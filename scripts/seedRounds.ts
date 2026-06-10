// Seed the rounds table from the real WC fixtures: group stage split by
// matchday, each knockout stage its own round. locks_at = first kickoff of the
// round, ends_at = last kickoff. Re-runnable (upsert). The cron later flips
// status open->locked->resolved and writes results.
//
// Service role under scripts/ (approved). Run:  npm run seed:rounds
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { footballDataProvider } from "../lib/results/footballData";

const STAGE_NAME: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "The Final",
  FINAL: "The Final",
};

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const matches = await footballDataProvider.getMatches();

  // Bucket matches into rounds.
  const buckets = new Map<string, { name: string; stage: string; matchday: number | null; dates: number[] }>();
  for (const m of matches) {
    const raw = m as unknown as { matchday: number | null; stage: string; utcDate: string };
    let id: string;
    let name: string;
    let matchday: number | null = null;
    if (raw.stage === "GROUP_STAGE") {
      matchday = raw.matchday ?? 1;
      id = `GROUP_${matchday}`;
      name = `Group Stage · Matchday ${matchday}`;
    } else {
      // Merge third-place into the FINAL round.
      id = raw.stage === "THIRD_PLACE" ? "FINAL" : raw.stage;
      name = STAGE_NAME[raw.stage] ?? raw.stage;
    }
    const t = new Date(raw.utcDate).getTime();
    const b = buckets.get(id) ?? { name, stage: raw.stage, matchday, dates: [] };
    b.dates.push(t);
    buckets.set(id, b);
  }

  const order = ["GROUP_1", "GROUP_2", "GROUP_3", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
  const rows = [...buckets.entries()]
    .map(([id, b]) => {
      const min = Math.min(...b.dates);
      const max = Math.max(...b.dates);
      return {
        id,
        name: b.name,
        stage: b.stage,
        matchday: b.matchday,
        locks_at: new Date(min).toISOString(),
        ends_at: new Date(max + 3 * 3600 * 1000).toISOString(), // +3h buffer
        status: "upcoming",
        sort: order.indexOf(id) >= 0 ? order.indexOf(id) : 99,
      };
    })
    .sort((a, b) => a.sort - b.sort);

  const { error } = await supabase.from("rounds").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  console.log("\n========== ROUNDS SEEDED ==========");
  for (const r of rows) {
    console.log(`${String(r.sort).padStart(2)}  ${r.id.padEnd(16)} locks ${r.locks_at.slice(0, 16)}  ${r.name}`);
  }
  console.log(`\n${rows.length} rounds. Active now: ${rows.find((r) => Date.now() < new Date(r.locks_at).getTime())?.id ?? "none"}`);
  console.log("===================================\n");
}

main().catch((e) => {
  console.error("Seed rounds failed:", e);
  process.exit(1);
});
