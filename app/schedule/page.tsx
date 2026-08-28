"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import LeagueBadgeRail from "@/components/LeagueBadgeRail";
import FrozenStamp from "@/components/FrozenStamp";
import ProbBar from "@/components/ProbBar";
import OddsPanel from "@/components/OddsPanel";
import MatchWidget from "@/components/MatchWidget";
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
import { useBackFrom } from "@/lib/useBackFrom";
import { formatMinute } from "@/lib/matchEvents";
import { IS_CUP, type League } from "@/lib/types";

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
  home_team_id: string | null;
  away_team_id: string | null;
  status: string;
  score: { home: number | null; away: number | null };
  penalty_score: { home: number; away: number } | null;
  api_fixture_id: number | null;
  prediction: {
    probs: { home: number; draw: number; away: number };
    pick: "home" | "draw" | "away";
    frozen_at: string;
    hash: string;
    model_correct: boolean | null;
  } | null;
}

interface LiveScore {
  apiFixtureId: number;
  status: string;
  elapsed: number | null;
  extra: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: string;
  awayTeam: string;
}

const DAY_MS = 86_400_000;

function todayWindowUtc(): { start: number; end: number } {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { start, end: start + DAY_MS };
}

type LeagueFilter = "ALL" | League;

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

// useBackFrom() (via useSearchParams) needs a Suspense boundary for static
// generation — this thin wrapper is the boundary, SchedulePageInner holds
// all the actual page logic.
export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
  );
}

