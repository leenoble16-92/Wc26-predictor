"use client";

import { forwardRef } from "react";

export interface ShareCardPick {
  short: string;
  flag: string;
  name: string;
  multiplier: number;
  tierCls: "common" | "rare" | "epic" | "legendary";
  tierLabel: string;
}

const TIER_BG: Record<string, string> = {
  common: "#E8EAF2",
  rare: "#DBE6FF",
  epic: "#EFDDFF",
  legendary: "#FFE9A8",
};
const TIER_FG: Record<string, string> = {
  common: "#6B7390",
  rare: "#2742C9",
  epic: "#7A2BD6",
  legendary: "#7A5A00",
};

// 1080×1350 portrait (rendered at half scale, captured at pixelRatio 2).
const ShareCard = forwardRef<
  HTMLDivElement,
  { displayName: string; handle: string; boldness: string; picks: ShareCardPick[] }
>(function ShareCard({ displayName, handle, boldness, picks }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: -99999,
        top: 0,
        width: 540,
        height: 675,
        background: "#101A4A",
        backgroundImage:
          "radial-gradient(circle at 85% -10%, #23348C 0%, transparent 55%), radial-gradient(circle at 0% 110%, #1B2A75 0%, transparent 50%)",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "26px 28px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 24, transform: "skewX(-6deg)" }}>
          CALLED IT<span style={{ color: "#FFD34D" }}>.</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#8E9AD6", fontWeight: 700 }}>
            BOLDNESS
          </div>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, color: "#FFD34D" }}>
            ×{boldness}
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 34,
          lineHeight: 1,
          letterSpacing: 0.5,
          transform: "skewX(-6deg)",
          marginTop: 14,
        }}
      >
        {displayName.toUpperCase()}
        <span style={{ color: "#FFD34D", textShadow: "3px 3px 0 rgba(255,92,122,0.55)" }}>
          {" "}CALLED IT.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 18,
          flex: 1,
        }}
      >
        {picks.map((p, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              color: "#101A4A",
              borderRadius: 12,
              padding: "10px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.4, color: "#8E9AD6" }}>
              {p.short}
            </div>
            <div style={{ fontSize: 30, lineHeight: 1 }}>{p.flag}</div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, lineHeight: 1.05 }}>
              {p.name}
            </div>
            <div
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: 0.8,
                padding: "3px 8px",
                borderRadius: 99,
                background: TIER_BG[p.tierCls],
                color: TIER_FG[p.tierCls],
              }}
            >
              {p.tierLabel} ×{p.multiplier}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#8E9AD6",
          fontWeight: 700,
        }}
      >
        <span>
          Make your six → <span style={{ color: "#FFD34D" }}>@{handle}</span>
        </span>
        <span>World Cup 2026</span>
      </div>
    </div>
  );
});

export default ShareCard;
