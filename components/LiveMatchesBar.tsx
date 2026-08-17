"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ClubCrest from "@/components/ClubCrest";
import type { LiveMatchCard } from "@/lib/data";
import type { League } from "@/lib/types";

const PICK_LABEL: Record<"home" | "draw" | "away", string> = { home: "Home", draw: "Draw", away: "Away" };
const POLL_MS = 60_000;

function Card({ m }: { m: LiveMatchCard }) {
  const statusLabel = m.afStatus === "HT" ? "HT" : m.elapsed != null ? `${m.elapsed}'` : "LIVE";
  return (
    <article className="relative min-w-[220px] shrink-0 rounded-[14px] border border-line bg-panel p-3.5 shadow-[var(--shadow)] transition-colors hover:border-muted">
      <Link href={`/matches/${m.matchId}`} aria-label={`Match centre: ${m.homeTeam} v ${m.awayTeam}`} className="absolute inset-0 z-10" />

      <div className="flex items-center gap-2">
        <LeagueBadge league={m.league as League} />
        <span className="ml-auto inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-wide text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ClubCrest apiFootballId={m.homeApiFootballId} clubName={m.homeTeam} size={22} />
        <span className="min-w-0 flex-1 truncate font-body text-[13px] font-semibold">{m.homeTeam}</span>
        <span className="shrink-0 font-data text-base font-bold">{m.score ? m.score.home : "–"}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <ClubCrest apiFootballId={m.awayApiFootballId} clubName={m.awayTeam} size={22} />
        <span className="min-w-0 flex-1 truncate font-body text-[13px] font-semibold">{m.awayTeam}</span>
        <span className="shrink-0 font-data text-base font-bold">{m.score ? m.score.away : "–"}</span>
      </div>

      {(m.modelProb != null || m.marketProb != null) && (
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 font-data text-[10px] text-muted">
          <span>Our pick <b className="text-ink">{m.modelPick ? PICK_LABEL[m.modelPick] : "—"}</b>{m.modelProb != null && ` ${Math.round(m.modelProb * 100)}%`}</span>
          {m.marketProb != null && <span>Market {Math.round(m.marketProb * 100)}%</span>}
        </div>
      )}

      {m.cta && (
        <a href={`/go/${m.cta.affiliateId}`} rel="sponsored nofollow" target="_blank"
          className="relative z-20 mt-2.5 flex items-center justify-center gap-1.5 rounded-[9px] bg-accent py-1.5 font-body text-[12px] font-bold text-accent-fg transition-[filter] hover:brightness-105">
          Bet now
        </a>
      )}
    </article>
  );
}

export default function LiveMatchesBar({ initial }: { initial: LiveMatchCard[] }) {
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

  if (matches.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3.5 flex items-center gap-2 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" /> Live now
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {matches.map((m) => <Card key={m.matchId} m={m} />)}
      </div>
    </section>
  );
}
