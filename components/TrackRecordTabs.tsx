"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccuracyDonut from "@/components/AccuracyDonut";
import LeagueBadge from "@/components/LeagueBadge";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import WorldCupProof from "@/components/WorldCupProof";
import { useBackFrom } from "@/lib/useBackFrom";
import type { League, LeagueStats, TrackRecordRow } from "@/lib/types";
import { IS_CUP, LEAGUE_NAMES } from "@/lib/types";
import { COUNTRIES, COUNTRY_LEAGUES, CONTINENTAL_LEAGUES } from "@/lib/leagues";

const PICK_SHORT = { home: "H", draw: "D", away: "A" } as const;

// Middle tier of the ring hierarchy (All competitions → group → individual
// league/cup) — one group per country, plus a catch-all for cross-country
// competitions (Champions League) that don't belong to any single country.
const GROUPS: { label: string; leagues: League[] }[] = [
  ...COUNTRIES.map((country) => ({ label: country, leagues: COUNTRY_LEAGUES[country] })),
  ...(CONTINENTAL_LEAGUES.length > 0 ? [{ label: "Europe", leagues: CONTINENTAL_LEAGUES }] : []),
];

type StatFilter = { kind: "league"; league: League } | { kind: "group"; label: string; leagues: League[] };

function filterLabel(f: StatFilter): string {
  return f.kind === "league" ? LEAGUE_NAMES[f.league] : f.label;
}
function sameFilter(a: StatFilter | null, b: StatFilter): boolean {
  if (!a || a.kind !== b.kind) return false;
  return a.kind === "league" && b.kind === "league" ? a.league === b.league : a.kind === "group" && b.kind === "group" ? a.label === b.label : false;
}

export default function TrackRecordTabs({
  rows, stats, coverage,
}: {
  rows: TrackRecordRow[];
  stats: LeagueStats[];
  coverage?: { predicting: number; totalFinished: number };
}) {
  const router = useRouter();
  const backFrom = useBackFrom();
  const [tab, setTab] = useState<"current" | "history">("current");
  // Selecting a ring filters the results table to that competition or
  // country — null means "All competitions" (the dominant ring's own
  // selection state).
  const [filter, setFilter] = useState<StatFilter | null>(null);
  const withoutPrediction = coverage ? coverage.totalFinished - coverage.predicting : 0;
  const tableRef = useRef<HTMLElement>(null);

  function selectFilter(f: StatFilter | null) {
    setFilter((cur) => (f && sameFilter(cur, f) ? null : f));
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filteredRows = !filter
    ? rows
    : filter.kind === "league"
      ? rows.filter((r) => r.fixture.league === filter.league)
      : rows.filter((r) => filter.leagues.includes(r.fixture.league));

  // Group-level rollups, summed client-side from the already-fetched
  // per-league stats — no separate query needed.
  function groupStat(leagues: League[]) {
    let settled = 0, correct = 0;
    for (const lg of leagues) {
      const s = stats.find((x) => x.league === lg);
      if (s) { settled += s.settled; correct += s.correct; }
    }
    return { settled, correct, accuracy: settled ? correct / settled : 0 };
  }

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
                    onClick={() => selectFilter(null)}
                    className={`mb-4 flex w-full flex-wrap items-center gap-6 rounded-[14px] border bg-panel px-6 py-6 text-left shadow-[var(--shadow)] transition-colors ${
                      filter === null ? "border-accent" : "border-accent/30 hover:border-accent/60"
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

                {/* Group tier — one ring per country plus Europe, summed across each group's leagues + cups */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {GROUPS.map((group) => {
                    const gs = groupStat(group.leagues);
                    const pct = gs.settled > 0 ? Math.round(gs.accuracy * 100) : null;
                    const perfect = gs.settled > 0 && gs.correct === gs.settled;
                    const selected = !!filter && sameFilter(filter, { kind: "group", label: group.label, leagues: group.leagues });
                    return (
                      <button
                        type="button"
                        key={group.label}
                        onClick={() => selectFilter({ kind: "group", label: group.label, leagues: group.leagues })}
                        aria-pressed={selected}
                        className={`flex flex-col items-center rounded-[14px] border p-3 text-center shadow-[var(--shadow)] transition-colors ${
                          selected
                            ? "border-accent bg-accent/10"
                            : perfect
                              ? "border-accent/60 bg-accent/5 hover:border-accent"
                              : "border-line bg-panel hover:border-muted"
                        }`}>
                        <div className="relative" style={{ width: 100, height: 100 }}>
                          <AccuracyDonut pct={pct ?? 0} size={100} stroke={10} emphasize={perfect || selected} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`font-display text-2xl leading-none ${perfect || selected ? "text-accent" : "text-ink"}`}>
                              {pct != null ? `${pct}%` : "—"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 font-data text-[10px] uppercase tracking-widest text-ink">{group.label}</p>
                        <p className="mt-1 font-data text-[10px] text-ink">{gs.settled > 0 ? `${gs.correct}/${gs.settled} correct` : "No settled picks yet"}</p>
                      </button>
                    );
                  })}
                </section>

                {/* League/cup tier, grouped under each country (+ Europe) */}
                {GROUPS.map((group) => (
                  <div key={group.label} className="mt-5">
                    <p className="mb-2.5 font-data text-[10px] uppercase tracking-widest text-muted">{group.label}</p>
                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                      {group.leagues.map((lg) => {
                        const s = stats.find((x) => x.league === lg);
                        const pct = s ? Math.round(s.accuracy * 100) : null;
                        const perfect = !!s && s.settled > 0 && s.correct === s.settled;
                        const selected = !!filter && sameFilter(filter, { kind: "league", league: lg });
                        return (
                          <button
                            type="button"
                            key={lg}
                            onClick={() => selectFilter({ kind: "league", league: lg })}
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
                ))}
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
              <span className="font-semibold text-ink">{filter ? filterLabel(filter) : "All competitions"}</span>
              {filter && (
                <button type="button" onClick={() => selectFilter(null)} className="text-accent-ink hover:underline">
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
                <p className="font-display text-xl text-ink">No settled predictions for {filterLabel(filter!)} yet</p>
                <button type="button" onClick={() => selectFilter(null)} className="mt-2 font-data text-xs text-accent-ink hover:underline">
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
                    <th className="py-2 pr-4">Hash</th>
                    <th className="py-2">✓</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ fixture, prediction, result }) => (
                    <tr
                      key={fixture.match_id}
                      onClick={() => router.push(`/matches/${fixture.match_id}?from=${backFrom}`)}
                      className="cursor-pointer border-b border-line/60 hover:bg-panel"
                    >
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
                        <Link href={`/teams/${fixture.home_team_id}`} onClick={(e) => e.stopPropagation()} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{fixture.home_team}</Link> v <Link href={`/teams/${fixture.away_team_id}`} onClick={(e) => e.stopPropagation()} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{fixture.away_team}</Link>
                      </td>
                      <td className="py-2 pr-4">{PICK_SHORT[prediction.pick]} ({(prediction.probs[prediction.pick] * 100).toFixed(0)}%)</td>
                      <td className="py-2 pr-4">
                        {IS_CUP[fixture.league] && result.penalty_score
                          ? `${result.fthg}–${result.ftag} (p: ${result.penalty_score.home}–${result.penalty_score.away})`
                          : `${result.fthg}–${result.ftag}`}
                      </td>
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
