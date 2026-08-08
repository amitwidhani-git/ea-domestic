"use client";
import { useState } from "react";

interface OddsRow {
  bookmaker: string;
  displayName: string;
  prices: { home: number; draw: number; away: number };
  impliedProbs: { home: number; draw: number; away: number };
  overround: number;
  fetchedAt: string;
}

type Outcome = "home" | "draw" | "away";
const OUTCOMES: Outcome[] = ["home", "draw", "away"];

// e.g. "08 Aug 12:00"
function formatOddsTime(iso: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}

const shortName = (display: string) => display.split(" ")[0];
const price = (o: OddsRow, k: Outcome): number | null =>
  typeof o.prices?.[k] === "number" ? o.prices[k] : null;

export default function OddsPanel({
  matchId, homeTeam, awayTeam, modelProbs, ev, selection, bestPrice,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  modelProbs?: { home: number; draw: number; away: number };
  ev?: number;
  selection?: Outcome;
  bestPrice?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [odds, setOdds] = useState<OddsRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  function open() {
    setIsOpen(true);
    if (odds === null && !loading) {
      setLoading(true);
      fetch(`/api/odds/${encodeURIComponent(matchId)}`)
        .then((r) => r.json())
        .then((data: OddsRow[]) => setOdds(Array.isArray(data) ? data : []))
        .catch(() => setOdds([]))
        .finally(() => setLoading(false));
    }
  }

  const toggleClass =
    "flex min-h-[44px] w-full cursor-pointer items-center justify-center font-data text-[10px] text-muted transition-colors hover:text-accent";

  if (!isOpen) {
    return (
      <div className="border-t border-line">
        <button type="button" onClick={open} className={toggleClass}>
          Compare odds ▾
        </button>
      </div>
    );
  }

  // Highest price per outcome (best for the bettor) and who offers it.
  const bestFor = (k: Outcome): { price: number; name: string } | null => {
    if (!odds || !odds.length) return null;
    let b: { price: number; name: string } | null = null;
    for (const o of odds) {
      const v = price(o, k);
      if (v !== null && (!b || v > b.price)) b = { price: v, name: o.displayName };
    }
    return b;
  };
  const bestByOutcome: Record<Outcome, { price: number; name: string } | null> = {
    home: bestFor("home"), draw: bestFor("draw"), away: bestFor("away"),
  };

  // Model's favoured outcome = highest probability.
  const modelPick: Outcome | null = modelProbs
    ? OUTCOMES.reduce((mx, k) => (modelProbs[k] > modelProbs[mx] ? k : mx), "home" as Outcome)
    : null;

  const outcomeName = (k: Outcome) => (k === "draw" ? "Draw" : k === "home" ? homeTeam : awayTeam);

  const latestFetched = odds && odds.length
    ? odds.reduce((a, o) => (o.fetchedAt > a ? o.fetchedAt : a), odds[0].fetchedAt)
    : "";

  const priceCell = (o: OddsRow, k: Outcome) => {
    const v = price(o, k);
    const isBest = v !== null && bestByOutcome[k]?.price != null && v === bestByOutcome[k]!.price;
    return (
      <td className={`w-14 px-1 text-center tabular-nums ${isBest ? "font-semibold text-accent" : "text-ink"}`}>
        {v !== null ? v.toFixed(2) : "—"}
      </td>
    );
  };

  return (
    <div className="border-t border-line bg-panel2">
      {loading && !odds ? (
        <div className="space-y-2 px-3 py-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-line/60" />
          ))}
        </div>
      ) : !odds || odds.length === 0 ? (
        <p className="px-3 py-4 text-center font-data text-xs text-muted">No bookmaker odds available yet.</p>
      ) : (
        <div className="space-y-4 px-3 pt-3">
          {/* Section 1 — Model Prediction */}
          {modelProbs && (
            <div>
              <p className="font-data text-[9px] uppercase tracking-widest text-muted">Model Prediction</p>
              <div className="mt-2 space-y-1.5">
                {OUTCOMES.map((k) => {
                  const p = modelProbs[k];
                  const isMax = k === modelPick;
                  const label = k === "draw" ? "Draw" : `${k === "home" ? homeTeam : awayTeam} to win`;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 truncate font-data text-xs text-ink">{label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded bg-line/30">
                        <div className={`h-full ${isMax ? "bg-accent" : "bg-line"}`} style={{ width: `${p * 100}%` }} />
                      </div>
                      <span className={`w-9 shrink-0 text-right font-data text-xs ${isMax ? "text-accent" : "text-muted"}`}>
                        {(p * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {modelPick && (
                <p className="mt-2 font-data text-xs text-ink">
                  Model pick: {modelPick === "draw" ? "Draw" : `${modelPick === "home" ? "Home" : "Away"} win`} ({(modelProbs[modelPick] * 100).toFixed(0)}%)
                </p>
              )}
            </div>
          )}

          {/* Section 2 — Best Available Odds */}
          <div>
            <p className="font-data text-[9px] uppercase tracking-widest text-muted">Best Available Odds</p>
            <div className="mt-2 space-y-1">
              {OUTCOMES.map((k) => {
                const b = bestByOutcome[k];
                const isPick = modelPick === k;
                return (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate font-data text-xs text-ink">{outcomeName(k)}</span>
                    <span className={`shrink-0 font-data text-sm font-semibold ${isPick ? "text-accent" : "text-ink"}`}>
                      {b ? b.price.toFixed(2) : "—"}
                    </span>
                    <span className="w-24 shrink-0 truncate text-right font-data text-[10px] text-muted">{b ? b.name : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3 — EV Signal */}
          {ev != null && ev > 0.05 && selection && bestPrice != null && modelProbs && (
            <div className="rounded border border-accent/40 bg-accent/5 p-2 font-data text-xs text-ink">
              ⚡ Value signal: {outcomeName(selection)} @ {bestPrice.toFixed(2)} — model {(modelProbs[selection] * 100).toFixed(1)}% vs implied {((1 / bestPrice) * 100).toFixed(1)}% (+{(ev * 100).toFixed(1)}% edge)
            </div>
          )}

          {/* Section 4 — Full bookmaker table */}
          <div className="border-t border-line pt-3">
            <p className="font-data text-[9px] uppercase tracking-widest text-muted">All Bookmaker Prices</p>
            <div className="mt-2 max-h-80 overflow-auto">
              <table className="w-full border-collapse font-data text-xs">
                <thead className="sticky top-0 bg-panel2">
                  <tr className="text-[9px] uppercase tracking-widest text-muted">
                    <th className="max-w-[120px] py-1 pr-2 text-left font-normal">Bookmaker</th>
                    <th className="w-14 px-1 text-center font-normal">
                      Home<span className="block max-w-[52px] truncate normal-case tracking-normal text-[8px]">{homeTeam}</span>
                    </th>
                    <th className="w-14 px-1 text-center font-normal">Draw</th>
                    <th className="w-14 px-1 text-center font-normal">
                      Away<span className="block max-w-[52px] truncate normal-case tracking-normal text-[8px]">{awayTeam}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {odds.map((o) => (
                    <tr key={o.bookmaker} className="h-9 border-t border-line/50">
                      <td className="max-w-[120px] truncate py-1 pr-2 text-xs text-muted">
                        <span className="sm:hidden">{shortName(o.displayName)}</span>
                        <span className="hidden sm:inline">{o.displayName}</span>
                      </td>
                      {priceCell(o, "home")}
                      {priceCell(o, "draw")}
                      {priceCell(o, "away")}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div>
            <p className="font-data text-[9px] text-muted">Odds updated: {formatOddsTime(latestFetched)}</p>
            <p className="font-data text-[9px] text-muted">Prices from The Odds API. Verify before betting. 18+</p>
          </div>
        </div>
      )}

      <button type="button" onClick={() => setIsOpen(false)} className={toggleClass}>
        Close ▴
      </button>
    </div>
  );
}
