"use client";
import { Fragment, useId, useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import StatsInsights from "@/components/StatsInsights";
import { useBackFrom } from "@/lib/useBackFrom";
import { NL_TIER_LABEL, nlTierFromRound } from "@/lib/leagues";
import { trackAffiliateClick } from "@/lib/gtag";
import LeagueBadge from "@/components/LeagueBadge";
import BookmakerLogo from "@/components/BookmakerLogo";
import { bookmakerName } from "@/lib/bookmakers";
import { LEAGUE_NAMES, type EvOutcome, type EvSignal } from "@/lib/types";
import type { CtaAffiliate } from "@/lib/affiliates";
import { SIDES, TOOLTIP, fmtPp, pct, shortCode } from "@/lib/marketDisplay";

export type OddsFormat = "frac" | "dec";

interface OddsRow {
  bookmaker: string;
  displayName: string;
  prices: { home: number | null; draw: number | null; away: number | null };
  cta: CtaAffiliate | null;
}

// ---- odds display helpers ------------------------------------------------
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
function decToFrac(dec: number): string {
  const x = dec - 1;
  if (x <= 0) return dec.toFixed(2);
  if (Math.abs(x - 1) < 1e-9) return "Evens";
  let best = { a: 1, b: 1, e: Infinity };
  for (let b = 1; b <= 20; b++) {
    const a = Math.round(x * b);
    if (a < 1) continue;
    const e = Math.abs(a / b - x);
    if (e < best.e - 1e-9) best = { a, b, e };
  }
  const g = gcd(best.a, best.b) || 1;
  return `${best.a / g}/${best.b / g}`;
}
function showPrice(dec: number | null | undefined, fmt: OddsFormat): string {
  if (dec == null) return "—";
  return fmt === "frac" ? decToFrac(dec) : dec.toFixed(2);
}

// ---- icons ---------------------------------------------------------------
const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const TrendUp = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const fmtBook = bookmakerName;

function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")}`;
}

// "Nations League • League A" (tier derived from round), falling back to the
// raw round string for knockout rounds that don't carry a single tier.
function nlCompetitionLabel(round: string | null | undefined): string {
  const tier = nlTierFromRound(round);
  return tier ? `Nations League • ${NL_TIER_LABEL[tier]}` : round ? `Nations League • ${round}` : "Nations League";
}

function outcomeName(signal: EvSignal, o: EvOutcome): string {
  return o.selection === "draw" ? "Draw" : o.selection === "home" ? signal.home_team : signal.away_team;
}

