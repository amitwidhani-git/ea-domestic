"use client";
import { useEffect, useState, useMemo } from "react";
import LeagueBadge from "@/components/LeagueBadge";
import FrozenStamp from "@/components/FrozenStamp";
import ProbBar from "@/components/ProbBar";
import BestOddsBar from "@/components/BestOddsBar";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import type { League } from "@/lib/types";

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

const LEAGUES: (League | "ALL")[] = ["ALL", "PL", "CH", "L1", "L2"];
const PICK_LABEL = { home: "H", draw: "D", away: "A" } as const;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | "ALL">("ALL");
  const [filter, setFilter] = useState<"ALL" | "LOCKED" | "PENDING" | "SETTLED">("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule").then((r) => r.json()),
      fetch("/api/affiliates").then((r) => r.json()).catch(() => []),
    ]).then(([schedule, affs]) => {
      setRows(schedule);
      setAffiliates(affs);
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
          All {rows.length} fixtures across four divisions, updated as the season unfolds. Every
          prediction is frozen before kick-off and permanently time-stamped. Nothing is ever
          revised.
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
      <div className="flex flex-wrap gap-2">
        {LEAGUES.map((lg) => (
          <button key={lg} onClick={() => setLeague(lg)}
            className={`border px-3 py-1 font-data text-xs tracking-widest transition-colors ${league === lg ? "border-accent text-accent" : "border-line text-ink hover:border-muted hover:text-ink"}`}>
            {lg}
          </button>
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
      {grouped.map(([key, week, weekRows]) => (
        <section key={key}>
          <h2 className="mb-3 font-data text-[11px] uppercase tracking-widest text-ink border-b border-line pb-2">
            {week}
          </h2>
          <div className="divide-y divide-line/60 border border-line">
            {weekRows.map((row) => {
              const state = predState(row);
              const p = row.prediction;
              return (
                <div key={row.match_id} className="flex flex-col">
                <div className="flex gap-2 px-4 py-3 sm:flex-row sm:items-center">
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

                  {/* middle: prob bar (only when locked/settled) */}
                  <div className="w-full sm:w-40">
                    {p ? (
                      <ProbBar probs={p.probs} pick={p.pick} />
                    ) : (
                      <p className="font-data text-[10px] text-ink">Prediction pending</p>
                    )}
                  </div>

                  {/* right: state indicator */}
                  <div className="flex flex-col items-end gap-1 sm:w-48">
                    {state === "LOCKED" && p && (
                      <>
                        <span className="font-data text-xs text-accent">
                          {PICK_LABEL[p.pick]} ({(p.probs[p.pick] * 100).toFixed(0)}%)
                        </span>
                        <FrozenStamp frozenAt={p.frozen_at} hash={p.hash} />
                      </>
                    )}
                    {state === "SETTLED" && p && (
                      <div className="flex items-center gap-2">
                        <span className={`font-display text-xl ${p.model_correct ? "text-accent" : "text-loss"}`}>
                          {p.model_correct ? "✓" : "✗"}
                        </span>
                        <span className="font-data text-xs text-ink">
                          {PICK_LABEL[p.pick]} ({(p.probs[p.pick] * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                    {state === "PENDING" && (
                      <span className="font-data text-[10px] text-ink">Locks 48h before KO</span>
                    )}
                  </div>
                </div>
                {affiliates.length > 0 && state !== "SETTLED" && (
                  <div className="border-t px-4 pb-2" style={{ borderColor: "rgba(247,245,240,0.06)" }}>
                    <BestOddsBar matchId={row.match_id} affiliates={affiliates as any} />
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <BetMazePromo />
    </div>
  );
}
