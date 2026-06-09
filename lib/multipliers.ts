// CALLED IT. — multiplier + rarity tier maths (INTEGRATIONS.md §5, SPEC §5)
//
// multiplier = clamp(30 / max(pct, 0.1) + 0.9, 1.1, 10), rounded to 1dp
// Rarity tiers (for display): <2 Common, 2–3.9 Rare, 4–6.9 Epic, ≥7 Legendary

import { MULTIPLIER } from "./constants";

/** Multiplier from a pick percentage (0–100). */
export function multiplierFromPct(pct: number): number {
  const raw = 30 / Math.max(pct, 0.1) + 0.9;
  const clamped = Math.min(MULTIPLIER.MAX, Math.max(MULTIPLIER.MIN, raw));
  return Math.round(clamped * 10) / 10;
}

export type TierClass = "common" | "rare" | "epic" | "legendary";

export interface Tier {
  label: string;
  cls: TierClass;
}

export function tierFor(multiplier: number): Tier {
  if (multiplier >= 7) return { label: "LEGENDARY", cls: "legendary" };
  if (multiplier >= 4) return { label: "EPIC", cls: "epic" };
  if (multiplier >= 2) return { label: "RARE", cls: "rare" };
  return { label: "COMMON", cls: "common" };
}
