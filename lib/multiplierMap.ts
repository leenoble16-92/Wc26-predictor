// Client-side multiplier computation (SPEC §5 / INTEGRATIONS §5).
//
// The hourly cron that maintains pick_stats is tomorrow's work. Until then,
// if pick_stats has no row for an entity we synthesise a "sensible default
// distribution" and run the SAME formula the cron will use:
//
//   pct        = picks_for_entity / total_picks_in_category * 100
//   multiplier = clamp(30 / max(pct, 0.1) + 0.9, 1.1, 10), 1dp
//
// Default distribution: a popularity-proxy pick-share (%) that decays with
// FIFA rank (teams) or a player's national-team rank, nudged by position
// (forwards draw the most Golden Boot / POTT picks). It's a heuristic stand-in
// that yields a believable spread of rarity tiers at any pool size — NOT a
// claim about real behaviour. Real shares replace it when the cron fills
// pick_stats tomorrow.

import type { PickEntity } from "./types";
import type { CategoryId } from "./constants";
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

// Multiplier maps for every category, keyed by entity id.
export type MultMaps = Map<CategoryId, Map<string, EntityMultiplier>>;

const POSITION_WEIGHT: Record<string, number> = {
  Offence: 1.0,
  Attacker: 1.0,
  Forward: 1.0,
  Midfield: 0.55,
  Midfielder: 0.55,
  Defence: 0.3,
  Defender: 0.3,
  Goalkeeper: 0.2,
};

function positionWeight(position?: string | null): number {
  if (!position) return 0.5;
  return POSITION_WEIGHT[position] ?? 0.5;
}

/**
 * Heuristic default pick-share (%) for one entity — popularity decays with
 * rank; players are additionally scaled by position. Clamped to a sane band.
 * This is fed straight into the §5 multiplier formula.
 */
function defaultPopPct(e: PickEntity, teamRank: (id: string) => number): number {
  const rank = e.type === "team" ? e.rank ?? 50 : teamRank(e.entityId);
  const decay = e.type === "team" ? 0.7 : 0.5;
  const base = 24 / Math.pow(Math.max(rank, 1), decay);
  const pop = e.type === "team" ? base : base * positionWeight(e.position);
  return Math.min(40, Math.max(0.1, pop));
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

  const out = new Map<string, EntityMultiplier>();
  for (const e of pool) {
    const stat = statByEntity.get(e.entityId);
    if (stat && stat.multiplier != null) {
      const m = stat.multiplier;
      out.set(e.entityId, {
        multiplier: m,
        pct: stat.pct ?? 0,
        tier: tierFor(m),
        source: "pick_stats",
      });
      continue;
    }
    const pct = defaultPopPct(e, rankOf);
    const m = multiplierFromPct(pct);
    out.set(e.entityId, {
      multiplier: m,
      pct: Math.round(pct * 10) / 10,
      tier: tierFor(m),
      source: "default",
    });
  }
  return out;
}
