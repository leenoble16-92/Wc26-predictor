"use client";

// Browser Supabase client (anon key). All user reads/writes go through this
// so RLS applies. The elevated server-only key is never used in this file.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
