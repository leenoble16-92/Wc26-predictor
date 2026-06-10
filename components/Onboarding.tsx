"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile, type Profile } from "@/lib/profile";
import type { Team } from "@/lib/types";

const CARDS = [
  {
    kicker: "THE GAME",
    title: "SIX CALLS.",
    body: "Make six predictions for the World Cup: Winner, Runner-up, Golden Boot, Player of the Tournament, Dark Horse and Biggest Flop.",
  },
  {
    kicker: "RARITY = REWARD",
    title: "BE BOLD.",
    body: "The fewer people who back your call, the rarer the sticker — Common, Rare, Epic, Legendary. Rarer picks carry a bigger multiplier. Your multipliers lock at the first whistle.",
  },
  {
    kicker: "SCORING",
    title: "POINTS ADD UP.",
    body: "Each call scores its base points × your locked multiplier. Points build through the tournament as results land, and the final settles the big ones.",
  },
  {
    kicker: "LEAGUES",
    title: "BRING YOUR MATES.",
    body: "Start a private league or join one with a 6-character code. Everyone's picks stay hidden until kickoff — then it's a live table. (Leagues land this week.)",
  },
];

export default function Onboarding({
  onReady,
}: {
  onReady: (profile: Profile) => void;
}) {
  const [card, setCard] = useState(0);
  const [step, setStep] = useState<"intro" | "details">("intro");

  const [name, setName] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeam, setFavTeam] = useState<Team | null>(null);
  const [teamQuery, setTeamQuery] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Teams are readable by the anon role, so we can load them before sign-in.
  useEffect(() => {
    createClient()
      .from("teams")
      .select("id,name,flag,fifa_rank")
      .order("fifa_rank", { ascending: true })
      .then(({ data }) => setTeams((data as Team[]) ?? []));
  }, []);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const profile = await ensureProfile(createClient(), name, favTeam?.id ?? null);
      onReady(profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        /anonymous/i.test(msg)
          ? "Sign-ins aren't switched on yet — try again in a moment."
          : msg
      );
      setBusy(false);
    }
  };

  const canSubmit = name.trim().length >= 2 && !busy;
  const teamMatches = teamQuery
    ? teams.filter((t) => t.name.toLowerCase().includes(teamQuery.toLowerCase()))
    : [];

  // ---------- Intro carousel ----------
  if (step === "intro") {
    const c = CARDS[card];
    const last = card === CARDS.length - 1;
    return (
      <div className="app">
        <header className="hdr">
          <div className="brand">
            CALLED IT<span className="brand-mark">.</span>
          </div>
          <button className="skip" onClick={() => setStep("details")}>
            SKIP
          </button>
        </header>

        <main className="onboard">
          <div className="intro-kicker">{c.kicker}</div>
          <h1 className="onboard-headline">
            <span className="headline-accent">{c.title}</span>
          </h1>
          <p className="onboard-intro">{c.body}</p>

          <div className="intro-dots">
            {CARDS.map((_, i) => (
              <span key={i} className={`dot ${i === card ? "on" : ""}`} />
            ))}
          </div>

          <button
            className="primary"
            onClick={() => (last ? setStep("details") : setCard((n) => n + 1))}
          >
            {last ? "GET STARTED" : "NEXT"}
          </button>
        </main>
        <footer className="ftr">
          Real 48-team squads · picks lock at the first whistle
        </footer>
      </div>
    );
  }

  // ---------- Details: name + favourite team ----------
  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
      </header>

      <main className="onboard">
        <div className="intro-kicker">WORLD CUP 2026</div>
        <h1 className="onboard-headline">
          SIX CALLS.<br />
          <span className="headline-accent">ONE SUMMER.</span>
        </h1>

        <label className="onboard-label" htmlFor="display-name">
          WHAT SHOULD WE CALL YOU?
        </label>
        <input
          id="display-name"
          className="search"
          placeholder="Your name or handle"
          value={name}
          maxLength={40}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />

        <label className="onboard-label" style={{ marginTop: 16 }}>
          YOUR TEAM <span className="opt">(OPTIONAL)</span>
        </label>
        {favTeam ? (
          <button className="fav-chosen" onClick={() => setFavTeam(null)}>
            <span className="pick-flag">{favTeam.flag}</span>
            <span className="fav-name">{favTeam.name}</span>
            <span className="fav-change">CHANGE</span>
          </button>
        ) : (
          <>
            <input
              className="search"
              placeholder="Search your country"
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
            />
            {teamMatches.length > 0 && (
              <div className="pick-list fav-list">
                {teamMatches.map((t) => (
                  <button
                    key={t.id}
                    className="pick-row"
                    onClick={() => {
                      setFavTeam(t);
                      setTeamQuery("");
                    }}
                  >
                    <span className="pick-flag">{t.flag}</span>
                    <span className="pick-meta">
                      <span className="pick-name">{t.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <button
          className={`primary ${canSubmit ? "" : "disabled"}`}
          disabled={!canSubmit}
          onClick={submit}
          style={{ marginTop: 18 }}
        >
          {busy ? "STARTING…" : "START PICKING"}
        </button>

        {error && <p className="onboard-error">{error}</p>}
        <p className="footnote">
          One tap and you&apos;re in. You can add an email later to save your game.
          <br />
          By playing you agree to our{" "}
          <Link href="/legal#terms" className="legal-link-inline">
            Terms
          </Link>{" "}
          &amp;{" "}
          <Link href="/legal#privacy" className="legal-link-inline">
            Privacy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
