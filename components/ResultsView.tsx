"use client";

import { useEffect, useState } from "react";

interface ResultItem {
  id: number;
  stage: string;
  status: string;
  utcDate: string;
  home: { name: string; tla: string | null };
  away: { name: string; tla: string | null };
  score: { home: number; away: number } | null;
}

const fmtStage = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ResultsView({ teamFlags }: { teamFlags: Map<string, string> }) {
  const [matches, setMatches] = useState<ResultItem[] | null>(null);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => setMatches([]));
  }, []);

  const flag = (tla: string | null) => (tla ? teamFlags.get(tla) ?? "🏳️" : "🏳️");

  const now = Date.now();
  const finished = (matches ?? []).filter((m) => m.score).slice(-15).reverse();
  const upcoming = (matches ?? [])
    .filter((m) => !m.score && +new Date(m.utcDate) >= now)
    .slice(0, 15);

  const Card = ({ m }: { m: ResultItem }) => {
    const homeWon = m.score && m.score.home > m.score.away;
    const awayWon = m.score && m.score.away > m.score.home;
    return (
      <div className="fix-card">
        <div className="fix-meta">
          <span>{fmtDate(m.utcDate)}</span>
          {m.score ? <span className="fix-ft">FT</span> : <span className="fix-stage">{fmtStage(m.stage)}</span>}
        </div>
        <div className={`fix-team ${homeWon ? "won" : ""}`}>
          <span className="fix-flag">{flag(m.home.tla)}</span>
          <span className="fix-name">{m.home.name}</span>
          {m.score && <span className="fix-score">{m.score.home}</span>}
        </div>
        <div className={`fix-team ${awayWon ? "won" : ""}`}>
          <span className="fix-flag">{flag(m.away.tla)}</span>
          <span className="fix-name">{m.away.name}</span>
          {m.score && <span className="fix-score">{m.score.away}</span>}
        </div>
      </div>
    );
  };

  return (
    <main className="main">
      <h1 className="headline small">
        RESULTS &amp;<br />
        <span className="headline-accent">FIXTURES.</span>
      </h1>

      {matches === null ? (
        <p className="note">Loading fixtures…</p>
      ) : (
        <>
          {finished.length > 0 && (
            <>
              <div className="results-head">LATEST RESULTS</div>
              <div className="fix-list">
                {finished.map((m) => (
                  <Card key={m.id} m={m} />
                ))}
              </div>
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <div className="results-head">UP NEXT · {fmtStage(upcoming[0].stage)}</div>
              <div className="fix-list">
                {upcoming.map((m) => (
                  <Card key={m.id} m={m} />
                ))}
              </div>
            </>
          )}
          {finished.length === 0 && upcoming.length === 0 && (
            <p className="note">No fixtures to show yet — the schedule lands as the World Cup nears.</p>
          )}
        </>
      )}
    </main>
  );
}
