"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ClubCrest from "@/components/ClubCrest";
import { useBackFrom } from "@/lib/useBackFrom";
import { formatMinute, eventIcon } from "@/lib/matchEvents";
import { trackAffiliateClick } from "@/lib/gtag";
import type { LiveMatchCard } from "@/lib/data";
import { LEAGUE_NAMES, type League } from "@/lib/types";
import { TOOLTIP, pct, shortCode } from "@/lib/marketDisplay";
import { bookmakerName } from "@/lib/bookmakers";
import BookmakerLogo from "@/components/BookmakerLogo";
import { RedCards } from "@/components/KeyStatsStrip";
import { ukTime } from "@/components/MatchMarket";
import Flash from "@/components/Flash";

const PICK_LABEL: Record<"home" | "draw" | "away", string> = { home: "Home", draw: "Draw", away: "Away" };
const POLL_MS = 60_000;

/** Live matches from SSR, refreshed from /api/live-matches every 60s (kept polling while empty: a match can go live without a reload). */
export function useLiveMatches(initial: LiveMatchCard[] | null): LiveMatchCard[] | null {
  const [matches, setMatches] = useState<LiveMatchCard[] | null>(initial);
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch("/api/live-matches")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: LiveMatchCard[] | null) => { if (!cancelled && Array.isArray(data)) setMatches(data); })
        .catch(() => {});
    };
    if (initial === null) poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return matches;
}

/**
 * Homepage live card. `compact` is the match page ticker size: minute, short
 * codes, score and red cards only, no odds or buttons; `current` highlights
 * the fixture being viewed.
 */
