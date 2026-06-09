"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile, type Profile } from "@/lib/profile";

export default function Onboarding({
  onReady,
}: {
  onReady: (profile: Profile) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const profile = await ensureProfile(supabase, name);
      onReady(profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      // Friendlier copy if the anonymous provider isn't enabled yet.
      setError(
        /anonymous/i.test(msg)
          ? "Sign-ins aren't switched on yet — try again in a moment."
          : msg
      );
      setBusy(false);
    }
  };

  const canSubmit = name.trim().length >= 2 && !busy;

  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
      </header>

      <main className="onboard">
        <div className="onboard-kicker">WORLD CUP 2026</div>
        <h1 className="onboard-headline">
          SIX CALLS.<br />
          <span className="headline-accent">ONE SUMMER.</span>
        </h1>
        <p className="onboard-intro">
          No email, no faff. Pick a name, collect your six, see how bold you
          really are. Your mates will know.
        </p>

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
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) submit();
          }}
        />

        <button
          className={`primary ${canSubmit ? "" : "disabled"}`}
          disabled={!canSubmit}
          onClick={submit}
        >
          {busy ? "STARTING…" : "START PICKING"}
        </button>

        {error && <p className="onboard-error">{error}</p>}
        <p className="footnote">
          One tap and you&apos;re in. You can add an email later to save your game.
        </p>
      </main>

      <footer className="ftr">
        Prototype data swaps for real 48-team squads at launch
      </footer>
    </div>
  );
}
