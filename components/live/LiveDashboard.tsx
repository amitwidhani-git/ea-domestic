"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LiveMatch } from "@/lib/liveFixtures";
import type { MatchEvent } from "@/lib/matchEvents";
import { formatMinute } from "@/lib/matchEvents";
import LiveOddsTab from "./LiveOddsTab";
import LiveStatsTab from "./LiveStatsTab";
import LiveEventsTab from "./LiveEventsTab";

const SIDEBAR_POLL_MS = 60_000;
const MAIN_POLL_MS = 30_000;

type Tab = "odds" | "stats" | "events";

function minuteLabel(m: Pick<LiveMatch, "status">): string {
  if (m.status.short === "HT") return "HT";
  return formatMinute(m.status.elapsed, null) || m.status.label;
}

// live_fixtures stores the poller's raw API-Football country string (not our
// internal League registry, which this collection isn't limited to) — mapped
// to a short display code, falling back to the country string itself for
// anything unmapped rather than guessing a wrong abbreviation.
const COUNTRY_CODE: Record<string, string> = {
  England: "EN", "England Women": "EN", Scotland: "SCO", Germany: "DE", Netherlands: "NL",
  France: "FR", Spain: "ES", Portugal: "PT", Italy: "IT", World: "EU", International: "INT",
};
function countryCode(country: string): string {
  return COUNTRY_CODE[country] ?? country.slice(0, 2).toUpperCase();
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M4 22V4s4-2 8 0 8 0 8 0v10s-4 2-8 0-8 0-8 0" />
    </svg>
  );
}

/** Sidebar's own icon set (solid-circle cards, not the square emoji the match
 * events tab uses) — kept local rather than changed in lib/matchEvents.ts's
 * shared eventIcon(), which other pages still rely on unchanged. */
function sidebarEventIcon(e: Pick<MatchEvent, "type" | "detail">): string {
  const type = (e.type ?? "").toLowerCase();
  const detail = (e.detail ?? "").toLowerCase();
  if (type.includes("goal") || detail.includes("goal")) return "⚽";
  if (detail.includes("yellow")) return "🟡";
  if (detail.includes("red")) return "🔴";
  if (type.includes("subst")) return "🔄";
  return "•";
}

function sidebarEventLabel(e: MatchEvent): string {
  const text = e.detail ?? e.player ?? "Event";
  const minute = formatMinute(e.minute, e.extra);
  return minute ? `${sidebarEventIcon(e)} ${text} · ${minute}` : `${sidebarEventIcon(e)} ${text}`;
}

function MiniCard({ m, onSelect }: { m: LiveMatch; onSelect: () => void }) {
  const homeLeads = m.score.home > m.score.away;
  const awayLeads = m.score.away > m.score.home;
  return (
    <div className="min-w-[210px] shrink-0 md:w-full md:min-w-0">
      <div className="mb-1 flex items-center gap-1.5 px-0.5">
        <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-[4px] bg-chip px-1 font-data text-[8.5px] font-bold text-muted">
          {countryCode(m.league.country)}
        </span>
        <span className="truncate font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">{m.league.name}</span>
      </div>
      <button
        onClick={onSelect}
        className="w-full rounded-[12px] border border-line bg-panel p-3 text-left shadow-[var(--shadow)] transition-colors hover:border-muted"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <img src={m.home.logo} alt="" className="h-4 w-4 object-contain" />
            <span className={`min-w-0 flex-1 truncate font-body text-[12.5px] ${homeLeads ? "font-bold text-accent" : "text-ink"}`}>{m.home.name}</span>
            <span className={`font-data text-[13px] ${homeLeads ? "font-bold text-accent" : "text-ink"}`}>{m.score.home}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={m.away.logo} alt="" className="h-4 w-4 object-contain" />
            <span className={`min-w-0 flex-1 truncate font-body text-[12.5px] ${awayLeads ? "font-bold text-accent" : "text-ink"}`}>{m.away.name}</span>
            <span className={`font-data text-[13px] ${awayLeads ? "font-bold text-accent" : "text-ink"}`}>{m.score.away}</span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-line pt-1.5">
          <span className="shrink-0 font-data text-[11px] font-bold text-accent">{minuteLabel(m)}</span>
          <span className="min-w-0 truncate font-data text-[10.5px] text-muted">
            {m.lastEvent ? sidebarEventLabel(m.lastEvent) : "Kick-off"}
          </span>
        </div>
      </button>
    </div>
  );
}

