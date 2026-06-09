// Reads reference data (teams, players) through the anon client so RLS
// applies, and shapes it into the per-category pools the album/picker render.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team, Player, PickEntity } from "./types";
import type { CategoryId } from "./constants";
import { DARK_HORSE_RANK_FLOOR, FLOP_RANK_CEILING } from "./constants";

export interface RefData {
  teams: Team[];
  players: Player[];
  teamById: Map<string, Team>;
  teamRankById: Map<string, number>;
}

export async function loadRefData(supabase: SupabaseClient): Promise<RefData> {
  const [teamsRes, playersRes] = await Promise.all([
    supabase.from("teams").select("*").order("fifa_rank", { ascending: true }),
    supabase.from("players").select("*").order("name", { ascending: true }),
  ]);
  if (teamsRes.error) throw teamsRes.error;
  if (playersRes.error) throw playersRes.error;

  const teams = (teamsRes.data ?? []) as Team[];
  const players = (playersRes.data ?? []) as Player[];
  const teamById = new Map(teams.map((t) => [t.id, t]));

  // Players are keyed by team_id for the multiplier proxy; entity ids in
  // pick_stats are the player id, so map player-entity-id -> team rank.
  const teamRankById = new Map<string, number>();
  for (const t of teams) teamRankById.set(t.id, t.fifa_rank);
  for (const p of players) {
    const t = p.team_id ? teamById.get(p.team_id) : undefined;
    if (t) teamRankById.set(String(p.id), t.fifa_rank);
  }

  return { teams, players, teamById, teamRankById };
}

function teamEntity(t: Team): PickEntity {
  return {
    type: "team",
    entityId: t.id,
    name: t.name,
    flag: t.flag,
    sub: `World ranking ${t.fifa_rank}`,
    rank: t.fifa_rank,
  };
}

function playerEntity(p: Player, teamById: Map<string, Team>): PickEntity {
  const t = p.team_id ? teamById.get(p.team_id) : undefined;
  const teamName = t?.name ?? p.team_id ?? "—";
  return {
    type: "player",
    entityId: String(p.id),
    name: p.name,
    flag: t?.flag ?? "🏳️",
    sub: `${teamName}${p.club ? ` · ${p.club}` : ""}`,
    position: p.position,
  };
}

/** The pickable pool for a category (mirrors SPEC §3 + prototype filters). */
export function poolForCategory(
  category: CategoryId,
  data: RefData
): PickEntity[] {
  const { teams, players, teamById } = data;
  switch (category) {
    case "winner":
    case "runner_up":
      return teams.map(teamEntity);
    case "dark_horse":
      return teams
        .filter((t) => t.fifa_rank > DARK_HORSE_RANK_FLOOR)
        .map(teamEntity);
    case "flop":
      return teams
        .filter((t) => t.fifa_rank <= FLOP_RANK_CEILING)
        .map(teamEntity);
    case "golden_boot":
    case "pott":
      return players.map((p) => playerEntity(p, teamById));
  }
}
