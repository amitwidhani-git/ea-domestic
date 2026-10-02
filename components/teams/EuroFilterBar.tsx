"use client";
import { CONTINENTAL_LEAGUES, LEAGUES } from "@/lib/leagues";
import { useEuroFilter } from "./EuroFilterContext";

function pillClass(active: boolean): string {
  return `shrink-0 rounded-full border px-3.5 py-1.5 font-body text-[13px] font-semibold transition-colors ${
    active ? "border-ink bg-ink text-panel" : "border-line text-muted hover:border-muted hover:text-ink"
  }`;
}

/** European competition filter — hides every team card not playing in the selected competition this season, across every domestic section at once. */
export default function EuroFilterBar() {
  const [filter, setFilter] = useEuroFilter();
  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 font-data text-[10px] uppercase tracking-widest text-muted">European:</span>
      <button type="button" onClick={() => setFilter(null)} className={pillClass(filter === null)}>All</button>
      {CONTINENTAL_LEAGUES.map((code) => (
        <button key={code} type="button" onClick={() => setFilter(code)} className={pillClass(filter === code)}>
          {LEAGUES[code].name}
        </button>
      ))}
    </div>
  );
}
