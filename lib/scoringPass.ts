// Scoring pass: read tournament_state + everyone's picks + frozen multipliers,
// compute each user's score, and write the scores table. Shared by the cron
// (app/api/cron/sync) and the preview injector (scripts/). Takes a Supabase
// client (the service-role key is only ever created in those two callers, so
// this file references no secret).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId } from "./constants";
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

export interface ScoringPassResult {
  scored: number;
}

/** Recompute and persist scores for every user. */
export async function runScoringPass(
  supabase: SupabaseClient
): Promise<ScoringPassResult> {
  const [state, pickRows, mults] = await Promise.all([
    readState(supabase),
    readAllPicks(supabase),
    readMultipliers(supabase),
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

  // Compute + rank.
  const computed = [...byUser.entries()].map(([user_id, picks]) => {
    const s = computeScore(picks, state);
    return { user_id, ...s };
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
