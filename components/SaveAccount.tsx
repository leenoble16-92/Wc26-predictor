"use client";

import { useState } from "react";
import Link from "next/link";
import { saveGameEmail } from "@/lib/auth";

export default function SaveAccount({ isAnonymous }: { isAnonymous: boolean }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAnonymous || dismissed) return null;

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveGameEmail(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="save-banner" onClick={() => setOpen(true)}>
        <span>💾 Save your game so you never lose your picks</span>
        <span className="save-cta">SAVE →</span>
      </button>

      {open && (
        <div className="save-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="save-card" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <>
                <h3 className="save-h">CHECK YOUR INBOX 📩</h3>
                <p className="save-p">
                  We&apos;ve sent a link to <strong>{email}</strong>. Tap it to
                  save your game — your picks, leagues and score stay exactly as
                  they are, on any device.
                </p>
                <button className="primary" onClick={() => setOpen(false)}>
                  GOT IT
                </button>
              </>
            ) : (
              <>
                <h3 className="save-h">SAVE YOUR GAME</h3>
                <p className="save-p">
                  Add an email and we&apos;ll send a one-tap sign-in link. No
                  password. It keeps your account safe if you clear your browser
                  or switch phones.
                </p>
                <input
                  className="search"
                  type="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  value={email}
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <button
                  className={`primary ${valid && !busy ? "" : "disabled"}`}
                  disabled={!valid || busy}
                  onClick={submit}
                >
                  {busy ? "SENDING…" : "SEND MY LINK"}
                </button>
                {error && <p className="onboard-error">{error}</p>}
                <p className="save-consent">
                  By adding your email you agree to receive updates and marketing
                  about CALLED IT. We&apos;ll never sell it. Unsubscribe any time.{" "}
                  <Link href="/legal#privacy" className="legal-link-inline">
                    Privacy
                  </Link>
                </p>
                <button className="save-skip" onClick={() => setDismissed(true)}>
                  Not now
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
