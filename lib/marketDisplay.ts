/**
 * Shared helpers for the EdgeIQ model / Market / Best odds presentation used
 * by match cards and the match page header panels.
 */

export type Side = "home" | "draw" | "away";
export type Triple = Record<Side, number>;

export const SIDES: Side[] = ["home", "draw", "away"];

/**
 * Value Signal bar: expected value (model prob x best price - 1) an outcome
 * must clear. Every match gets one ev_signals doc per selection, most of them
 * negative EV, so without this floor every match would show.
 */
export const MIN_EV = 0.05;

/** Margin-free probabilities from one decimal-odds triple (normalised implied %). */
export function deVig(odds: Triple | null | undefined): Triple | null {
  if (!odds || !(odds.home > 1) || !(odds.draw > 1) || !(odds.away > 1)) return null;
  const h = 1 / odds.home, d = 1 / odds.draw, a = 1 / odds.away;
  const t = h + d + a;
  return { home: h / t, draw: d / t, away: a / t };
}

/** Percentage-point change from `before` to `after` (both 0-1 probabilities). */
export function ppDiff(after: Triple | null, before: Triple | null): Triple | null {
  if (!after || !before) return null;
  return { home: (after.home - before.home) * 100, draw: (after.draw - before.draw) * 100, away: (after.away - before.away) * 100 };
}

/** 0-1 probability as a whole percent; a small non-zero value reads "<1%", never "0%". */
export const pct = (p: number | null | undefined) =>
  p == null || !Number.isFinite(p) ? "-" : p > 0 && p < 0.005 ? "<1%" : `${Math.round(p * 100)}%`;

/** "+2pp" / "-9pp" / "0pp". */
export function fmtPp(v: number): string {
  const r = Math.round(v);
  return `${r > 0 ? "+" : ""}${r}pp`;
}

/** Three-letter code for compact mobile rows ("Draw" -> DRW). Names only, no data lookup. */
export function shortCode(name: string): string {
  if (name === "Draw") return "DRW";
  const letters = name.replace(/^(FC|AFC|AC|SC|SV|1\.\s*FC)\s+/i, "").replace(/[^A-Za-z]/g, "");
  return letters.slice(0, 3).toUpperCase() || name.slice(0, 3).toUpperCase();
}


export const TOOLTIP = {
  model: "Edge Analysts' pre-match probability, locked at kick-off",
  marketNow: "Implied by the best available bookmaker price. Not margin-adjusted",
  liveMarket: "Derived from live bookmaker odds, not an EdgeIQ prediction",
  closing: "Last bookmaker prices before kick-off. Archived, not available to bet",
  bestOdds: "Best available price, partner bookmakers first",
};
