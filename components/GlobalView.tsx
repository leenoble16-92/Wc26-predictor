"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { globalLeaderboard, type GlobalBoard } from "@/lib/leaderboard";

export default function GlobalView({
  userId,
  favouriteTeam,
}: {
  userId: string;
  favouriteTeam: { id: string; name: string; flag: string } | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [board, setBoard] = useState<GlobalBoard | null>(null);
  const [scope, setScope] = useState<"world" | "team">("world");

  useEffect(() => {
    const team = scope === "team" && favouriteTeam ? favouriteTeam.id : null;
    setBoard(null);
    globalLeaderboard(supabase, userId, { favouriteTeam: team })
      .then(setBoard)
      .catch((e) => console.error(e));
  }, [supabase, userId, scope, favouriteTeam]);

  const fansLabel = favouriteTeam ? `${favouriteTeam.flag} ${favouriteTeam.name} fans` : "";

  return (
    <main className="main">
      <h1 className="headline small">
        GLOBAL
        <br />
        <span className="headline-accent">LEADERBOARD.</span>
      </h1>

      {favouriteTeam && (
        <div className="lb-filter">
          <button
            className={`chip ${scope === "world" ? "on" : ""}`}
            onClick={() => setScope("world")}
          >
            🌍 Everyone
          </button>
          <button
            className={`chip ${scope === "team" ? "on" : ""}`}
            onClick={() => setScope("team")}
          >
            {favouriteTeam.flag} {favouriteTeam.name} fans
          </button>
        </div>
      )}

      {board?.you ? (
        <div className="bold-strip">
          <span>
            {scope === "team" ? (
              <>
                YOU&apos;RE #<span style={{ color: "#4DF0C2" }}>{board.you.rank}</span> OF{" "}
                {fansLabel.toUpperCase()}
              </>
            ) : (
              <>
                YOU&apos;RE IN THE TOP{" "}
                <span style={{ color: "#4DF0C2" }}>{board.you.percentile}%</span>
              </>
            )}
          </span>
          <span className="bold-val">#{board.you.rank}</span>
        </div>
      ) : (
        <p className="note" style={{ marginBottom: 16 }}>
          Make and lock your six to climb the table. Live points start at kickoff.
        </p>
      )}

      <div className="table">
        <div className="t-row t-head lb">
          <span>#</span>
          <span>PLAYER</span>
          <span className="t-right">POINTS</span>
        </div>
        {(board?.top ?? []).map((s) => (
          <div className={`t-row lb ${s.isYou ? "me" : ""}`} key={s.user_id}>
            <span className="t-rank">{s.rank}</span>
            <span className="t-name">{s.isYou ? "You" : s.display_name}</span>
            <span className="t-right t-mult">
              {Math.round(s.points)}
              {s.provisional > 0 && <i className="prov" title="includes provisional" />}
            </span>
          </div>
        ))}
        {board && board.top.length === 0 && (
          <div className="empty">No scores yet — live points begin at kickoff.</div>
        )}
      </div>
      {board && board.total > 0 && (
        <p className="note">
          {board.total.toLocaleString()} {scope === "team" ? fansLabel : "players"} and
          counting.
        </p>
      )}
    </main>
  );
}
