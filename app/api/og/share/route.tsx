// Shareable sticker card (the file dropped into the native share sheet).
// Rendered server-side from query params the client already has — no DB read,
// no RLS, no canvas/font fragility (unlike client-side html-to-image, which
// goes blank on iOS Safari). Pure render → edge runtime.
import { ImageResponse } from "next/og";

export const runtime = "edge";

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

interface CardPick {
  s: string; // short label
  f: string; // flag
  n: string; // name
  m: number; // multiplier
  t: string; // tier class
  l: string; // tier label
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const name = (sp.get("name") ?? "A challenger").slice(0, 40);
  const handle = sp.get("handle") ?? "";
  const boldness = sp.get("boldness") ?? "0.0";
  let picks: CardPick[] = [];
  try {
    picks = JSON.parse(sp.get("d") ?? "[]");
  } catch {
    picks = [];
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#101A4A",
          backgroundImage:
            "radial-gradient(circle at 85% -5%, #23348C 0%, transparent 55%), radial-gradient(circle at 0% 105%, #1B2A75 0%, transparent 50%)",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 900, letterSpacing: 2 }}>
            CALLED IT<span style={{ color: "#FFD34D" }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 22, letterSpacing: 2, color: "#8E9AD6", fontWeight: 800 }}>
              BOLDNESS
            </span>
            <span style={{ fontSize: 56, color: "#FFD34D", fontWeight: 900 }}>×{boldness}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            marginTop: 26,
            textTransform: "uppercase",
          }}
        >
          {name}
          <span style={{ color: "#FFD34D", marginLeft: 18, textShadow: "5px 5px 0 rgba(255,92,122,0.55)" }}>
            called it.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 22,
            marginTop: 40,
            flex: 1,
            alignContent: "flex-start",
          }}
        >
          {picks.map((p, i) => (
            <div
              key={i}
              style={{
                width: 280,
                height: 300,
                background: "#fff",
                color: "#101A4A",
                borderRadius: 22,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1.5, color: "#8E9AD6" }}>
                {p.s}
              </span>
              <span style={{ fontSize: 80 }}>{p.f}</span>
              <span style={{ fontSize: 30, fontWeight: 800, textAlign: "center", lineHeight: 1.05 }}>
                {p.n}
              </span>
              <span
                style={{
                  display: "flex",
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 1,
                  padding: "6px 14px",
                  borderRadius: 99,
                  background: TIER_BG[p.t] ?? "#E8EAF2",
                  color: TIER_FG[p.t] ?? "#6B7390",
                }}
              >
                {p.l} ×{p.m}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#8E9AD6", fontWeight: 800, marginTop: 20 }}>
          Make your six →
          <span style={{ color: "#FFD34D", marginLeft: 12 }}>@{handle}</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, emoji: "twemoji" }
  );
}
