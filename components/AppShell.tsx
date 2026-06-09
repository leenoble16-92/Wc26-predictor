"use client";

import Header from "./Header";

export type Tab = "album" | "league";

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
        Full 48-team squad dataset · picks lock at the first whistle
      </footer>
    </div>
  );
}
