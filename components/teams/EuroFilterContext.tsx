"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CONTINENTAL_LEAGUES, type League } from "@/lib/leagues";

type EuroFilter = League | null;
const EuroFilterCtx = createContext<[EuroFilter, (v: EuroFilter) => void]>([null, () => {}]);

function fromSearchParam(v: string | null): EuroFilter {
  return CONTINENTAL_LEAGUES.includes(v as League) ? (v as League) : null;
}

/**
 * Reads the ?euro= filter from the URL (so a nav link like /teams?euro=UCL
 * lands pre-filtered) and holds the active European competition filter for
 * every LeagueSection on the page. Client-side only — filtering reshuffles
 * which already-fetched cards are visible, no refetch. Re-syncs if the URL's
 * own ?euro= changes (e.g. clicking a different European nav link while
 * already on /teams, which doesn't remount this provider) without fighting
 * the in-page filter pills, which only touch state, never the URL.
 */
export function EuroFilterProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const [filter, setFilter] = useState<EuroFilter>(() => fromSearchParam(params.get("euro")));

  useEffect(() => {
    setFilter(fromSearchParam(params.get("euro")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("euro")]);

  const state: [EuroFilter, (v: EuroFilter) => void] = [filter, setFilter];
  return <EuroFilterCtx.Provider value={state}>{children}</EuroFilterCtx.Provider>;
}

export function useEuroFilter() {
  return useContext(EuroFilterCtx);
}
