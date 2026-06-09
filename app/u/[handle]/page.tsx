// Public profile + the share growth loop. The <meta og:image> is the share
// card, so a WhatsApp/X unfurl shows the teaser. The page itself shows the
// six stickers once they're readable (owner, or everyone post-kickoff);
// otherwise an intrigue teaser with a big "Make your six" CTA above the fold.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, KICKOFF } from "@/lib/constants";
import { tierFor } from "@/lib/multipliers";

const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1];

async function getProfile(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, handle, boldness, locked_at")
    .eq("handle", handle)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) return { title: "CALLED IT." };

  const title = `${profile.display_name} — CALLED IT.`;
  const description = profile.locked_at
    ? `Boldness ×${(profile.boldness ?? 0).toFixed(1)}. Six calls locked. Make yours before kickoff.`
    : "Six calls, one summer. Make yours before the first whistle.";
  const image = `/api/og/card/${profile.id}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

interface DisplayPick {
  short: string;
  flag: string;
  name: string;
  multiplier: number | null;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const profile = await getProfile(handle);
  if (!profile) notFound();

  const revealed = Date.now() >= KICKOFF.getTime();

  // Picks are RLS-gated: visible to the owner, or to anyone post-kickoff.
  const { data: pickRows } = await supabase
    .from("picks")
    .select("category, team_id, player_id")
    .eq("user_id", profile.id);

  const picksVisible = (pickRows?.length ?? 0) > 0;
  const display = new Map<string, DisplayPick>();

  if (picksVisible) {
    const teamIds = pickRows!.map((p) => p.team_id).filter(Boolean) as string[];
    const playerIds = pickRows!.map((p) => p.player_id).filter((x) => x != null) as number[];

    const [{ data: teams }, { data: players }, { data: stats }] = await Promise.all([
      supabase.from("teams").select("id, name, flag").in("id", teamIds.length ? teamIds : [""]),
      supabase.from("players").select("id, name, team_id").in("id", playerIds.length ? playerIds : [-1]),
      supabase
        .from("pick_stats")
        .select("category, entity_id, multiplier")
        .in("category", pickRows!.map((p) => p.category)),
    ]);

    const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
    const playerById = new Map((players ?? []).map((p) => [p.id, p]));
    const multByKey = new Map(
      (stats ?? []).map((s) => [`${s.category}:${s.entity_id}`, s.multiplier as number])
    );

    for (const p of pickRows!) {
      const cat = CATEGORIES.find((c) => c.id === p.category);
      if (!cat) continue;
      let flag = "🏳️";
      let name = "—";
      let entityId = "";
      if (p.team_id) {
        const t = teamById.get(p.team_id);
        flag = t?.flag ?? "🏳️";
        name = t?.name ?? p.team_id;
        entityId = p.team_id;
      } else if (p.player_id != null) {
        const pl = playerById.get(p.player_id);
        name = pl?.name ?? "—";
        flag = pl?.team_id ? teamById.get(pl.team_id)?.flag ?? "🏳️" : "🏳️";
        entityId = String(p.player_id);
      }
      display.set(cat.id, {
        short: cat.short,
        flag,
        name,
        multiplier: multByKey.get(`${p.category}:${entityId}`) ?? null,
      });
    }
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
      </header>

      <main className="main">
        <h1 className="headline">
          {profile.display_name.toUpperCase()}
          <br />
          <span className="headline-accent">
            {profile.locked_at ? "CALLED IT." : "IS CALLING IT."}
          </span>
        </h1>

        {profile.boldness != null && (
          <div className="bold-strip">
            <span>BOLDNESS RATING</span>
            <span className="bold-val">×{profile.boldness.toFixed(1)}</span>
          </div>
        )}

        {picksVisible ? (
          <div className="grid">
            {CATEGORIES.map((c, i) => {
              const d = display.get(c.id);
              if (!d) return null;
              const cls = d.multiplier != null ? tierFor(d.multiplier).cls : "common";
              return (
                <div
                  key={c.id}
                  className={`sticker ${cls}`}
                  style={{ ["--rot" as string]: `${ROTATIONS[i]}deg` }}
                >
                  <span className="stk-cat">{d.short}</span>
                  <span className="stk-flag">{d.flag}</span>
                  <span className="stk-name">{d.name}</span>
                  {d.multiplier != null && (
                    <span className={`stk-tier ${cls}`}>
                      {tierFor(d.multiplier).label} ×{d.multiplier}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="intro">
            {revealed
              ? "No picks to show."
              : `${profile.display_name} has locked six calls. Everyone's picks stay hidden until the first whistle — then it all reveals.`}
          </p>
        )}

        <Link href="/" className="primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          MAKE YOUR SIX →
        </Link>
      </main>
      <footer className="ftr">CALLED IT. · World Cup 2026</footer>
    </div>
  );
}
