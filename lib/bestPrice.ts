/**
 * Shared best-price logic (spec v3 2.2). One function used by the homepage
 * cards (server), the outcome tiles and the Best Odds panel (client), so a
 * card and its match page never disagree. Pure: no server-only imports.
 *
 * Order is partner bookmakers first (best price first), then the rest by price
 * (Nav decision, 22 Nov 2026). The top row is "the best odds" everywhere.
 */
import type { CtaAffiliate } from "./affiliates";
import { bookmakerName } from "./bookmakers";

export type Outcome = "home" | "draw" | "away";

export interface PriceRow {
  bookmaker: string;
  prices: Partial<Record<Outcome, number | null>>;
  fetchedAt?: string | null;
  cta: CtaAffiliate | null;
}

export interface PricedBook {
  bookmaker: string;
  name: string;
  price: number;
  /** 100 / decimal odds (includes bookmaker margin). */
  implied: number;
  /** A real partner deal (not a stand-in fallback), so the row can be a tracked link. */
  partner: boolean;
  cta: CtaAffiliate | null;
}

export interface BestPrice {
  best: PricedBook | null;
  list: PricedBook[];
  /** Latest snapshot time across the rows used. */
  at: string | null;
}

export const isPartnerCta = (cta: CtaAffiliate | null | undefined) => !!cta && !cta.isFallback;

export function bestPrice(rows: PriceRow[], outcome: Outcome): BestPrice {
  const list = rows
    .map((r) => {
      const price = r.prices[outcome];
      return typeof price === "number" && price > 1
        ? { bookmaker: r.bookmaker, name: bookmakerName(r.bookmaker), price, implied: 100 / price, partner: isPartnerCta(r.cta), cta: r.cta }
        : null;
    })
    .filter((b): b is PricedBook => b !== null)
    .sort((a, b) => Number(b.partner) - Number(a.partner) || b.price - a.price);
  const at = rows.reduce<string | null>((acc, r) => (r.fetchedAt && (!acc || r.fetchedAt > acc) ? r.fetchedAt : acc), null);
  return { best: list[0] ?? null, list, at };
}

/** Market probability per outcome from the best price on each (the convention the EV maths uses). */
export function marketFromBest(rows: PriceRow[]): Record<Outcome, number> | null {
  const top = (o: Outcome) => Math.max(...rows.map((r) => r.prices[o] ?? NaN).filter((n) => Number.isFinite(n) && (n as number) > 1) as number[]);
  const h = top("home"), d = top("draw"), a = top("away");
  return Number.isFinite(h) && Number.isFinite(d) && Number.isFinite(a) ? { home: 1 / h, draw: 1 / d, away: 1 / a } : null;
}
