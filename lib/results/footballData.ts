// football-data.org v4 implementation of the ResultsProvider interface.
// Auth: header X-Auth-Token. Competition: WC. Free tier: 10 req/min.
import { COMPETITION } from "../constants";
import {
  type ResultsProvider,
  type ProviderTeam,
  type ProviderMatch,
  type ProviderScorer,
  ProviderPlanError,
} from "./provider";

const BASE = "https://api.football-data.org/v4";

async function get<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set.");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token },
  });

  if (res.status === 403) {
    // Plan/access refusal — caller must STOP and switch provider (SPEC §4).
    const body = await res.text().catch(() => "");
    throw new ProviderPlanError(
      `football-data 403 on ${path}: ${body.slice(0, 200)}`,
      403
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const footballDataProvider: ResultsProvider = {
  async getTeamsWithSquads(): Promise<ProviderTeam[]> {
    const data = await get<{
      teams: {
        tla: string;
        name: string;
        area?: { name?: string };
        squad?: { id: number; name: string; position?: string }[];
      }[];
    }>(`/competitions/${COMPETITION}/teams`);

    return data.teams.map((t) => ({
      tla: t.tla,
      name: t.name,
      areaName: t.area?.name ?? t.name,
      squad: (t.squad ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position ?? "Unknown",
      })),
    }));
  },

  async getMatches(): Promise<ProviderMatch[]> {
    const data = await get<{ matches: ProviderMatch[] }>(
      `/competitions/${COMPETITION}/matches`
    );
    return data.matches ?? [];
  },

  async getScorers(limit = 20): Promise<ProviderScorer[]> {
    const data = await get<{
      scorers: {
        player: { id: number; name: string };
        team?: { tla?: string };
        goals: number;
        assists: number | null;
      }[];
    }>(`/competitions/${COMPETITION}/scorers?limit=${limit}`);

    return (data.scorers ?? []).map((s) => ({
      playerId: s.player.id,
      playerName: s.player.name,
      teamTla: s.team?.tla ?? null,
      goals: s.goals,
      assists: s.assists,
    }));
  },
};
