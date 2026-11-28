"use client";
import { useState } from "react";
import Link from "next/link";
import { bestPrice, type Outcome, type PriceRow } from "@/lib/bestPrice";
import { pct } from "@/lib/marketDisplay";
import type { Fixture } from "@/lib/types";

export interface RelatedFixtures { sameLeague: Fixture[]; homeNext: Fixture | null; awayNext: Fixture | null }

const ukDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/**
 * FAQ (spec v3 4.3): a few factual, data-driven questions per fixture, collapsible.
 * Questions without data behind them are left out.
 */
export function MatchFaq({ home, away, league, kickoffUtc, venue, edgeiq, frozenAt, rows }: {
  home: string; away: string; league: string; kickoffUtc: string | null; venue: string | null;
  edgeiq: Record<Outcome, number> | null; frozenAt: string | null; rows: PriceRow[] | null;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const names: Record<Outcome, string> = { home, draw: "the draw", away };
  const best = (["home", "draw", "away"] as const).map((o) => ({ o, b: bestPrice(rows ?? [], o).best })).filter((x) => x.b);
  const at = bestPrice(rows ?? [], "home").at;

  const faqs: { q: string; a: string }[] = [];
  if (best.length === 3) {
    faqs.push({
      q: `What are the latest ${home} vs ${away} odds?`,
      a: `Best available decimal odds: ${best.map(({ o, b }) => `${names[o]} ${b!.price.toFixed(2)} (${b!.name})`).join(", ")}${at ? `, as at ${ukDateTime(at)} UK` : ""}. Prices move, so check with the bookmaker before acting.`,
    });
  }
  if (edgeiq) {
    faqs.push({
      q: `What does EdgeIQ predict for ${home} vs ${away}?`,
      a: `Edge Analysts' EdgeIQ model gives ${home} ${pct(edgeiq.home)}, a draw ${pct(edgeiq.draw)} and ${away} ${pct(edgeiq.away)}. The prediction was frozen before kick-off${frozenAt ? ` (${ukDateTime(frozenAt)} UK)` : ""} and is never changed afterwards. It is a model probability, not a betting recommendation.`,
    });
  }
  if (kickoffUtc) {
    faqs.push({
      q: `When does ${home} vs ${away} kick off?`,
      a: `${home} vs ${away} (${league}) kicks off at ${ukDateTime(kickoffUtc)} UK time${venue ? ` at ${venue}` : ""}.`,
    });
  }
  faqs.push({
    q: "Why do odds vary between bookmakers?",
    a: "Each bookmaker sets its own prices and margin, and reacts to its own customers' bets at different speeds. That is why the same outcome can be priced differently, and why comparing bookmakers matters.",
  });
  faqs.push({
    q: "How is the market probability worked out?",
    a: "Market probability is derived from bookmaker decimal odds and shown compared against the frozen EdgeIQ model. Live figures remove the bookmaker margin; the implied percentage beside each price (100 divided by the odds) includes it. It is the market's view, not an EdgeIQ prediction.",
  });

  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((f, i) => (
        <div key={f.q}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
            className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-[6px] px-2 py-3 text-left font-body text-sm font-semibold hover:bg-chip">
            <h3>{f.q}</h3>
            <span className="text-muted" aria-hidden="true">{open === i ? "−" : "+"}</span>
          </button>
          {/* Answers stay in the HTML (hidden, not removed) so they are server-rendered. */}
          <p className={`pb-3 font-body text-[13px] leading-relaxed text-muted ${open === i ? "" : "hidden"}`}>{f.a}</p>
        </div>
      ))}
    </div>
  );
}

function FixtureRow({ f }: { f: Fixture }) {
  return (
    <Link href={`/matches/${f.match_id}`} className="-mx-2 block rounded-[6px] px-2 py-2 transition-colors hover:bg-chip">
      <span className="block font-body text-[13px] font-semibold">{f.home_team} v {f.away_team}</span>
      <span className="block font-data text-[10.5px] text-muted">{f.league} · {ukDateTime(f.kickoff_utc)}</span>
    </Link>
  );
}

/** Related fixtures (spec v3 4.3): same league next kick-offs and each team's next match. Hidden when empty. */
export function RelatedFixturesPanel({ related, home, away, leagueName }: { related: RelatedFixtures; home: string; away: string; leagueName: string }) {
  const { sameLeague, homeNext, awayNext } = related;
  if (sameLeague.length === 0 && !homeNext && !awayNext) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">Related fixtures</h2>
      {(homeNext || awayNext) && (
        <div>
          <p className="font-body text-xs font-medium text-muted">Next matches</p>
          {homeNext && <div><p className="pt-1 font-body text-[11px] text-muted">{home}</p><FixtureRow f={homeNext} /></div>}
          {awayNext && <div><p className="pt-1 font-body text-[11px] text-muted">{away}</p><FixtureRow f={awayNext} /></div>}
        </div>
      )}
      {sameLeague.length > 0 && (
        <div>
          <p className="font-body text-xs font-medium text-muted">More {leagueName}</p>
          {sameLeague.map((f) => <FixtureRow key={f.match_id} f={f} />)}
        </div>
      )}
    </div>
  );
}
