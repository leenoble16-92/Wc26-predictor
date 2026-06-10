// Email magic-link account helpers (anon client). Two flows:
//  - saveGameEmail: attach an email to the CURRENT (anonymous) account so it
//    becomes permanent and recoverable — picks/leagues/scores all kept.
//  - signInWithEmail: a returning player (new device / cleared cache) gets a
//    magic link that signs them back into their existing account.
import { createClient } from "./supabase/client";

const redirect = () =>
  typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

export async function saveGameEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: redirect() }
  );
  if (error) throw error;
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirect() },
  });
  if (error) throw error;
}
