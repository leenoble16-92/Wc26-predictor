// Client-side multiplier computation (SPEC §5 / INTEGRATIONS §5).
//
// The hourly cron that maintains pick_stats is tomorrow's work. Until then,
// if pick_stats has no row for an entity we synthesise a "sensible default
// distribution" and run the SAME formula the cron will use:
//
//   pct        = picks_for_entity / total_picks_in_category * 100
//   multiplier = clamp(30 / max(pct, 0.1) + 0.9, 1.1, 10), 1dp
//
// Default distribution: popularity is assumed to decay with FIFA rank (teams)
// or the rank of a player's national team, nudged by position (forwards draw
// more Golden Boot / POTT picks). Weights are normalised so each category's
// pcts sum to ~100 — a real distribution, not a fudge.

import type { PickEntity } from "./types";
import { multiplierFromPct, tierFor, type Tier } from "./multipliers";

export interface PickStatRow {
  category: string;
  entity_id: string;
  pct: number | null;
  multiplier: number | null;
}

export interface EntityMultiplier {
  multiplier: number;
  pct: number;
  tier: Tier;
  source: "pick_stats" | "default";
}

const POSITION_WEIGHT: Record<string, number> = {
  Offence: 1.6,
  Attacker: 1.6,
  Forward: 1.6,
  Midfield: 1.0,
  Midfielder: 1.0,
  Defence: 0.5,
  Defender: 0.5,
  Goalkeeper: 0.3,
};

function positionWeight(position?: string | null): number {
  if (!position) return 1.0;
  return POSITION_WEIGHT[position] ?? 1.0;
}

/** Raw popularity weight for one entity within its category pool. */
function defaultWeight(e: PickEntity, teamRank: (id: string) => number): number {
  if (e.type === "team") {
    const rank = e.rank ?? 50;
    return 1 / Math.max(rank, 1);
  }
  // player: weight by their team's rank and position
  const rank = teamRank(e.entityId);
  return positionWeight(e.position) / Math.max(rank, 1);
}

/**
 * Build a multiplier map for one category's pool of pickable entities.
 * `stats` are the pick_stats rows for this category (may be empty today).
 */
export function buildMultiplierMap(
  pool: PickEntity[],
  stats: PickStatRow[],
  teamRankById: Map<string, number>
): Map<string, EntityMultiplier> {
  const statByEntity = new Map(stats.map((s) => [s.entity_id, s]));
  const rankOf = (id: string) => teamRankById.get(id) ?? 50;

  // Default distribution across the pool (normalised to 100).
  const weights = pool.map((e) => defaultWeight(e, rankOf));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  const out = new Map<string, EntityMultiplier>();
  pool.forEach((e, i) => {
    const stat = statByEntity.get(e.entityId);
    if (stat && stat.multiplier != null) {
      const m = stat.multiplier;
      out.set(e.entityId, {
        multiplier: m,
        pct: stat.pct ?? 0,
        tier: tierFor(m),
        source: "pick_stats",
      });
      return;
    }
    const pct = (weights[i] / totalWeight) * 100;
    const m = multiplierFromPct(pct);
    out.set(e.entityId, {
      multiplier: m,
      pct: Math.round(pct * 10) / 10,
      tier: tierFor(m),
      source: "default",
    });
  });
  return out;
}
