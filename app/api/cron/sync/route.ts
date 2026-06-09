// Results sync + scoring (INTEGRATIONS §3/§4). Today this runs the scoring
// pass against the current tournament_state. The provider-driven results
// derivation (matches → eliminations/finalists, scorers → golden boot) layers
// on top here once the tournament is live and there are real results to read.
//
// Service-role client confined to app/api/cron/ per the hard rule.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runScoringPass } from "@/lib/scoringPass";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // TODO (tournament): fetch matches + scorers via the provider adapter and
  // upsert tournament_state (winner/runner_up/golden_boot/flop/dark_horse/
  // alive_teams) before scoring. Until kickoff there are no results to read.

  try {
    const { scored } = await runScoringPass(svc);
    return NextResponse.json({ ok: true, scored });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "scoring failed" },
      { status: 500 }
    );
  }
}
