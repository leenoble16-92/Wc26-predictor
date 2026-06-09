"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, type CategoryId, type Category } from "@/lib/constants";
import type { PickEntity, PicksMap } from "@/lib/types";
import type { MultMaps } from "@/lib/multiplierMap";
import type { RefData } from "@/lib/data";
import { poolForCategory } from "@/lib/data";
import Picker from "./Picker";
import Confetti from "./Confetti";

const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1];

export default function Album({
  data,
  mults,
  picks,
  onPick,
  locked,
  onLock,
  handle,
  displayName,
}: {
  data: RefData;
  mults: MultMaps;
  picks: PicksMap;
  onPick: (category: CategoryId, entity: PickEntity) => void | Promise<void>;
  locked: boolean;
  onLock: (boldness: number) => void | Promise<void>;
  handle: string;
  displayName: string;
}) {
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [lastPicked, setLastPicked] = useState<CategoryId | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  const multFor = (cat: CategoryId, entityId: string) =>
    mults.get(cat)?.get(entityId);

  const doneCount = CATEGORIES.filter((c) => picks[c.id]).length;
  const complete = doneCount === 6;

  const avgMult = useMemo(() => {
    const vals = CATEGORIES.filter((c) => picks[c.id]).map(
      (c) => multFor(c.id, picks[c.id]!.entityId)?.multiplier ?? 1
    );
    return vals.length
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, mults]);

  const lockIn = () => {
    if (!avgMult) return;
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 2600);
    void onLock(Number(avgMult));
  };

  const shareUrl = () =>
    typeof window !== "undefined" ? `${window.location.origin}/u/${handle}` : "";

  // The six, as text lines.
  const lines = () =>
    CATEGORIES.map((c) => {
      const p = picks[c.id];
      const m = p ? multFor(c.id, p.entityId)?.multiplier : undefined;
      return `${c.short}: ${p?.name ?? "—"} ×${m ?? 1}`;
    }).join("\n");

  // Full caption WITH the app link embedded — so it survives even when an app
  // drops the separate share url and keeps only the image + text.
  const caption = () =>
    `I've called the World Cup 2026 🏆\n\n${lines()}\n\nBoldness ×${avgMult} — reckon you know better?\nMake your six → ${shareUrl()}`;

  // Without the link, for the X intent (which takes url separately).
  const shareText = () =>
    `I've called the World Cup 2026 🏆\n\n${lines()}\n\nBoldness ×${avgMult} — reckon you know better? Make your six:`;

  // URL of the server-rendered share image, carrying the six picks as params.
  const shareImageUrl = () => {
    const d = CATEGORIES.map((c) => {
      const p = picks[c.id];
      const m = p ? multFor(c.id, p.entityId) : undefined;
      return {
        s: c.short,
        f: p?.flag ?? "🏳️",
        n: p?.name ?? "—",
        m: m?.multiplier ?? 1,
        t: m?.tier.cls ?? "common",
        l: m?.tier.label ?? "COMMON",
      };
    });
    const q = new URLSearchParams({
      name: displayName,
      handle,
      boldness: avgMult ?? "0.0",
      d: JSON.stringify(d),
    });
    return `/api/og/share?${q.toString()}`;
  };

  // Fetch the server-rendered PNG and open the native share sheet WITH the
  // image (SPEC §6). Falls back to a text+link share, then to copying the link.
  const nativeShare = async () => {
    if (sharing) return;
    setSharing(true);
    const url = shareUrl();
    try {
      let file: File | null = null;
      try {
        const res = await fetch(shareImageUrl());
        if (res.ok) {
          const blob = await res.blob();
          file = new File([blob], "called-it.png", { type: "image/png" });
        }
      } catch {
        /* image fetch failed — fall through to link share */
      }

      if (
        file &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        // Most apps DROP text when an image is attached (iOS/WhatsApp/IG), so
        // copy the caption to the clipboard — it's then one paste away.
        try {
          await navigator.clipboard.writeText(caption());
          setPasteHint(true);
          setTimeout(() => setPasteHint(false), 6000);
        } catch {
          /* clipboard blocked — image still shares */
        }
        await navigator.share({ files: [file], text: caption() });
      } else if (navigator.share) {
        await navigator.share({ title: "CALLED IT.", text: shareText(), url });
      } else {
        await copyLink();
      }
    } catch {
      /* user dismissed the sheet — no-op */
    } finally {
      setSharing(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(caption());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const waHref = () => `https://wa.me/?text=${encodeURIComponent(caption())}`;
  const xHref = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText()
    )}&url=${encodeURIComponent(shareUrl())}`;

  if (activeCat) {
    const pool = poolForCategory(activeCat.id, data);
    return (
      <main className="main">
        <Picker
          cat={activeCat}
          pool={pool}
          mults={mults.get(activeCat.id) ?? new Map()}
          selectedId={picks[activeCat.id]?.entityId ?? null}
          onPick={(entity) => {
            onPick(activeCat.id, entity);
            setLastPicked(activeCat.id);
            setActiveCat(null);
          }}
          onBack={() => setActiveCat(null)}
        />
      </main>
    );
  }

  return (
    <>
      {celebrate && <Confetti />}
      <main className="main">
        <h1 className="headline">
          SIX CALLS.
          <br />
          <span className="headline-accent">ONE SUMMER.</span>
        </h1>
        <p className="intro">
          Collect your six. The fewer people who agree with you, the rarer the
          sticker — and the more it&apos;s worth when you&apos;re right.
        </p>

        <div className="grid">
          {CATEGORIES.map((c, i) => {
            const p = picks[c.id];
            const rot = ROTATIONS[i];
            if (!p) {
              return (
                <button
                  key={c.id}
                  className="slot"
                  style={{ ["--rot" as string]: `${rot}deg` }}
                  onClick={() => !locked && setActiveCat(c)}
                  disabled={locked}
                >
                  <span className="slot-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="slot-cat">{c.short}</span>
                  <span className="slot-cta">TAP TO PICK</span>
                </button>
              );
            }
            const m = multFor(c.id, p.entityId);
            const cls = m?.tier.cls ?? "common";
            return (
              <button
                key={c.id}
                className={`sticker ${cls} ${
                  lastPicked === c.id ? "slap" : ""
                } ${locked ? "foil" : ""}`}
                style={{ ["--rot" as string]: `${rot}deg` }}
                onClick={() => !locked && setActiveCat(c)}
                disabled={locked}
              >
                <span className="stk-cat">{c.short}</span>
                <span className="stk-flag">{p.flag}</span>
                <span className="stk-name">{p.name}</span>
                <span className={`stk-tier ${cls}`}>
                  {m?.tier.label} ×{m?.multiplier}
                </span>
                {locked && m && (
                  <span className="stk-pop">{m.pct}% agree</span>
                )}
              </button>
            );
          })}
        </div>

        {!locked ? (
          <>
            <button
              className={`primary ${complete ? "" : "disabled"}`}
              disabled={!complete}
              onClick={lockIn}
            >
              {complete ? "LOCK MY SIX" : `${doneCount} OF 6 COLLECTED`}
            </button>
            {complete && (
              <p className="footnote">
                Locked means locked. Everyone&apos;s picks stay hidden until
                kickoff.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="bold-strip">
              <span>BOLDNESS RATING</span>
              <span className="bold-val">×{avgMult}</span>
            </div>
            <button className="primary" onClick={nativeShare} disabled={sharing}>
              {sharing ? "PREPARING…" : "SHARE MY SIX"}
            </button>
            {pasteHint && (
              <p className="paste-hint">
                📋 Caption copied — paste it with your post.
              </p>
            )}
            <div className="share-row">
              <a className="share-btn" href={waHref()} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a className="share-btn" href={xHref()} target="_blank" rel="noreferrer">
                X
              </a>
              <button className="share-btn" onClick={copyLink}>
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </div>
            <p className="footnote">
              Straight to the group chat. Receipts dated and timestamped.
            </p>
          </>
        )}
      </main>
    </>
  );
}
