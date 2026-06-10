"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// We only set essential (auth) cookies, so this is an informational notice with
// an acknowledge action, not a tracking-consent gate. Stored in localStorage so
// it shows once.
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("ci_cookie_ack")) setShow(true);
    } catch {
      /* storage blocked — don't nag */
    }
  }, []);

  const ack = () => {
    try {
      localStorage.setItem("ci_cookie_ack", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="cookie-bar" role="dialog" aria-label="Cookie notice">
      <span className="cookie-text">
        We use essential cookies to keep you signed in — no ads, no tracking.{" "}
        <Link href="/legal#cookies" className="legal-link-inline">
          Learn more
        </Link>
        .
      </span>
      <button className="cookie-ok" onClick={ack}>
        OK
      </button>
    </div>
  );
}
