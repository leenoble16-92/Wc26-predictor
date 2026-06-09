// Fetch pick_stats (likely empty today) and build a multiplier map per
// category from the pool + the default distribution. Step 8's client-side
// computation; the hourly cron that maintains pick_stats is tomorrow.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, type CategoryId } from "./constants";
import { poolForCategory, type RefData } from "./data";
import {
  buildMultiplierMap,
  type EntityMultiplier,
  type PickStatRow,
} from "./multiplierMap";

export async function loadMultiplierMaps(
  supabase: SupabaseClient,
  data: RefData
): Promise<Map<CategoryId, Map<string, EntityMultiplier>>> {
  const { data: statsData, error } = await supabase
    .from("pick_stats")
    .select("category,entity_id,pct,multiplier");
  if (error) throw error;

  const stats = (statsData ?? []) as PickStatRow[];
  const byCat = new Map<string, PickStatRow[]>();
  for (const s of stats) {
    const arr = byCat.get(s.category) ?? [];
    arr.push(s);
    byCat.set(s.category, arr);
  }

  const maps = new Map<CategoryId, Map<string, EntityMultiplier>>();
  for (const c of CATEGORIES) {
    const pool = poolForCategory(c.id, data);
    maps.set(
      c.id,
      buildMultiplierMap(pool, byCat.get(c.id) ?? [], data.teamRankById)
    );
  }
  return maps;
}
