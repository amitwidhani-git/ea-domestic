"use client";
import { useEffect, useState, useMemo } from "react";
import LeagueBadge, { LEAGUE_LOGO_URL } from "@/components/LeagueBadge";
import FrozenStamp from "@/components/FrozenStamp";
import ProbBar from "@/components/ProbBar";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import SubscribeRegister from "@/components/SubscribeRegister";
import type { League } from "@/lib/types";

// A single strip banner sits above each week's date line. The first match
// week always leads with LiveScoreBet; later weeks draw a randomised pick
// from the full pool so the schedule doesn't repeat the same partner every round.
const STRIP_PROMOS: { id: string; Promo: React.ComponentType }[] = [
  { id: "betano", Promo: BetanoPromo },
  { id: "livescorebet", Promo: LivescorebetPromo },
  { id: "betsuna", Promo: BetsunaPromo },
  { id: "betrino", Promo: BetrinoPromo },
  { id: "mogobet", Promo: MogobetPromo },
  { id: "fruity-king", Promo: FruityKingPromo },
  { id: "monster-sports", Promo: MonsterCasinoPromo },
  { id: "spinzwin", Promo: SpinzwinPromo },
  { id: "betmaze", Promo: BetMazePromo },
];
const FIRST_WEEK_ID = "livescorebet";

// Deterministic PRNG seeded from the week key, so a given week always shows
// the same partner (no reshuffle on re-render/filter) but different weeks vary.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return h;
}
function stripPromoForWeek(weekIndex: number, weekKey: string) {
  if (weekIndex === 0) {
    return STRIP_PROMOS.find((p) => p.id === FIRST_WEEK_ID)!;
  }
  const rand = mulberry32(seedFromKey(weekKey));
  return STRIP_PROMOS[Math.floor(rand() * STRIP_PROMOS.length)];
}

type PredState = "LOCKED" | "PENDING" | "SETTLED";

interface ScheduleRow {
  match_id: string;
  league: League;
  season: string;
  kickoff_utc: string;
  home_team: string;
  away_team: string;
  status: string;
  score: { home: number | null; away: number | null };
  prediction: {
    probs: { home: number; draw: number; away: number };
    pick: "home" | "draw" | "away";
    frozen_at: string;
    hash: string;
    model_correct: boolean | null;
  } | null;
}

type LeagueFilter = "ALL" | League;

const FILTER_GROUPS: { key: LeagueFilter; label: string }[][] = [
  [
    { key: "ALL", label: "All" },
  ],
  [
    { key: "PL", label: "PL" },
    { key: "CH", label: "Championship" },
    { key: "L1", label: "League One" },
    { key: "L2", label: "League Two" },
  ],
  [
    { key: "FAC", label: "FA Cup" },
    { key: "LC", label: "League Cup" },
    { key: "CS", label: "Comm. Shield" },
  ],
];

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;

function predState(row: ScheduleRow): PredState {
  if (!row.prediction) return "PENDING";
  if (row.prediction.model_correct !== null) return "SETTLED";
  return "LOCKED";
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const fri = new Date(d);
  // Football weekend runs Friday–Monday; anchor each group to that Friday
  // (Fri=0 ... Thu=6) so midweek holiday fixtures still fall in the right round.
  fri.setDate(d.getDate() - ((d.getDay() + 2) % 7));
  return fri.toISOString().slice(0, 10);
}

function kickoffLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
  }) + " UK";
}

