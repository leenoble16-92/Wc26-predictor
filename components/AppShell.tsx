"use client";

import Link from "next/link";
import Header from "./Header";

export type Tab = "album" | "league" | "global" | "results";

export default function AppShell({
  tab,
  onTab,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <Header />
      <nav className="tabs">
        {(
          [
            ["album", "My six"],
            ["league", "League"],
            ["global", "Global"],
            ["results", "Results"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={`tab ${tab === id ? "on" : ""}`}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {children}
      <footer className="ftr">
        <Link href="/how" className="ftr-link">
          How points work
        </Link>{" "}
        · picks lock at the first whistle
      </footer>
    </div>
  );
}
