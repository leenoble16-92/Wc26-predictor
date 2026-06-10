// Pure resolution logic (SPEC §4). Derives tournament_state + round results
// from the provider's matches + scorers feeds. Kept pure so it's unit-testable
// with synthetic fixtures before any real result exists.
import type { ProviderMatch, ProviderScorer } from "./provider";
import type { TournamentState } from "../scoring";
import { EMPTY_STATE } from "../scoring";

const STAGE_ORDER: Record<string, number> = {
  GROUP_STAGE: 0,
  LAST_32: 1,
  LAST_16: 2,
  QUARTER_FINALS: 3,
  THIRD_PLACE: 4,
  SEMI_FINALS: 4,
  FINAL: 5,
};

interface FT {
  fullTime?: { home: number | null; away: number | null };
}
const ft = (m: ProviderMatch) => (m.score as FT | undefined)?.fullTime;
const finished = (m: ProviderMatch) => m.status === "FINISHED" && !!ft(m);

/** Most goals scored by a single team across a set of FINISHED matches. */
export function deriveBestTeam(matches: ProviderMatch[]): string | null {
  const goals = new Map<string, number>();
  for (const m of matches) {
    if (!finished(m)) continue;
    const f = ft(m)!;
    if (m.homeTeam.tla) goals.set(m.homeTeam.tla, (goals.get(m.homeTeam.tla) ?? 0) + (f.home ?? 0));
    if (m.awayTeam.tla) goals.set(m.awayTeam.tla, (goals.get(m.awayTeam.tla) ?? 0) + (f.away ?? 0));
  }
  let best: string | null = null;
  let max = -1;
  for (const [tla, g] of goals) {
    if (g > max) {
      max = g;
      best = tla;
    }
  }
  return best;
}

/**
 * Derive the full tournament state. `teamRank` maps team tla -> FIFA rank
 * (for flop/dark-horse eligibility). Eliminations are approximate before the
 * tournament has real data: a team is out if it lost a knockout tie, or once a
 * knockout stage has started and it has no match in the latest started stage.
 */
export function deriveTournamentState(
  matches: ProviderMatch[],
  scorers: ProviderScorer[],
  teamRank: Map<string, number>
): TournamentState {
  const state: TournamentState = { ...EMPTY_STATE };

  // Golden boot — top of the (cumulative) scorers feed.
  if (scorers.length) state.golden_boot_leader = String(scorers[0].playerId);

  // Final → winner / runner-up (and finalise golden boot).
  const final = matches.find((m) => m.stage === "FINAL" && finished(m));
  if (final) {
    const f = ft(final)!;
    const homeWon = (f.home ?? 0) > (f.away ?? 0);
    state.winner = (homeWon ? final.homeTeam.tla : final.awayTeam.tla) ?? null;
    state.runner_up = (homeWon ? final.awayTeam.tla : final.homeTeam.tla) ?? null;
    state.golden_boot = state.golden_boot_leader;
  }

  // Per-team furthest stage reached + knockout losses.
  const reached = new Map<string, number>();
  const lostKO = new Set<string>();
  const startedKO = new Set<number>();
  for (const m of matches) {
    const si = STAGE_ORDER[m.stage] ?? 0;
    for (const t of [m.homeTeam.tla, m.awayTeam.tla]) {
      if (t) reached.set(t, Math.max(reached.get(t) ?? 0, si));
    }
    if (si >= 1) startedKO.add(si);
    if (si >= 1 && finished(m)) {
      const f = ft(m)!;
      if ((f.home ?? 0) !== (f.away ?? 0)) {
        const loser = (f.home ?? 0) > (f.away ?? 0) ? m.awayTeam.tla : m.homeTeam.tla;
        if (loser) lostKO.add(loser);
      }
    }
  }
  const latestKO = startedKO.size ? Math.max(...startedKO) : 0;

  const eliminated = (tla: string) =>
    lostKO.has(tla) || (latestKO > 0 && (reached.get(tla) ?? 0) < latestKO);

  const aliveTeams: string[] = [];
  for (const tla of reached.keys()) if (!eliminated(tla)) aliveTeams.push(tla);
  state.alive_teams = aliveTeams;

  // Dark horse (rank > 12): progressing furthest; tie → worse (higher) rank.
  let dh: string | null = null;
  let dhStage = -1;
  let dhRank = -1;
  // Flop (rank <= 16): eliminated earliest; tie → better (lower) rank.
  let flop: string | null = null;
  let flopStage = Infinity;
  let flopRank = Infinity;
  for (const [tla, st] of reached) {
    const rank = teamRank.get(tla);
    if (rank == null) continue;
    if (rank > 12) {
      if (st > dhStage || (st === dhStage && rank > dhRank)) {
        dh = tla;
        dhStage = st;
        dhRank = rank;
      }
    }
    if (rank <= 16 && eliminated(tla)) {
      if (st < flopStage || (st === flopStage && rank < flopRank)) {
        flop = tla;
        flopStage = st;
        flopRank = rank;
      }
    }
  }
  state.dark_horse_leader = dh;
  state.flop = flop;
  if (state.winner) state.dark_horse = dh; // finalise furthest-progressing at the end

  return state;
}
