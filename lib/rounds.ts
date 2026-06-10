// Round picks data access (engagement layer). All through the anon client so
// RLS applies — each round locks at its own kickoff.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoundCategoryId } from "./constants";
import { ROUND_CATEGORIES } from "./constants";
import type { PickEntity } from "./types";
import { type RefData, teamToEntity, playerToEntity } from "./data";
import {
  buildMultiplierMap,
  type EntityMultiplier,
  type PickStatRow,
} from "./multiplierMap";

export interface Round {
  id: string;
  name: string;
  stage: string;
  matchday: number | null;
  locks_at: string;
  ends_at: string | null;
  status: "upcoming" | "open" | "locked" | "resolved";
  best_team: string | null;
  top_scorer: number | null;
  sort: number;
}

export type RoundPicksMap = Partial<Record<RoundCategoryId, PickEntity>>;

export async function loadRounds(supabase: SupabaseClient): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Round[];
}

/** The round you can currently make picks for: earliest not-yet-locked round. */
export function activeRound(rounds: Round[]): Round | null {
  const now = Date.now();
  return rounds.find((r) => now < new Date(r.locks_at).getTime()) ?? null;
}

/** The pool of pickable entities for a round category. */
export function poolForRoundCategory(
  category: RoundCategoryId,
  data: RefData
): PickEntity[] {
  if (category === "round_team") return data.teams.map(teamToEntity);
  return data.players.map((p) => playerToEntity(p, data.teamById));
}

export async function loadRoundPicks(
  supabase: SupabaseClient,
  userId: string,
  roundId: string,
  data: RefData
): Promise<{ picks: RoundPicksMap; locked: boolean }> {
  const { data: rows, error } = await supabase
    .from("round_picks")
    .select("category, team_id, player_id, locked_at")
    .eq("user_id", userId)
    .eq("round_id", roundId);
  if (error) throw error;

  const picks: RoundPicksMap = {};
  let locked = false;
  for (const r of (rows ?? []) as {
    category: RoundCategoryId;
    team_id: string | null;
    player_id: number | null;
    locked_at: string | null;
  }[]) {
    if (r.locked_at) locked = true;
    if (r.team_id) {
      const t = data.teamById.get(r.team_id);
      if (t) picks[r.category] = teamToEntity(t);
    } else if (r.player_id != null) {
      const p = data.playerById.get(r.player_id);
      if (p) picks[r.category] = playerToEntity(p, data.teamById);
    }
  }
  return { picks, locked };
}

export async function saveRoundPick(
  supabase: SupabaseClient,
  userId: string,
  roundId: string,
  category: RoundCategoryId,
  entity: PickEntity
): Promise<void> {
  const row = {
    user_id: userId,
    round_id: roundId,
    category,
    team_id: entity.type === "team" ? entity.entityId : null,
    player_id: entity.type === "player" ? Number(entity.entityId) : null,
  };
  const { error } = await supabase
    .from("round_picks")
    .upsert(row, { onConflict: "user_id,round_id,category" });
  if (error) throw error;
}

/** Multiplier maps for a round's two categories (real round_stats override). */
export async function loadRoundMultipliers(
  supabase: SupabaseClient,
  roundId: string,
  data: RefData
): Promise<Map<RoundCategoryId, Map<string, EntityMultiplier>>> {
  const { data: statsData } = await supabase
    .from("round_stats")
    .select("category, entity_id, pct, multiplier")
    .eq("round_id", roundId);
  const byCat = new Map<string, PickStatRow[]>();
  for (const s of (statsData ?? []) as PickStatRow[]) {
    const arr = byCat.get(s.category) ?? [];
    arr.push(s);
    byCat.set(s.category, arr);
  }
  const maps = new Map<RoundCategoryId, Map<string, EntityMultiplier>>();
  for (const c of ROUND_CATEGORIES) {
    const pool = poolForRoundCategory(c.id, data);
    maps.set(c.id, buildMultiplierMap(pool, byCat.get(c.id) ?? [], data.teamRankById));
  }
  return maps;
}
