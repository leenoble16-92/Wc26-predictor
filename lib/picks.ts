// Picks persistence — all through the anon client so RLS applies (HARD RULE:
// immutability + privacy are server-enforced, this layer just reads/writes).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId } from "./constants";
import type { PickEntity, PicksMap } from "./types";
import { type RefData, teamToEntity, playerToEntity } from "./data";

interface PickRow {
  category: CategoryId;
  team_id: string | null;
  player_id: number | null;
  locked_at: string | null;
}

/** Load the signed-in user's saved picks and resolve them to display entities. */
export async function loadPicks(
  supabase: SupabaseClient,
  userId: string,
  data: RefData
): Promise<{ picks: PicksMap; locked: boolean }> {
  const { data: rows, error } = await supabase
    .from("picks")
    .select("category,team_id,player_id,locked_at")
    .eq("user_id", userId);
  if (error) throw error;

  const picks: PicksMap = {};
  let locked = false;
  for (const row of (rows ?? []) as PickRow[]) {
    if (row.locked_at) locked = true;
    const entity = resolveEntity(row, data);
    if (entity) picks[row.category] = entity;
  }
  return { picks, locked };
}

function resolveEntity(row: PickRow, data: RefData): PickEntity | null {
  if (row.team_id) {
    const t = data.teamById.get(row.team_id);
    return t ? teamToEntity(t) : null;
  }
  if (row.player_id != null) {
    const p = data.playerById.get(row.player_id);
    return p ? playerToEntity(p, data.teamById) : null;
  }
  return null;
}

/**
 * Upsert a single pick for the user. Team picks set team_id; player picks set
 * player_id. RLS rejects this if the row is already locked or kickoff passed.
 */
export async function savePick(
  supabase: SupabaseClient,
  userId: string,
  category: CategoryId,
  entity: PickEntity
): Promise<void> {
  const row = {
    user_id: userId,
    category,
    team_id: entity.type === "team" ? entity.entityId : null,
    player_id: entity.type === "player" ? Number(entity.entityId) : null,
  };
  const { error } = await supabase
    .from("picks")
    .upsert(row, { onConflict: "user_id,category" });
  if (error) throw error;
}
