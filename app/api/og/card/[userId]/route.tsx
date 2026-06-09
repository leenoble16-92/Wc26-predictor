// Share card image (OG unfurl + Stories). Renders from PUBLIC profile fields
// only (handle, display_name, boldness, locked_at) — picks stay private
// pre-kickoff, so the card is an intrigue teaser, not a spoiler. No service
// role here (this lives under app/api/og/, not cron/admin); anon key only.
import { ImageResponse } from "next/og";
import { KICKOFF } from "@/lib/constants";

export const runtime = "edge";

// Single public profile read via PostgREST — plain fetch is edge-native
// (the supabase-js SDK pulls in Node APIs the Edge runtime rejects).
async function fetchProfile(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(
    `${url}/rest/v1/profiles?id=eq.${userId}&select=display_name,handle,boldness,locked_at`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as {
    display_name: string;
    handle: string;
    boldness: number | null;
    locked_at: string | null;
  }[];
  return rows[0] ?? null;
}

const NAVY = "#101A4A";
const GOLD = "#FFD34D";
const CORAL = "#FF5C7A";
const MUTED = "#8E9AD6";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const story = new URL(req.url).searchParams.get("format") === "story";
  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;

  const profile = await fetchProfile(userId);

  const name = profile?.display_name ?? "A challenger";
  const boldness = profile?.boldness as number | null;
  const locked = !!profile?.locked_at;
  const revealed = Date.now() >= KICKOFF.getTime();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: story ? 90 : 70,
          background: NAVY,
          backgroundImage:
            "radial-gradient(circle at 85% 0%, #23348C 0%, transparent 55%), radial-gradient(circle at 0% 100%, #1B2A75 0%, transparent 50%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: story ? 40 : 34,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          CALLED IT<span style={{ color: GOLD }}>.</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: story ? 120 : 92,
            fontWeight: 900,
            lineHeight: 1,
            marginTop: story ? 60 : 28,
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: story ? 110 : 84,
            fontWeight: 900,
            lineHeight: 1,
            color: GOLD,
            textShadow: `5px 5px 0 ${CORAL}99`,
            textTransform: "uppercase",
          }}
        >
          {locked ? "has called it." : "is calling it."}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: story ? 80 : 44 }}>
          {boldness != null ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.08)",
                  border: "2px solid rgba(255,255,255,0.16)",
                  borderRadius: 22,
                  padding: story ? "28px 40px" : "20px 30px",
                }}
              >
                <span style={{ fontSize: story ? 26 : 20, color: MUTED, fontWeight: 800, letterSpacing: 2 }}>
                  BOLDNESS
                </span>
                <span style={{ fontSize: story ? 90 : 64, color: GOLD, fontWeight: 900 }}>
                  ×{boldness.toFixed(1)}
                </span>
              </div>
              <span style={{ display: "flex", fontSize: story ? 34 : 26, color: MUTED, maxWidth: story ? 520 : 420 }}>
                {revealed ? "Six calls in. See if they nailed it." : "Six calls locked. Picks revealed at the first whistle."}
              </span>
            </>
          ) : (
            <span style={{ display: "flex", fontSize: story ? 40 : 30, color: MUTED }}>
              Make your six before the first whistle.
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: story ? 90 : 46,
            fontSize: story ? 34 : 26,
            color: "#fff",
            fontWeight: 800,
          }}
        >
          Make your six →{" "}
          <span style={{ color: GOLD, marginLeft: 12 }}>
            @{profile?.handle ?? ""}
          </span>
        </div>
      </div>
    ),
    { width: W, height: H, emoji: "noto" }
  );
}
