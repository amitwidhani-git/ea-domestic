"use client";
import { useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import { useBackFrom } from "@/lib/useBackFrom";
import type { EvOutcome, EvSignal } from "@/lib/types";
import type { CtaAffiliate } from "@/lib/affiliates";

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

// Small branded badge so a CTA's real destination is always clear — including
// when it's a stand-in partner (Betano/LiveScoreBet) rather than the priced book.
// Betano gets its real "B" logomark (cropped from the wordmark asset); everyone
// else still falls back to the initials chip until a mark is available for them.
function AffiliateLogo({ cta }: { cta: CtaAffiliate }) {
  if (cta.affiliateId?.toLowerCase() === "betano") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-[3px]"
        title={cta.name}
      >
        <img src="/betano-mark.png" alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-data text-[9px] font-bold leading-none"
      style={{ background: cta.brandColor ?? "#ffffff", color: "#0E1521" }}
      title={cta.name}
    >
      {cta.logoInitials}
    </span>
  );
}

const fmtBook = (id: string) => id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")}`;
}

function outcomeName(signal: EvSignal, o: EvOutcome): string {
  return o.selection === "draw" ? "Draw" : o.selection === "home" ? signal.home_team : signal.away_team;
}

// ---- outcome block (Model pick / Best value) ------------------------------
function OutcomeBlock({
  title, signal, outcome,
}: { title: string; signal: EvSignal; outcome: EvOutcome }) {
  const model = outcome.model_prob * 100;
  const market = outcome.market_prob * 100;
  const edge = model - market;
  const name = outcomeName(signal, outcome);
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 flex items-center gap-2.5 rounded-[10px] border border-line bg-panel2 px-3 py-2.5">
        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">{title}</span>
        <span className="font-data text-sm font-bold">{name}{outcome.selection !== "draw" ? " win" : ""}</span>
        <span className="ml-auto font-data text-lg font-semibold">{model.toFixed(0)}%</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <BarRow label="Model" pct={model} color="var(--accent)" />
        <BarRow label="Market" pct={market} color="var(--muted)" />
        <span
          className={`mt-1 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 font-data text-xs font-semibold ${
            edge > 0 ? "bg-accent/10 text-accent-ink" : "bg-chip text-muted"
          }`}
        >
          {edge > 0 ? <><TrendUp /> +{edge.toFixed(1)}% value on {name}</> : "No value · market fair"}
        </span>
      </div>
    </div>
  );
}

