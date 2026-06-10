"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, type Profile } from "@/lib/profile";
import { loadRefData, type RefData } from "@/lib/data";
import { loadMultiplierMaps } from "@/lib/loadMultipliers";
import { loadPicks, savePick, lockPicks } from "@/lib/picks";
import type { CategoryId } from "@/lib/constants";
import type { PickEntity, PicksMap } from "@/lib/types";
import type { MultMaps } from "@/lib/multiplierMap";
import Onboarding from "@/components/Onboarding";
import Album from "@/components/Album";
import AppShell, { type Tab } from "@/components/AppShell";
import LeagueView from "@/components/LeagueView";
import GlobalView from "@/components/GlobalView";
import ResultsView from "@/components/ResultsView";
import RoundView from "@/components/RoundView";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [data, setData] = useState<RefData | null>(null);
  const [mults, setMults] = useState<MultMaps | null>(null);
  const [picks, setPicks] = useState<PicksMap>({});
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState<Tab>("album");

  // Resolve the current profile on mount; honour ?tab= for deep links.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "round" || t === "league" || t === "global" || t === "results") setTab(t);
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
      const { picks: saved, locked: alreadyLocked } = await loadPicks(
        supabase,
        profile.id,
        ref
      );
      setData(ref);
      setMults(maps);
      setPicks(saved);
      setLocked(alreadyLocked);
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

  const onLock = async (boldness: number) => {
    setLocked(true);
    try {
      await lockPicks(createClient(), profile.id, boldness);
    } catch (e) {
      console.error("lockPicks failed", e);
      setLocked(false);
    }
  };

  const teamFlags = new Map(
    [...data.teamById].map(([id, t]) => [id, t.flag])
  );

  return (
    <AppShell tab={tab} onTab={setTab}>
      {tab === "album" && (
        <Album
          data={data}
          mults={mults}
          picks={picks}
          onPick={onPick}
          locked={locked}
          onLock={onLock}
          handle={profile.handle}
          displayName={profile.display_name}
        />
      )}
      {tab === "round" && <RoundView userId={profile.id} data={data} />}
      {tab === "league" && <LeagueView userId={profile.id} teamFlags={teamFlags} />}
      {tab === "global" && (
        <GlobalView
          userId={profile.id}
          teamFlags={teamFlags}
          favouriteTeam={(() => {
            const t = profile.favourite_team
              ? data.teamById.get(profile.favourite_team)
              : null;
            return t ? { id: t.id, name: t.name, flag: t.flag } : null;
          })()}
        />
      )}
      {tab === "results" && <ResultsView teamFlags={teamFlags} />}
    </AppShell>
  );
}