export function LiveCard({ m, backFrom, compact = false, current = false }: { m: LiveMatchCard; backFrom: string; compact?: boolean; current?: boolean }) {
  const statusLabel = m.afStatus === "HT" ? "HT" : m.elapsed != null ? formatMinute(m.elapsed, m.extra) : "LIVE";
  if (compact) {
    return (
      <Link href={`/matches/${m.matchId}`} aria-current={current ? "page" : undefined}
        className={`flex shrink-0 items-center gap-2 rounded-[6px] px-2.5 py-1.5 font-data text-xs transition-colors ${
          current ? "bg-[var(--ea-signal)]/10" : "hover:bg-chip"
        }`}>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--ea-live)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ea-live)]" aria-hidden="true" />{statusLabel}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">{shortCode(m.homeTeam)} <RedCards count={m.redCards.home} /> <Flash value={m.score?.home}>{m.score?.home ?? "-"}</Flash></span>
        <span className="inline-flex items-center gap-1 font-semibold">{shortCode(m.awayTeam)} <RedCards count={m.redCards.away} /> <Flash value={m.score?.away}>{m.score?.away ?? "-"}</Flash></span>
      </Link>
    );
  }
  return (
    // Flat column on the page; whitespace between columns separates matches, no card box or rules.
    <article className="relative w-[240px] shrink-0">

      <Link href={`/matches/${m.matchId}?from=${backFrom}`} aria-label={`Match centre: ${m.homeTeam} v ${m.awayTeam}`} className="absolute inset-0 z-10" />

      <div className="flex items-center gap-2">
        <LeagueBadge league={m.league as League} />
        <span className="min-w-0 truncate font-body text-[11.5px] font-medium text-muted">{LEAGUE_NAMES[m.league as League] ?? m.league}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-data text-[11px] font-semibold text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ClubCrest apiFootballId={m.homeApiFootballId} clubName={m.homeTeam} size={22} />
        <span className="min-w-0 truncate font-body text-[13px] font-semibold">{m.homeTeam}</span>
        <RedCards count={m.redCards.home} />
        <Flash value={m.score?.home} className="ml-auto shrink-0 px-0.5 font-data text-base font-semibold">{m.score ? m.score.home : "–"}</Flash>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <ClubCrest apiFootballId={m.awayApiFootballId} clubName={m.awayTeam} size={22} />
        <span className="min-w-0 truncate font-body text-[13px] font-semibold">{m.awayTeam}</span>
        <RedCards count={m.redCards.away} />
        <Flash value={m.score?.away} className="ml-auto shrink-0 px-0.5 font-data text-base font-semibold">{m.score ? m.score.away : "–"}</Flash>
      </div>

      {/* Every row below always renders at a fixed height (blank or "–" when there's nothing to show),
          so cards in the strip stay the same size as goals, cards and prices come and go. */}
      <div className="mt-2 flex h-[18px] items-center gap-1.5 font-data text-[11.5px] text-muted">
        {m.latestEvent && (
          <>
            <span>{eventIcon(m.latestEvent)}</span>
            <span>{formatMinute(m.latestEvent.minute, m.latestEvent.extra)}</span>
            <span className="min-w-0 truncate text-ink">{m.latestEvent.player ?? m.latestEvent.detail}</span>
          </>
        )}
      </div>

      {/* Both rows refer to the same outcome (the model's pick). The live figure is
          the live odds feed, compared against the frozen pre-match model. */}
      <div className="mt-3 space-y-1 font-data text-[11.5px] text-muted">
        <div className="flex items-center justify-between gap-2" title={TOOLTIP.model}>
          <span>EdgeIQ model</span>
          {m.modelPick && m.modelProb != null
            ? <span><span className="text-muted">{PICK_LABEL[m.modelPick]}</span> <b className="font-semibold text-[var(--ea-model)]">{Math.round(m.modelProb * 100)}%</b></span>
            : <span>–</span>}
        </div>
        <div className="flex items-center justify-between gap-2" title={TOOLTIP.liveMarket}>
          <span>Live market</span>
          {m.modelPick && m.liveMarket
            ? <span><span className="text-muted">{PICK_LABEL[m.modelPick]}</span> <Flash value={m.liveMarket[m.modelPick]}><b className="font-semibold text-[var(--ea-market)]">{pct(m.liveMarket[m.modelPick])}</b></Flash></span>
            : <span>{m.modelPick ? "Unavailable" : "–"}</span>}
        </div>
      </div>

      {/* Best partner price for the card's outcome (shared best-price logic, partners first), merged
          into the tracked button: same /go/ link and affiliate_click event as before. Only partner
          prices appear here; with none, the button goes to the card's partner without a price. */}
      <div className="mt-3">
        <p className="flex h-[18px] items-center justify-between gap-2 font-data text-[11.5px] text-muted">
          <span className="shrink-0">Best odds{m.bestOdds && m.modelPick && <> <span className="text-ink">{PICK_LABEL[m.modelPick]}</span></>}</span>
          {m.bestOdds?.at ? <span title="Time of the latest bookmaker price">{ukTime(m.bestOdds.at)}</span> : !m.bestOdds && <span>–</span>}
        </p>
        {m.bestOdds?.cta && m.modelPick ? (
          <a href={`/go/${m.bestOdds.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
            onClick={() => trackAffiliateClick({ bookmaker: m.bestOdds!.cta!.affiliateId, matchId: m.matchId, league: m.league, odds: m.bestOdds!.price })}
            className="relative z-20 mt-1 flex min-h-9 items-center gap-2 rounded-[9px] bg-accent px-2.5 font-body text-[12.5px] font-semibold text-accent-fg transition-[filter] hover:brightness-105 active:brightness-95">
            <BookmakerLogo cta={m.bestOdds.cta} name={m.bestOdds.name} />
            <span className="min-w-0 flex-1 truncate">Go to {m.bestOdds.name}</span>
            <Flash value={m.bestOdds.price} className="px-0.5 font-data text-[13px] font-semibold data-[changed=true]:bg-black/15">{m.bestOdds.price.toFixed(2)}</Flash>
          </a>
        ) : m.cta ? (
          <a href={`/go/${m.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
            onClick={() => trackAffiliateClick({ bookmaker: m.cta!.affiliateId, matchId: m.matchId, league: m.league })}
            className="relative z-20 mt-1 flex min-h-9 items-center gap-2 rounded-[9px] bg-accent px-2.5 font-body text-[12.5px] font-semibold text-accent-fg transition-[filter] hover:brightness-105 active:brightness-95">
            <BookmakerLogo cta={m.cta} name={bookmakerName(m.cta.affiliateId)} />
            <span className="min-w-0 flex-1 truncate">Odds at {bookmakerName(m.cta.affiliateId)}</span>
          </a>
        ) : (
          <div className="mt-1 min-h-9" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

export default function LiveMatchesBar({ initial }: { initial: LiveMatchCard[] }) {
  const backFrom = useBackFrom();
  const [matches, setMatches] = useState<LiveMatchCard[]>(initial);

  // Keep polling even while empty — a match can go live without a page reload.
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch("/api/live-matches")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: LiveMatchCard[] | null) => { if (!cancelled && Array.isArray(data)) setMatches(data); })
        .catch(() => {});
    };
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // #live is where the retired Live hub (/live) redirects to; keep the anchor even when nothing is in play.
  if (matches.length === 0) return <div id="live" aria-hidden="true" />;

  return (
    <section id="live" className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" /> Live now ({matches.length})
      </h2>
      <div className="flex gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {matches.map((m) => <LiveCard key={m.matchId} m={m} backFrom={backFrom} />)}
      </div>
    </section>
  );
}
