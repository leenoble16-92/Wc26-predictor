"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ROUND_CATEGORIES,
  type RoundCategoryId,
  type RoundCategory,
} from "@/lib/constants";
import type { RefData } from "@/lib/data";
import type { PickEntity } from "@/lib/types";
import type { EntityMultiplier } from "@/lib/multiplierMap";
import {
  loadRounds,
  activeRound,
  loadRoundPicks,
  saveRoundPick,
  loadRoundMultipliers,
  poolForRoundCategory,
  type Round,
  type RoundPicksMap,
} from "@/lib/rounds";
import Picker from "./Picker";

const ROT = [-1.5, 1.5];

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
  };
}

export default function RoundView({
  userId,
  data,
}: {
  userId: string;
  data: RefData;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [picks, setPicks] = useState<RoundPicksMap>({});
  const [mults, setMults] = useState<Map<RoundCategoryId, Map<string, EntityMultiplier>>>(
    new Map()
  );
  const [activeCat, setActiveCat] = useState<RoundCategory | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nextOpp, setNextOpp] = useState<Map<string, { name: string; tla: string | null; date: string }>>(
    new Map()
  );

  // Next fixture per team (to show alongside round picks).
  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<string, { name: string; tla: string | null; date: string }>();
        const now = Date.now();
        for (const m of (d.matches ?? []) as {
          status: string;
          utcDate: string;
          home: { name: string; tla: string | null };
          away: { name: string; tla: string | null };
        }[]) {
          if (m.status === "FINISHED" || +new Date(m.utcDate) < now) continue;
          if (m.home.tla && !map.has(m.home.tla))
            map.set(m.home.tla, { name: m.away.name, tla: m.away.tla, date: m.utcDate });
          if (m.away.tla && !map.has(m.away.tla))
            map.set(m.away.tla, { name: m.home.name, tla: m.home.tla, date: m.utcDate });
        }
        setNextOpp(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const rs = await loadRounds(supabase);
      setRounds(rs);
      const active = activeRound(rs);
      setRound(active);
      if (active) {
        const [{ picks: p }, m] = await Promise.all([
          loadRoundPicks(supabase, userId, active.id, data),
          loadRoundMultipliers(supabase, active.id, data),
        ]);
        setPicks(p);
        setMults(m);
      }
      setLoaded(true);
    })().catch((e) => console.error(e));
  }, [supabase, userId, data]);

  const cd = useCountdown(round?.locks_at ?? new Date().toISOString());

  const onPick = async (cat: RoundCategoryId, entity: PickEntity) => {
    if (!round) return;
    setPicks((prev) => ({ ...prev, [cat]: entity }));
    setActiveCat(null);
    try {
      await saveRoundPick(supabase, userId, round.id, cat, entity);
    } catch (e) {
      console.error("saveRoundPick failed", e);
    }
  };

  if (!loaded) {
    return (
      <main className="main">
        <div className="loading">LOADING THE ROUND…</div>
      </main>
    );
  }

  const resolved = rounds.filter((r) => r.status === "resolved" || r.best_team || r.top_scorer);

  // Annotate the pool with each entity's next opponent.
  const augmentPool = (catId: RoundCategoryId): PickEntity[] => {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return poolForRoundCategory(catId, data).map((e) => {
      let tla: string | null = null;
      if (e.type === "team") tla = e.entityId;
      else tla = data.playerById.get(Number(e.entityId))?.team_id ?? null;
      const n = tla ? nextOpp.get(tla) : undefined;
      if (!n) return e;
      const oppFlag = n.tla ? data.teamById.get(n.tla)?.flag ?? "" : "";
      const sub =
        e.type === "team"
          ? `Next: vs ${oppFlag} ${n.name} · ${fmt(n.date)}`
          : `${e.sub.split(" · ")[0]} · vs ${n.name}`;
      return { ...e, sub };
    });
  };

  if (activeCat && round) {
    return (
      <main className="main">
        <Picker
          cat={activeCat}
          pool={augmentPool(activeCat.id)}
          mults={mults.get(activeCat.id) ?? new Map()}
          selectedId={picks[activeCat.id]?.entityId ?? null}
          onPick={(e) => onPick(activeCat.id, e)}
          onBack={() => setActiveCat(null)}
        />
      </main>
    );
  }

  return (
    <main className="main">
      <h1 className="headline small">
        ROUND PICKS<br />
        <span className="headline-accent">BONUS POINTS.</span>
      </h1>

      {round ? (
        <>
          <div className="round-bar">
            <span className="round-name">{round.name}</span>
            <span className="round-cd">
              LOCKS IN {cd.d}d {cd.h}h {cd.m}m
            </span>
          </div>
          <p className="intro">
            Two quick calls each round, scored on rarity like your six. Lock in
            before the round kicks off.
          </p>

          <div className="grid round-grid">
            {ROUND_CATEGORIES.map((c, i) => {
              const p = picks[c.id];
              const m = p ? mults.get(c.id)?.get(p.entityId) : undefined;
              const cls = m?.tier.cls ?? "common";
              if (!p) {
                return (
                  <button
                    key={c.id}
                    className="slot"
                    style={{ ["--rot" as string]: `${ROT[i]}deg` }}
                    onClick={() => setActiveCat(c)}
                  >
                    <span className="slot-cat">{c.short}</span>
                    <span className="slot-cta">TAP TO PICK</span>
                  </button>
                );
              }
              return (
                <button
                  key={c.id}
                  className={`sticker ${cls}`}
                  style={{ ["--rot" as string]: `${ROT[i]}deg` }}
                  onClick={() => setActiveCat(c)}
                >
                  <span className="stk-cat">{c.short}</span>
                  <span className="stk-flag">{p.flag}</span>
                  <span className="stk-name">{p.name}</span>
                  <span className={`stk-tier ${cls}`}>
                    {m?.tier.label} ×{m?.multiplier}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="note">
          No round open right now — the next one opens when these fixtures finish.
        </p>
      )}

      {resolved.length > 0 && (
        <>
          <div className="results-head">PAST ROUNDS</div>
          <div className="table">
            {resolved.map((r) => {
              const t = r.best_team ? data.teamById.get(r.best_team) : null;
              const p = r.top_scorer ? data.playerById.get(r.top_scorer) : null;
              return (
                <div className="t-row" key={r.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                  <span className="t-name">{r.name}</span>
                  <span className="t-status">{t ? `${t.flag} ${t.name}` : "—"}</span>
                  <span className="t-status">{p ? p.name : "—"}</span>
                </div>
              );
            })}
          </div>
          <p className="note">Team of the round · Top scorer — results so far.</p>
        </>
      )}
    </main>
  );
}
