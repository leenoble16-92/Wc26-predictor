"use client";

import { useState } from "react";
import type { EntityType } from "@/lib/constants";
import type { PickEntity } from "@/lib/types";
import type { EntityMultiplier } from "@/lib/multiplierMap";

export default function Picker({
  cat,
  pool,
  mults,
  selectedId,
  onPick,
  onBack,
}: {
  cat: { label: string; short: string; type: EntityType; hint: string };
  pool: PickEntity[];
  mults: Map<string, EntityMultiplier>;
  selectedId: string | null;
  onPick: (entity: PickEntity) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");
  const isTeam = cat.type === "team";
  const query = q.toLowerCase();
  // Favourites first: order by popularity proxy (= multiplier pct, descending).
  // Today that's team strength + position; once the cron fills pick_stats it
  // becomes real pick-share, i.e. genuinely most-picked first. Ties keep the
  // DB's alphabetical order (stable sort).
  const list = pool
    .filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.sub.toLowerCase().includes(query)
    )
    .sort(
      (a, b) =>
        (mults.get(b.entityId)?.pct ?? 0) - (mults.get(a.entityId)?.pct ?? 0)
    );

  return (
    <div className="picker">
      <button className="back" onClick={onBack}>
        ← MY SIX
      </button>
      <h2 className="pick-title">{cat.label.toUpperCase()}</h2>
      <p className="pick-hint">{cat.hint}. Rarer pick, rarer sticker.</p>
      <input
        className="search"
        placeholder={isTeam ? "Search teams" : "Search players"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="pick-list">
        {list.map((item) => {
          const m = mults.get(item.entityId);
          const cls = m?.tier.cls ?? "common";
          return (
            <button
              key={item.entityId}
              className={`pick-row ${selectedId === item.entityId ? "sel" : ""}`}
              onClick={() => onPick(item)}
            >
              <span className="pick-flag">{item.flag}</span>
              <span className="pick-meta">
                <span className="pick-name">{item.name}</span>
                <span className="pick-sub">{item.sub}</span>
              </span>
              <span className={`pill ${cls}`}>×{m?.multiplier ?? "—"}</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="empty">No results — full squads load at launch.</div>
        )}
      </div>
    </div>
  );
}
