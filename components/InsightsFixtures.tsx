"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import OddsPanel from "@/components/OddsPanel";
import MatchWidget from "@/components/MatchWidget";
import ValueSignalCard, { type OddsFormat } from "@/components/ValueSignalCard";
import BetanoPromo from "@/components/BetanoPromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetMazePromo from "@/components/BetMazePromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import MogobetPromo from "@/components/MogobetPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import Bet247Promo from "@/components/Bet247Promo";
import BetwayPromo from "@/components/BetwayPromo";
import { useBackFrom } from "@/lib/useBackFrom";
import { LEAGUE_CODES } from "@/lib/leagues";
import type { EvSignal, League, UpcomingFixtureWithSignal } from "@/lib/types";

// The real partner strip banners — randomised into the All Fixtures list
// (replacing the generic placeholder AffiliateBar previously used there).
const STRIP_BANNERS = [
  BetanoPromo, LivescorebetPromo, BetMazePromo, BetrinoPromo, BetsunaPromo,
  FruityKingPromo, MogobetPromo, MonsterCasinoPromo, SpinzwinPromo, Bet247Promo, BetwayPromo,
];

// Value Signals gets its own, smaller rotation — just the two newest/priority
// partners, per request — rather than the full All Fixtures pool.
const VALUE_SIGNAL_STRIPS = [BetwayPromo, Bet247Promo];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Extends `prev` up to `needed` items drawn from `pool`, "shuffle-bag" style:
// each full pass through the pool is a fresh shuffle (so nothing repeats
// until every other option has appeared once), and a pass boundary is
// nudged so it never lands on the same item that just preceded it either.
// With pool.length <= 1 a repeat is unavoidable — falls through gracefully.
function extendNoAdjacentDupes<T>(prev: T[], pool: T[], needed: number): T[] {
  const result = [...prev];
  while (result.length < needed) {
    const bag = shuffled(pool);
    if (result.length > 0 && bag.length > 1 && bag[0] === result[result.length - 1]) {
      const swapAt = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[swapAt]] = [bag[swapAt], bag[0]];
    }
    result.push(...bag);
  }
  return result.slice(0, needed);
}

// ---------------------------------------------------------------- helpers

