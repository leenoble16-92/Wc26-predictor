"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile, type Profile } from "@/lib/profile";
import { signInWithEmail } from "@/lib/auth";
import type { Team } from "@/lib/types";

type Visual = "six" | "tiers" | "round" | "fixture" | "points" | "leagues";
const CARDS: { kicker: string; title: string; body: string; visual: Visual }[] = [
  {
    kicker: "THE GAME",
    title: "SIX CALLS.",
    body: "Six predictions for the World Cup: Winner, Runner-up, Golden Boot, Player of the Tournament, Dark Horse and Biggest Flop.",
    visual: "six",
  },
  {
    kicker: "RARITY = REWARD",
    title: "BE BOLD.",
    body: "The fewer people who back your call, the rarer the sticker — and the bigger its multiplier. Multipliers freeze at the first whistle.",
    visual: "tiers",
  },
  {
    kicker: "EVERY ROUND · NEW",
    title: "KEEP PLAYING.",
    body: "Each round, bonus picks open: Team of the Round and Top Scorer. Quick calls, extra points, a reason to come back every few days.",
    visual: "round",
  },
  {
    kicker: "LIVE",
    title: "FOLLOW IT ALL.",
    body: "Every fixture and result in the app, updating as matches finish. Watch your calls come good in real time.",
    visual: "fixture",
  },
  {
    kicker: "SCORING",
    title: "POINTS ADD UP.",
    body: "Base points × your frozen multiplier. Points build as results land — provisional now, final by 19 July — and you climb the table.",
    visual: "points",
  },
  {
    kicker: "LEAGUES",
    title: "BRING YOUR MATES.",
    body: "Private leagues by 6-char code, a global leaderboard, and a filter to see where you rank among fellow fans of your team.",
    visual: "leagues",
  },
];

function CardVisual({ visual }: { visual: Visual }) {
  if (visual === "six")
    return (
      <div className="ob-six">
        {["WINNER", "RUNNER-UP", "GOLDEN BOOT", "BEST PLAYER", "DARK HORSE", "FLOP"].map((s) => (
          <span key={s} className="ob-six-chip">{s}</span>
        ))}
      </div>
    );
  if (visual === "tiers")
    return (
      <div className="ob-tiers">
        <span className="stk-tier common">COMMON</span>
        <span className="stk-tier rare">RARE</span>
        <span className="stk-tier epic">EPIC</span>
        <span className="stk-tier legendary">LEGENDARY</span>
      </div>
    );
  if (visual === "round")
    return (
      <div className="ob-hero">
        <span className="ob-emoji">🎯</span>
        <div className="ob-hero-rows">
          <span>⚽ Team of the Round</span>
          <span>👟 Top Scorer of the Round</span>
        </div>
      </div>
    );
  if (visual === "fixture")
    return (
      <div className="ob-fixture">
        <div className="ob-fix-row"><span>🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</span><b>2</b></div>
        <div className="ob-fix-row dim"><span>🇫🇷 France</span><b>1</b></div>
      </div>
    );
  if (visual === "points")
    return (
      <div className="ob-points">
        <div className="ob-pt-row me"><span>1 ▲2 You</span><b>312</b></div>
        <div className="ob-pt-row"><span>2 Woody</span><b>280</b></div>
        <div className="ob-pt-row"><span>3 Dave</span><b>96</b></div>
      </div>
    );
  return (
    <div className="ob-hero">
      <span className="ob-emoji">🏆</span>
      <div className="ob-hero-rows">
        <span>Private leagues · code GAZ26</span>
        <span>🌍 Global · 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England fans</span>
      </div>
    </div>
  );
}

export default function Onboarding({
  onReady,
}: {
  onReady: (profile: Profile) => void;
}) {
  const [card, setCard] = useState(0);
  const [step, setStep] = useState<"intro" | "details">("intro");
  const touchX = useRef(0);

  const [name, setName] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeam, setFavTeam] = useState<Team | null>(null);
  const [teamQuery, setTeamQuery] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returning-player sign-in (magic link).
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinSent, setSigninSent] = useState(false);
  const sendSignin = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signinEmail.trim())) return;
    try {
      await signInWithEmail(signinEmail);
      setSigninSent(true);
    } catch {
      setSigninSent(true); // don't leak whether the email exists
    }
  };

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

        <main
          className="onboard"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -45 && !last) setCard((n) => n + 1);
            if (dx > 45 && card > 0) setCard((n) => n - 1);
          }}
        >
          <div className="intro-kicker">{c.kicker}</div>
          <h1 className="onboard-headline">
            <span className="headline-accent">{c.title}</span>
          </h1>
          <p className="onboard-intro">{c.body}</p>

          <div className="ob-visual" key={card}>
            <CardVisual visual={c.visual} />
          </div>

          <div className="intro-dots">
            {CARDS.map((_, i) => (
              <button
                key={i}
                aria-label={`Card ${i + 1}`}
                className={`dot ${i === card ? "on" : ""}`}
                onClick={() => setCard(i)}
              />
            ))}
          </div>

          <button
            className="primary"
            onClick={() => (last ? setStep("details") : setCard((n) => n + 1))}
          >
            {last ? "GET STARTED" : "NEXT"}
          </button>
          <p className="footnote">Swipe to explore · {card + 1} of {CARDS.length}</p>
        </main>
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

        {signinSent ? (
          <p className="footnote">📩 Check your inbox for a sign-in link.</p>
        ) : signinOpen ? (
          <div className="signin-inline">
            <input
              className="search"
              type="email"
              inputMode="email"
              placeholder="Email you saved with"
              value={signinEmail}
              onChange={(e) => setSigninEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendSignin()}
            />
            <button className="tab" onClick={sendSignin}>
              Send link
            </button>
          </div>
        ) : (
          <button className="save-skip" onClick={() => setSigninOpen(true)}>
            Already playing? Sign in →
          </button>
        )}
      </main>
    </div>
  );
}
