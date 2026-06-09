"use client";

// Browser Supabase client (anon key). All user reads/writes go through this
// so RLS applies. SUPABASE_SERVICE_ROLE_KEY is NEVER referenced here.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
