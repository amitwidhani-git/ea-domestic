"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import FrozenStamp from "@/components/FrozenStamp";
import { FormRow } from "@/components/MatchSquadTab";
import { KeyStatsInline, RedCards, redCardCount } from "@/components/KeyStatsStrip";
import MatchFeed from "@/components/MatchFeed";
import { LiveCard, useLiveMatches } from "@/components/LiveMatchesBar";
import { BestOddsPanel, MarketChart, MatchOddsTable, useOddsSnapshots, type Phase as MarketPhase } from "@/components/MatchMarket";
import LineupsModule from "@/components/LineupsModule";
import { MatchFaq, RelatedFixturesPanel, type RelatedFixtures } from "@/components/MatchExtras";
import { marketFromBest, type Outcome } from "@/lib/bestPrice";
import { MIN_EV, deVig, shortCode } from "@/lib/marketDisplay";
import { trackSectionJump, trackSectionView } from "@/lib/gtag";
import type { LiveMatch } from "@/lib/liveFixtures";
import type { MatchDetail, MatchEvent, MatchInjury, MatchNews, LineupPlayer, LineupTeam } from "@/lib/matchDetail";
import { mapMatchEvent, formatMinute, eventIcon, type RawMatchEvent } from "@/lib/matchEvents";

// Both the matches and match_stats collections use normalised status values:
// SCHEDULED | LIVE | FINISHED. The raw API-Football code (FT/AET/PEN/HT/1H…)
// lives on fixture.afStatus and is only used for display labels.
const PRE = new Set(["SCHEDULED"]);
const LIVE = new Set(["LIVE"]);
const POST = new Set(["FINISHED"]);

// Postponed / cancelled / abandoned / suspended: show the status, no odds actions.
const OFF_STATUSES = new Set(["PST", "CANC", "ABD", "SUSP", "INT", "AWD", "WO"]);
const OFF_LABEL: Record<string, string> = { PST: "Postponed", CANC: "Cancelled", ABD: "Abandoned", SUSP: "Suspended", INT: "Interrupted", AWD: "Awarded", WO: "Walkover" };
const LIVE_FEED_POLL_MS = 30_000;

// One scrolling page with a sticky jump bar replaces the tabs (spec v3 4.4).
type SectionKey = "odds" | "events" | "lineups" | "h2h" | "stats" | "preview" | "faq";
const SECTION_LABEL: Record<SectionKey, string> = {
  odds: "Odds", events: "Events", lineups: "Lineups", h2h: "Head to head", stats: "Stats", preview: "Preview", faq: "FAQ",
};
/** Site header height (60px + 1px border); the sticky bar sits directly under it. */
const STICKY_TOP = 61;

