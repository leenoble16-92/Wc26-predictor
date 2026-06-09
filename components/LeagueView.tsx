"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createLeague,
  joinLeague,
  myLeagues,
  type League,
} from "@/lib/leagues";
import { leagueStandings, type Standing } from "@/lib/leaderboard";

export default function LeagueView({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [active, setActive] = useState<League | null>(null);
  const [members, setMembers] = useState<Standing[]>([]);

  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const refreshLeagues = useCallback(
    async (selectId?: string) => {
      const ls = await myLeagues(supabase, userId);
      setLeagues(ls);
      setActive((cur) => ls.find((l) => l.id === (selectId ?? cur?.id)) ?? ls[0] ?? null);
    },
    [supabase, userId]
  );

  useEffect(() => {
    refreshLeagues().catch((e) => console.error(e));
  }, [refreshLeagues]);

  useEffect(() => {
    if (!active) {
      setMembers([]);
      return;
    }
    leagueStandings(supabase, active.id, userId)
      .then(setMembers)
      .catch((e) => console.error(e));
  }, [active, supabase, userId]);

  const submitCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const l = await createLeague(supabase, userId, name);
      setName("");
      setMode("none");
      await refreshLeagues(l.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create league.");
    } finally {
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    setError(null);
    setBusy(true);
    try {
      const l = await joinLeague(supabase, userId, code);
      setCode("");
      setMode("none");
      await refreshLeagues(l.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join league.");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Share an invite: a /join/<code> deep link (auto-joins + onboards) plus the
  // league invite card image, via the native share sheet.
  const shareLeague = async () => {
    if (!active || shareBusy) return;
    setShareBusy(true);
    const joinUrl = `${window.location.origin}/join/${active.code}`;
    const lockedCount = members.filter((m) => m.locked).length;
    const caption =
      `Join my CALLED IT. league "${active.name}" ⚽\n` +
      `Six World Cup calls, locked at kickoff. ${lockedCount}/${members.length} in.\n` +
      `Tap to join → ${joinUrl}`;
    try {
      let file: File | null = null;
      try {
        const q = new URLSearchParams({
          name: active.name,
          code: active.code,
          members: String(members.length),
          locked: String(lockedCount),
        });
        const res = await fetch(`/api/og/league?${q.toString()}`);
        if (res.ok) file = new File([await res.blob()], "league.png", { type: "image/png" });
      } catch {
        /* fall back to text share */
      }
      if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        // Apps drop text alongside images — copy the join link so it can paste.
        try {
          await navigator.clipboard.writeText(caption);
          setCopied(true);
          setTimeout(() => setCopied(false), 4000);
        } catch {
          /* clipboard blocked */
        }
        await navigator.share({ files: [file], text: caption });
      } else if (navigator.share) {
        await navigator.share({ title: "CALLED IT.", text: caption, url: joinUrl });
      } else {
        await navigator.clipboard.writeText(caption);
      }
    } catch {
      /* user dismissed */
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <main className="main">
      <h1 className="headline small">
        YOUR
        <br />
        <span className="headline-accent">LEAGUES.</span>
      </h1>

      {/* league switcher */}
      {leagues.length > 0 && (
        <div className="league-switch">
          {leagues.map((l) => (
            <button
              key={l.id}
              className={`chip ${active?.id === l.id ? "on" : ""}`}
              onClick={() => setActive(l)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* actions */}
      <div className="league-actions">
        <button
          className={`tab ${mode === "create" ? "on" : ""}`}
          onClick={() => setMode(mode === "create" ? "none" : "create")}
        >
          + New league
        </button>
        <button
          className={`tab ${mode === "join" ? "on" : ""}`}
          onClick={() => setMode(mode === "join" ? "none" : "join")}
        >
          Join with code
        </button>
      </div>

      {mode === "create" && (
        <div className="league-form">
          <input
            className="search"
            placeholder="League name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className={`primary ${name.trim().length >= 2 && !busy ? "" : "disabled"}`}
            disabled={name.trim().length < 2 || busy}
            onClick={submitCreate}
          >
            {busy ? "CREATING…" : "CREATE LEAGUE"}
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="league-form">
          <input
            className="search code-input"
            placeholder="6-character code"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            className={`primary ${code.trim().length === 6 && !busy ? "" : "disabled"}`}
            disabled={code.trim().length !== 6 || busy}
            onClick={submitJoin}
          >
            {busy ? "JOINING…" : "JOIN LEAGUE"}
          </button>
        </div>
      )}

      {error && <p className="onboard-error">{error}</p>}

      {/* active league */}
      {active ? (
        <>
          <div className="league-bar">
            <span className="league-members">
              {members.length} member{members.length === 1 ? "" : "s"}
            </span>
            <button className="code-chip" onClick={copyCode}>
              {copied ? "COPIED ✓" : `CODE · ${active.code}`}
            </button>
          </div>

          <button className="primary" onClick={shareLeague} disabled={shareBusy}>
            {shareBusy ? "PREPARING…" : "📣 INVITE MATES"}
          </button>
          <p className="footnote">
            Sends a join link — they tap, pick a name, and they&apos;re in your
            league.
          </p>

          {members.some((m) => m.hasScore) ? (
            <>
              <div className="table">
                <div className="t-row t-head lb">
                  <span>#</span>
                  <span>MEMBER</span>
                  <span className="t-right">POINTS</span>
                </div>
                {members.map((m) => (
                  <div className={`t-row lb ${m.isYou ? "me" : ""}`} key={m.user_id}>
                    <span className="t-rank">
                      {m.rank}
                      {m.delta !== 0 && (
                        <i className={m.delta > 0 ? "up" : "down"}>
                          {m.delta > 0 ? `▲${m.delta}` : `▼${-m.delta}`}
                        </i>
                      )}
                    </span>
                    <span className="t-name">{m.isYou ? "You" : m.display_name}</span>
                    <span className="t-right t-mult">
                      {Math.round(m.points)}
                      {m.provisional > 0 && <i className="prov" title="includes provisional" />}
                    </span>
                  </div>
                ))}
              </div>
              <p className="note">
                <i className="prov" /> = includes provisional points that can still
                change. Final points settle as results land.
              </p>
            </>
          ) : (
            <>
              <div className="table">
                <div className="t-row t-head">
                  <span>MEMBER</span>
                  <span>STATUS</span>
                  <span className="t-right">BOLDNESS</span>
                </div>
                {members.map((m) => (
                  <div className={`t-row ${m.isYou ? "me" : ""}`} key={m.user_id}>
                    <span className="t-name">{m.isYou ? "You" : m.display_name}</span>
                    <span className={`t-status ${m.locked ? "in" : ""}`}>
                      {m.locked ? "Locked ✓" : "Still picking"}
                    </span>
                    <span className="t-right t-mult">
                      {m.locked && m.boldness != null ? `×${m.boldness.toFixed(1)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="note">
                Boldness — the average rarity of a member&apos;s six — is all you
                can see before kickoff. Picks reveal at the first whistle, then
                the table scores live with every match.
              </p>
            </>
          )}
        </>
      ) : (
        mode === "none" && (
          <p className="note">
            No leagues yet. Start one and share the code, or join your mates&apos;
            with a 6-character code.
          </p>
        )
      )}
    </main>
  );
}
