"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import OddsPanel from "@/components/OddsPanel";
import MatchWidget from "@/components/MatchWidget";
import ValueSignalCard, { type OddsFormat } from "@/components/ValueSignalCard";
import type { EvSignal, League, UpcomingFixtureWithSignal } from "@/lib/types";
import type { Affiliate } from "@/lib/affiliates";

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

function FixtureCard({ item, highlighted }: { item: UpcomingFixtureWithSignal; highlighted: boolean }) {
  const { fixture, prediction, bestSignal } = item;
  return (
    <article
      id={`match-${fixture.match_id}`}
      className={`border bg-panel p-4 transition-colors duration-700 ${highlighted ? "border-accent" : "border-line"}`}
    >
      <div className="flex items-center justify-between">
        <LeagueBadge league={fixture.league} />
        {bestSignal && (
          <span className="border border-accent bg-accent/10 px-2 py-0.5 font-data text-xs font-semibold text-accent">
            +{(bestSignal.ev * 100).toFixed(1)}% EV
          </span>
        )}
      </div>

      <h3 className="relative mt-2 font-display text-xl tracking-wide">
        <Link href={`/matches/${fixture.match_id}`} aria-label={`Match centre: ${fixture.home_team} v ${fixture.away_team}`} className="absolute inset-0 z-10" />
        {teamLink(fixture.home_team_id, fixture.home_team)}
        {" "}<span className="text-ink">v</span>{" "}
        {teamLink(fixture.away_team_id, fixture.away_team)}
      </h3>
      <p className="mt-0.5 font-data text-[10px] text-muted">{kickoffLabel(fixture.kickoff_utc)}</p>

      {prediction ? (
        <div className="mt-3 space-y-2">
          <ProbBar probs={prediction.probs} pick={prediction.pick} />
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="font-data text-xs">
              EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[prediction.pick]}</span>
            </span>
            <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} />
          </div>
        </div>
      ) : (
        <p className="mt-3 font-data text-[10px] text-muted">Locks 48h before KO</p>
      )}

      <div className="-mx-4 -mb-4 mt-3">
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

const LEAGUE_FILTERS: ("ALL" | League)[] = ["ALL", "PL", "CH", "L1", "L2", "LC", "FAC"];
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

function NativeOffer() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-dashed border-line bg-panel px-5 py-4 sm:col-span-2">
      <span className="rounded border border-line px-1.5 py-0.5 font-body text-[9.5px] font-bold uppercase tracking-wide text-muted">Ad · Partner</span>
      <div className="flex flex-col gap-0.5">
        <b className="font-body text-[14.5px]">New-customer offers from our licensed partners</b>
        <span className="font-body text-[12.5px] text-muted">Compare welcome offers before you back a pick · 18+</span>
      </div>
      <Link href="/#partner-offers" className="ml-auto rounded-[9px] bg-ink px-4 py-2.5 font-body text-[13px] font-bold text-panel">See offers</Link>
    </div>
  );
}

function tabClass(active: boolean): string {
  return active
    ? "border border-accent bg-accent px-5 py-2.5 font-display text-lg tracking-wider text-bg transition-colors"
    : "border border-line px-5 py-2.5 font-display text-lg tracking-wider text-ink transition-colors hover:border-accent hover:text-accent";
}

export default function InsightsFixtures({
  signals,
}: { signals: EvSignal[]; affiliates: (Affiliate | null)[] }) {
  const [tab, setTab] = useState<"signals" | "fixtures">("signals");
  const [oddsFmt, setOddsFmt] = useState<OddsFormat>("frac");

  const [upcoming, setUpcoming] = useState<UpcomingFixtureWithSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [league, setLeague] = useState<"ALL" | League>("ALL");
  const [sort, setSort] = useState<SortKey>("date");
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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
            {/* competition sub-nav + odds format toggle */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {LEAGUE_FILTERS.map((lg) => (
                  <button key={lg} onClick={() => setLeague(lg)} className={pillClass(league === lg)}>
                    {lg === "ALL" ? "All" : lg}
                  </button>
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

            {(() => {
              const sigList = league === "ALL" ? signals : signals.filter((s) => s.league === league);
              if (sigList.length === 0) {
                return <p className="mt-8 font-data text-sm text-muted">No value signals for this competition.</p>;
              }
              const featured = [...sigList].sort((a, b) => (b.model_prob - b.market_prob) - (a.model_prob - a.market_prob))[0];
              return (
                <>
                  <div className="mt-4">
                    <h2 className="mb-3 font-data text-[13px] font-bold uppercase tracking-wider text-muted">Biggest edge this weekend</h2>
                    <ValueSignalCard signal={featured} oddsFmt={oddsFmt} featured />
                  </div>

                  <h2 className="mb-3 mt-8 font-data text-[13px] font-bold uppercase tracking-wider text-muted">All value signals</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sigList.map((s, i) => (
                      <Fragment key={`${s.match_id}-${s.selection}`}>
                        <ValueSignalCard signal={s} oddsFmt={oddsFmt} />
                        {i === 2 && <NativeOffer />}
                      </Fragment>
                    ))}
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
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <span className="font-data text-[10px] uppercase tracking-widest text-muted self-center">Sort</span>
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => setSort(s.key)} className={pillClass(sort === s.key)}>
                {s.label}
              </button>
            ))}
            <span className="ml-auto font-data text-xs text-ink self-center">{visible.length} fixtures</span>
          </div>

          {loading && !loaded ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse border border-line bg-panel" />
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
              {visible.map((u) => (
                <FixtureCard
                  key={u.fixture.match_id}
                  item={u}
                  highlighted={highlightId === `match-${u.fixture.match_id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
