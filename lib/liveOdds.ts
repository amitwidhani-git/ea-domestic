/**
 * Decimal-odds -> win-probability conversion, applied client-side only.
 * Removes bookmaker overround by normalising the implied probabilities back
 * to 100% rather than trusting their raw (always >100%) sum. Mongo keeps the
 * raw decimal odds; nothing server-side ever converts them.
 */
export interface OddsTriple {
  home: number;
  draw: number;
  away: number;
}

export interface ProbTriple {
  home: number;
  draw: number;
  away: number;
}

export function oddsToProb({ home, draw, away }: OddsTriple): ProbTriple {
  const raw = [1 / home, 1 / draw, 1 / away];
  const sum = raw.reduce((s, v) => s + v, 0);
  const [h, d, a] = raw.map((v) => Math.round((v / sum) * 100));
  return { home: h, draw: d, away: a };
}

/** Signed percentage-point delta, e.g. +8 or -5, null if either side is missing. */
export function probDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

export function oddsDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 100) / 100;
}
