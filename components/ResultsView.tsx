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

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  const finished = (matches ?? []).filter((m) => m.score).slice(-12).reverse();
  const upcoming = (matches ?? [])
    .filter((m) => !m.score && +new Date(m.utcDate) >= now)
    .slice(0, 12);

  const Row = ({ m, live }: { m: ResultItem; live: boolean }) => (
    <div className="match-row">
      <div className="match-side">
        <span className="match-flag">{flag(m.home.tla)}</span>
        <span className="match-team">{m.home.name}</span>
      </div>
      <div className="match-mid">
        {m.score ? (
          <span className="match-score">
            {m.score.home}–{m.score.away}
          </span>
        ) : (
          <span className="match-time">{fmtDate(m.utcDate)}</span>
        )}
      </div>
      <div className="match-side right">
        <span className="match-team">{m.away.name}</span>
        <span className="match-flag">{flag(m.away.tla)}</span>
      </div>
    </div>
  );

  return (
    <main className="main">
      <h1 className="headline small">
        RECENT
        <br />
        <span className="headline-accent">RESULTS.</span>
      </h1>

      {matches === null ? (
        <p className="note">Loading fixtures…</p>
      ) : (
        <>
          {finished.length > 0 && (
            <>
              <div className="results-head">LATEST RESULTS</div>
              <div className="match-list">
                {finished.map((m) => (
                  <Row key={m.id} m={m} live={false} />
                ))}
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div className="results-head">UP NEXT · {fmtStage(upcoming[0].stage)}</div>
              <div className="match-list">
                {upcoming.map((m) => (
                  <Row key={m.id} m={m} live />
                ))}
              </div>
            </>
          )}

          {finished.length === 0 && upcoming.length === 0 && (
            <p className="note">
              No fixtures to show yet — the schedule lands as the World Cup nears.
            </p>
          )}
        </>
      )}
    </main>
  );
}
