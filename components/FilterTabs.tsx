"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LEAGUE_CODES } from "@/lib/leagues";
import { LEAGUE_NAMES, type League } from "@/lib/types";

/** Text filter option (matchday, competition, tier) shared by the homepage and Insights: underlined when selected, 36px tall hit area. */
export function optClass(active: boolean): string {
  return `inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap border-b-2 py-2 font-body transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted/45 ${
    active ? "border-accent text-ink" : "border-transparent text-muted enabled:hover:text-ink"
  }`;
}

export function Count({ n }: { n: number }) {
  return <span className="font-data text-[11px] text-muted">{n}</span>;
}

/** Matchday label, with its shorter form on phones so the row fits on one line. */
export function OptLabel({ label, short }: { label: string; short?: string }) {
  if (!short) return <>{label}</>;
  return <><span className="max-sm:hidden">{label}</span><span className="sm:hidden">{short}</span></>;
}

export type FilterOption<K extends string> = { key: K; label: string; n?: number };

/** "All" plus every competition with fixtures in `leagues`, in registry order, with counts. The selected one stays listed even at zero. */
export function competitionOptions(leagues: League[], selected: "ALL" | League): FilterOption<"ALL" | League>[] {
  const counts = new Map<League, number>();
  for (const lg of leagues) counts.set(lg, (counts.get(lg) ?? 0) + 1);
  return [
    { key: "ALL", label: "All", n: leagues.length },
    ...LEAGUE_CODES.filter((lg) => counts.has(lg) || lg === selected).map((lg) => ({ key: lg, label: LEAGUE_NAMES[lg] ?? lg, n: counts.get(lg) ?? 0 })),
  ];
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"
    className={`self-center transition-transform ${open ? "rotate-180" : ""}`}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * One line of text filters that never runs off screen: the options that fit
 * stay inline and the rest go into a "More" menu at the end of the line (which
 * takes the selected option's name when the selection is in it). What fits is
 * measured on a hidden copy of the full line, so the visible line never reflows.
 */
export function OverflowGroup<K extends string>({ options, value, onChange, label, size = "text-[13px]" }: {
  options: FilterOption<K>[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  size?: string;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // null until measured: the line is clipped in CSS so the server render doesn't jump.
  const [fit, setFit] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const sig = options.map((o) => `${o.key}:${o.n ?? ""}`).join("|");
  const selIdx = options.findIndex((o) => o.key === value);

  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    const measure = () => {
      const items = [...box.children] as HTMLElement[];
      const more = items.pop()!;
      const W = box.clientWidth;
      const right = (el: HTMLElement) => el.offsetLeft + el.offsetWidth;
      if (right(items[items.length - 1]) <= W) return setFit(items.length);
      const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
      const count = (reserve: number) => Math.max(1, items.filter((el) => right(el) + gap + reserve <= W).length);
      let n = count(more.offsetWidth);
      // A selection that lands in the menu labels the trigger, so leave room for its name.
      if (selIdx >= n) n = count(Math.max(more.offsetWidth, items[selIdx].offsetWidth + 16));
      setFit(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [sig, selIdx]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const content = (o: FilterOption<K>) => <>{o.label}{o.n != null && <Count n={o.n} />}</>;
  const inline = fit == null ? options : options.slice(0, fit);
  const rest = fit == null ? [] : options.slice(fit);
  const picked = selIdx >= (fit ?? options.length) ? options[selIdx] : null;

  return (
    <div className="relative">
      <div ref={measureRef} aria-hidden="true" className={`pointer-events-none invisible absolute inset-x-0 top-0 flex h-0 gap-x-4 overflow-hidden ${size}`}>
        {options.map((o) => <span key={o.key} className={optClass(false)}>{content(o)}</span>)}
        <span className={optClass(false)}>More <Chevron open={false} /></span>
      </div>
      <div role="group" aria-label={label} className={`flex items-end gap-x-4 ${size} ${fit == null ? "overflow-hidden" : ""}`}>
        {inline.map((o) => (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} aria-pressed={value === o.key} className={optClass(value === o.key)}>
            {content(o)}
          </button>
        ))}
        {rest.length > 0 && (
          <div ref={wrapRef} className="relative">
            <button ref={triggerRef} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true"
              className={optClass(!!picked)}>
              {picked ? content(picked) : "More"} <Chevron open={open} />
            </button>
            {open && (
              <div className="absolute right-0 top-full z-30 mt-1 max-h-[min(60vh,360px)] min-w-[220px] overflow-y-auto rounded-[8px] border border-line bg-panel py-1 shadow-[var(--shadow)]">
                {rest.map((o) => (
                  <button key={o.key} type="button" aria-pressed={value === o.key}
                    onClick={() => { onChange(o.key); setOpen(false); triggerRef.current?.focus(); }}
                    className={`flex w-full items-baseline justify-between gap-4 px-3 py-2 text-left font-body text-[13px] transition-colors hover:bg-chip focus-visible:bg-chip focus-visible:outline-none ${value === o.key ? "font-medium text-ink" : "text-muted hover:text-ink"}`}>
                    <span className="flex items-baseline gap-2">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 self-center rounded-full ${value === o.key ? "bg-accent" : "bg-transparent"}`} />
                      {o.label}
                    </span>
                    {o.n != null && <Count n={o.n} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
