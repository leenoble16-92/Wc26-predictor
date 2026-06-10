"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/lib/types";

// Shown on the picks page when a player has no favourite team yet (e.g. they
// signed up before it was required). Lets them set it → joins their fan
// leaderboard.
export default function FavouriteTeamPrompt({
  teams,
  userId,
  onSet,
}: {
  teams: Team[];
  userId: string;
  onSet: (teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = query
    ? teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : teams.slice(0, 12);

  const choose = async (t: Team) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({ favourite_team: t.id })
        .eq("id", userId);
      if (error) throw error;
      onSet(t.id);
      setOpen(false);
    } catch {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="save-banner" onClick={() => setOpen(true)}>
        <span>⚽ Pick your team to join its fan leaderboard</span>
        <span className="save-cta">PICK →</span>
      </button>

      {open && (
        <div className="save-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="save-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="save-h">PICK YOUR TEAM</h3>
            <p className="save-p">
              Choose the team you&apos;re backing — you&apos;ll be ranked against
              fellow fans on the global leaderboard.
            </p>
            <input
              className="search"
              placeholder="Search your country"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="pick-list fav-list">
              {matches.map((t) => (
                <button key={t.id} className="pick-row" onClick={() => choose(t)}>
                  <span className="pick-flag">{t.flag}</span>
                  <span className="pick-meta">
                    <span className="pick-name">{t.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
