// League create / join / read — all through the anon client so RLS applies
// (leagues readable by signed-in users; membership readable to members;
// owner-only create/rename). Picks stay hidden pre-kickoff via the picks RLS;
// the league view uses the display-only lock/boldness on profiles instead.
import type { SupabaseClient } from "@supabase/supabase-js";

// 6-char code, unambiguous alphabet (no 0/O/1/I, SPEC §3/§7).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface League {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  created_at: string;
}

export interface LeagueMember {
  user_id: string;
  display_name: string;
  handle: string;
  locked: boolean;
  boldness: number | null;
  isYou: boolean;
}

function makeCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++)
    c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}

/** Create a league owned by the user; add them as the first member. */
export async function createLeague(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<League> {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Give your league a name.");

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from("leagues")
      .insert({ name: trimmed, code, owner_id: userId })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") continue; // code collision — retry
      throw error;
    }
    await supabase
      .from("league_members")
      .insert({ league_id: data.id, user_id: userId });
    return data as League;
  }
  throw new Error("Could not generate a unique code — try again.");
}

/** Look up a league by exact code (case-insensitive). */
export async function findLeagueByCode(
  supabase: SupabaseClient,
  code: string
): Promise<League | null> {
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as League) ?? null;
}

/** Join a league by code. Idempotent. */
export async function joinLeague(
  supabase: SupabaseClient,
  userId: string,
  code: string
): Promise<League> {
  const league = await findLeagueByCode(supabase, code);
  if (!league) throw new Error("No league with that code.");
  const { error } = await supabase
    .from("league_members")
    .upsert(
      { league_id: league.id, user_id: userId },
      { onConflict: "league_id,user_id" }
    );
  if (error) throw error;
  return league;
}

/** Leagues the user belongs to. */
export async function myLeagues(
  supabase: SupabaseClient,
  userId: string
): Promise<League[]> {
  const { data, error } = await supabase
    .from("league_members")
    .select("joined_at, leagues(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as { leagues: League }[])
    .map((r) => r.leagues)
    .filter(Boolean);
}

/**
 * Member list with lock status + boldness, read from the public profile
 * fields (NOT from picks — those stay hidden pre-kickoff by RLS). Sorted:
 * locked members first (by boldness desc), then those still picking.
 */
export async function leagueMembers(
  supabase: SupabaseClient,
  leagueId: string,
  userId: string
): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from("league_members")
    .select("user_id, profiles(display_name, handle, locked_at, boldness)")
    .eq("league_id", leagueId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    user_id: string;
    profiles: {
      display_name: string;
      handle: string;
      locked_at: string | null;
      boldness: number | null;
    } | null;
  }[];

  const members: LeagueMember[] = rows.map((r) => ({
    user_id: r.user_id,
    display_name: r.profiles?.display_name ?? "Player",
    handle: r.profiles?.handle ?? "",
    locked: !!r.profiles?.locked_at,
    boldness: r.profiles?.boldness ?? null,
    isYou: r.user_id === userId,
  }));

  members.sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1;
    return (b.boldness ?? 0) - (a.boldness ?? 0);
  });
  return members;
}
