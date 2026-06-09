// Results provider adapter (INTEGRATIONS §2 "Architecture requirement").
// All external results calls go through this interface so a fallback provider
// (e.g. API-Football) can be swapped in without touching seed/scoring logic.

export interface ProviderSquadMember {
  id: number;
  name: string;
  position: string; // Goalkeeper | Defence | Midfield | Offence | Coach
}

export interface ProviderTeam {
  tla: string; // three-letter code, used as our teams.id
  name: string;
  areaName: string;
  squad: ProviderSquadMember[];
}

export interface ProviderMatch {
  id: number;
  status: string;
  stage: string;
  homeTeam: { tla: string | null; name: string | null };
  awayTeam: { tla: string | null; name: string | null };
  score: unknown;
  utcDate: string;
}

export interface ProviderScorer {
  playerId: number;
  playerName: string;
  teamTla: string | null;
  goals: number;
  assists: number | null;
}

export interface ResultsProvider {
  /** All competition teams with embedded squads (seed). */
  getTeamsWithSquads(): Promise<ProviderTeam[]>;
  /** All fixtures + statuses + scores (cron sync — tomorrow). */
  getMatches(): Promise<ProviderMatch[]>;
  /** Top scorers feed (Golden Boot — tomorrow). */
  getScorers(limit?: number): Promise<ProviderScorer[]>;
}

/** Thrown when the provider refuses the competition on plan/access grounds. */
export class ProviderPlanError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ProviderPlanError";
  }
}
