// Demo data so the live leaderboard can be SEEN before kickoff. Creates ~8
// mock players, a "Demo League" (code DEMO26), a mid-tournament state, frozen
// pick_stats, and runs the scoring pass. Re-runnable (cleans its own demo
// data first). Real seeded teams/players + your own account are untouched
// except for pick_stats (recomputed) — run scripts/purge to fully reset.
//
// Service role under scripts/ (approved). Run:  npm run preview
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { multiplierFromPct } from "../lib/multipliers";
import { runScoringPass } from "../lib/scoringPass";

const MOCK = [
  { name: "Woody", fav: "ENG", bold: 4.2 },
  { name: "Dave", fav: "ENG", bold: 1.6 },
  { name: "Sam H", fav: "ENG", bold: 3.1 },
  { name: "Jonno", fav: "SCO", bold: 5.4 },
  { name: "Priya", fav: "BRA", bold: 2.7 },
  { name: "Gaz", fav: "FRA", bold: 3.8 },
  { name: "Mbappe2026", fav: "FRA", bold: 6.1 },
  { name: "Tom", fav: "ARG", bold: 2.2 },
];

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // --- Clean prior demo data ---
  await supabase.from("leagues").delete().eq("code", "DEMO26");
  for (let page = 1; ; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (!data.users.length) break;
    for (const u of data.users) {
      if (u.email?.endsWith("@calledit.local")) await supabase.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 200) break;
  }

  // --- Reference data ---
  const { data: teams } = await supabase.from("teams").select("id, fifa_rank");
  const { data: players } = await supabase
    .from("players")
    .select("id, team_id")
    .limit(400);
  const allTeams = teams ?? [];
  const darkPool = allTeams.filter((t) => t.fifa_rank > 12);
  const flopPool = allTeams.filter((t) => t.fifa_rank <= 16);
  const playerPool = players ?? [];

  // --- Create mock users + picks ---
  const now = new Date().toISOString();
  const created: { uid: string; picks: Record<string, string> }[] = [];

  for (let i = 0; i < MOCK.length; i++) {
    const m = MOCK[i];
    const { data: u, error } = await supabase.auth.admin.createUser({
      email: `demo${i}@calledit.local`,
      password: randomUUID(),
      email_confirm: true,
    });
    if (error || !u.user) throw error ?? new Error("createUser failed");
    const uid = u.user.id;

    const picks = {
      winner: rand(allTeams).id,
      runner_up: rand(allTeams).id,
      dark_horse: rand(darkPool).id,
      flop: rand(flopPool).id,
      golden_boot: String(rand(playerPool).id),
      pott: String(rand(playerPool).id),
    };

    await supabase.from("profiles").insert({
      id: uid,
      handle: `${slug(m.name)}-${i}`,
      display_name: m.name,
      favourite_team: m.fav,
      locked_at: now,
      boldness: m.bold,
    });

    const pickRows = [
      { user_id: uid, category: "winner", team_id: picks.winner, locked_at: now },
      { user_id: uid, category: "runner_up", team_id: picks.runner_up, locked_at: now },
      { user_id: uid, category: "dark_horse", team_id: picks.dark_horse, locked_at: now },
      { user_id: uid, category: "flop", team_id: picks.flop, locked_at: now },
      { user_id: uid, category: "golden_boot", player_id: Number(picks.golden_boot), locked_at: now },
      { user_id: uid, category: "pott", player_id: Number(picks.pott), locked_at: now },
    ];
    await supabase.from("picks").insert(pickRows);
    created.push({ uid, picks });
  }

  // --- Frozen pick_stats from ALL picks ---
  const { data: allPicks } = await supabase
    .from("picks")
    .select("category, team_id, player_id")
    .limit(5000);
  const totals = new Map<string, number>();
  const counts = new Map<string, Map<string, number>>();
  for (const p of allPicks ?? []) {
    const e = p.team_id ?? (p.player_id != null ? String(p.player_id) : null);
    if (!e) continue;
    totals.set(p.category, (totals.get(p.category) ?? 0) + 1);
    const mm = counts.get(p.category) ?? new Map();
    mm.set(e, (mm.get(e) ?? 0) + 1);
    counts.set(p.category, mm);
  }
  const statRows: Record<string, unknown>[] = [];
  for (const [category, mm] of counts) {
    const total = totals.get(category) ?? 0;
    for (const [entity_id, c] of mm) {
      const pct = total ? (c / total) * 100 : 0;
      statRows.push({
        category,
        entity_id,
        pick_count: c,
        pct: Math.round(pct * 10) / 10,
        multiplier: multiplierFromPct(pct),
        frozen: true,
      });
    }
  }
  await supabase.from("pick_stats").upsert(statRows, { onConflict: "category,entity_id" });

  // --- Mock mid-tournament state ---
  const mostPicked = (cat: string) => {
    const mm = counts.get(cat);
    if (!mm) return null;
    return [...mm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const aliveTeams = [...allTeams]
    .sort((a, b) => a.fifa_rank - b.fifa_rank)
    .slice(0, 8)
    .map((t) => t.id);

  const stateRows = [
    { key: "golden_boot_leader", value: mostPicked("golden_boot") },
    { key: "dark_horse_leader", value: mostPicked("dark_horse") },
    { key: "flop", value: mostPicked("flop") },
    { key: "alive_teams", value: aliveTeams },
    { key: "winner", value: null },
    { key: "runner_up", value: null },
    { key: "golden_boot", value: null },
    { key: "pott", value: null },
    { key: "dark_horse", value: null },
  ].map((r) => ({ ...r, updated_at: now }));
  await supabase.from("tournament_state").upsert(stateRows, { onConflict: "key" });

  // --- Round picks demo: give everyone GROUP_1 round picks + resolve it ---
  const { data: roundsData } = await supabase
    .from("rounds")
    .select("id")
    .order("sort", { ascending: true })
    .limit(1);
  const roundId = roundsData?.[0]?.id;
  if (roundId) {
    const rpRows: Record<string, unknown>[] = [];
    for (const c of created) {
      rpRows.push(
        { user_id: c.uid, round_id: roundId, category: "round_team", team_id: rand(allTeams).id, locked_at: now },
        { user_id: c.uid, round_id: roundId, category: "round_scorer", player_id: rand(playerPool).id, locked_at: now }
      );
    }
    await supabase.from("round_picks").upsert(rpRows, { onConflict: "user_id,round_id,category" });

    // frozen round_stats + resolve to the most-picked entities
    const rTot = new Map<string, number>();
    const rCnt = new Map<string, Map<string, number>>();
    for (const r of rpRows as { category: string; team_id?: string; player_id?: number }[]) {
      const e = r.team_id ?? String(r.player_id);
      const key = `${roundId}:${r.category}`;
      rTot.set(key, (rTot.get(key) ?? 0) + 1);
      const mm = rCnt.get(key) ?? new Map();
      mm.set(e, (mm.get(e) ?? 0) + 1);
      rCnt.set(key, mm);
    }
    const rStat: Record<string, unknown>[] = [];
    const topOf = (cat: string) =>
      [...(rCnt.get(`${roundId}:${cat}`)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    for (const [key, mm] of rCnt) {
      const [, category] = key.split(":");
      const total = rTot.get(key) ?? 0;
      for (const [entity_id, c] of mm) {
        const pct = total ? (c / total) * 100 : 0;
        rStat.push({ round_id: roundId, category, entity_id, pick_count: c, pct: Math.round(pct * 10) / 10, multiplier: multiplierFromPct(pct), frozen: true });
      }
    }
    await supabase.from("round_stats").upsert(rStat, { onConflict: "round_id,category,entity_id" });
    await supabase
      .from("rounds")
      .update({ status: "resolved", best_team: topOf("round_team"), top_scorer: Number(topOf("round_scorer")) || null })
      .eq("id", roundId);
  }

  // --- Demo league ---
  const { data: league } = await supabase
    .from("leagues")
    .insert({ name: "Demo League", code: "DEMO26", owner_id: created[0].uid })
    .select("*")
    .single();
  await supabase
    .from("league_members")
    .insert(created.map((c) => ({ league_id: league!.id, user_id: c.uid })));

  // --- Score everyone ---
  const { scored } = await runScoringPass(supabase);

  // --- Report ---
  const { data: board } = await supabase
    .from("scores")
    .select("points, breakdown, profiles(display_name)")
    .order("points", { ascending: false })
    .limit(10);
  console.log("\n========== DEMO LEADERBOARD ==========");
  (board ?? []).forEach((r, i) => {
    const b = r.breakdown as { final: number; provisional: number };
    const name = (r.profiles as { display_name?: string } | null)?.display_name ?? "?";
    console.log(
      `${String(i + 1).padStart(2)}. ${name.padEnd(12)} ${Math.round(r.points)} pts  (final ${b.final} + prov ${b.provisional})`
    );
  });
  console.log(`\nScored ${scored} players. League code: DEMO26`);
  console.log("======================================\n");
}

main().catch((e) => {
  console.error("Preview failed:", e);
  process.exit(1);
});
