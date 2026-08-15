"use client";
import { useState } from "react";
import Link from "next/link";
import type { SettledEvSignal } from "@/lib/types";

function pickLabel(s: { selection: "home" | "draw" | "away"; home_team: string; away_team: string }): string {
  if (s.selection === "draw") return "Draw";
  return `${s.selection === "home" ? s.home_team : s.away_team} to win`;
}

function settledPnl(s: SettledEvSignal): number {
  if (s.settled_result === "WIN") return s.best_price - 1;
  if (s.settled_result === "LOSE") return -1;
  return 0; // VOID — stake returned
}

// Feature toggle — hidden from the page entirely until this is "true".
// Set NEXT_PUBLIC_SETTLED_SIGNALS_ENABLED=true to show the section.
const SETTLED_SIGNALS_ENABLED = process.env.NEXT_PUBLIC_SETTLED_SIGNALS_ENABLED === "true";

export default function SettledSignalsSection(props: { settled: SettledEvSignal[] }) {
  // Hook-free gate so the early return never sits above conditional hooks.
  if (!SETTLED_SIGNALS_ENABLED) return null;
  return <SettledSignalsSectionInner {...props} />;
}

function SettledSignalsSectionInner({ settled }: { settled: SettledEvSignal[] }) {
  const [open, setOpen] = useState(false); // still defaults collapsed once shown

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Settled Odds Value Signals</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink">
            Every Value Signal we&apos;ve published, win or lose, the auditable record.
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="shrink-0 rounded-full border border-line px-4 py-2 font-body text-[13px] font-semibold text-muted transition-colors hover:border-muted hover:text-ink"
        >
          {open ? "Hide" : "Show"} settled results
        </button>
      </div>

      {open && (
        settled.length === 0 ? (
          <p className="mt-4 font-data text-xs text-ink">No settled value signals yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-data text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-ink">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Match</th>
                  <th className="py-2 pr-4">Selection</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((s) => {
                  const pnl = settledPnl(s);
                  return (
                    <tr key={`${s.match_id}-${s.selection}`} className="border-b border-line/60 hover:bg-panel">
                      <td className="py-2 pr-4 text-ink">{s.created_at.slice(0, 10)}</td>
                      <td className="py-2 pr-4 text-ink">
                        <Link href={`/teams/${s.home_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{s.home_team}</Link> v <Link href={`/teams/${s.away_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{s.away_team}</Link>
                      </td>
                      <td className="py-2 pr-4 text-ink">{pickLabel(s)}</td>
                      <td className="py-2 pr-4 text-ink">{s.best_price.toFixed(2)}</td>
                      <td className={`py-2 pr-4 font-bold ${s.settled_result === "WIN" ? "text-accent" : s.settled_result === "LOSE" ? "text-loss" : "text-ink"}`}>
                        {s.settled_result}
                      </td>
                      <td className={`py-2 font-bold ${pnl > 0 ? "text-accent" : pnl < 0 ? "text-loss" : "text-ink"}`}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
