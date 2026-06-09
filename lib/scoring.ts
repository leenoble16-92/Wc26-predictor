// Scoring engine (SPEC §4 resolution + §5 points). Pure + deterministic so the
// cron, the preview injector, and tests all share one source of truth.
//
// points = base × FROZEN multiplier (the multiplier locked at kickoff).
// League/global tables rank by total = final + provisional points.

import { BASE_POINTS, type CategoryId } from "./constants";

export type CategoryStatus =
  | "won" // resolved in your favour — final points
  | "provisional" // currently going your way — points may change
  | "on_track" // still alive but no points yet (winner/runner-up pre-final)
  | "missed" // resolved against you — 0
  | "pending"; // not started / undecided

export interface CategoryResult {
  category: CategoryId;
  points: number;
  status: CategoryStatus;
  note: string;
}

export interface ScoreResult {
  total: number;
  finalPoints: number;
  provisionalPoints: number;
  breakdown: CategoryResult[];
}

// Resolved + provisional tournament facts the cron maintains.
export interface TournamentState {
  winner: string | null; // team id, FINAL
  runner_up: string | null; // team id, FINAL
  golden_boot: string | null; // player id (string), FINAL
  golden_boot_leader: string | null; // player id (string), provisional
  pott: string | null; // player id (string), FINAL (manual)
  dark_horse: string | null; // team id, FINAL
  dark_horse_leader: string | null; // team id, provisional
  flop: string | null; // team id, resolved
  alive_teams: string[]; // teams not yet eliminated
}

export const EMPTY_STATE: TournamentState = {
  winner: null,
  runner_up: null,
  golden_boot: null,
  golden_boot_leader: null,
  pott: null,
  dark_horse: null,
  dark_horse_leader: null,
  flop: null,
  alive_teams: [],
};

// A user's pick for one category, with its frozen multiplier.
export interface ScoredPick {
  category: CategoryId;
  entityId: string; // team id or player id (string)
  multiplier: number; // frozen multiplier
}

function scoreOne(
  pick: ScoredPick,
  state: TournamentState
): CategoryResult {
  const base = BASE_POINTS[pick.category];
  const win = (): CategoryResult => ({
    category: pick.category,
    points: Math.round(base * pick.multiplier),
    status: "won",
    note: "Called it",
  });
  const provisional = (note: string): CategoryResult => ({
    category: pick.category,
    points: Math.round(base * pick.multiplier),
    status: "provisional",
    note,
  });
  const missed = (note: string): CategoryResult => ({
    category: pick.category,
    points: 0,
    status: "missed",
    note,
  });
  const pending = (note = "Undecided"): CategoryResult => ({
    category: pick.category,
    points: 0,
    status: "pending",
    note,
  });
  const onTrack = (note: string): CategoryResult => ({
    category: pick.category,
    points: 0,
    status: "on_track",
    note,
  });

  const alive = state.alive_teams.includes(pick.entityId);

  switch (pick.category) {
    case "winner":
      if (state.winner) return state.winner === pick.entityId ? win() : missed("Didn't lift it");
      return alive ? onTrack("Still in it") : missed("Eliminated");
    case "runner_up":
      if (state.runner_up) return state.runner_up === pick.entityId ? win() : missed("Not the runner-up");
      return alive ? onTrack("Still in it") : missed("Eliminated");
    case "golden_boot":
      if (state.golden_boot) return state.golden_boot === pick.entityId ? win() : missed("Outscored");
      if (state.golden_boot_leader === pick.entityId) return provisional("Leading the scoring");
      return pending("In the hunt");
    case "pott":
      if (state.pott) return state.pott === pick.entityId ? win() : missed("Not awarded");
      return pending("Awarded at the final");
    case "dark_horse":
      if (state.dark_horse) return state.dark_horse === pick.entityId ? win() : missed("Bolted too early");
      if (state.dark_horse_leader === pick.entityId) return provisional("Going furthest");
      return alive ? onTrack("Still running") : missed("Eliminated");
    case "flop":
      if (state.flop) return state.flop === pick.entityId ? win() : missed("Didn't flop");
      return pending("No flop confirmed yet");
  }
}

export function computeScore(
  picks: ScoredPick[],
  state: TournamentState
): ScoreResult {
  const breakdown = picks.map((p) => scoreOne(p, state));
  let finalPoints = 0;
  let provisionalPoints = 0;
  for (const r of breakdown) {
    if (r.status === "won") finalPoints += r.points;
    else if (r.status === "provisional") provisionalPoints += r.points;
  }
  return {
    total: finalPoints + provisionalPoints,
    finalPoints,
    provisionalPoints,
    breakdown,
  };
}
