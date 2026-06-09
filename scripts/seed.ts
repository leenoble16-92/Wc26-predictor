// CALLED IT. — squad seed (SPEC §8 / INTEGRATIONS §2).
//
// Pulls the 48 teams + squads from football-data.org (one bulk call — the
// /teams endpoint embeds squads, so no per-team rate-limit dance) and writes
// them to Supabase. Re-runnable (upserts).
//
// Auth: uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS on the read-only
// reference tables. This file lives under scripts/ (NOT app/ or lib/), is
// never bundled or deployed, and is excluded from the §6 service-role grep.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { footballDataProvider } from "../lib/results/footballData";
import { ProviderPlanError } from "../lib/results/provider";
import { TEAM_META } from "./teamMeta";

const EXPECTED_SQUAD_MIN = 20; // flag anything smaller as suspicious
const DEFAULT_RANK = 99;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase env vars missing.");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Fetching teams + squads from football-data.org…");
  let providerTeams;
  try {
    providerTeams = await footballDataProvider.getTeamsWithSquads();
  } catch (e) {
    if (e instanceof ProviderPlanError) {
      console.error(
        "\n🛑 STOP: football-data refused the WC competition on plan grounds.\n" +
          e.message +
          "\nDo not build on this provider — switch to the fallback before seeding."
      );
      process.exit(2);
    }
    throw e;
  }

  // --- Build team rows (curated flag + rank) ---
  const missingMeta: string[] = [];
  const teamRows = providerTeams.map((t) => {
    const meta = TEAM_META[t.tla];
    if (!meta) missingMeta.push(`${t.tla} (${t.name})`);
    return {
      id: t.tla,
      name: t.name,
      flag: meta?.flag ?? "🏳️",
      fifa_rank: meta?.fifaRank ?? DEFAULT_RANK,
    };
  });

  // --- Build player rows (exclude coaches; club not available from feed) ---
  const playerRows: {
    id: number;
    name: string;
    team_id: string;
    club: null;
    position: string;
  }[] = [];
  const smallSquads: string[] = [];
  for (const t of providerTeams) {
    const players = t.squad.filter((p) => p.position !== "Coach");
    if (players.length < EXPECTED_SQUAD_MIN) {
      smallSquads.push(`${t.tla} (${players.length})`);
    }
    for (const p of players) {
      playerRows.push({
        id: p.id,
        name: p.name,
        team_id: t.tla,
        club: null,
        position: p.position,
      });
    }
  }

  // --- Write: teams first (FK), then players ---
  console.log(`Upserting ${teamRows.length} teams…`);
  const teamRes = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
  if (teamRes.error) throw teamRes.error;

  console.log(`Upserting ${playerRows.length} players…`);
  // Chunk to stay well under any payload limits.
  const CHUNK = 500;
  for (let i = 0; i < playerRows.length; i += CHUNK) {
    const slice = playerRows.slice(i, i + CHUNK);
    const res = await supabase.from("players").upsert(slice, { onConflict: "id" });
    if (res.error) throw res.error;
  }

  // --- Verify counts from the DB ---
  const { count: teamCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });
  const { count: playerCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true });

  // --- Report ---
  console.log("\n========== SEED REPORT ==========");
  console.log(`Teams seeded:   ${teamCount}`);
  console.log(`Players seeded: ${playerCount}`);
  console.log(`Players excluded as coaches/staff: counted out before insert.`);

  if (smallSquads.length) {
    console.log(`\n⚠️  Teams with suspiciously small squads (<${EXPECTED_SQUAD_MIN}):`);
    console.log("   " + smallSquads.join(", "));
  } else {
    console.log(`\n✓ No teams with squads smaller than ${EXPECTED_SQUAD_MIN}.`);
  }

  if (missingMeta.length) {
    console.log(`\n⚠️  Teams missing curated flag/rank (defaulted 🏳️ / ${DEFAULT_RANK}):`);
    console.log("   " + missingMeta.join(", "));
  } else {
    console.log("✓ Every team matched a curated flag + FIFA rank.");
  }

  console.log("\nNOTE: club is null for all players — football-data's free WC");
  console.log("squad feed omits it. Decide on a club source before launch.");
  console.log("NOTE: FIFA ranks are APPROXIMATE — verify vs official list.");
  console.log("=================================\n");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
