// Reads scores for the league table + global leaderboard. scores is public-
// read (RLS), so clients can rank everyone. Ranks are computed at read time;
// `delta` (movement since the last sync) is written by the cron/preview.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryResult } from "./scoring";

export interface ScoreBreakdown {
  final: number;
  provisional: number;
  delta: number; // previous global rank − new global rank (+ = moved up)
  categories: CategoryResult[];
}

export interface Standing {
  user_id: string;
  display_name: string;
  handle: string;
  favourite_team: string | null;
  rank: number;
  points: number;
  provisional: number;
  delta: number;
  hasScore: boolean;
  boldness: number | null;
  locked: boolean;
  isYou: boolean;
}

interface ScoreRow {
  user_id: string;
  points: number;
  breakdown: ScoreBreakdown | null;
}

export async function leagueStandings(
  supabase: SupabaseClient,
  leagueId: string,
  userId: string
): Promise<Standing[]> {
  const { data: memberRows, error } = await supabase
    .from("league_members")
    .select("user_id, profiles(display_name, handle, boldness, locked_at, favourite_team)")
    .eq("league_id", leagueId);
  if (error) throw error;

  const members = (memberRows ?? []) as unknown as {
    user_id: string;
    profiles: {
      display_name: string;
      handle: string;
      boldness: number | null;
      locked_at: string | null;
      favourite_team: string | null;
    } | null;
  }[];
  const ids = members.map((m) => m.user_id);

  const { data: scoreData } = await supabase
    .from("scores")
    .select("user_id, points, breakdown")
    .in("user_id", ids.length ? ids : [""]);
  const scoreByUser = new Map(
    ((scoreData ?? []) as ScoreRow[]).map((s) => [s.user_id, s])
  );

  const rows: Standing[] = members.map((m) => {
    const s = scoreByUser.get(m.user_id);
    return {
      user_id: m.user_id,
      display_name: m.profiles?.display_name ?? "Player",
      handle: m.profiles?.handle ?? "",
      favourite_team: m.profiles?.favourite_team ?? null,
      rank: 0,
      points: s?.points ?? 0,
      provisional: s?.breakdown?.provisional ?? 0,
      delta: s?.breakdown?.delta ?? 0,
      hasScore: !!s,
      boldness: m.profiles?.boldness ?? null,
      locked: !!m.profiles?.locked_at,
      isYou: m.user_id === userId,
    };
  });

  // Rank by points desc; ties keep insertion order.
  rows.sort((a, b) => b.points - a.points);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface GlobalBoard {
  top: Standing[];
  total: number;
  you: { rank: number; percentile: number; points: number } | null;
}

/**
 * Global leaderboard, optionally filtered to fans of one team (profiles.
 * favourite_team) — e.g. "you're #3 of England fans". Inner-join filter on
 * profiles applies to the top list, the total count, and your rank.
 */
export async function globalLeaderboard(
  supabase: SupabaseClient,
  userId: string,
  opts: { favouriteTeam?: string | null; topN?: number } = {}
): Promise<GlobalBoard> {
  const { favouriteTeam = null, topN = 20 } = opts;
  const profileJoin = favouriteTeam
    ? "profiles!inner(display_name, handle, favourite_team)"
    : "profiles(display_name, handle, favourite_team)";

  // Top N for display.
  let topQuery = supabase
    .from("scores")
    .select(`user_id, points, breakdown, ${profileJoin}`)
    .order("points", { ascending: false })
    .limit(topN);
  if (favouriteTeam) topQuery = topQuery.eq("profiles.favourite_team", favouriteTeam);
  const { data: topData } = await topQuery;

  const top: Standing[] = (
    (topData ?? []) as unknown as {
      user_id: string;
      points: number;
      breakdown: ScoreBreakdown | null;
      profiles: { display_name: string; handle: string; favourite_team: string | null } | null;
    }[]
  ).map((r, i) => ({
    user_id: r.user_id,
    display_name: r.profiles?.display_name ?? "Player",
    handle: r.profiles?.handle ?? "",
    favourite_team: r.profiles?.favourite_team ?? null,
    rank: i + 1,
    points: r.points,
    provisional: r.breakdown?.provisional ?? 0,
    delta: r.breakdown?.delta ?? 0,
    hasScore: true,
    boldness: null,
    locked: true,
    isYou: r.user_id === userId,
  }));

  const totalJoin = favouriteTeam ? "profiles!inner(favourite_team)" : "*";
  let totalQuery = supabase
    .from("scores")
    .select(totalJoin, { count: "exact", head: true });
  if (favouriteTeam) totalQuery = totalQuery.eq("profiles.favourite_team", favouriteTeam);
  const { count: total } = await totalQuery;

  // Your rank = how many score strictly higher, +1 (within the filter).
  let you: GlobalBoard["you"] = null;
  const { data: mine } = await supabase
    .from("scores")
    .select("points")
    .eq("user_id", userId)
    .maybeSingle();
  if (mine) {
    let aboveQuery = supabase
      .from("scores")
      .select(totalJoin, { count: "exact", head: true })
      .gt("points", mine.points);
    if (favouriteTeam) aboveQuery = aboveQuery.eq("profiles.favourite_team", favouriteTeam);
    const { count: above } = await aboveQuery;
    const rank = (above ?? 0) + 1;
    const percentile = total ? Math.max(1, Math.round((rank / total) * 100)) : 100;
    you = { rank, percentile, points: mine.points };
  }

  return { top, total: total ?? 0, you };
}
