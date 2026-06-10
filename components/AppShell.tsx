"use client";

import Header from "./Header";
import SaveAccount from "./SaveAccount";

export type Tab = "album" | "round" | "league" | "global" | "results";

const NAV: [Tab, string, string][] = [
  ["album", "🎴", "My Six"],
  ["round", "🎯", "Round"],
  ["league", "🏆", "League"],
  ["global", "🌍", "Global"],
  ["results", "📅", "Fixtures"],
];

export default function AppShell({
  tab,
  onTab,
  children,
  hasEmail,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  children: React.ReactNode;
  hasEmail: boolean;
}) {
  return (
    <div className="app">
      <Header />
      <SaveAccount hasEmail={hasEmail} />
      <div className="shell-body">{children}</div>
      <nav className="bottom-nav">
        {NAV.map(([id, icon, label]) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? "on" : ""}`}
            onClick={() => onTab(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
