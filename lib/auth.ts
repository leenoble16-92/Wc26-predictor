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
  const clean = email.trim();

  // 1) Capture immediately into the private user_emails table. This succeeds
  //    with NO email send, so the address is stored even before SMTP exists.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error: capErr } = await supabase.from("user_emails").upsert(
      { user_id: user.id, email: clean, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (capErr) throw capErr; // capture is the contract — surface real failures
  }

  // 2) Attach to the auth identity so magic-link recovery works. This SENDS a
  //    confirmation and therefore needs working SMTP — don't let a send failure
  //    undo the capture above; just log it.
  const { error: authErr } = await supabase.auth.updateUser({ email: clean });
  if (authErr) {
    console.warn(
      "Email captured, but auth confirmation could not send (configure SMTP):",
      authErr.message
    );
  }
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw error;
}
