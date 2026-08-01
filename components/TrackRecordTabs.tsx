"use client";
import { useState } from "react";
import LeagueBadge from "@/components/LeagueBadge";
import WorldCupProof from "@/components/WorldCupProof";
import type { LeagueStats, TrackRecordRow } from "@/lib/types";
import { IS_CUP, LEAGUE_NAMES } from "@/lib/types";

const PICK_SHORT = { home: "H", draw: "D", away: "A" } as const;

export default function TrackRecordTabs({ rows, stats }: { rows: TrackRecordRow[]; stats: LeagueStats[] }) {
  const [tab, setTab] = useState<"current" | "history">("current");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setTab("current")}
          className={tab === "current"
            ? "border border-accent bg-accent px-5 py-2.5 font-display text-lg tracking-wider text-bg transition-colors"
            : "border border-line px-5 py-2.5 font-display text-lg tracking-wider text-ink transition-colors hover:border-accent hover:text-accent"}
        >
          CURRENT
        </button>
        <button
          onClick={() => setTab("history")}
          className={tab === "history"
            ? "border border-accent bg-accent px-5 py-2.5 font-display text-lg tracking-wider text-bg transition-colors"
            : "border border-line px-5 py-2.5 font-display text-lg tracking-wider text-ink transition-colors hover:border-accent hover:text-accent"}
        >
          HISTORY
        </button>
      </div>

      {tab === "current" ? (
        <div className="space-y-10">
          {stats.length > 0 && (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s) => (
                <div key={s.league} className="border border-line bg-panel p-4">
                  <p className="font-data text-[10px] uppercase tracking-widest text-ink">
                    {s.league === "ALL" ? "All leagues" : LEAGUE_NAMES[s.league]}
                  </p>
                  <p className="mt-2 font-display text-3xl leading-none text-accent">
                    {(s.accuracy * 100).toFixed(1)}%
                  </p>
                  <p className="mt-1 font-data text-[11px] text-ink">{s.correct}/{s.settled} correct</p>
                </div>
              ))}
            </section>
          )}
          <div className="max-w-2xl border border-line bg-panel p-3 font-data text-xs text-muted">
            How we settle predictions: League fixtures (PL, Championship, League One, League Two)
            settle on the 90-minute result — a draw after 90 minutes is a draw. Cup fixtures (FA
            Cup, League Cup, Community Shield) settle on the final outcome including penalty
            shootouts where applicable — the winner advances.
          </div>
          <section className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="border border-line bg-panel px-6 py-10 text-center">
                <p className="font-display text-xl text-ink">No settled predictions yet</p>
                <p className="mt-1 font-data text-xs text-ink">Check back after opening weekend — 14 August</p>
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
                  {rows.map(({ fixture, prediction, result }) => (
                    <tr key={fixture.match_id} className="border-b border-line/60 hover:bg-panel">
                      <td className="py-2 pr-4 text-ink">{fixture.kickoff_utc.slice(0, 10)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1">
                          <LeagueBadge league={fixture.league} />
                          {IS_CUP[fixture.league] && (
                            <span className="border border-line px-1 py-0.5 font-data text-[8px] uppercase tracking-widest text-muted">
                              CUP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{fixture.home_team} v {fixture.away_team}</td>
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
