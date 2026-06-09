"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, type Profile } from "@/lib/profile";
import { joinLeague, findLeagueByCode } from "@/lib/leagues";
import Onboarding from "@/components/Onboarding";

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<"loading" | "onboarding" | "joining" | "error">(
    "loading"
  );
  const [leagueName, setLeagueName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Resolve session + preview the league name.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const league = await findLeagueByCode(supabase, code);
        if (league) setLeagueName(league.name);
      } catch {
        /* league lookup is best-effort for the heading */
      }
      const p = await getMyProfile(supabase).catch(() => null);
      if (p) {
        setProfile(p);
        await doJoin(p);
      } else {
        setPhase("onboarding");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const doJoin = async (_p: Profile) => {
    setPhase("joining");
    try {
      await joinLeague(createClient(), _p.id, code);
      // Land in the app on the League tab.
      router.replace("/?tab=league");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that league.");
      setPhase("error");
    }
  };

  if (phase === "onboarding" && !profile) {
    return (
      <Onboarding
        onReady={(p) => {
          setProfile(p);
          void doJoin(p);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
      </header>
      <main className="onboard">
        <div className="intro-kicker">LEAGUE INVITE</div>
        <h1 className="onboard-headline">
          {leagueName ? (
            <>
              JOINING<br />
              <span className="headline-accent">{leagueName.toUpperCase()}</span>
            </>
          ) : (
            <span className="headline-accent">JOINING LEAGUE…</span>
          )}
        </h1>
        {phase === "error" ? (
          <>
            <p className="onboard-error">{error}</p>
            <button className="primary" onClick={() => router.replace("/")}>
              GO TO THE GAME
            </button>
          </>
        ) : (
          <p className="onboard-intro">Getting you in… make your six before kickoff.</p>
        )}
      </main>
    </div>
  );
}
