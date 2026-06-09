import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works — CALLED IT.",
  description: "How points, multipliers and rarity work in CALLED IT.",
};

const CALLS = [
  ["Winner", "Lifts the trophy", "100"],
  ["Runner-up", "Loses the final", "80"],
  ["Golden Boot", "Top scorer", "80"],
  ["Player of the Tournament", "Official best player", "80"],
  ["Dark Horse", "Ranked outside the top 12, goes furthest", "60"],
  ["Biggest Flop", "Top-16 team, earliest exit", "60"],
];

const TIERS = [
  ["Common", "under ×2", "common"],
  ["Rare", "×2 – ×3.9", "rare"],
  ["Epic", "×4 – ×6.9", "epic"],
  ["Legendary", "×7 and up", "legendary"],
];

export default function HowItWorks() {
  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
        <Link href="/" className="skip">
          ← BACK
        </Link>
      </header>

      <main className="main">
        <h1 className="headline">
          HOW IT
          <br />
          <span className="headline-accent">WORKS.</span>
        </h1>

        <h2 className="how-h">1 · MAKE SIX CALLS</h2>
        <p className="how-p">
          Six predictions for the World Cup. Each one is worth base points —
          before your multiplier:
        </p>
        <div className="how-table">
          {CALLS.map(([label, hint, base]) => (
            <div className="how-row" key={label}>
              <span className="how-cat">{label}</span>
              <span className="how-hint">{hint}</span>
              <span className="how-base">{base}</span>
            </div>
          ))}
        </div>

        <h2 className="how-h">2 · RARITY SETS YOUR MULTIPLIER</h2>
        <p className="how-p">
          The fewer people who make the same call, the rarer the sticker — and
          the bigger its multiplier. We work it out from the real pick
          distribution across everyone playing:
        </p>
        <div className="bold-strip" style={{ fontFamily: "monospace", letterSpacing: 0 }}>
          <span>MULTIPLIER</span>
          <span className="bold-val" style={{ fontSize: 15 }}>
            30 ÷ pick% + 0.9
          </span>
        </div>
        <div className="how-tiers">
          {TIERS.map(([label, range, cls]) => (
            <div className={`how-tier ${cls}`} key={label}>
              <span className="how-tier-name">{label}</span>
              <span className="how-tier-range">{range}</span>
            </div>
          ))}
        </div>
        <p className="how-p">
          Multipliers move as people pick — then <strong>freeze at kickoff</strong>.
          The multiplier you lock with is provisional; the frozen one is what
          scores. (No gaming it by locking early.)
        </p>

        <h2 className="how-h">3 · POINTS = BASE × FROZEN MULTIPLIER</h2>
        <p className="how-p">
          Call the Winner at ×4.2? That&apos;s 100 × 4.2 = <strong>420 points</strong>.
          Bold calls that come off are worth far more than the obvious ones.
        </p>

        <h2 className="how-h">4 · PROVISIONAL vs FINAL</h2>
        <p className="how-p">
          Points build through the tournament as results land. A{" "}
          <i className="prov" /> marks <strong>provisional</strong> points — your
          Golden Boot leader, a dark horse still running — which can still
          change. Winner and Runner-up only pay out at the final. Everything
          settles by 19 July.
        </p>

        <h2 className="how-h">5 · LEAGUES & LEADERBOARDS</h2>
        <p className="how-p">
          Before kickoff, league mates see only your <strong>boldness</strong>{" "}
          (your average multiplier) and lock status — never your picks. At the
          first whistle picks reveal and the table scores live with every match.
          Climb the <strong>global leaderboard</strong>, see your percentile, and
          filter it down to fans of your team.
        </p>

        <Link
          href="/"
          className="primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}
        >
          MAKE YOUR SIX →
        </Link>
      </main>
      <footer className="ftr">CALLED IT. · World Cup 2026</footer>
    </div>
  );
}