export default function SchedulePage() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<LeagueFilter>("ALL");
  const [filter, setFilter] = useState<"ALL" | "LOCKED" | "PENDING" | "SETTLED">("ALL");

  useEffect(() => {
    fetch("/api/schedule").then((r) => r.json()).then((schedule) => {
      setRows(schedule);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (league !== "ALL" && r.league !== league) return false;
      if (filter !== "ALL" && predState(r) !== filter) return false;
      return true;
    });
  }, [rows, league, filter]);

  // Group by week
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const r of filtered) {
      const key = weekKey(r.kickoff_utc);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    const fmt = (dt: Date) => dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return [...map.entries()].map(([key, weekRows]) => {
      const times = weekRows.map((r) => new Date(r.kickoff_utc).getTime());
      const label = `Week of ${fmt(new Date(Math.min(...times)))} – ${fmt(new Date(Math.max(...times)))}`;
      return [key, label, weekRows] as const;
    });
  }, [filtered]);

  const counts = useMemo(() => ({
    LOCKED: rows.filter((r) => predState(r) === "LOCKED").length,
    PENDING: rows.filter((r) => predState(r) === "PENDING").length,
    SETTLED: rows.filter((r) => predState(r) === "SETTLED").length,
  }), [rows]);

  return (
    <div className="space-y-8">
      <BetanoPromo />
      <div>
        <h1 className="font-display text-4xl tracking-wide">2026/27 Season Schedule</h1>
        <p className="mt-2 text-sm text-ink max-w-2xl">
          The next {rows.length} fixtures across the four divisions and major cup competitions
          (FA Cup, League Cup, Community Shield), over the coming 20 days. Every prediction is
          frozen before kick-off and permanently time-stamped. Nothing is ever revised.
        </p>
      </div>

      {/* Status summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["LOCKED", "PENDING", "SETTLED"] as const).map((s) => (
          <div key={s} className={`border p-3 cursor-pointer transition-colors ${filter === s ? "border-accent bg-accent/10" : "border-line bg-panel hover:border-muted"}`}
            onClick={() => setFilter(filter === s ? "ALL" : s)}>
            <p className="font-data text-[9px] uppercase tracking-widest text-ink">{s}</p>
            <p className={`mt-1 font-display text-2xl ${s === "LOCKED" ? "text-accent" : s === "SETTLED" ? "text-ink" : "text-ink"}`}>
              {counts[s]}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_GROUPS.map((group, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {i > 0 && <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />}
            {group.map(({ key, label }) => (
              <button key={key} onClick={() => setLeague(key)}
                className={`flex items-center gap-1.5 border px-3 py-1 font-data text-xs tracking-widest transition-colors ${league === key ? "border-accent text-accent" : "border-line text-ink hover:border-muted hover:text-ink"}`}>
                {key === "ALL" ? (
                  <svg width="13" height="12" viewBox="1 -1 62 58" fill="none" aria-hidden="true" className="flex-shrink-0">
                    <path d="M4 22 L32 2 L60 22" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" fill="none" />
                    <path d="M4 38 L32 18 L60 38" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" fill="none" />
                    <path d="M4 54 L32 34 L60 54" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" fill="none" />
                  </svg>
                ) : (
                  <img
                    src={LEAGUE_LOGO_URL[key]}
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                {label}
              </button>
            ))}
          </div>
        ))}
        <span className="ml-auto font-data text-xs text-ink self-center">
          {filtered.length} fixtures
        </span>
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse border border-line bg-panel" />
          ))}
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <p className="font-data text-sm text-ink">No fixtures match the current filter.</p>
      )}

      {/* Fixture table grouped by week */}
      {grouped.map(([key, week, weekRows], weekIndex) => {
        const { id: promoId, Promo } = stripPromoForWeek(weekIndex, key);
        return (
        <section key={key}>
          <Promo key={promoId} />
          <h2 className="mb-3 mt-4 font-data text-[11px] uppercase tracking-widest text-ink border-b border-line pb-2">
            {week}
          </h2>
          <div className="divide-y divide-line/60 border border-line">
            {weekRows.map((row) => {
              const state = predState(row);
              const p = row.prediction;
              return (
                <div key={row.match_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                  {/* left: league + teams + time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LeagueBadge league={row.league} />
                      <span className="font-data text-[10px] text-ink">{kickoffLabel(row.kickoff_utc)}</span>
                    </div>
                    <p className="font-display text-lg leading-tight tracking-wide truncate">
                      {row.home_team} <span className="text-ink">v</span> {row.away_team}
                    </p>
                    {row.status === "FINISHED" && row.score.home !== null && (
                      <p className="mt-0.5 font-data text-sm font-semibold">
                        {row.score.home} – {row.score.away}
                      </p>
                    )}
                  </div>

                  {/* right: prob bar on top, pick/lock commentary beneath — matches Home page card */}
                  <div className="w-full space-y-2 sm:w-96">
                    {p ? (
                      <>
                        <ProbBar probs={p.probs} pick={p.pick} />
                        {state === "LOCKED" && (
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-data text-xs">
                              EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[p.pick]}</span>
                            </span>
                            <FrozenStamp frozenAt={p.frozen_at} hash={p.hash} />
                          </div>
                        )}
                        {state === "SETTLED" && (
                          <div className="flex items-center gap-2">
                            <span className={`font-display text-lg ${p.model_correct ? "text-accent" : "text-loss"}`}>
                              {p.model_correct ? "✓" : "✗"}
                            </span>
                            <span className="font-data text-xs text-ink">
                              EdgeIQ Prediction: <span className="text-ink">{PICK_LABEL[p.pick]}</span>
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="font-data text-[10px] text-ink">
                        Prediction pending · locks 48h before kick-off
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        );
      })}
      <BetMazePromo />

      <SubscribeRegister source="schedule" compact={false} />
    </div>
  );
}
