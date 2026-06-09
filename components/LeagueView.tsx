"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createLeague,
  joinLeague,
  myLeagues,
  leagueMembers,
  type League,
  type LeagueMember,
} from "@/lib/leagues";

export default function LeagueView({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [active, setActive] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);

  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    leagueMembers(supabase, active.id, userId)
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
            Boldness — the average rarity of a member&apos;s six — is all you can
            see before kickoff. Picks reveal at the first whistle, then the table
            scores live with every match.
          </p>
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
