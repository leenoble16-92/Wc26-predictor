// Hourly multiplier recompute (INTEGRATIONS §3/§5).
// Tallies real pick distribution across ALL users, writes pick_stats, and
// freezes at kickoff (after which it never updates again).
//
// Service-role client lives here under app/api/cron/ — the only place (with
// app/api/admin/) the hard rule permits SUPABASE_SERVICE_ROLE_KEY.
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { KICKOFF } from "@/lib/constants";
import { multiplierFromPct } from "@/lib/multipliers";

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

  const past = Date.now() >= KICKOFF.getTime();

  // Once frozen at kickoff, never recompute (frozen values are what score).
  const { data: frozen } = await svc
    .from("pick_stats")
    .select("category")
    .eq("frozen", true)
    .limit(1);
  if (frozen && frozen.length > 0) {
    return NextResponse.json({ ok: true, status: "frozen", updated: 0 });
  }

  // Read every pick (service role bypasses RLS). Paginate past the 1000 cap.
  type Row = { category: string; team_id: string | null; player_id: number | null };
  const picks: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await svc
      .from("picks")
      .select("category,team_id,player_id")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const batch = (data ?? []) as Row[];
    picks.push(...batch);
    if (batch.length < 1000) break;
  }

  // Tally per category + entity.
  const totals = new Map<string, number>();
  const counts = new Map<string, Map<string, number>>();
  for (const p of picks) {
    const entity = p.team_id ?? (p.player_id != null ? String(p.player_id) : null);
    if (!entity) continue;
    totals.set(p.category, (totals.get(p.category) ?? 0) + 1);
    const m = counts.get(p.category) ?? new Map<string, number>();
    m.set(entity, (m.get(entity) ?? 0) + 1);
    counts.set(p.category, m);
  }

  const rows: {
    category: string;
    entity_id: string;
    pick_count: number;
    pct: number;
    multiplier: number;
    frozen: boolean;
  }[] = [];
  for (const [category, m] of counts) {
    const total = totals.get(category) ?? 0;
    for (const [entity_id, pick_count] of m) {
      const pct = total > 0 ? (pick_count / total) * 100 : 0;
      rows.push({
        category,
        entity_id,
        pick_count,
        pct: Math.round(pct * 10) / 10,
        multiplier: multiplierFromPct(pct),
        frozen: past,
      });
    }
  }

  if (rows.length) {
    const { error } = await svc
      .from("pick_stats")
      .upsert(rows, { onConflict: "category,entity_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ---- Round picks: per-round rarity, frozen once a round locks ----
  const roundsUpdated = await computeRoundStats(svc);

  return NextResponse.json({
    ok: true,
    status: past ? "frozen" : "recomputed",
    categories: counts.size,
    updated: rows.length,
    picksCounted: picks.length,
    roundStats: roundsUpdated,
  });
}

async function computeRoundStats(svc: SupabaseClient): Promise<number> {
  const { data: rounds } = await svc.from("rounds").select("id, locks_at");
  const lockAt = new Map(
    ((rounds ?? []) as { id: string; locks_at: string }[]).map((r) => [
      r.id,
      new Date(r.locks_at).getTime(),
    ])
  );
  // Rounds already frozen — don't recompute.
  const { data: frozenRows } = await svc
    .from("round_stats")
    .select("round_id")
    .eq("frozen", true);
  const frozenRounds = new Set(
    ((frozenRows ?? []) as { round_id: string }[]).map((r) => r.round_id)
  );

  const { data: rp } = await svc
    .from("round_picks")
    .select("round_id, category, team_id, player_id")
    .limit(20000);

  // tally per round+category
  const totals = new Map<string, number>();
  const counts = new Map<string, Map<string, number>>();
  for (const p of (rp ?? []) as {
    round_id: string;
    category: string;
    team_id: string | null;
    player_id: number | null;
  }[]) {
    if (frozenRounds.has(p.round_id)) continue;
    const entity = p.team_id ?? (p.player_id != null ? String(p.player_id) : null);
    if (!entity) continue;
    const key = `${p.round_id}:${p.category}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
    const m = counts.get(key) ?? new Map<string, number>();
    m.set(entity, (m.get(entity) ?? 0) + 1);
    counts.set(key, m);
  }

  const now = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const [key, m] of counts) {
    const [round_id, category] = key.split(":");
    const total = totals.get(key) ?? 0;
    const frozen = now >= (lockAt.get(round_id) ?? Infinity);
    for (const [entity_id, c] of m) {
      const pct = total ? (c / total) * 100 : 0;
      rows.push({
        round_id,
        category,
        entity_id,
        pick_count: c,
        pct: Math.round(pct * 10) / 10,
        multiplier: multiplierFromPct(pct),
        frozen,
      });
    }
  }
  if (rows.length) {
    await svc.from("round_stats").upsert(rows, { onConflict: "round_id,category,entity_id" });
  }
  return rows.length;
}