function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${get("hour")}:${get("minute")} UK`;
}

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;

function teamLink(id: string, name: string) {
  return (
    <Link href={`/teams/${id}`} className="relative z-20 underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{name}</Link>
  );
}

// ---------------------------------------------------------------- upcoming-fixture card

function FixtureCard({ item, highlighted, backFrom }: { item: UpcomingFixtureWithSignal; highlighted: boolean; backFrom: string }) {
  const { fixture, prediction, bestSignal } = item;
  return (
    <article
      id={`match-${fixture.match_id}`}
      className={`relative flex flex-col overflow-hidden rounded-[14px] border bg-panel p-4 transition-colors duration-700 ${highlighted ? "border-accent" : "border-line hover:border-muted"}`}
      style={{ boxShadow: "var(--shadow)" }}
    >
      {/* top row */}
      <div className="mb-3.5 flex items-center gap-2">
        <span className="rounded-md bg-chip px-1.5 py-1 font-data text-[10.5px] font-semibold tracking-wide text-muted">{fixture.league}</span>
        <span className="font-data text-xs text-muted">{kickoffLabel(fixture.kickoff_utc)}</span>
        {bestSignal && (
          <span className="ml-auto rounded-full bg-accent/10 px-2.5 py-1 font-data text-xs font-semibold text-accent-ink">
            +{(bestSignal.ev * 100).toFixed(1)}% EV
          </span>
        )}
      </div>

      {/* teams — the whole title area links to the match centre */}
      <div className="relative mb-3.5 flex items-center gap-2.5">
        <Link href={`/matches/${fixture.match_id}?from=${backFrom}`} aria-label={`Match centre: ${fixture.home_team} v ${fixture.away_team}`} className="absolute inset-0 z-10" />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[15.5px] font-semibold">
          <ClubCrest apiFootballId={fixture.home_api_football_id ?? null} clubName={fixture.home_team} size={26} />
          {teamLink(fixture.home_team_id, fixture.home_team)}
        </div>
        <span className="font-data text-[11px] text-muted">v</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[15.5px] font-semibold">
          {teamLink(fixture.away_team_id, fixture.away_team)}
          <ClubCrest apiFootballId={fixture.away_api_football_id ?? null} clubName={fixture.away_team} size={26} />
        </div>
      </div>

      {prediction ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-panel2 px-3 py-2.5">
            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-muted">Pick</span>
            <span className="font-data text-sm font-bold">
              {prediction.pick === "draw" ? "Draw" : prediction.pick === "home" ? fixture.home_team : fixture.away_team}
              {prediction.pick !== "draw" ? " win" : ""}
            </span>
            <span className="ml-auto font-data text-lg font-semibold">{(prediction.probs[prediction.pick] * 100).toFixed(0)}%</span>
          </div>
          <ProbBar probs={prediction.probs} pick={prediction.pick} />
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="font-data text-xs">
              EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[prediction.pick]}</span>
            </span>
            <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} />
          </div>
        </div>
      ) : (
        <p className="font-data text-[10px] text-muted">Prediction locks before KO</p>
      )}

      <div className="-mx-4 -mb-4 mt-3.5">
        <OddsPanel
          matchId={fixture.match_id}
          homeTeam={fixture.home_team}
          awayTeam={fixture.away_team}
          modelProbs={prediction?.probs}
          ev={bestSignal?.ev}
          selection={bestSignal?.selection}
          bestPrice={bestSignal?.best_price}
        />
        {prediction && (
          <MatchWidget
            matchId={fixture.match_id}
            homeTeam={fixture.home_team}
            awayTeam={fixture.away_team}
            homeTeamId={fixture.home_team_id}
            awayTeamId={fixture.away_team_id}
            kickoffUtc={fixture.kickoff_utc}
            modelProbs={prediction.probs}
            modelPick={prediction.pick}
            status="SCHEDULED"
            bestSignal={
              bestSignal
                ? { selection: bestSignal.selection, ev: bestSignal.ev, bestPrice: bestSignal.best_price, bestBookmaker: bestSignal.best_bookmaker }
                : undefined
            }
          />
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- main

const LEAGUE_FILTERS: ("ALL" | League)[] = ["ALL", ...LEAGUE_CODES];
type SortKey = "date" | "ev" | "confidence";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "ev", label: "EV" },
  { key: "confidence", label: "Confidence" },
];

function pillClass(active: boolean): string {
  return `shrink-0 rounded-full border px-3.5 py-1.5 font-body text-[13px] font-semibold transition-colors ${
    active ? "border-ink bg-ink text-panel" : "border-line text-muted hover:border-muted hover:text-ink"
  }`;
}

type WhenKey = "today" | "weekend" | "week";
const WHENS: { key: WhenKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekend", label: "This weekend" },
  { key: "week", label: "Full week" },
];
// Loose timeframe filter over a fixture's kickoff time (Europe/London aware).
function inWhen(iso: string, when: WhenKey): boolean {
  if (!iso) return when === "week";
  const now = new Date();
  const t = new Date(iso);
  const diffDays = (t.getTime() - now.getTime()) / 86_400_000;
  if (when === "today") {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
    return f.format(now) === f.format(t);
  }
  if (when === "weekend") {
    const wd = t.getUTCDay(); // Fri 5 · Sat 6 · Sun 0
    return (wd === 5 || wd === 6 || wd === 0) && diffDays >= -1 && diffDays <= 9;
  }
  return diffDays >= -1 && diffDays <= 14; // full week (generous)
}

function tabClass(active: boolean): string {
  return `rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${
    active ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"
  }`;
}

export default function InsightsFixtures({
  signals,
}: { signals: EvSignal[] }) {
  const backFrom = useBackFrom();
  const [tab, setTab] = useState<"signals" | "fixtures">("signals");
  const [oddsFmt, setOddsFmt] = useState<OddsFormat>("frac");
  const [when, setWhen] = useState<WhenKey>("week");

  const [upcoming, setUpcoming] = useState<UpcomingFixtureWithSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Defaults to the competition of the next (soonest-kickoff) value signal —
  // signals are already sorted kickoff-ascending — rather than "All".
  const [league, setLeague] = useState<"ALL" | League>(() => (signals[0]?.league as League | undefined) ?? "ALL");
  const [sort, setSort] = useState<SortKey>("date");
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // One real strip banner (Betway/247Bet) per every-8-cards slot in Value
  // Signals, picked once client-side (never during SSR, so it can't mismatch
  // on hydration) and grown — never reshuffled — as the list needs more slots.
  const [valueStripPicks, setValueStripPicks] = useState<(typeof VALUE_SIGNAL_STRIPS)[number][]>([]);
  useEffect(() => {
    const needed = Math.ceil(Math.max(signals.length, 1) / 8) + 1;
    setValueStripPicks((prev) => (prev.length >= needed ? prev : extendNoAdjacentDupes(prev, VALUE_SIGNAL_STRIPS, needed)));
  }, [signals.length]);

  // Same idea, but for the All Fixtures tab: one real strip banner per
  // every-8-cards slot, picked once client-side and grown (never reshuffled)
  // as more fixtures load — shuffle-bag order, so no repeats until every
  // other banner has had a turn.
  const [stripPicks, setStripPicks] = useState<(typeof STRIP_BANNERS)[number][]>([]);
  useEffect(() => {
    const needed = Math.ceil(Math.max(upcoming.length, 1) / 8) + 1;
    setStripPicks((prev) => (prev.length >= needed ? prev : extendNoAdjacentDupes(prev, STRIP_BANNERS, needed)));
  }, [upcoming.length]);

  // Deep link: /insights#match-<id> lands on the All Fixtures tab.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#match-")) {
      setTab("fixtures");
      setPendingHash(hash.slice(1));
    }
  }, []);

  // Lazy-load the large upcoming dataset only when the tab is first opened.
  useEffect(() => {
    if (tab !== "fixtures" || loaded) return;
    setLoading(true);
    fetch("/api/upcoming")
      .then((r) => r.json())
      .then((data: UpcomingFixtureWithSignal[]) => {
        setUpcoming(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, loaded]);

  // Once the target card exists, scroll to it and flag it for highlighting.
  useEffect(() => {
    if (!loaded || !pendingHash) return;
    const el = document.getElementById(pendingHash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(pendingHash);
    }
    setPendingHash(null);
  }, [loaded, pendingHash]);

  // Fade the accent highlight back to normal after 2 seconds.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const visible = useMemo(() => {
    const list = league === "ALL" ? upcoming : upcoming.filter((u) => u.fixture.league === league);
    const confidence = (u: UpcomingFixtureWithSignal) =>
      u.prediction ? u.prediction.probs[u.prediction.pick] : -Infinity;
    const byDate = (a: UpcomingFixtureWithSignal, b: UpcomingFixtureWithSignal) =>
      a.fixture.kickoff_utc < b.fixture.kickoff_utc ? -1 : a.fixture.kickoff_utc > b.fixture.kickoff_utc ? 1 : 0;
    return [...list].sort((a, b) => {
      if (sort === "ev") {
        const diff = (b.bestSignal?.ev ?? -Infinity) - (a.bestSignal?.ev ?? -Infinity);
        return diff !== 0 ? diff : byDate(a, b);
      }
      if (sort === "confidence") {
        const diff = confidence(b) - confidence(a);
        return diff !== 0 ? diff : byDate(a, b);
      }
      return byDate(a, b);
    });
  }, [upcoming, league, sort]);

  return (
    <section>
      <h1 className="font-display text-4xl tracking-wide">Odds Value Signals</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink">
        We compare our model&apos;s predicted chances against the best odds on the market.
        If our probability differs from the price on offer, that&apos;s considered a Value Signal.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setTab("signals")} className={tabClass(tab === "signals")}>
          VALUE SIGNALS
        </button>
        <button onClick={() => setTab("fixtures")} className={tabClass(tab === "fixtures")}>
          ALL FIXTURES
        </button>
      </div>

      {tab === "signals" ? (
        signals.length === 0 ? (
          <div className="mt-6 rounded-[14px] border border-line bg-panel px-6 py-10 text-center">
            <p className="font-display text-xl text-ink">No live value signals</p>
            <p className="mt-1 font-data text-xs text-ink">Check back on matchdays.</p>
          </div>
        ) : (
          <>
            {/* timeframe + odds format toggle */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {WHENS.map((w) => (
                  <button key={w.key} onClick={() => setWhen(w.key)} className={pillClass(when === w.key)}>{w.label}</button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-data text-[11px] uppercase tracking-widest text-muted">Odds</span>
                <div className="inline-flex rounded-lg bg-chip p-0.5">
                  {(["frac", "dec"] as OddsFormat[]).map((f) => (
                    <button key={f} onClick={() => setOddsFmt(f)}
                      className={`rounded-md px-3 py-1.5 font-body text-xs font-semibold transition-colors ${
                        oddsFmt === f ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
                      }`}>
                      {f === "frac" ? "Fractional" : "Decimal"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* competition chips */}
            <div className="mt-3 -mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {LEAGUE_FILTERS.map((lg) => (
                <button key={lg} onClick={() => setLeague(lg)} className={pillClass(league === lg)}>
                  {lg === "ALL" ? "All" : lg}
                </button>
              ))}
            </div>

            {(() => {
              const list = signals.filter((s) => (league === "ALL" || s.league === league) && inWhen(s.kickoff_utc, when));
              if (list.length === 0) {
                return <p className="mt-8 font-data text-sm text-muted">No value signals for this filter.</p>;
              }
              const edgeOf = (s: EvSignal) => s.bestValue.model_prob - s.bestValue.market_prob;
              const featured = [...list].sort((a, b) => edgeOf(b) - edgeOf(a))[0];
              return (
                <>
                  <h2 className="mb-3 mt-6 flex items-center gap-2 font-data text-[13px] font-bold uppercase tracking-wider text-muted">
                    Biggest edge
                    <span title="Edge = our model's probability minus the probability implied by the best available price. Positive means we rate it likelier than the market does."
                      className="inline-flex h-[15px] w-[15px] cursor-help items-center justify-center rounded-full border border-muted/60 text-[10px] font-bold normal-case tracking-normal text-muted">?</span>
                  </h2>
                  <div className="max-w-xl">
                    <ValueSignalCard signal={featured} oddsFmt={oddsFmt} featured />
                  </div>

                  <h2 className="mb-3 mt-8 font-data text-[13px] font-bold uppercase tracking-wider text-muted">All odds &amp; value</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {list.map((s, i) => {
                      const StripBanner = (i + 1) % 8 === 0 ? valueStripPicks[Math.floor(i / 8)] : undefined;
                      return (
                        <Fragment key={s.match_id}>
                          <ValueSignalCard signal={s} oddsFmt={oddsFmt} />
                          {StripBanner && <div className="sm:col-span-2"><StripBanner /></div>}
                        </Fragment>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        )
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {LEAGUE_FILTERS.map((lg) => (
              <button key={lg} onClick={() => setLeague(lg)} className={pillClass(league === lg)}>
                {lg === "ALL" ? "All" : lg}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <span className="font-data text-[11px] uppercase tracking-widest text-muted">Sort</span>
              <div className="inline-flex rounded-lg bg-chip p-0.5">
                {SORTS.map((s) => (
                  <button key={s.key} onClick={() => setSort(s.key)}
                    className={`rounded-md px-3 py-1.5 font-body text-xs font-semibold transition-colors ${
                      sort === s.key ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="font-data text-xs text-ink self-center">{visible.length} fixtures</span>
          </div>

          {loading && !loaded ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-[14px] border border-line bg-panel" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-6 font-data text-sm text-muted">
              {loaded && upcoming.length === 0
                ? "No upcoming fixtures in the next 14 days."
                : "No fixtures match the current filter."}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {visible.map((u, i) => {
                const StripBanner = (i + 1) % 8 === 0 ? stripPicks[Math.floor(i / 8)] : undefined;
                return (
                  <Fragment key={u.fixture.match_id}>
                    <FixtureCard
                      item={u}
                      highlighted={highlightId === `match-${u.fixture.match_id}`}
                      backFrom={backFrom}
                    />
                    {StripBanner && <div className="sm:col-span-2"><StripBanner /></div>}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
