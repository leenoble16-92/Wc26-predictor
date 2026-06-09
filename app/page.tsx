"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, type Profile } from "@/lib/profile";
import Onboarding from "@/components/Onboarding";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    getMyProfile(supabase)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="app">
        <div className="loading">LOADING…</div>
      </div>
    );
  }

  if (!profile) {
    return <Onboarding onReady={setProfile} />;
  }

  // Step 5 replaces this placeholder with the full sticker album.
  return (
    <div className="app">
      <header className="hdr">
        <div className="brand">
          CALLED IT<span className="brand-mark">.</span>
        </div>
      </header>
      <main className="main">
        <h1 className="headline">
          YOU&apos;RE IN,<br />
          <span className="headline-accent">
            {profile.display_name.toUpperCase()}.
          </span>
        </h1>
        <p className="intro">
          Your profile is live (@{profile.handle}). The sticker album lands
          next.
        </p>
      </main>
    </div>
  );
}