function MainPanel({ match, tab, onTab }: { match: LiveMatch; tab: Tab; onTab: (t: Tab) => void }) {
  const label = minuteLabel(match);
  return (
    <div className="rounded-[14px] border border-line bg-panel p-5 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-chip px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wide text-muted">
          <FlagIcon />
          {match.league.name}
        </span>
        {match.league.round && <span className="hidden font-body text-[11px] text-muted sm:inline">{match.league.round}</span>}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 font-data text-[11px] font-bold text-accent-ink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          {label}
        </span>
      </div>

      <div
        className="mt-5 grid grid-cols-3 items-center gap-3"
        role="group"
        aria-label={`${match.home.name} ${match.score.home} - ${match.score.away} ${match.away.name}, ${label}`}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={match.home.logo} alt="" className="h-12 w-12 object-contain" />
          <span className="font-body text-[13px] font-semibold">{match.home.name}</span>
        </div>
        <div className="text-center font-data text-[40px] font-bold leading-none">
          {match.score.home} – {match.score.away}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={match.away.logo} alt="" className="h-12 w-12 object-contain" />
          <span className="font-body text-[13px] font-semibold">{match.away.name}</span>
        </div>
      </div>
      {match.score.ht.home != null && match.score.ht.away != null && (
        <p className="mt-1.5 text-center font-data text-[11px] text-muted">HT {match.score.ht.home}-{match.score.ht.away}</p>
      )}

      <div className="mt-5 flex gap-1 border-b border-line">
        {(["odds", "stats", "events"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={`px-3 py-2 font-body text-[13px] font-bold uppercase tracking-wide ${tab === t ? "border-b-2 border-accent text-ink" : "text-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "odds" && <LiveOddsTab match={match} />}
        {tab === "stats" && <LiveStatsTab match={match} />}
        {tab === "events" && <LiveEventsTab match={match} />}
      </div>
    </div>
  );
}

export default function LiveDashboard({ initial }: { initial: LiveMatch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matches, setMatches] = useState<LiveMatch[]>(initial);
  const [activeId, setActiveId] = useState<number | null>(() => {
    const requested = searchParams.get("m");
    const requestedId = requested ? Number(requested) : null;
    if (requestedId != null && initial.some((m) => m.fixtureId === requestedId)) return requestedId;
    return initial[0]?.fixtureId ?? null;
  });
  const [activeMatch, setActiveMatch] = useState<LiveMatch | null>(
    () => initial.find((m) => m.fixtureId === activeId) ?? null
  );
  const [tab, setTab] = useState<Tab>("odds");

  // Sidebar list — new matches going live, finished ones dropping off.
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { matches: LiveMatch[] } | null) => {
          if (cancelled || !data) return;
          const next = Array.isArray(data.matches) ? data.matches : [];
          setMatches(next);
          setActiveId((prev) => (prev != null && next.some((m) => m.fixtureId === prev) ? prev : next[0]?.fixtureId ?? null));
        })
        .catch(() => {});
    };
    const id = setInterval(poll, SIDEBAR_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Active match's full detail (odds/stats/events) — independent 30s poll.
  useEffect(() => {
    if (activeId == null) {
      setActiveMatch(null);
      return;
    }
    const fromList = matches.find((m) => m.fixtureId === activeId);
    if (fromList) setActiveMatch(fromList);

    let cancelled = false;
    const poll = () => {
      fetch(`/api/live/${activeId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: LiveMatch | null) => { if (!cancelled && data) setActiveMatch(data); })
        .catch(() => {});
    };
    const id = setInterval(poll, MAIN_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const selectMatch = useCallback((fixtureId: number) => {
    setActiveId(fixtureId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("m", String(fixtureId));
    router.replace(`/live?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (matches.length === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-panel p-8 text-center shadow-[var(--shadow)]">
        <p className="font-body text-[15px] font-semibold text-ink">No live matches right now — check back soon.</p>
        <p className="mt-1.5 font-body text-[13px] text-muted">Every match we track will appear here the moment it kicks off.</p>
        <Link href="/schedule" className="mt-4 inline-flex items-center gap-1.5 font-body text-[13px] font-bold text-accent-ink hover:underline">
          View upcoming fixtures →
        </Link>
      </div>
    );
  }

  const sidebarMatches = matches.filter((m) => m.fixtureId !== activeId);

  return (
    <div className="flex flex-col-reverse gap-5 md:flex-row md:items-start">
      <aside className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:w-[220px] md:shrink-0 md:flex-col md:gap-3 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        <h2 className="hidden font-body text-[11px] font-bold uppercase tracking-[0.1em] text-muted md:block">Also live</h2>
        {sidebarMatches.length === 0 && (
          <p className="hidden font-body text-[12.5px] text-muted md:block">This is the only match live right now.</p>
        )}
        {sidebarMatches.map((m) => (
          <MiniCard key={m.fixtureId} m={m} onSelect={() => selectMatch(m.fixtureId)} />
        ))}
      </aside>

      <section className="min-w-0 flex-1">
        {activeMatch && <MainPanel match={activeMatch} tab={tab} onTab={setTab} />}
      </section>
    </div>
  );
}
