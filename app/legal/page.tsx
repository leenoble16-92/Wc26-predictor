import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms, Privacy & Disclaimer — CALLED IT.",
  description: "Terms of use, privacy policy, cookies and disclaimer for CALLED IT.",
};

// NOTE FOR LEE: these are working templates, not legal advice. Fill the
// [PLACEHOLDERS] and have a solicitor review before public launch — especially
// the privacy/data sections (UK GDPR) and the no-affiliation disclaimer.
const BUSINESS = "[BUSINESS / YOUR NAME]";
const CONTACT = "leenoble16@gmail.com";
const UPDATED = "June 2026";

export default function LegalPage() {
  return (
    <div className="app">
      <header className="hdr">
        <div className="brand-wrap">
          <div className="brand">
            CALLED IT<span className="brand-mark">.</span>
          </div>
        </div>
        <Link href="/" className="skip">
          ← BACK
        </Link>
      </header>

      <main className="main legal">
        <h1 className="headline small">
          THE<br />
          <span className="headline-accent">SMALL PRINT.</span>
        </h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <nav className="legal-nav">
          <a href="#disclaimer">Disclaimer</a>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
          <a href="#cookies">Cookies</a>
        </nav>

        <h2 id="disclaimer" className="how-h">DISCLAIMER</h2>
        <p className="how-p">
          CALLED IT. is an independent, free-to-play prediction game made for
          entertainment. It is <strong>not affiliated with, endorsed by, or
          associated with</strong> FIFA, UEFA, any national football association,
          competition organiser, club, team or player.
        </p>
        <p className="how-p">
          Team names, player names, fixtures and results are factual data
          provided by third-party feeds (football-data.org) and are used for
          identification and informational purposes only. Flags and squad
          information may contain errors or be out of date. No trademark or image
          rights are claimed.
        </p>
        <p className="how-p">
          <strong>This is not gambling.</strong> There is no entry fee, no stake,
          no cash prize and no betting of any kind — just bragging rights. You
          must be 16 or over to create an account.
        </p>

        <h2 id="terms" className="how-h">TERMS OF USE</h2>
        <p className="how-p">
          By using CALLED IT. you agree to these terms. The game is provided
          &ldquo;as is&rdquo;, without warranties, and may change or be
          unavailable at any time. {BUSINESS} is not liable for any loss arising
          from use of the game, including lost picks, scores or downtime.
        </p>
        <p className="how-p">
          Don&apos;t abuse the service: no scraping, automated entry, offensive
          display names, or attempts to interfere with scoring or other players.
          We may remove accounts or content that break these rules. Scoring and
          results are determined by our process and the data feeds, and our
          decisions on them are final.
        </p>

        <h2 id="privacy" className="how-h">PRIVACY</h2>
        <p className="how-p">
          We collect the minimum needed to run the game:
        </p>
        <ul className="legal-list">
          <li>A <strong>display name</strong> you choose (shown to other players).</li>
          <li>Your <strong>picks, leagues and scores</strong>.</li>
          <li>An optional <strong>favourite team</strong>.</li>
          <li>
            An optional <strong>email address</strong>, only if you choose to save
            your account — used solely to sign you in.
          </li>
        </ul>
        <p className="how-p">
          We do <strong>not</strong> sell your data or use third-party advertising
          trackers. Authentication and data storage are handled by{" "}
          <strong>Supabase</strong> (our processor). Hosting is by{" "}
          <strong>Vercel</strong>. You can request deletion of your account and
          data any time by emailing{" "}
          <a href={`mailto:${CONTACT}`} className="legal-link-inline">{CONTACT}</a>.
          Under UK GDPR you have rights to access, correct and erase your data.
        </p>

        <h2 id="cookies" className="how-h">COOKIES</h2>
        <p className="how-p">
          We use a small number of <strong>essential cookies</strong> only — to
          keep you signed in to your (anonymous or saved) account. These are
          required for the game to work and carry no advertising or cross-site
          tracking. We don&apos;t use analytics or marketing cookies. If that ever
          changes, we&apos;ll ask for your consent first.
        </p>
        <p className="how-p">
          Web fonts are loaded from Google Fonts, which may receive your IP
          address as part of serving the font files.
        </p>

        <Link
          href="/"
          className="primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 14 }}
        >
          BACK TO THE GAME →
        </Link>
      </main>
      <footer className="ftr">CALLED IT. · World Cup 2026</footer>
    </div>
  );
}