// ---- back CTA --------------------------------------------------------------
function BackCta({
  signal, outcome, oddsFmt, tag, primary,
}: { signal: EvSignal; outcome: EvOutcome; oddsFmt: OddsFormat; tag?: string; primary: boolean }) {
  const name = outcomeName(signal, outcome);
  if (!outcome.cta) {
    return (
      <div className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-line px-3.5 py-2.5 font-data text-sm text-muted">
        Best price for {name} <span className="ml-auto font-data text-[15px]">{showPrice(outcome.best_price, oddsFmt)}</span>
      </div>
    );
  }
  return (
    <a
      href={`/go/${outcome.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
      className={`mt-2 flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 font-data text-sm font-bold transition-[filter] hover:brightness-105 ${
        primary ? "bg-accent text-accent-fg" : "border border-accent/40 text-accent-ink"
      }`}
    >
      <AffiliateLogo cta={outcome.cta} />
      <span>Back {name}{tag ? <span className="ml-1.5 font-data text-[10px] font-normal uppercase tracking-wide opacity-80">{tag}</span> : null}</span>
      <span className="ml-auto font-data text-[15px]">{showPrice(outcome.best_price, oddsFmt)}</span>
      <span className="flex"><Arrow /></span>
    </a>
  );
}

// ---- component -----------------------------------------------------------
export default function ValueSignalCard({
  signal, oddsFmt, featured = false,
}: {
  signal: EvSignal;
  oddsFmt: OddsFormat;
  featured?: boolean;
}) {
  const backFrom = useBackFrom();
  const [drawer, setDrawer] = useState<null | "compare" | "audit">(null);
  const [odds, setOdds] = useState<OddsRow[] | null>(null);
  const [loadingOdds, setLoadingOdds] = useState(false);

  function toggleCompare() {
    setDrawer((d) => (d === "compare" ? null : "compare"));
    if (odds === null && !loadingOdds) {
      setLoadingOdds(true);
      fetch(`/api/odds/${encodeURIComponent(signal.match_id)}`)
        .then((r) => r.json())
        .then((data: OddsRow[]) => setOdds(Array.isArray(data) ? data : []))
        .catch(() => setOdds([]))
        .finally(() => setLoadingOdds(false));
    }
  }

  // Rows sorted by the actionable outcome's price, so the top row is the one
  // the "Best" tag on that column refers to.
  const cmpRows = (odds ?? [])
    .filter((o) => o.prices.home != null || o.prices.draw != null || o.prices.away != null)
    .sort((a, b) => (b.prices[signal.bestValue.selection] ?? -Infinity) - (a.prices[signal.bestValue.selection] ?? -Infinity));
  const bestValueBook = cmpRows[0]?.prices[signal.bestValue.selection] != null ? cmpRows[0] : null;

  return (
    <article
      className={`relative flex flex-col rounded-[14px] border bg-panel p-4 transition-colors ${featured ? "border-accent" : "border-line hover:border-muted"}`}
      style={{ boxShadow: "var(--shadow)" }}
    >
      {/* top row */}
      <div className="mb-3.5 flex items-center gap-2">
        <span className="rounded-md bg-chip px-1.5 py-1 font-data text-[10.5px] font-semibold tracking-wide text-muted">{signal.league}</span>
        {signal.kickoff_utc && <span className="font-data text-xs text-muted">{kickoffLabel(signal.kickoff_utc)}</span>}
        <span className="ml-auto text-muted" title="Frozen before kick-off"><Lock /></span>
      </div>

      {/* teams — the whole title area links to the match centre */}
      <div className="relative mb-3.5 flex items-center gap-2.5">
        <Link href={`/matches/${signal.match_id}?from=${backFrom}`} aria-label={`Match centre: ${signal.home_team} v ${signal.away_team}`} className="absolute inset-0 z-10" />
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

      {/* EdgeIQ's own pick, always shown */}
      <OutcomeBlock title="Model pick" signal={signal} outcome={signal.model} />
      {/* Best-value outcome, only broken out separately when it differs from the model's pick */}
      {!signal.sameAsModel && <OutcomeBlock title="Best value" signal={signal} outcome={signal.bestValue} />}

      {/* back CTA(s) */}
      {signal.sameAsModel ? (
        <BackCta signal={signal} outcome={signal.bestValue} oddsFmt={oddsFmt} primary />
      ) : (
        <>
          <BackCta signal={signal} outcome={signal.model} oddsFmt={oddsFmt} tag="Model pick" primary={false} />
          <BackCta signal={signal} outcome={signal.bestValue} oddsFmt={oddsFmt} tag="Best value" primary />
        </>
      )}

      {/* tools */}
      <div className="mt-2.5 flex items-center gap-3.5 font-data text-xs">
        <button onClick={toggleCompare} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink">
          Compare books <Chevron open={drawer === "compare"} />
        </button>
        <span className="text-line">|</span>
        <button onClick={() => setDrawer((d) => (d === "audit" ? null : "audit"))} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink">
          Audit <Chevron open={drawer === "audit"} />
        </button>
      </div>

      {/* compare drawer — full 1x2 table so every outcome's prices are visible at once */}
      {drawer === "compare" && (
        <div className="mt-3 overflow-x-auto border-t border-line pt-3">
          <p className="mb-2 font-data text-[10.5px] uppercase tracking-wide text-muted">All bookmaker prices</p>
          {loadingOdds ? (
            <p className="font-data text-xs text-muted">Loading prices…</p>
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
                              className="flex items-center gap-1 rounded-[6px] border border-accent/40 px-1.5 py-0.5 font-data text-[10px] font-bold text-accent-ink hover:bg-accent/10">
                              <AffiliateLogo cta={r.cta} /> Bet
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
          <p className="mt-2.5 font-data text-[10px] text-muted">Prices illustrative · 18+ · Gamble responsibly · BeGambleAware.org</p>
        </div>
      )}

      {/* audit drawer */}
      {drawer === "audit" && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 font-data text-xs">
          <div className="flex flex-col gap-2">
            <p className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">Model pick</p>
            <Row k="Model probability" v={`${(signal.model.model_prob * 100).toFixed(1)}%`} />
            <Row k="Market probability" v={`${(signal.model.market_prob * 100).toFixed(1)}%`} />
            <Row k="Best price" v={`${showPrice(signal.model.best_price, oddsFmt)} · ${fmtBook(signal.model.best_bookmaker)}`} />
          </div>
          {!signal.sameAsModel && (
            <div className="flex flex-col gap-2 border-t border-line/60 pt-2">
              <p className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">Best value</p>
              <Row k="Model probability" v={`${(signal.bestValue.model_prob * 100).toFixed(1)}%`} />
              <Row k="Market probability" v={`${(signal.bestValue.market_prob * 100).toFixed(1)}%`} />
              <Row k="Best price" v={`${showPrice(signal.bestValue.best_price, oddsFmt)} · ${fmtBook(signal.bestValue.best_bookmaker)}`} />
            </div>
          )}
        </div>
      )}

      <span className="mt-3 inline-flex items-center gap-1.5 border-t border-line pt-3 font-data text-[11px] text-muted">
        <Lock /> Logged pre-kick-off · never revised
      </span>
    </article>
  );
}

function BarRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-11 font-data text-[10.5px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="h-[7px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </span>
      <span className="w-9 text-right font-data text-xs">{pct.toFixed(0)}%</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span><span>{v}</span>
    </div>
  );
}
