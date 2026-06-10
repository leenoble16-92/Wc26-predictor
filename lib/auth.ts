// Email magic-link account helpers (anon client). Two flows:
//  - saveGameEmail: attach an email to the CURRENT (anonymous) account so it
//    becomes permanent and recoverable — picks/leagues/scores all kept.
//  - signInWithEmail: a returning player (new device / cleared cache) gets a
//    magic link that signs them back into their existing account.
import { createClient } from "./supabase/client";

// We deliberately DON'T pass emailRedirectTo. The branded email templates link
// to {{ .SiteURL }}/auth/confirm (token-hash flow), so the destination is
// driven entirely by the Supabase Site URL — set that to production and links
// can never point at localhost, regardless of where the request originated.

export async function saveGameEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw error;
}
