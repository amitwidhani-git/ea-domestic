"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import AccuracyDonut from "@/components/AccuracyDonut";
import LeagueBadge from "@/components/LeagueBadge";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import WorldCupProof from "@/components/WorldCupProof";
import type { League, LeagueStats, TrackRecordRow } from "@/lib/types";
import { IS_CUP, LEAGUE_NAMES } from "@/lib/types";

const PICK_SHORT = { home: "H", draw: "D", away: "A" } as const;
// The six competitions we show a mini-ring for, underneath the dominant
// "All competitions" ring — mirrors the World Cup tab's dominant-ring +
// stage-rings layout. FA Cup isn't included here; it has no settled picks
// yet this early in the season, unlike the other five.
const RING_LEAGUES: League[] = ["PL", "CH", "L1", "L2", "LC", "CS"];

export default function TrackRecordTabs({
  rows, stats, coverage,
}: {
  rows: TrackRecordRow[];
  stats: LeagueStats[];
  coverage?: { predicting: number; totalFinished: number };
}) {
  const [tab, setTab] = useState<"current" | "history">("current");
  // Selecting a ring filters the results table to that competition — null
  // means "All competitions" (the dominant ring's own selection state).
  const [leagueFilter, setLeagueFilter] = useState<League | null>(null);
  const withoutPrediction = coverage ? coverage.totalFinished - coverage.predicting : 0;
  const tableRef = useRef<HTMLElement>(null);

  function selectLeague(lg: League | null) {
    setLeagueFilter((cur) => (cur === lg ? null : lg));
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filteredRows = leagueFilter ? rows.filter((r) => r.fixture.league === leagueFilter) : rows;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setTab("current")}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${
            tab === "current" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"
          }`}
        >
          Current
        </button>
        <button
          onClick={() => setTab("history")}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${
            tab === "history" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"
          }`}
        >
          History
        </button>
      </div>

      {tab === "current" ? (
        <div className="space-y-10">
          {stats.length > 0 && (() => {
            const all = stats.find((s) => s.league === "ALL");
            const allPct = all ? Math.round(all.accuracy * 100) : 0;
            return (
              <div>
                {/* Dominant "All competitions" ring — same layout as the World Cup tab's headline ring */}
                {all && (
                  <button
                    type="button"
                    onClick={() => selectLeague(null)}
                    className={`mb-4 flex w-full flex-wrap items-center gap-6 rounded-[14px] border bg-panel px-6 py-6 text-left shadow-[var(--shadow)] transition-colors ${
                      leagueFilter === null ? "border-accent" : "border-accent/30 hover:border-accent/60"
                    }`}
                  >
                    <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
                      <AccuracyDonut pct={allPct} size={140} stroke={14} emphasize />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-4xl leading-none text-accent">{allPct}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-display text-3xl leading-none text-ink">{all.correct}/{all.settled}</p>
                      <p className="mt-1 font-data text-[11px] uppercase tracking-widest text-ink">All competitions · Correct picks</p>
                      <p className="mt-3 max-w-md font-body text-sm text-ink">
                        Aggregate stats and recent results are always public. Every pick is logged before
                        kick-off, hashed and time-stamped.
                      </p>
                      {coverage && coverage.totalFinished > 0 && (
                        <p className="mt-2 max-w-md font-data text-[10px] text-muted">
                          Predicting {coverage.predicting} of {coverage.totalFinished} fixtures played this season
                          {withoutPrediction > 0 && ` · ${withoutPrediction} without prediction (fixtures added after freeze window)`}
                        </p>
                      )}
                    </div>
                  </button>
                )}

                {/* Six smaller rings underneath — one per competition, same size/style as the World Cup stage rings */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {RING_LEAGUES.map((lg) => {
                    const s = stats.find((x) => x.league === lg);
                    const pct = s ? Math.round(s.accuracy * 100) : null;
                    const perfect = !!s && s.settled > 0 && s.correct === s.settled;
                    const selected = leagueFilter === lg;
                    return (
                      <button
                        type="button"
                        key={lg}
                        onClick={() => selectLeague(lg)}
                        aria-pressed={selected}
                        className={`flex flex-col items-center rounded-[14px] border p-3 text-center shadow-[var(--shadow)] transition-colors ${
                          selected
                            ? "border-accent bg-accent/10"
                            : perfect
                              ? "border-accent/60 bg-accent/5 hover:border-accent"
                              : "border-line bg-panel hover:border-muted"
                        }`}>
                        <div className="relative" style={{ width: 88, height: 88 }}>
                          <AccuracyDonut pct={pct ?? 0} size={88} stroke={8} emphasize={perfect || selected} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`font-display text-xl leading-none ${perfect || selected ? "text-accent" : "text-ink"}`}>
                              {pct != null ? `${pct}%` : "—"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 font-data text-[9px] uppercase tracking-widest text-ink">{LEAGUE_NAMES[lg]}</p>
                        <p className="mt-1 font-data text-[10px] text-ink">{s ? `${s.correct}/${s.settled} correct` : "No settled picks yet"}</p>
                      </button>
                    );
                  })}
                </section>
              </div>
            );
          })()}
          <LivescorebetPromo />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[14px] border border-line bg-panel p-6 shadow-[var(--shadow)]">
              <h3 className="font-display text-xl tracking-wide">How We Settle Predictions</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                League fixtures such as Premier League, Championship etc. settle on the 90-minute
                result, a draw after 90 minutes is a draw. Cup fixtures such as FA Cup, League Cup,
                Community Shield settle on the final outcome including penalty shootouts where
                applicable, resulting in the winner advancing.
              </p>
            </div>
            <div className="rounded-[14px] border border-line bg-panel p-6 shadow-[var(--shadow)]">
              <h3 className="font-display text-xl tracking-wide">What does EdgeIQ publish, and when?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                EdgeIQ publishes a model output and an edge percentage for every fixture, before
                kick-off. Every single one goes into the audit log. Nothing is added afterward.
                Nothing is removed. The record is immutable, auditable, and timestamped. What you
                get is an unbiased, data-led read on every match, checkable against the record,
                and against live market odds.
              </p>
            </div>
          </div>
          <section ref={tableRef} className="scroll-mt-20 overflow-x-auto">
            <div className="mb-3 flex items-center gap-2 font-data text-xs">
              <span className="text-muted">Showing:</span>
              <span className="font-semibold text-ink">{leagueFilter ? LEAGUE_NAMES[leagueFilter] : "All competitions"}</span>
              {leagueFilter && (
                <button type="button" onClick={() => selectLeague(null)} className="text-accent-ink hover:underline">
                  Clear ✕
                </button>
              )}
            </div>
            {rows.length === 0 ? (
              <div className="rounded-[14px] border border-line bg-panel px-6 py-10 text-center">
                <p className="font-display text-xl text-ink">No settled predictions yet</p>
                <p className="mt-1 font-data text-xs text-ink">Check back after opening weekend — 14 August</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[14px] border border-line bg-panel px-6 py-10 text-center">
                <p className="font-display text-xl text-ink">No settled predictions for {LEAGUE_NAMES[leagueFilter!]} yet</p>
                <button type="button" onClick={() => selectLeague(null)} className="mt-2 font-data text-xs text-accent-ink hover:underline">
                  Clear filter →
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[700px] border-collapse font-data text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-ink">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Lg</th>
                    <th className="py-2 pr-4">Match</th>
                    <th className="py-2 pr-4">Pick</th>
                    <th className="py-2 pr-4">FT</th>
                    <th className="py-2 pr-4">Frozen</th>
                    <th className="py-2 pr-4">Hash</th>
                    <th className="py-2">✓</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ fixture, prediction, result }) => (
                    <tr key={fixture.match_id} className="border-b border-line/60 hover:bg-panel">
                      <td className="py-2 pr-4 text-ink">{fixture.kickoff_utc.slice(0, 10)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1">
                          <LeagueBadge league={fixture.league} />
                          {IS_CUP[fixture.league] && (
                            <span className="rounded-md border border-line px-1 py-0.5 font-data text-[8px] uppercase tracking-widest text-muted">
                              CUP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <Link href={`/teams/${fixture.home_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{fixture.home_team}</Link> v <Link href={`/teams/${fixture.away_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{fixture.away_team}</Link>
                      </td>
                      <td className="py-2 pr-4">{PICK_SHORT[prediction.pick]} ({(prediction.probs[prediction.pick] * 100).toFixed(0)}%)</td>
                      <td className="py-2 pr-4">
                        {IS_CUP[fixture.league] && result.penalty_score
                          ? `${result.fthg}–${result.ftag} (p: ${result.penalty_score.home}–${result.penalty_score.away})`
                          : `${result.fthg}–${result.ftag}`}
                      </td>
                      <td className="py-2 pr-4 text-ink">{prediction.frozen_at.slice(0, 16).replace("T", " ")}Z</td>
                      <td className="py-2 pr-4 text-ink">{prediction.hash.slice(0, 8)}</td>
                      <td className={`py-2 font-bold ${prediction.model_correct ? "text-accent" : "text-loss"}`}>
                        {prediction.model_correct ? "✓" : "✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : (
        <WorldCupProof
          intro="Edge Analysts created the EdgeIQ model and have already tested it at the highest level. Every prediction below was frozen ahead of kick-off across all 104 World Cup matches. Here's exactly how it played out, round by round."
        />
      )}
    </div>
  );
}
