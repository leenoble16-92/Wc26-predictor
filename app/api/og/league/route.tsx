// League invite card (the image shared when inviting mates). Lighter than the
// pick card: league name + code + "X locked in" + countdown (SPEC §6).
// Params-driven so it needs no DB/auth (leagues are auth-only readable).
import { ImageResponse } from "next/og";
import { KICKOFF_UTC } from "@/lib/constants";

export const runtime = "edge";

function countdown(): string {
  const diff = new Date(KICKOFF_UTC).getTime() - Date.now();
  if (diff <= 0) return "Picks are locked";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h to kickoff` : `${h}h to kickoff`;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const name = (sp.get("name") ?? "Our League").slice(0, 40);
  const code = (sp.get("code") ?? "").toUpperCase().slice(0, 6);
  const members = sp.get("members") ?? "1";
  const locked = sp.get("locked") ?? "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#101A4A",
          backgroundImage:
            "radial-gradient(circle at 85% 0%, #23348C 0%, transparent 55%), radial-gradient(circle at 0% 100%, #1B2A75 0%, transparent 50%)",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: 70,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 900, letterSpacing: 2 }}>
          CALLED IT<span style={{ color: "#FFD34D" }}>.</span>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#8E9AD6", fontWeight: 800, marginTop: 30 }}>
          YOU&apos;RE INVITED TO
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 86,
            fontWeight: 900,
            lineHeight: 1,
            color: "#FFD34D",
            textShadow: "5px 5px 0 rgba(255,92,122,0.55)",
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.08)",
              border: "2px solid rgba(255,255,255,0.16)",
              borderRadius: 18,
              padding: "16px 28px",
            }}
          >
            <span style={{ fontSize: 18, color: "#8E9AD6", fontWeight: 800, letterSpacing: 2 }}>
              CODE
            </span>
            <span style={{ fontSize: 56, color: "#fff", fontWeight: 900, letterSpacing: 6 }}>
              {code}
            </span>
          </div>
          <span style={{ display: "flex", fontSize: 30, color: "#B9C2EA", maxWidth: 420 }}>
            {locked} of {members} locked in · {countdown()}
          </span>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#fff", fontWeight: 800, marginTop: 44 }}>
          Tap to join and make your six →
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
