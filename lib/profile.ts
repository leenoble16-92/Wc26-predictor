// Profile bootstrap for the anonymous-auth flow.
// Runs client-side with the browser (anon) client so RLS applies.
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeHandle } from "./handle";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  created_at: string;
}

/** Fetch the current user's profile row, or null if none yet. */
export async function getMyProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile) ?? null;
}

/**
 * Ensure there's an anonymous session AND a profiles row for the given
 * display name. Idempotent: returns the existing profile if already created.
 * Retries on handle collisions (unique constraint is the real guard).
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  displayName: string
): Promise<Profile> {
  const name = displayName.trim();
  if (!name) throw new Error("Enter a display name.");

  // 1. Make sure we have a session (anonymous).
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error("Could not start a session.");

  // 2. If a profile already exists, keep it.
  const existing = await getMyProfile(supabase);
  if (existing) return existing;

  // 3. Insert, retrying on handle collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = makeHandle(name);
    const { data, error } = await supabase
      .from("profiles")
      .insert({ id: user.id, handle, display_name: name })
      .select("*")
      .single();

    if (!error) return data as Profile;
    if (error.code !== "23505") throw error; // not a unique violation
  }
  throw new Error("Could not generate a unique handle — try again.");
}
