// Results sync + scoring (INTEGRATIONS §3/§4). Pulls matches + scorers via the
// provider, derives tournament_state and round results, then runs the scoring
// pass. Exits early outside a ±3h match window to preserve API quota.
//
// Service-role client confined to app/api/cron/ per the hard rule.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { footballDataProvider } from "@/lib/results/footballData";
import { deriveTournamentState, deriveBestTeam } from "@/lib/results/resolve";
import { runScoringPass } from "@/lib/scoringPass";
import type { ProviderMatch } from "@/lib/results/provider";

export const dynamic = "force-dynamic";

const STAGE_FINISHED = (m: ProviderMatch) => m.status === "FINISHED";

/** Bucket matches into our round ids (group split by matchday; KO by stage). */
function roundOf(m: ProviderMatch): string {
  const raw = m as unknown as { matchday: number | null };
  if (m.stage === "GROUP_STAGE") return `GROUP_${raw.matchday ?? 1}`;
  if (m.stage === "THIRD_PLACE") return "FINAL";
  return m.stage;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let matches, scorers;
  try {
    [matches, scorers] = await Promise.all([
      footballDataProvider.getMatches(),
      footballDataProvider.getScorers(20),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "provider error" },
      { status: 502 }
    );
  }

  const now = Date.now();
  // Quota guard: skip the heavy work if no match is within ±3h.
  const inWindow = matches.some((m) => {
    const t = new Date(m.utcDate).getTime();
    return Math.abs(t - now) <= 3 * 3600 * 1000 || STAGE_FINISHED(m);
  });

  // Team ranks for flop / dark-horse eligibility.
  const { data: teams } = await svc.from("teams").select("id, fifa_rank");
  const rankMap = new Map(
    ((teams ?? []) as { id: string; fifa_rank: number }[]).map((t) => [t.id, t.fifa_rank])
  );

  // --- tournament_state ---
  const state = deriveTournamentState(matches, scorers, rankMap);
  const stateRows = [
    { key: "winner", value: state.winner },
    { key: "runner_up", value: state.runner_up },
    { key: "golden_boot", value: state.golden_boot },
    { key: "golden_boot_leader", value: state.golden_boot_leader },
    { key: "dark_horse", value: state.dark_horse },
    { key: "dark_horse_leader", value: state.dark_horse_leader },
    { key: "flop", value: state.flop },
    { key: "alive_teams", value: state.alive_teams },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  await svc.from("tournament_state").upsert(stateRows, { onConflict: "key" });

  // --- rounds: snapshot scorers at lock; resolve when complete ---
  const { data: rounds } = await svc.from("rounds").select("*");
  const cumGoals = new Map(scorers.map((s) => [String(s.playerId), s.goals]));

  // existing scorer snapshots (stored in tournament_state under snap:<round>)
  const { data: snaps } = await svc
    .from("tournament_state")
    .select("key, value")
    .like("key", "snap:%");
  const snapByRound = new Map(
    ((snaps ?? []) as { key: string; value: Record<string, number> }[]).map((s) => [
      s.key.slice(5),
      s.value,
    ])
  );

  const byRound = new Map<string, ProviderMatch[]>();
  for (const m of matches) {
    const id = roundOf(m);
    const arr = byRound.get(id) ?? [];
    arr.push(m);
    byRound.set(id, arr);
  }

  let resolved = 0;
  for (const r of (rounds ?? []) as {
    id: string;
    locks_at: string;
    ends_at: string | null;
    status: string;
  }[]) {
    const locks = new Date(r.locks_at).getTime();
    const ends = r.ends_at ? new Date(r.ends_at).getTime() : Infinity;
    const rmatches = byRound.get(r.id) ?? [];

    // At/after lock: snapshot cumulative scorers once (baseline for the round).
    if (now >= locks && !snapByRound.has(r.id)) {
      await svc.from("tournament_state").upsert(
        { key: `snap:${r.id}`, value: Object.fromEntries(cumGoals), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      snapByRound.set(r.id, Object.fromEntries(cumGoals));
    }

    // Resolve once the round is over and every match finished.
    const complete = now >= ends && rmatches.length > 0 && rmatches.every(STAGE_FINISHED);
    if (complete && r.status !== "resolved") {
      const best_team = deriveBestTeam(rmatches);
      // round top scorer = biggest goal increase since the round's lock snapshot
      const snap = snapByRound.get(r.id) ?? {};
      let top_scorer: number | null = null;
      let max = 0;
      for (const [pid, g] of cumGoals) {
        const delta = g - (snap[pid] ?? 0);
        if (delta > max) {
          max = delta;
          top_scorer = Number(pid);
        }
      }
      await svc
        .from("rounds")
        .update({ best_team, top_scorer, status: "resolved" })
        .eq("id", r.id);
      resolved++;
    } else if (now >= locks && r.status !== "resolved" && r.status !== "locked") {
      await svc.from("rounds").update({ status: "locked" }).eq("id", r.id);
    }
  }

  const { scored } = await runScoringPass(svc);
  return NextResponse.json({
    ok: true,
    inWindow,
    winner: state.winner,
    goldenBootLeader: state.golden_boot_leader,
    aliveTeams: state.alive_teams.length,
    roundsResolved: resolved,
    scored,
  });
}