/** Collapses a long section to a preview with "Show more", expanding in place. */
function ShowMore({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={open ? "" : "relative max-h-[420px] overflow-hidden"}>
        {children}
        {!open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" aria-hidden="true" />}
      </div>
      <button onClick={() => setOpen((o) => !o)} className="mt-2 font-data text-xs font-semibold text-muted hover:text-ink">
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

/** Collapsed by default on mobile, always open from md up (used for the market chart). */
function MobileCollapse({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="mb-2 font-data text-xs font-semibold text-muted hover:text-ink md:hidden">
        {open ? `Hide ${label}` : `Show ${label}`}
      </button>
      <div className={open ? "" : "hidden md:block"}>{children}</div>
    </div>
  );
}

/** Live ticker (spec v3 2.3 compact): every live match, current one highlighted. Hidden when nothing is in play. */
function LiveTicker({ currentMatchId }: { currentMatchId: string }) {
  const matches = useLiveMatches(null);
  const strip = useRef<HTMLDivElement>(null);
  if (!matches || matches.length === 0) return null;
  return (
    <div className="relative" aria-label="Live now">
      <div ref={strip} className="flex gap-2 overflow-x-auto pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {matches.map((m) => <LiveCard key={m.matchId} m={m} backFrom="" compact current={m.matchId === currentMatchId} />)}
      </div>
      <button type="button" aria-label="Scroll live matches" onClick={() => strip.current?.scrollBy({ left: 280, behavior: "smooth" })}
        className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-chip text-muted hover:text-ink">
        ›
      </button>
    </div>
  );
}

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;
const HOME_COLOR = "var(--accent)";
const AWAY_COLOR = "#60A5FA";

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  suspension: { label: "SUSP", className: "border-loss text-loss" },
  high: { label: "OUT", className: "border-warn/60 text-warn" },
  medium: { label: "DOUBT", className: "border-caution/60 text-caution" },
  low: { label: "50/50", className: "border-muted text-muted" },
  international: { label: "INTL", className: "border-info/60 text-info" },
  unknown: { label: "?", className: "border-muted text-muted" },
};

const STAT_LABELS: { key: string; label: string }[] = [
  { key: "ball_possession", label: "Possession" },
  { key: "total_shots", label: "Total shots" },
  { key: "shots_on_goal", label: "Shots on target" },
  { key: "shots_off_goal", label: "Shots off target" },
  { key: "blocked_shots", label: "Blocked shots" },
  { key: "corner_kicks", label: "Corners" },
  { key: "offsides", label: "Offsides" },
  { key: "fouls", label: "Fouls" },
  { key: "yellow_cards", label: "Yellow cards" },
  { key: "red_cards", label: "Red cards" },
  { key: "goalkeeper_saves", label: "Saves" },
  { key: "total_passes", label: "Passes" },
  { key: "passes_accurate", label: "Accurate passes" },
];

function fmtKickoff(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")} UK`;
}
function countdown(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Kick off imminent";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Kicks off in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Kicks off in ${hrs}h`;
  return `Kicks off in ${Math.floor(hrs / 24)}d`;
}
function num(v: number | string | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}
export default function MatchLiveUpdater({
  matchId, initialData, related: relatedFixtures,
}: {
  matchId: string;
  initialData: MatchDetail;
  isLive: boolean;
  related: RelatedFixtures;
}) {
  const [data, setData] = useState<MatchDetail>(initialData);
  const status = data.fixture.status ?? "";
  const phase: "PRE" | "LIVE" | "POST" = LIVE.has(status) ? "LIVE" : POST.has(status) ? "POST" : "PRE";
  const marketPhase: MarketPhase = OFF_STATUSES.has(data.fixture.afStatus ?? "") ? "OFF" : phase;
  const apiFixtureId = data.fixture.apiFootballFixtureId;
  const oddsRows = useOddsSnapshots(matchId);
  const [selected, setSelected] = useState<Outcome>(initialData.prediction?.pick ?? "home");
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerInView, setHeaderInView] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  // In-play feed (live_fixtures: live odds, odds history, events). undefined = loading, null = none.
  const [liveFeed, setLiveFeed] = useState<LiveMatch | null | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const liveActive = LIVE.has(status);

  // Poll live endpoint every 60s while the match is live; stops once FT/AET/PEN.
  useEffect(() => {
    if (!liveActive) return;
    let cancelled = false;
    const poll = () => {
      fetch(`/api/matches/${encodeURIComponent(matchId)}/live`)
        .then((r) => (r.status === 204 || !r.ok ? null : r.json()))
        .then((live) => {
          if (cancelled || !live) return;
          setData((prev) => ({
            ...prev,
            fixture: {
              ...prev.fixture,
              status: live.status ?? prev.fixture.status,
              afStatus: live.afStatus ?? prev.fixture.afStatus,
              elapsed: live.elapsed ?? prev.fixture.elapsed,
              extra: live.extra ?? prev.fixture.extra,
              score: live.score ?? prev.fixture.score,
            },
            // /live forwards match_stats.events in its raw (pipeline) shape —
            // same mapping the initial SSR load goes through, so a live goal's
            // scorer/card name renders correctly too, not just on first load.
            events: Array.isArray(live.events)
              ? (live.events as RawMatchEvent[]).map((e) => mapMatchEvent(e, initialData.homeTeam.apiFootballId))
              : prev.events,
            stats: live.stats ?? prev.stats,
          }));
          setLastUpdated(new Date());
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [liveActive, matchId, initialData.homeTeam.apiFootballId]);

  // Live odds feed (chart, live market %): every 30s while live; fetched once at full time,
  // since finished fixtures keep their in-play odds history for the full-time chart.
  const postMatch = phase === "POST";
  useEffect(() => {
    if ((!liveActive && !postMatch) || apiFixtureId == null) return;
    let cancelled = false;
    const poll = () => {
      fetch(`/api/live/${apiFixtureId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((m: LiveMatch | null) => { if (!cancelled) setLiveFeed(m); })
        .catch(() => { if (!cancelled) setLiveFeed((prev) => prev ?? null); });
    };
    poll();
    if (!liveActive) return () => { cancelled = true; };
    const id = setInterval(poll, LIVE_FEED_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [liveActive, postMatch, apiFixtureId]);

  // 1s ticker so "updated Xs ago" counts up.
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Pre-match: re-render every minute so the "Kicks off in …" countdown updates.
  useEffect(() => {
    if (phase !== "PRE") return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [phase]);

  const { fixture, homeTeam, awayTeam, evSignals } = data;
  const score = fixture.score;
  const hasScore = !!score && score.home != null && score.away != null;
  const bestSignal = useMemo(() => {
    const live = evSignals.filter((s) => s.settled_result == null && s.best_price != null).sort((a, b) => b.ev - a.ev)[0];
    return live ? { selection: live.selection, ev: live.ev, bestPrice: live.best_price as number, bestBookmaker: live.best_bookmaker ?? "" } : undefined;
  }, [evSignals]);

  // ── status chip ──
  let statusChip: React.ReactNode = null;
  if (phase === "LIVE") {
    statusChip = (
      <span className="inline-flex items-center gap-1 font-data text-xs text-live">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
        {fixture.afStatus === "HT" ? "HT" : fixture.elapsed != null ? formatMinute(fixture.elapsed, fixture.extra) : "LIVE"}
      </span>
    );
  } else if (phase === "POST") {
    // Status is normalised to "FINISHED"; the FT/AET/PEN detail for display comes
    // from afStatus (falling back to penaltyScore when match_stats is absent).
    const pens = fixture.penaltyScore ? ` (pens ${fixture.penaltyScore.home}-${fixture.penaltyScore.away})` : "";
    const label =
      fixture.afStatus === "PEN" ? "AET"
      : fixture.afStatus === "AET" ? "AET"
      : fixture.afStatus === "FT" ? "FT"
      : fixture.penaltyScore ? "AET" : "FT";
    statusChip = <span className="font-data text-[10px] uppercase tracking-widest text-muted">{label}{pens}</span>;
  } else {
    statusChip = <span className="font-data text-[10px] text-muted">{countdown(fixture.kickoffUtc)}</span>;
  }

  if (marketPhase === "OFF") {
    statusChip = <span className="font-data text-[10px] uppercase tracking-widest text-muted">{OFF_LABEL[fixture.afStatus ?? ""] ?? fixture.afStatus}</span>;
  }

  // ── market data: EdgeIQ frozen probs; kick-off, now / closing market; Value Signal (pre-match) ──
  const names: Record<Outcome, string> = { home: homeTeam.name, draw: "Draw", away: awayTeam.name };
  const edgeiq = data.prediction?.probs ?? null;
  const market = marketPhase === "LIVE" ? deVig(liveFeed?.liveOdds) : marketPhase === "OFF" ? null : marketFromBest(oddsRows ?? []);
  const kickoffMarket = marketPhase === "LIVE" || marketPhase === "POST" ? deVig(liveFeed?.prematchOdds) : null;
  const valueSignal = (() => {
    if (marketPhase !== "PRE" || !edgeiq || !market) return null;
    const top = evSignals.filter((s) => s.settled_result == null && s.ev >= MIN_EV).sort((a, b) => b.ev - a.ev)[0];
    if (!top) return null;
    const gap = (edgeiq[top.selection] - market[top.selection]) * 100;
    return Math.round(gap) > 0 ? { side: top.selection, gap } : null;
  })();
  const hasChart = (phase === "LIVE" || phase === "POST") && !!liveFeed && liveFeed.oddsHistory.length >= 2;
  const result: Outcome | null = phase === "POST" && score ? (score.home > score.away ? "home" : score.away > score.home ? "away" : "draw") : null;

  // Live feed events once loaded (fresher), else the match payload's events.
  const feedEvents = phase === "LIVE" && liveFeed && liveFeed.events.length > 0 ? liveFeed.events : data.events;
  const latest = phase !== "PRE" && feedEvents.length > 0 ? feedEvents[feedEvents.length - 1] : null;
  const redHome = phase === "PRE" ? 0 : redCardCount(data.stats, data.events, "home");
  const redAway = phase === "PRE" ? 0 : redCardCount(data.stats, data.events, "away");
  const scoreText = hasScore && score ? `${score.home} – ${score.away}` : phase === "PRE" ? "v" : "–";

  // ── sections, placed as in the spec v3 4.2 diagram ──
  const h2h = data.headToHead;
  const hasH2H = !!h2h && (h2h.meetings.length > 0 || h2h.homeWins + h2h.draws + h2h.awayWins > 0);
  // Left column: match feed + lineups (pre-match: lineups if published, else head to head).
  const leftKeys = (phase === "PRE"
    ? ([data.lineups ? "lineups" : null, hasH2H ? "h2h" : null] as (SectionKey | null)[])
    // Events: always while live (the feed fills in); at full time only when event data exists.
    : ([phase === "LIVE" || feedEvents.length > 0 ? "events" : null, data.lineups ? "lineups" : null] as (SectionKey | null)[])).filter((k): k is SectionKey => k !== null);
  // Below, left two thirds: stats, preview (pre-match: preview first), FAQ. Right third: related fixtures.
  const belowKeys = (phase === "PRE" ? (["preview", "stats", "faq"] as SectionKey[]) : (["stats", "preview", "faq"] as SectionKey[]))
    .filter((k) => k !== "stats" || !!data.stats);
  const order: SectionKey[] = ["odds", ...leftKeys, ...belowKeys];
  const orderKey = order.join(",");
  const sectionLabel = (k: SectionKey) => (k === "preview" && phase === "POST" ? "Result and preview" : SECTION_LABEL[k]);
  const node: Record<Exclude<SectionKey, "odds">, React.ReactNode> = {
    events: <MatchFeed events={feedEvents} homeName={homeTeam.name} awayName={awayTeam.name} />,
    lineups: data.lineups ? <LineupsModule lineups={data.lineups} events={feedEvents} homeName={homeTeam.name} awayName={awayTeam.name} /> : null,
    h2h: <H2HTab data={data} />,
    stats: <StatsTab data={data} phase={phase} />,
    preview: <PreviewBlock data={data} phase={phase} />,
    faq: <MatchFaq home={homeTeam.name} away={awayTeam.name} league={fixture.league ?? ""} kickoffUtc={fixture.kickoffUtc} venue={fixture.venue}
      edgeiq={edgeiq} frozenAt={data.prediction?.frozen_at ?? null} rows={phase === "PRE" ? oddsRows : null} />,
  };
  const LONG = new Set<SectionKey>(["h2h", "faq", "preview"]);

  // Sticky bar shows once the full score header has scrolled away.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setHeaderInView(e.isIntersecting), { rootMargin: `-${STICKY_TOP}px 0px 0px 0px` });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Active jump link: the section nearest the top under the sticky bar.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: SectionKey | null = null, best = -Infinity;
        for (const k of orderKey.split(",") as SectionKey[]) {
          const top = document.getElementById(k)?.getBoundingClientRect().top;
          if (top != null && top <= STICKY_TOP + 80 && top > best) { best = top; current = k; }
        }
        setActiveSection(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [orderKey]);

  // section_view: once per section per page view, when at least half of it (or half the screen) is visible.
  const viewed = useRef(new Set<string>());
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const key = (e.target as HTMLElement).id;
        const half = e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.5;
        if (e.isIntersecting && half && !viewed.current.has(key)) {
          viewed.current.add(key);
          trackSectionView({ section: key, matchId });
        }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    for (const k of orderKey.split(",")) {
      const el = document.getElementById(k);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [orderKey, matchId]);

  const MAIN_ORDER = ["order-4", "order-5", "order-6", "order-7", "order-8", "order-9"];
  const section = (k: Exclude<SectionKey, "odds">, extra = "") => (
    <section key={k} id={k} aria-labelledby={`${k}-heading`} className={`space-y-3 ${extra}`} style={{ scrollMarginTop: STICKY_TOP + 56 }}>
      <h2 id={`${k}-heading`} className="font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">{sectionLabel(k)}</h2>
      {LONG.has(k) ? <ShowMore>{node[k]}</ShowMore> : node[k]}
    </section>
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ── STICKY BAR (appears once the hero scrolls away) ── */}
      {!headerInView && (
        <div className="fixed inset-x-0 z-40 border-b border-line bg-panel/95 backdrop-blur" style={{ top: STICKY_TOP }}>
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 sm:px-6">
            <span className="flex shrink-0 items-center gap-1.5 font-data text-xs font-semibold">
              {shortCode(homeTeam.name)} <RedCards count={redHome} /> <span className="font-display text-sm">{scoreText}</span> <RedCards count={redAway} /> {shortCode(awayTeam.name)}
              <span className="ml-1">{statusChip}</span>
            </span>
            <nav aria-label="Match sections" className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {order.map((k) => (
                <a key={k} href={`#${k}`} onClick={() => trackSectionJump({ section: k, matchId })}
                  className={`shrink-0 rounded-full px-3 py-1 font-body text-xs font-semibold transition-colors ${activeSection === k ? "bg-ink text-panel" : "text-muted hover:text-ink"}`}>
                  {sectionLabel(k)}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      <LiveTicker currentMatchId={matchId} />

      {/* ── HERO: full-width score, then latest event + key stats on one strip ── */}
      <div ref={headerRef}>
        <div className="pb-1 pt-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
            <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <ClubCrest apiFootballId={homeTeam.apiFootballId} clubName={homeTeam.name} size={48} />
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Link href={`/teams/${homeTeam.id}`} className="font-body text-[15px] font-semibold leading-tight tracking-[-0.015em] [overflow-wrap:anywhere] hover:text-accent sm:text-[22px]">{homeTeam.name}</Link>
                <RedCards count={redHome} />
              </span>
            </div>
            <div className="text-center">
              <div className="font-data text-4xl font-semibold leading-none tracking-[-0.02em] text-ink sm:text-5xl">{scoreText}</div>
              <div className="mt-1.5">{phase === "PRE" && !hasScore && marketPhase !== "OFF" ? <span className="font-data text-sm text-muted">{countdown(fixture.kickoffUtc)}</span> : statusChip}</div>
            </div>
            <div className="flex min-w-0 flex-col items-end gap-1.5 text-right sm:flex-row-reverse sm:items-center sm:gap-3">
              <ClubCrest apiFootballId={awayTeam.apiFootballId} clubName={awayTeam.name} size={48} />
              <span className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                <RedCards count={redAway} />
                <Link href={`/teams/${awayTeam.id}`} className="font-body text-[15px] font-semibold leading-tight tracking-[-0.015em] [overflow-wrap:anywhere] hover:text-accent sm:text-[22px]">{awayTeam.name}</Link>
              </span>
            </div>
          </div>
          <p className="mt-3 text-center font-body text-xs text-muted">
            {fixture.league} · {fmtKickoff(fixture.kickoffUtc)}{fixture.venue ? ` · ${fixture.venue}` : ""}{fixture.referee ? ` · Ref: ${fixture.referee}` : ""}
          </p>
        </div>
        {(latest || phase === "LIVE" || (phase !== "PRE" && data.stats)) && (
          <div className="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-x-6 gap-y-2">
            {latest ? (
              <span className="flex min-w-0 items-center gap-2 font-data text-xs">
                <span className="font-body font-medium text-muted">Latest</span>
                <span>{eventIcon(latest)}</span>
                <span className="min-w-0 truncate">
                  {[latest.detail, latest.player].filter(Boolean).join(" · ")}
                  {latest.side ? ` · ${shortCode(latest.side === "home" ? homeTeam.name : awayTeam.name)}` : ""}
                </span>
                <span className="shrink-0 text-muted">{formatMinute(latest.minute, latest.extra)}</span>
              </span>
            ) : <span />}
            {phase !== "PRE" && <KeyStatsInline stats={data.stats} />}
          </div>
        )}
      </div>

      {/* ── HOOK + ODDS: the market chart (live, and at full time from the stored in-play history) with
          Match odds beside it on desktop, so the odds sit at the top; then Best odds, three outcomes side by side ── */}
      <section id="odds" aria-label="Odds" className="space-y-10" style={{ scrollMarginTop: STICKY_TOP + 56 }}>
        <div className={hasChart ? "grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start" : ""}>
          {hasChart && liveFeed && (
            <MarketChart points={liveFeed.oddsHistory} events={feedEvents} names={names} edgeiq={edgeiq}
              focus={selected} onFocus={setSelected} updatedAt={liveFeed.updatedAt} final={phase === "POST"} />
          )}
          <MatchOddsTable phase={marketPhase} names={names} edgeiq={edgeiq} kickoff={kickoffMarket} now={market} result={result}
            valueSignal={valueSignal} rows={oddsRows} selected={selected} onSelect={setSelected} compact={hasChart} matchId={matchId} league={fixture.league ?? ""}
            pick={data.prediction?.pick ?? null} />
        </div>
        <BestOddsPanel names={names} phase={marketPhase} rows={oddsRows} matchId={matchId} league={fixture.league ?? ""} />
      </section>

      {/* ── EVENTS | STATS | RELATED FIXTURES in one row (stats between events and related), the rest below ── */}
      {(() => {
        const all = [...leftKeys, ...belowKeys] as Exclude<SectionKey, "odds">[];
        const rowKeys: Exclude<SectionKey, "odds">[] = all.filter((k) => k === "events" || k === "stats");
        const restKeys = all.filter((k) => !rowKeys.includes(k));
        const related = (
          <aside className={rowKeys.length === 2 ? "md:col-span-2 xl:col-span-1" : ""}>
            <RelatedFixturesPanel related={relatedFixtures} home={homeTeam.name} away={awayTeam.name} leagueName={fixture.league ?? ""} />
          </aside>
        );
        if (rowKeys.length === 0) {
          // Pre-match without stats: sections (2/3) beside related fixtures (1/3).
          return (
            <div className="grid gap-x-10 gap-y-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
              <div className="min-w-0 space-y-10">{restKeys.map((k) => section(k))}</div>
              {related}
            </div>
          );
        }
        return (
          <>
            <div className={`grid gap-x-10 gap-y-10 md:items-start ${rowKeys.length === 2 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}>
              {rowKeys.map((k) => section(k, "min-w-0"))}
              {related}
            </div>
            {restKeys.map((k) => section(k))}
          </>
        );
      })()}


      {phase === "LIVE" && lastUpdated && (
        <p className="text-center font-data text-[10px] text-muted">
          <span className="text-live">●</span> Last updated {Math.max(0, Math.round((nowTick - lastUpdated.getTime()) / 1000))}s ago
        </p>
      )}
    </div>
  );

  // (Header uses prediction/fixture from closure; tabs are declared below.)
}

// ---------------------------------------------------------------- tabs

/**
 * Preview (#preview): there is no written preview article for fixtures, so this is
 * the existing preview data: form guide and squad absences, with the EdgeIQ
 * freeze stamp. At full time a short recap with the Track Record link sits above it.
 */
function PreviewBlock({ data, phase }: { data: MatchDetail; phase: "PRE" | "LIVE" | "POST" }) {
  const { fixture, homeTeam, awayTeam, prediction, homeForm, awayForm } = data;
  return (
    <div className="space-y-6">
      {phase === "POST" && prediction?.pick && prediction.probs && (
        <div>
          <p className="font-body text-sm">
            Full time {fixture.score ? `${fixture.score.home}–${fixture.score.away}` : ""}. EdgeIQ&apos;s pre-match pick was {PICK_LABEL[prediction.pick]} ({Math.round(prediction.probs[prediction.pick] * 100)}%)
            {prediction.model_correct != null ? `, which was ${prediction.model_correct ? "correct" : "not correct"}.` : "."}
          </p>
          <Link href="/track-record" className="mt-2 inline-block font-body text-[13px] font-medium text-accent-ink underline-offset-4 hover:underline">View Track Record →</Link>
        </div>
      )}
      {prediction?.frozen_at && prediction.hash && (
        <p className="font-data text-xs text-muted">EdgeIQ prediction locked before kick-off: <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} /></p>
      )}
      <div>
        <h3 className="mb-3 font-body text-[15px] font-semibold leading-tight text-ink">Form guide</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormRow team={homeTeam.name} form={homeForm} />
          <FormRow team={awayTeam.name} form={awayForm} />
        </div>
      </div>
      <InjurySection data={data} />
    </div>
  );
}


function StatBar({ home, away, label }: { home: number | string; away: number | string; label: string }) {
  const h = num(home), a = num(away);
  const total = h + a || 1;
  return (
    <div>
      <div className="flex items-center justify-between font-data text-xs text-ink">
        <span>{home ?? 0}</span>
        <span className="font-body text-[11px] text-muted">{label}</span>
        <span>{away ?? 0}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-line/30">
        <div className="h-full" style={{ width: `${(h / total) * 100}%`, background: HOME_COLOR }} />
        <div className="h-full" style={{ width: `${(a / total) * 100}%`, background: AWAY_COLOR }} />
      </div>
    </div>
  );
}

function StatsTab({ data, phase }: { data: MatchDetail; phase: "PRE" | "LIVE" | "POST" }) {
  const { stats, homeTeam, awayTeam } = data;
  return (
    <div className="space-y-6">
      {phase === "LIVE" && (
        <p className="font-data text-[10px] text-muted"><span className="text-live">●</span> Updating every 60s</p>
      )}

      {!stats ? (
        <div className="space-y-2">
          <p className="font-data text-sm text-muted">
            {phase === "PRE" ? "Match stats will appear here once the game kicks off." : "Match stats not available."}
          </p>
          {phase === "PRE" && <p className="font-data text-[10px] text-muted">Recent form data not yet available.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between font-body text-[13px] font-semibold">
            <span className="text-accent">{homeTeam.name}</span>
            <span className="text-sky-400">{awayTeam.name}</span>
          </div>
          {STAT_LABELS.filter(({ key }) => stats.home[key] != null || stats.away[key] != null).map(({ key, label }) => (
            <StatBar key={key} home={stats.home[key] ?? 0} away={stats.away[key] ?? 0} label={label} />
          ))}
        </div>
      )}

    </div>
  );
}

function H2HTab({ data }: { data: MatchDetail }) {
  const { headToHead, homeTeam, awayTeam } = data;
  if (!headToHead || (headToHead.meetings.length === 0 && headToHead.homeWins + headToHead.draws + headToHead.awayWins === 0)) {
    return <p className="font-data text-sm text-muted">No previous meetings found.</p>;
  }
  const { homeWins, draws, awayWins, meetings } = headToHead;
  const total = homeWins + draws + awayWins || 1;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between font-data text-xs">
          <span className="text-accent">{homeTeam.name} {homeWins}</span>
          <span className="text-muted">Draws {draws}</span>
          <span className="text-sky-400">{awayTeam.name} {awayWins}</span>
        </div>
        <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-line/30">
          <div className="h-full" style={{ width: `${(homeWins / total) * 100}%`, background: HOME_COLOR }} />
          <div className="h-full" style={{ width: `${(draws / total) * 100}%`, background: "#8a8a8a" }} />
          <div className="h-full" style={{ width: `${(awayWins / total) * 100}%`, background: AWAY_COLOR }} />
        </div>
      </div>

      {meetings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse font-data text-xs">
            <thead>
              <tr className="border-b border-line text-left font-body text-[11px] font-medium text-muted">
                <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Home</th><th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Away</th><th className="py-2 pr-3">Comp</th><th className="py-2">R</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, i) => {
                const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
                const homeIsUs = m.homeTeam === homeTeam.name;
                const usScore = homeIsUs ? hs : as, themScore = homeIsUs ? as : hs;
                const res = usScore > themScore ? "W" : usScore < themScore ? "L" : "D";
                return (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-muted">{m.date ? String(m.date).slice(0, 10) : ""}</td>
                    <td className="py-2 pr-3">{m.homeTeam}</td>
                    <td className="py-2 pr-3 text-ink">{hs}–{as}</td>
                    <td className="py-2 pr-3">{m.awayTeam}</td>
                    <td className="py-2 pr-3 text-muted">{m.competition}</td>
                    <td className={`py-2 font-bold ${res === "W" ? "text-accent" : res === "L" ? "text-loss" : "text-muted"}`}>{res}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





function InjuryList({ injuries }: { injuries: MatchInjury[] }) {
  if (injuries.length === 0) return <p className="font-data text-xs text-muted">No reported absences.</p>;
  return (
    <div className="space-y-1">
      {injuries.map((inj, i) => {
        const badge = SEVERITY_BADGE[inj.severity ?? "unknown"] ?? SEVERITY_BADGE.unknown;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={`inline-block shrink-0 rounded-md border px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest ${badge.className}`}>{badge.label}</span>
            <span className="font-data text-xs text-ink">{inj.playerName}{inj.position ? <span className="text-muted"> · {inj.position}</span> : null}{inj.injuryType && inj.injuryType.toLowerCase() !== "unknown" ? <span className="text-muted"> · {inj.injuryType}</span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

function InjurySection({ data }: { data: MatchDetail }) {
  return (
    <div>
      <h2 className="font-body text-[15px] font-semibold leading-tight text-ink">Squad Absences</h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-body text-xs font-medium text-muted">{data.homeTeam.name}</p>
          <InjuryList injuries={data.homeInjuries} />
        </div>
        <div>
          <p className="mb-2 font-body text-xs font-medium text-muted">{data.awayTeam.name}</p>
          <InjuryList injuries={data.awayInjuries} />
        </div>
      </div>
    </div>
  );
}
