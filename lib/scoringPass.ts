// Scoring pass: read tournament_state + everyone's picks + frozen multipliers,
// compute each user's score, and write the scores table. Shared by the cron
// (app/api/cron/sync) and the preview injector (scripts/). Takes a Supabase
// client (the service-role key is only ever created in those two callers, so
// this file references no secret).
import type { SupabaseClient } from "@supabase/supabase-js";
import { type CategoryId, ROUND_BASE, type RoundCategoryId } from "./constants";
import {
  computeScore,
  EMPTY_STATE,
  type TournamentState,
  type ScoredPick,
} from "./scoring";

const STATE_KEYS = [
  "winner",
  "runner_up",
  "golden_boot",
  "golden_boot_leader",
  "pott",
  "dark_horse",
  "dark_horse_leader",
  "flop",
  "alive_teams",
] as const;

/** Assemble TournamentState from the key/value tournament_state table. */
export async function readState(
  supabase: SupabaseClient
): Promise<TournamentState> {
  const { data } = await supabase
    .from("tournament_state")
    .select("key, value")
    .in("key", STATE_KEYS as unknown as string[]);
  const state: TournamentState = { ...EMPTY_STATE };
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if (row.key === "alive_teams") {
      state.alive_teams = Array.isArray(row.value) ? (row.value as string[]) : [];
    } else if (STATE_KEYS.includes(row.key as (typeof STATE_KEYS)[number])) {
      // scalar id stored as a json string (or null)
      (state as unknown as Record<string, unknown>)[row.key] =
        row.value == null ? null : String(row.value);
    }
  }
  return state;
}

async function readAllPicks(supabase: SupabaseClient) {
  const rows: {
    user_id: string;
    category: CategoryId;
    team_id: string | null;
    player_id: number | null;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("picks")
      .select("user_id, category, team_id, player_id")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

async function readMultipliers(supabase: SupabaseClient) {
  const map = new Map<string, number>(); // `${category}:${entity_id}` -> mult
  const { data } = await supabase
    .from("pick_stats")
    .select("category, entity_id, multiplier");
  for (const s of (data ?? []) as {
    category: string;
    entity_id: string;
    multiplier: number | null;
  }[]) {
    if (s.multiplier != null) map.set(`${s.category}:${s.entity_id}`, s.multiplier);
  }
  return map;
}

/**
 * Round-pick points per user: for each resolved round, ROUND_BASE × the round
 * multiplier if the user's round pick matches the result (best_team /
 * top_scorer). Returns a map user_id -> bonus points.
 */
async function roundPointsByUser(
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id, best_team, top_scorer");
  const results = new Map<string, { team: string | null; scorer: string | null }>();
  for (const r of (rounds ?? []) as {
    id: string;
    best_team: string | null;
    top_scorer: number | null;
  }[]) {
    if (r.best_team || r.top_scorer != null) {
      results.set(r.id, {
        team: r.best_team,
        scorer: r.top_scorer != null ? String(r.top_scorer) : null,
      });
    }
  }
  if (results.size === 0) return new Map();

  // Round multipliers (frozen at round lock).
  const { data: stats } = await supabase
    .from("round_stats")
    .select("round_id, category, entity_id, multiplier");
  const mult = new Map<string, number>();
  for (const s of (stats ?? []) as {
    round_id: string;
    category: string;
    entity_id: string;
    multiplier: number | null;
  }[]) {
    if (s.multiplier != null) mult.set(`${s.round_id}:${s.category}:${s.entity_id}`, s.multiplier);
  }

  const { data: picks } = await supabase
    .from("round_picks")
    .select("user_id, round_id, category, team_id, player_id")
    .limit(20000);

  const out = new Map<string, number>();
  for (const p of (picks ?? []) as {
    user_id: string;
    round_id: string;
    category: RoundCategoryId;
    team_id: string | null;
    player_id: number | null;
  }[]) {
    const res = results.get(p.round_id);
    if (!res) continue;
    const entity = p.team_id ?? (p.player_id != null ? String(p.player_id) : null);
    if (!entity) continue;
    const correct =
      p.category === "round_team" ? res.team === entity : res.scorer === entity;
    if (!correct) continue;
    const m = mult.get(`${p.round_id}:${p.category}:${entity}`) ?? 1;
    out.set(p.user_id, (out.get(p.user_id) ?? 0) + Math.round(ROUND_BASE[p.category] * m));
  }
  return out;
}

export interface ScoringPassResult {
  scored: number;
}

/** Recompute and persist scores for every user. */
export async function runScoringPass(
  supabase: SupabaseClient
): Promise<ScoringPassResult> {
  const [state, pickRows, mults, roundPts] = await Promise.all([
    readState(supabase),
    readAllPicks(supabase),
    readMultipliers(supabase),
    roundPointsByUser(supabase),
  ]);

  // Group picks by user into ScoredPick[].
  const byUser = new Map<string, ScoredPick[]>();
  for (const p of pickRows) {
    const entityId = p.team_id ?? (p.player_id != null ? String(p.player_id) : null);
    if (!entityId) continue;
    const arr = byUser.get(p.user_id) ?? [];
    arr.push({
      category: p.category,
      entityId,
      multiplier: mults.get(`${p.category}:${entityId}`) ?? 1,
    });
    byUser.set(p.user_id, arr);
  }

  // Previous global ranks (for delta) from existing scores.
  const { data: prev } = await supabase
    .from("scores")
    .select("user_id, breakdown");
  const prevRank = new Map<string, number>();
  for (const r of (prev ?? []) as { user_id: string; breakdown: { rank?: number } | null }[]) {
    if (r.breakdown?.rank) prevRank.set(r.user_id, r.breakdown.rank);
  }

  // Users to score = anyone with six-picks OR round-picks.
  const userIds = new Set<string>([...byUser.keys(), ...roundPts.keys()]);

  // Compute + rank (six points + resolved round bonus).
  const computed = [...userIds].map((user_id) => {
    const s = computeScore(byUser.get(user_id) ?? [], state);
    const round = roundPts.get(user_id) ?? 0;
    return { user_id, ...s, round, total: s.total + round };
  });
  computed.sort((a, b) => b.total - a.total);

  const now = new Date().toISOString();
  const rows = computed.map((c, i) => {
    const rank = i + 1;
    const pr = prevRank.get(c.user_id);
    return {
      user_id: c.user_id,
      points: c.total,
      breakdown: {
        final: c.finalPoints,
        provisional: c.provisionalPoints,
        round: c.round,
        delta: pr ? pr - rank : 0,
        rank,
        categories: c.breakdown,
      },
      updated_at: now,
    };
  });

  if (rows.length) {
    const { error } = await supabase
      .from("scores")
      .upsert(rows, { onConflict: "user_id" });
    if (error) throw error;
  }
  return { scored: rows.length };
}