// ---- EdgeIQ model / Market now / Best odds table ---------------------------
// Best odds cell: the best price at a partner bookmaker is the tracked link
// (same /go/ route and affiliate_click event as before). With no partner
// price for that outcome, the best other bookmaker's price is shown, named,
// with no link, so a price is never attributed to a stand-in partner.
function OddsCell({ signal, outcome, oddsFmt, highlight, refined = false }: { signal: EvSignal; outcome: EvOutcome; oddsFmt: OddsFormat; highlight: boolean; refined?: boolean }) {
  if (!(outcome.best_price > 0)) return <span className="font-data text-xs text-muted">-</span>;
  if (outcome.cta && !outcome.cta.isFallback) {
    return (
      <a
        href={`/go/${outcome.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
        onClick={() => trackAffiliateClick({ bookmaker: outcome.cta!.affiliateId, matchId: signal.match_id, league: signal.league, odds: outcome.best_price })}
        title={`${bookmakerName(outcome.cta.affiliateId)} ${showPrice(outcome.best_price, oddsFmt)}`}
        className={`relative z-20 inline-flex items-center justify-end gap-1.5 rounded-[8px] px-2 py-1 font-data text-[13px] ${refined ? "font-semibold" : "font-bold"} transition-[filter] hover:brightness-105 active:brightness-95 ${
          highlight ? "bg-[var(--ea-signal)] text-accent-fg" : "border border-line text-ink hover:border-muted"
        }`}
      >
        <BookmakerLogo cta={outcome.cta} name={bookmakerName(outcome.cta.affiliateId)} />
        {showPrice(outcome.best_price, oddsFmt)}
      </a>
    );
  }
  return (
    <span className="inline-flex items-center justify-end gap-1.5 px-2 py-1 font-data text-[13px] text-muted" title={fmtBook(outcome.best_bookmaker)}>
      <span className={refined ? "max-w-[64px] truncate text-[10.5px]" : "max-w-[64px] truncate text-[9.5px] uppercase tracking-wide"}>{fmtBook(outcome.best_bookmaker)}</span>
      {showPrice(outcome.best_price, oddsFmt)}
    </span>
  );
}

function OutcomeTable({ signal, oddsFmt }: { signal: EvSignal; oddsFmt: OddsFormat }) {
  const th = "pb-1.5 text-right font-data text-[9.5px] font-semibold uppercase tracking-widest text-[var(--ea-muted)]";
  return (
    <table className="mb-3 w-full table-fixed border-collapse">
      <thead>
        <tr>
          <th className={`${th} w-[34%] text-left`}><span className="sr-only">Outcome</span></th>
          <th className={th} title={TOOLTIP.model}>EdgeIQ<span className="hidden sm:inline"> model</span></th>
          <th className={th} title={TOOLTIP.marketNow}><span className="sm:hidden">Mkt</span><span className="hidden sm:inline">Market now</span></th>
          <th className={`${th} w-[30%]`} title={TOOLTIP.bestOdds}><span className="sm:hidden">Odds</span><span className="hidden sm:inline">Best odds</span></th>
        </tr>
      </thead>
      <tbody>
        {SIDES.map((sel) => {
          const o = signal.outcomes[sel];
          const name = outcomeName(signal, o);
          const isPick = signal.model.selection === sel;
          return (
            <tr key={sel} className="border-t border-line/60">
              <td className="py-1.5 pr-2">
                <span className="flex min-w-0 items-center gap-1.5 font-body text-[13px] font-semibold">
                  <span className="truncate sm:hidden">{shortCode(name)}</span>
                  <span className="hidden truncate sm:inline">{name}</span>
                  {isPick && <span className="shrink-0 rounded bg-[var(--ea-pick)]/15 text-[var(--ea-pick)] px-1 py-px font-data text-[8.5px] font-bold uppercase tracking-wide">Pick</span>}
                </span>
              </td>
              <td className="py-1.5 text-right font-data text-[13.5px] font-semibold text-[var(--ea-model)]">{pct(o.model_prob)}</td>
              <td className="py-1.5 text-right font-data text-[13.5px] text-[var(--ea-market)]">{pct(o.market_prob)}</td>
              <td className="py-1.5 pl-2 text-right">
                <OddsCell signal={signal} outcome={o} oddsFmt={oddsFmt} highlight={sel === signal.bestValue.selection} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Value Signal: the single outcome with the highest EV (bestValue already
// clears MIN_EV on the server), shown as model minus market in pp.
function ValueSignalPill({ signal, refined = false }: { signal: EvSignal; refined?: boolean }) {
  const o = signal.outcomes[signal.bestValue.selection];
  const gap = (o.model_prob - o.market_prob) * 100;
  if (!(Math.round(gap) > 0)) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--ea-signal)]/10 px-2.5 py-1 font-data text-xs ${refined ? "font-medium" : "font-semibold"} text-accent-ink`}>
      <TrendUp /> Value Signal {outcomeName(signal, o)} {fmtPp(gap)}
    </span>
  );
}

// ---- homepage feed row -----------------------------------------------------
// Desktop feed columns, shared with the list header in EdgesExplorer so every
// fixture's EdgeIQ / market / odds columns line up under one set of labels.
export const FEED_COLS = "lg:grid-cols-[128px_minmax(0,1fr)_440px] xl:grid-cols-[140px_minmax(0,1fr)_500px]";
export const FEED_NUM_COLS = "lg:grid-cols-[minmax(0,1fr)_64px_72px_100px] xl:grid-cols-[minmax(0,1fr)_72px_80px_108px]";

// Outcome-per-row table (name · EdgeIQ · market · best odds) at every width; the
// column labels sit in each block below lg and once over the whole feed on lg.
const ROW = ["row-start-2", "row-start-3", "row-start-4"];

function FeedOutcomes({ signal, oddsFmt }: { signal: EvSignal; oddsFmt: OddsFormat }) {
  const th = "row-start-1 pb-1.5 text-right font-body text-[11px] font-medium text-[var(--ea-muted)] lg:hidden";
  // The first outcome row drops its rule on lg, where the fixture row's own rule sits just above it.
  const rule = (i: number) => `border-t border-line/60 ${i === 0 ? "lg:border-t-0" : ""}`;
  const cell = "flex items-center justify-end py-1.5 font-data text-[13px]";
  return (
    <div className={`mb-2.5 grid grid-cols-[minmax(0,1fr)_52px_56px_96px] ${FEED_NUM_COLS} lg:mb-0`}>
      <span className={`${th} col-start-2`} title={TOOLTIP.model}>EdgeIQ</span>
      <span className={`${th} col-start-3`} title={TOOLTIP.marketNow}>Market</span>
      <span className={`${th} col-start-4`} title={TOOLTIP.bestOdds}>Best odds</span>
      {SIDES.map((sel, i) => {
        const o = signal.outcomes[sel];
        const name = outcomeName(signal, o);
        const isPick = signal.model.selection === sel;
        return (
          <Fragment key={sel}>
            <span className={`${ROW[i]} ${rule(i)} col-start-1 flex min-w-0 items-center gap-1.5 py-1.5 pr-2 font-body text-[13px] font-medium`}>
              <span className="truncate sm:hidden">{shortCode(name)}</span>
              <span className="hidden truncate sm:inline" title={name}>{name}</span>
              {isPick && <span className="shrink-0 rounded bg-[var(--ea-pick)]/15 text-[var(--ea-pick)] px-1.5 py-px font-body text-[10px] font-semibold">Pick</span>}
            </span>
            <span className={`${cell} ${ROW[i]} ${rule(i)} col-start-2 font-medium text-[var(--ea-model)]`} title={TOOLTIP.model}>
              <span className="sr-only">EdgeIQ {name}: </span>{pct(o.model_prob)}
            </span>
            <span className={`${cell} ${ROW[i]} ${rule(i)} col-start-3 text-[var(--ea-market)]`} title={TOOLTIP.marketNow}>
              <span className="sr-only">Market {name}: </span>{pct(o.market_prob)}
            </span>
            <span className={`${cell} ${ROW[i]} ${rule(i)} col-start-4`}>
              <span className="sr-only">Best odds {name}: </span>
              <OddsCell signal={signal} outcome={o} oddsFmt={oddsFmt} highlight={sel === signal.bestValue.selection} refined />
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Desktop column labels, once above a feed of flat rows (same grid as each row's outcome table). */
export function FeedHeader() {
  return (
    <div aria-hidden="true" className={`hidden items-end gap-x-6 pb-2 lg:grid ${FEED_COLS}`}>
      <div className={`col-start-3 grid ${FEED_NUM_COLS} whitespace-nowrap text-right font-body text-[11px] font-medium text-muted`}>
        <span className="col-start-2" title={TOOLTIP.model}>EdgeIQ model</span>
        <span className="col-start-3" title={TOOLTIP.marketNow}>Market now</span>
        <span className="col-start-4" title={TOOLTIP.bestOdds}>Best odds</span>
      </div>
    </div>
  );
}

// ---- component -----------------------------------------------------------
export default function ValueSignalCard({
  signal, oddsFmt, featured = false, flat = false,
}: {
  signal: EvSignal;
  oddsFmt: OddsFormat;
  featured?: boolean;
  /** Homepage feed: a flat row per fixture on desktop (see FEED_COLS), a compact unboxed card below lg. */
  flat?: boolean;
}) {
  const backFrom = useBackFrom();
  const [drawer, setDrawer] = useState<null | "compare" | "audit" | "stats">(null);
  const [odds, setOdds] = useState<OddsRow[] | null>(null);
  const [loadingOdds, setLoadingOdds] = useState(false);
  // A failed request is its own state, not "no prices": odds stays null so reopening or Retry fetches again.
  const [oddsError, setOddsError] = useState(false);
  const drawerId = useId();

  function loadOdds() {
    setLoadingOdds(true);
    setOddsError(false);
    fetch(`/api/odds/${encodeURIComponent(signal.match_id)}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data: OddsRow[]) => setOdds(Array.isArray(data) ? data : []))
      .catch(() => setOddsError(true))
      .finally(() => setLoadingOdds(false));
  }

  function toggleCompare() {
    setDrawer((d) => (d === "compare" ? null : "compare"));
    if (odds === null && !loadingOdds) loadOdds();
  }

  // Partner bookmakers first (best price on the value outcome first), then
  // everyone else by the same price, so the top row is the one the bold
  // "best" cell on that column refers to.
  const isPartner = (o: OddsRow) => !!o.cta && !o.cta.isFallback;
  const cmpRows = (odds ?? [])
    .filter((o) => o.prices.home != null || o.prices.draw != null || o.prices.away != null)
    .sort((a, b) =>
      Number(isPartner(b)) - Number(isPartner(a)) ||
      (b.prices[signal.bestValue.selection] ?? -Infinity) - (a.prices[signal.bestValue.selection] ?? -Infinity));
  const bestValueBook = cmpRows[0]?.prices[signal.bestValue.selection] != null ? cmpRows[0] : null;

  const drawers = (
    <>
      {/* compare drawer — full 1x2 table so every outcome's prices are visible at once */}
      {drawer === "compare" && (
        <div id={`${drawerId}-compare`} aria-busy={loadingOdds} className={`overflow-x-auto ${flat ? "mt-4" : "mt-3 border-t border-line pt-3"}`}>
          <p className="mb-2 font-data text-[10.5px] uppercase tracking-wide text-muted">All bookmaker prices</p>
          {loadingOdds ? (
            // Placeholder rows at table-row height, so the drawer opens to roughly its final size.
            <div className="space-y-px" role="status">
              <span className="sr-only">Loading prices…</span>
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[29px] animate-pulse rounded-[4px] bg-chip/60" />)}
            </div>
          ) : oddsError ? (
            <p className="flex items-center gap-3 font-data text-xs text-muted" role="alert">
              Couldn&apos;t load bookmaker prices.
              <button type="button" onClick={loadOdds} className="font-body font-medium text-accent-ink underline-offset-4 hover:underline">Retry</button>
            </p>
          ) : cmpRows.length === 0 ? (
            <p className="font-data text-xs text-muted">No bookmaker prices available yet.</p>
          ) : (
            <table className="w-full min-w-[420px] border-collapse font-data text-xs">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-widest text-muted">
                  <th className="pb-1.5 pr-2 font-semibold">Bookmaker</th>
                  <th className="pb-1.5 px-2 text-right font-semibold">{signal.home_team}</th>
                  <th className="pb-1.5 px-2 text-right font-semibold">Draw</th>
                  <th className="pb-1.5 pl-2 text-right font-semibold">{signal.away_team}</th>
                </tr>
              </thead>
              <tbody>
                {cmpRows.map((r) => {
                  const isBestRow = bestValueBook?.bookmaker === r.bookmaker;
                  return (
                    <tr key={r.bookmaker} className="border-t border-line/60">
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{r.displayName}</span>
                          {/* Only a genuine (non-fallback) affiliate match gets a Bet button
                              here — with ~20 books listed, defaulting every row to the same
                              partner would misleadingly imply we're partnered with all of them. */}
                          {r.cta && !r.cta.isFallback && (
                            <a href={`/go/${r.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
                              onClick={() => trackAffiliateClick({ bookmaker: r.cta!.affiliateId, matchId: signal.match_id, league: signal.league, odds: r.prices[signal.bestValue.selection] })}
                              className="flex items-center gap-1 rounded-[6px] border border-accent/40 px-1.5 py-0.5 font-data text-[10px] font-bold text-accent-ink hover:bg-accent/10">
                              <BookmakerLogo cta={r.cta} name={r.displayName} /> Bet
                            </a>
                          )}
                        </div>
                      </td>
                      {(["home", "draw", "away"] as const).map((sel) => (
                        <td
                          key={sel}
                          className={`px-2 py-1.5 text-right ${sel === signal.bestValue.selection && isBestRow ? "font-bold text-accent-ink" : ""}`}
                        >
                          {showPrice(r.prices[sel], oddsFmt)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* audit drawer */}
      {drawer === "audit" && (
        <div id={`${drawerId}-audit`} className={`flex flex-col font-data text-xs ${flat ? "mt-4 gap-4 lg:max-w-md" : "mt-3 gap-3 border-t border-line pt-3"}`}>
          <div className="flex flex-col gap-2">
            <p className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">Model pick</p>
            <Row k="Model probability" v={`${(signal.model.model_prob * 100).toFixed(1)}%`} />
            <Row k="Market probability" v={`${(signal.model.market_prob * 100).toFixed(1)}%`} />
            <Row k="Best price" v={`${showPrice(signal.model.best_price, oddsFmt)} · ${fmtBook(signal.model.best_bookmaker)}`} />
          </div>
          {!signal.sameAsModel && (
            <div className={`flex flex-col gap-2 ${flat ? "" : "border-t border-line/60 pt-2"}`}>
              <p className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">Best value</p>
              <Row k="Model probability" v={`${(signal.bestValue.model_prob * 100).toFixed(1)}%`} />
              <Row k="Market probability" v={`${(signal.bestValue.market_prob * 100).toFixed(1)}%`} />
              <Row k="Best price" v={`${showPrice(signal.bestValue.best_price, oddsFmt)} · ${fmtBook(signal.bestValue.best_bookmaker)}`} />
            </div>
          )}
        </div>
      )}

      {/* stats drawer */}
      {drawer === "stats" && (
        <div id={`${drawerId}-stats`} className={flat ? "mt-2" : "border-t border-line"}>
          <StatsInsights
            homeTeamId={signal.home_team_id}
            awayTeamId={signal.away_team_id}
            league={signal.league}
            season={signal.season}
            homeTeam={signal.home_team}
            awayTeam={signal.away_team}
          />
        </div>
      )}
    </>
  );

  const toolButtons = (
    <>
      <button type="button" onClick={toggleCompare} aria-expanded={drawer === "compare"} aria-controls={`${drawerId}-compare`} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink aria-expanded:text-ink">
        Compare books <Chevron open={drawer === "compare"} />
      </button>
      {!flat && <span className="text-line">|</span>}
      <button type="button" onClick={() => setDrawer((d) => (d === "audit" ? null : "audit"))} aria-expanded={drawer === "audit"} aria-controls={`${drawerId}-audit`} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink aria-expanded:text-ink">
        Audit <Chevron open={drawer === "audit"} />
      </button>
      {!flat && <span className="text-line">|</span>}
      <button type="button" onClick={() => setDrawer((d) => (d === "stats" ? null : "stats"))} aria-expanded={drawer === "stats"} aria-controls={`${drawerId}-stats`} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink aria-expanded:text-ink">
        Stats <Chevron open={drawer === "stats"} />
      </button>
    </>
  );

  const competition = signal.league === "NL" ? nlCompetitionLabel(signal.round) : LEAGUE_NAMES[signal.league] ?? signal.league;
  const matchHref = `/matches/${signal.match_id}?from=${backFrom}`;

  // Homepage feed: one row per fixture on desktop (columns shared with the list header via FEED_COLS),
  // the same cells stacked into a compact card below lg.
  if (flat) {
    return (
      <article className={`relative min-w-0 lg:grid ${FEED_COLS} lg:items-center lg:gap-x-6 lg:border-t lg:border-line/60 lg:py-4`}>
        {/* competition + kick-off */}
        <div className="mb-2.5 flex items-center gap-2 lg:mb-0 lg:flex-col lg:items-start lg:gap-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <LeagueBadge league={signal.league} />
            <span className="min-w-0 truncate font-body text-xs font-medium text-muted" title={competition}>{competition}</span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-data text-xs text-muted lg:ml-0">
            {signal.kickoff_utc && kickoffLabel(signal.kickoff_utc)}
            <span title="Frozen before kick-off"><Lock /></span>
          </span>
        </div>

        {/* teams: side by side on mobile, stacked home over away in the desktop row */}
        <div className="relative mb-3 flex items-center gap-2.5 lg:mb-0 lg:flex-col lg:items-stretch lg:gap-1.5">
          <Link href={matchHref} aria-label={`Match centre: ${signal.home_team} v ${signal.away_team}`} className="absolute inset-0 z-10" />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
            <ClubCrest apiFootballId={signal.home_api_football_id} clubName={signal.home_team} size={24} />
            <Link href={`/teams/${signal.home_team_id}`} title={signal.home_team} className="relative z-20 truncate hover:text-accent">{signal.home_team}</Link>
          </div>
          <span className="font-data text-[11px] text-muted lg:hidden">v</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[15px] font-semibold tracking-[-0.01em] lg:flex-row-reverse lg:justify-end lg:text-left">
            <Link href={`/teams/${signal.away_team_id}`} title={signal.away_team} className="relative z-20 truncate hover:text-accent">{signal.away_team}</Link>
            <ClubCrest apiFootballId={signal.away_api_football_id} clubName={signal.away_team} size={24} />
          </div>
        </div>

        <FeedOutcomes signal={signal} oddsFmt={oddsFmt} />

        {/* signal, analysis link and tools: one line on desktop, full row width at lg, under the teams from xl */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 lg:col-span-3 lg:col-start-1 lg:mt-2 lg:gap-x-4 xl:col-span-2 xl:col-start-2 xl:gap-x-5">
          <ValueSignalPill signal={signal} refined />
          <Link href={matchHref} className="order-2 ml-auto inline-flex items-center gap-1 font-body text-[12.5px] font-medium text-ink underline-offset-4 hover:underline lg:order-last">
            View Market Analysis <Arrow />
          </Link>
          <div className="order-3 flex w-full items-center gap-5 font-body text-xs [&_button]:py-1.5 [&_button]:font-medium lg:order-2 lg:w-auto lg:gap-4 xl:gap-5">
            {toolButtons}
          </div>
          <span className="order-4 inline-flex w-full items-center gap-1.5 font-body text-[11px] text-muted lg:order-3 lg:w-auto">
            <Lock /> Logged pre-kick-off · never revised
          </span>
        </div>

        {drawer && <div className="lg:col-span-3 lg:col-start-1 xl:col-span-2 xl:col-start-2">{drawers}</div>}
      </article>
    );
  }

  return (
    <article
      className={`relative flex flex-col rounded-[14px] border bg-panel p-4 transition-colors ${featured ? "border-accent" : "border-line hover:border-muted"}`}
      style={{ boxShadow: "var(--shadow)" }}
    >
      {/* top row */}
      <div className="mb-3.5 flex items-center gap-2">
        <LeagueBadge league={signal.league} />
        <span className="min-w-0 truncate font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">{competition}</span>
        {signal.kickoff_utc && <span className="ml-auto shrink-0 font-data text-xs text-muted">{kickoffLabel(signal.kickoff_utc)}</span>}
        <span className="shrink-0 text-muted" title="Frozen before kick-off"><Lock /></span>
      </div>

      {/* teams — the whole title area links to the match centre */}
      <div className="relative mb-3.5 flex items-center gap-2.5">
        <Link href={matchHref} aria-label={`Match centre: ${signal.home_team} v ${signal.away_team}`} className="absolute inset-0 z-10" />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[15.5px] font-semibold">
          <ClubCrest apiFootballId={signal.home_api_football_id} clubName={signal.home_team} size={26} />
          <Link href={`/teams/${signal.home_team_id}`} className="relative z-20 truncate hover:text-accent">{signal.home_team}</Link>
        </div>
        <span className="font-data text-[11px] text-muted">v</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[15.5px] font-semibold">
          <Link href={`/teams/${signal.away_team_id}`} className="relative z-20 truncate hover:text-accent">{signal.away_team}</Link>
          <ClubCrest apiFootballId={signal.away_api_football_id} clubName={signal.away_team} size={26} />
        </div>
      </div>

      <OutcomeTable signal={signal} oddsFmt={oddsFmt} />

      {/* Spacer: the grid stretches cards in a row to equal height, so this pushes
          the signal, tools and footer to the bottom and lines them up across cards. */}
      <div className="mt-auto" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-2">
        <ValueSignalPill signal={signal} />
        <Link href={matchHref}
          className="ml-auto inline-flex items-center gap-1 rounded-[9px] border border-line px-3 py-1.5 font-body text-xs font-semibold text-ink transition-colors hover:border-muted">
          View Market Analysis <Arrow />
        </Link>
      </div>

      {/* tools */}
      <div className="mt-2.5 flex items-center gap-3.5 font-data text-xs">
        {toolButtons}
      </div>

      {drawers}

      <span className="mt-3 inline-flex items-center gap-1.5 border-t border-line pt-3 font-data text-[11px] text-muted">
        <Lock /> Logged pre-kick-off · never revised
      </span>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span><span>{v}</span>
    </div>
  );
}
