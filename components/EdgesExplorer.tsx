"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ValueSignalCard, { FeedHeader } from "@/components/ValueSignalCard";
import { Count, OptLabel, OverflowGroup, competitionOptions, optClass } from "@/components/FilterTabs";
import type { EvSignal, League } from "@/lib/types";
import { WHENS, inWhen, type WhenKey } from "@/lib/when";

type Matchday = "featured" | WhenKey;
const MATCHDAYS: { key: Matchday; label: string; short?: string }[] = [{ key: "featured", label: "Featured" }, ...WHENS];

// Featured always shows in full (as before). The timeframes can hold 100+ fixtures, so they show a
// grid's worth and expand in place.
const PAGE = 12;

/**
 * Homepage "Best upcoming edges": Featured is the curated top-two-per-competition
 * list (and the server-rendered default); Today / This weekend / Full week use the
 * same timeframe rules as Insights. Competitions filter whichever list is selected.
 */
export default function EdgesExplorer({ featured, signals }: { featured: EvSignal[]; signals: EvSignal[] }) {
  const [day, setDay] = useState<Matchday>("featured");
  const [league, setLeague] = useState<"ALL" | League>("ALL");
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // "Show all" removes itself on click; move keyboard focus to the first newly shown fixture instead of losing it.
  const focusAfterExpand = useRef(false);
  useEffect(() => {
    if (!expanded || !focusAfterExpand.current) return;
    focusAfterExpand.current = false;
    listRef.current?.querySelectorAll("article")[PAGE]?.querySelector<HTMLElement>("a[href]")?.focus();
  }, [expanded]);

  const listFor = (d: Matchday) => (d === "featured" ? featured : signals.filter((s) => inWhen(s.kickoff_utc, d)));
  const dayCounts = useMemo(
    () => Object.fromEntries(MATCHDAYS.map((m) => [m.key, listFor(m.key).length])) as Record<Matchday, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featured, signals],
  );
  const dayList = useMemo(() => listFor(day), [day, featured, signals]); // eslint-disable-line react-hooks/exhaustive-deps
  const leagues = competitionOptions(dayList.map((s) => s.league), league);
  const list = league === "ALL" ? dayList : dayList.filter((s) => s.league === league);
  const shown = expanded || day === "featured" ? list : list.slice(0, PAGE);

  const pickDay = (d: Matchday) => {
    setDay(d);
    setExpanded(false);
    // Keep the competition only if the new matchday still has fixtures in it.
    if (league !== "ALL" && !listFor(d).some((s) => s.league === league)) setLeague("ALL");
  };

  return (
    <section>
      <h2 className="mb-1 flex items-baseline font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">
        Best upcoming edges
        <Link href="/insights" className="ml-auto font-body text-[13px] font-medium tracking-normal text-accent-ink underline-offset-4 hover:underline">Full odds →</Link>
      </h2>

      {/* Same filters as Insights: matchdays, then competitions on one line with the overflow in a "More" menu. */}
      <div className="mb-4">
        <div role="group" aria-label="Matchday" className="-mx-4 flex items-end gap-x-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:gap-x-5 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {MATCHDAYS.map((m) => (
            <button key={m.key} type="button" onClick={() => pickDay(m.key)} aria-pressed={day === m.key}
              disabled={dayCounts[m.key] === 0} className={`${optClass(day === m.key)} text-[13px] font-medium sm:text-[14px]`}>
              <OptLabel label={m.label} short={m.short} /> <Count n={dayCounts[m.key]} />
            </button>
          ))}
        </div>
        {leagues.length > 2 && (
          <OverflowGroup label="Competition" options={leagues} value={league}
            onChange={(lg) => { setLeague(lg); setExpanded(false); }} />
        )}
      </div>

      {list.length === 0 ? (
        <p className="font-body text-[13px] text-muted">No value signals for this selection.</p>
      ) : (
        <>
          <FeedHeader />
          <div ref={listRef} className="grid gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-1 lg:gap-y-0">
            {shown.map((s) => (
              <ValueSignalCard key={s.match_id} signal={s} oddsFmt="dec" featured flat />
            ))}
          </div>
        </>
      )}
      {list.length > shown.length && (
        <button type="button" onClick={() => { focusAfterExpand.current = true; setExpanded(true); }}
          className="mt-6 inline-flex min-h-9 items-center font-body text-[13px] font-medium text-accent-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Show all {list.length}
        </button>
      )}
    </section>
  );
}
