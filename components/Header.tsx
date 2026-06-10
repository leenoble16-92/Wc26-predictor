"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KICKOFF } from "@/lib/constants";

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Header() {
  const cd = useCountdown(KICKOFF.getTime());
  return (
    <header className="hdr">
      <div className="brand-wrap">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
        <Link href="/how" className="how-link">
          How it works ›
        </Link>
      </div>
      <div className="countdown">
        <span className="cd-label">PICKS LOCK AT KICKOFF</span>
        <span className="cd-time">
          {cd.d}
          <small>d</small> {pad(cd.h)}
          <small>h</small> {pad(cd.m)}
          <small>m</small> {pad(cd.s)}
          <small>s</small>
        </span>
      </div>
    </header>
  );
}
