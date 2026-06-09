"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, type Profile } from "@/lib/profile";
import { loadRefData, type RefData } from "@/lib/data";
import { loadMultiplierMaps } from "@/lib/loadMultipliers";
import type { CategoryId } from "@/lib/constants";
import type { PickEntity } from "@/lib/types";
import Onboarding from "@/components/Onboarding";
import Album, { type PicksMap, type MultMaps } from "@/components/Album";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [data, setData] = useState<RefData | null>(null);
  const [mults, setMults] = useState<MultMaps | null>(null);
  const [picks, setPicks] = useState<PicksMap>({});

  // Resolve the current profile on mount.
  useEffect(() => {
    const supabase = createClient();
    getMyProfile(supabase)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoaded(true));
  }, []);

  // Once we have a profile, load reference data + multipliers.
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    (async () => {
      const ref = await loadRefData(supabase);
      const maps = await loadMultiplierMaps(supabase, ref);
      setData(ref);
      setMults(maps);
    })().catch((e) => console.error("load failed", e));
  }, [profile]);

  // Step 6 will persist this to the picks table; for now it's local state.
  const onPick = useCallback((category: CategoryId, entity: PickEntity) => {
    setPicks((prev) => ({ ...prev, [category]: entity }));
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

  if (!data || !mults) {
    return (
      <div className="app">
        <div className="loading">DEALING THE STICKERS…</div>
      </div>
    );
  }

  return <Album data={data} mults={mults} picks={picks} onPick={onPick} />;
}
