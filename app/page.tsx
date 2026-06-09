"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, type Profile } from "@/lib/profile";
import { loadRefData, type RefData } from "@/lib/data";
import { loadMultiplierMaps } from "@/lib/loadMultipliers";
import { loadPicks, savePick } from "@/lib/picks";
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

  // Once we have a profile, load reference data + multipliers + saved picks.
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    (async () => {
      const ref = await loadRefData(supabase);
      const maps = await loadMultiplierMaps(supabase, ref);
      const { picks: saved } = await loadPicks(supabase, profile.id, ref);
      setData(ref);
      setMults(maps);
      setPicks(saved);
    })().catch((e) => console.error("load failed", e));
  }, [profile]);

  // Persist each pick to the DB through the anon client (RLS applies).
  // Optimistic local update, rolled back if the write is rejected.
  const onPick = useCallback(
    async (category: CategoryId, entity: PickEntity) => {
      if (!profile) return;
      const prevEntity = picks[category];
      setPicks((prev) => ({ ...prev, [category]: entity }));
      try {
        await savePick(createClient(), profile.id, category, entity);
      } catch (e) {
        console.error("savePick failed", e);
        setPicks((prev) => ({ ...prev, [category]: prevEntity }));
      }
    },
    [profile, picks]
  );

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