function SchedulePageInner() {
  const backFrom = useBackFrom();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<LeagueFilter>("ALL");
  const [filter, setFilter] = useState<"ALL" | "LOCKED" | "PENDING" | "SETTLED">("ALL");
  const [liveScores, setLiveScores] = useState<Map<number, LiveScore>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMatchday, setIsMatchday] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/schedule").then((r) => r.json()).then((schedule) => {
      setRows(schedule);
      setLoading(false);
    });
  }, []);

  // Matchday flag: any fixture kicking off today, checked once the schedule loads.
  useEffect(() => {
    if (rows.length === 0) return;
    const { start, end } = todayWindowUtc();
    const hasToday = rows.some((r) => {
      const t = new Date(r.kickoff_utc).getTime();
      return t >= start && t < end;
    });
    setIsMatchday(hasToday);
  }, [rows]);

  // Live-score polling: only while today has fixtures, and only while the
  // clock is within (earliest today kickoff - 15min, latest today kickoff + 120min).
  useEffect(() => {
    if (!isMatchday) return;

    const { start, end } = todayWindowUtc();
    const todayKickoffs = rows
      .filter((r) => {
        const t = new Date(r.kickoff_utc).getTime();
        return t >= start && t < end;
      })
      .map((r) => new Date(r.kickoff_utc).getTime());

    if (todayKickoffs.length === 0) return;

    const windowStart = Math.min(...todayKickoffs) - 15 * 60_000;
    const windowEnd = Math.max(...todayKickoffs) + 120 * 60_000;

    function poll() {
      fetch("/api/live-scores")
        .then((r) => r.json())
        .then((data: { fixtures: LiveScore[] }) => {
          setLiveScores(new Map((data.fixtures ?? []).map((f) => [f.apiFixtureId, f])));
          setLastUpdated(new Date());
        })
        .catch(() => {});
    }

    function tick() {
      const now = Date.now();
      if (now < windowStart) return; // too early — nothing to poll yet
      if (now > windowEnd) {
        setLiveScores(new Map()); // window closed — drop any stale live overlays
        return;
      }
      poll();
    }

    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [isMatchday, rows]);

  // Separate 1s ticker purely so "updated Xs ago" counts up smoothly between polls.
  useEffect(() => {
    if (!isMatchday || !lastUpdated) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isMatchday, lastUpdated]);

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
      <LeagueBadgeRail value={league} onChange={setLeague} />
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-2">
        {isMatchday && lastUpdated ? (
          <span className="font-data text-xs text-muted">
            <span className="text-green-400">●</span> Live · updated{" "}
            {Math.max(0, Math.round((nowTick - lastUpdated.getTime()) / 1000))}s ago
          </span>
        ) : <span />}
        <span className="font-data text-xs text-ink">{filtered.length} fixtures</span>
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
        <section key={key} className={weekIndex === 0 ? "-mt-6" : undefined}>
          <Promo key={promoId} />
          <h2 className="mb-3 mt-4 font-data text-[11px] uppercase tracking-widest text-ink border-b border-line pb-2">
            {week}
          </h2>
          <div className="overflow-hidden rounded-[14px] border border-line bg-panel shadow-[var(--shadow)] divide-y divide-line/60">
            {weekRows.map((row) => {
              const state = predState(row);
              const p = row.prediction;
              const live = row.api_fixture_id != null ? liveScores.get(row.api_fixture_id) : undefined;
              return (
                <div key={row.match_id}>
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                  {/* left: league + teams + time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LeagueBadge league={row.league} />
                      <span className="font-data text-[10px] text-ink">{kickoffLabel(row.kickoff_utc)}</span>
                      {live && (
                        <span className="inline-flex items-center gap-1 border border-green-500/60 px-1.5 py-0.5 font-data text-[9px] text-green-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" aria-hidden="true" />
                          {live.status === "HT" ? "HT" : live.elapsed != null ? formatMinute(live.elapsed, live.extra) : "LIVE"}
                        </span>
                      )}
                    </div>
                    <p className="relative font-display text-lg leading-tight tracking-wide truncate">
                      <Link href={`/matches/${row.match_id}?from=${backFrom}`} aria-label={`Match centre: ${row.home_team} v ${row.away_team}`} className="absolute inset-0 z-10" />
                      {row.home_team_id ? (
                        <Link href={`/teams/${row.home_team_id}`} className="relative z-20 underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{row.home_team}</Link>
                      ) : row.home_team}{" "}
                      <span className="text-ink">v</span>{" "}
                      {row.away_team_id ? (
                        <Link href={`/teams/${row.away_team_id}`} className="relative z-20 underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{row.away_team}</Link>
                      ) : row.away_team}
                    </p>
                    {!live && row.status === "FINISHED" && row.score.home !== null && (
                      <p className="mt-0.5 font-data text-sm font-semibold">
                        {row.score.home} – {row.score.away}
                      </p>
                    )}
                  </div>

                  {/* right: prob bar on top, pick/lock commentary beneath — matches Home page card */}
                  <div className="w-full space-y-2 sm:w-96">
                    {live ? (
                      <div className="flex items-center gap-3">
                        <span className="font-display text-3xl text-accent">
                          {live.homeScore ?? 0} – {live.awayScore ?? 0}
                        </span>
                        {p && (
                          <span className="font-data text-xs text-ink">
                            EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[p.pick]}</span>
                          </span>
                        )}
                      </div>
                    ) : p ? (
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
                          <div className="space-y-1">
                            <p className="font-display text-lg text-ink">
                              {row.score.home}–{row.score.away}
                              {IS_CUP[row.league] && row.penalty_score && (
                                <span className="ml-2 font-data text-xs text-muted">
                                  (pens {row.penalty_score.home}–{row.penalty_score.away})
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`font-display text-lg ${p.model_correct ? "text-accent" : "text-loss"}`}>
                                {p.model_correct ? "✓" : "✗"}
                              </span>
                              <span className="font-data text-xs text-ink">
                                EdgeIQ Prediction: <span className="text-ink">{PICK_LABEL[p.pick]}</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="font-data text-[10px] text-ink">
                        Prediction pending · locks before kick-off
                      </p>
                    )}
                    {(state === "LOCKED" || state === "SETTLED") && (
                      <div className="text-right">
                        <Link href={`/insights#match-${row.match_id}`} className="font-data text-[10px] text-muted hover:text-accent">
                          View analysis →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                {IS_CUP[row.league] && state === "LOCKED" && (
                  <p className="font-data text-[9px] text-muted italic px-4 pb-2">
                    Cup prediction — settles on final result inc. penalties
                  </p>
                )}
                {state !== "SETTLED" && (
                  <OddsPanel
                    matchId={row.match_id}
                    homeTeam={row.home_team}
                    awayTeam={row.away_team}
                    modelProbs={row.prediction?.probs}
                  />
                )}
                {state !== "SETTLED" && (
                  <MatchWidget
                    matchId={row.match_id}
                    homeTeam={row.home_team}
                    awayTeam={row.away_team}
                    homeTeamId={row.home_team_id ?? ""}
                    awayTeamId={row.away_team_id ?? ""}
                    kickoffUtc={row.kickoff_utc}
                    modelProbs={row.prediction?.probs}
                    modelPick={row.prediction?.pick}
                    currentScore={live ? { home: live.homeScore ?? 0, away: live.awayScore ?? 0 } : null}
                    status={live?.status ?? row.status}
                    elapsed={live?.elapsed ?? null}
                  />
                )}
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
