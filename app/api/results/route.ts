// Recent results + upcoming fixtures for the Results tab. Reads the provider
// (football-data) and caches for 3 min so the 10 req/min free-tier limit is
// never threatened, however many users open the tab. Uses FOOTBALL_DATA_TOKEN
// (server-only, not the service role) — fine outside cron/admin.
import { NextResponse } from "next/server";
import { footballDataProvider } from "@/lib/results/footballData";

export const revalidate = 180; // ISR cache window (seconds)

interface RawScore {
  winner?: string | null;
  fullTime?: { home: number | null; away: number | null };
}

export async function GET() {
  try {
    const matches = await footballDataProvider.getMatches();
    const items = matches
      .map((m) => {
        const score = m.score as RawScore | undefined;
        const finished = m.status === "FINISHED";
        return {
          id: m.id,
          stage: m.stage,
          status: m.status,
          utcDate: m.utcDate,
          home: { name: m.homeTeam.name ?? "TBD", tla: m.homeTeam.tla },
          away: { name: m.awayTeam.name ?? "TBD", tla: m.awayTeam.tla },
          score:
            finished && score?.fullTime
              ? { home: score.fullTime.home ?? 0, away: score.fullTime.away ?? 0 }
              : null,
        };
      })
      .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate));

    return NextResponse.json({ matches: items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "results unavailable", matches: [] },
      { status: 200 }
    );
  }
}
