"use client";
import { useEffect, useRef, useState } from "react";
import BookmakerLogo from "@/components/BookmakerLogo";
import { trackAffiliateClick } from "@/lib/gtag";
import { bestPrice, type Outcome, type PricedBook, type PriceRow } from "@/lib/bestPrice";
import { TOOLTIP, fmtPp, pct } from "@/lib/marketDisplay";
import type { MatchEvent } from "@/lib/matchEvents";
import type { LiveOddsPoint } from "@/lib/liveFixtures";

/**
 * Match page market modules: the hero market chart, the Match odds table and the
 * Best odds panel. All bookmaker prices go through lib/bestPrice so the page and
 * the homepage cards agree.
 */

export type Phase = "PRE" | "LIVE" | "POST" | "OFF";
export const OUTCOMES: Outcome[] = ["home", "draw", "away"];
type Probs = Record<Outcome, number>;

const ukDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
/** UK clock time; prefixed with the date when not today, so an older snapshot never reads as current. */
export function ukTime(iso: string | null | undefined, seconds = false): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hour12: false }).format(d);
  if (ukDay(d) === ukDay(new Date())) return time;
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(d)}, ${time}`;
}

/** /api/odds/[matchId] rows (latest snapshot per bookmaker, updated in play too). null while loading. */
export function useOddsSnapshots(matchId: string): PriceRow[] | null {
  const [rows, setRows] = useState<PriceRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/odds/${encodeURIComponent(matchId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PriceRow[]) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [matchId]);
  return rows;
}

const MARKET_TIP: Record<Phase, string> = { PRE: TOOLTIP.marketNow, LIVE: TOOLTIP.liveMarket, POST: TOOLTIP.closing, OFF: TOOLTIP.marketNow };

// ---------------------------------------------------------------- hero market chart

type Mode = "prob" | "odds";
const LINE_VAR: Record<Outcome, string> = { home: "--info", draw: "--muted", away: "--warn" }; // no team colour data: neutral, distinct

function toProbs(p: LiveOddsPoint): Probs {
  const h = 1 / p.h, d = 1 / p.d, a = 1 / p.a, t = h + d + a;
  return { home: h / t, draw: d / t, away: a / t };
}

/** Smooth path through points without overshoot (monotone cubic, Fritsch-Carlson). */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Value of each outcome at any minute, interpolated between history points (so the cursor glides). */
function valuesAt(points: LiveOddsPoint[], minute: number, mode: Mode): Record<Outcome, number> {
  const get = (p: LiveOddsPoint, o: Outcome) => (mode === "prob" ? toProbs(p)[o] * 100 : o === "home" ? p.h : o === "draw" ? p.d : p.a);
  if (minute <= points[0].min) return { home: get(points[0], "home"), draw: get(points[0], "draw"), away: get(points[0], "away") };
  const last = points[points.length - 1];
  if (minute >= last.min) return { home: get(last, "home"), draw: get(last, "draw"), away: get(last, "away") };
  let i = 0;
  while (i < points.length - 2 && points[i + 1].min < minute) i++;
  const a = points[i], b = points[i + 1], f = b.min === a.min ? 0 : (minute - a.min) / (b.min - a.min);
  const lerp = (o: Outcome) => get(a, o) + (get(b, o) - get(a, o)) * f;
  return { home: lerp("home"), draw: lerp("draw"), away: lerp("away") };
}

const VB_H = 300;               // SVG height in user units
const PAD = { l: 36, r: 56, t: 22, b: 26 }; // left: % axis labels; right: end-of-line % pills
const SNAP_PX = 14;             // the cursor snaps to an event within this distance

/**
 * The page's hook (Polymarket / Kalshi style): smooth market lines from kick-off with soft
 * gradient fills, live end pills, minimal axes and a cursor that glides with the pointer
 * (values interpolated between data points). Near a goal or red card the cursor locks onto
 * the event and shows how the market moved across it. Dashed lines = EdgeIQ pre-match.
 */
export function MarketChart({ points, events, names, edgeiq, focus, onFocus, updatedAt, final }: {
  points: LiveOddsPoint[];
  events: MatchEvent[];
  names: Record<Outcome, string>;
  edgeiq: Probs | null;
  focus: Outcome | null;
  onFocus: (o: Outcome) => void;
  updatedAt: string | null;
  /** Full time: the chart is the complete in-play record, not a live view. */
  final: boolean;
}) {
  const [mode, setMode] = useState<Mode>("prob");
  const [cursor, setCursor] = useState<number | null>(null); // minute under the pointer; null = now
  const wrap = useRef<HTMLDivElement>(null);
  // The SVG is drawn in real pixels (measured), so lines and text never stretch at any size.
  const [size, setSize] = useState({ w: 800, h: VB_H });
  const usable = points.filter((p) => p.h > 1 && p.d > 1 && p.a > 1);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(280, Math.round(e.contentRect.width)), h: Math.max(180, Math.round(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (usable.length < 2) return null;

  const minMin = usable[0].min;
  const maxMin = Math.max(usable[usable.length - 1].min, minMin + 1);
  const domain = mode === "prob" ? { min: 0, max: 100 } : (() => {
    const all = usable.flatMap((p) => [p.h, p.d, p.a]);
    return { min: Math.max(1, Math.min(...all) * 0.95), max: Math.max(...all) * 1.05 };
  })();
  const W = size.w, H = size.h, plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const x = (m: number) => PAD.l + ((m - minMin) / (maxMin - minMin)) * plotW;
  const y = (v: number) => PAD.t + (1 - (v - domain.min) / (domain.max - domain.min)) * plotH;
  const val = (p: LiveOddsPoint, o: Outcome) => (mode === "prob" ? toProbs(p)[o] * 100 : o === "home" ? p.h : o === "draw" ? p.d : p.a);

  // Goals and red cards inside the plotted range: the cursor snaps to these.
  const marks = events
    .map((e) => ({ e, goal: /goal|penalty/i.test(e.type ?? "") && !/missed/i.test(e.detail ?? ""), red: /red/i.test(e.detail ?? "") }))
    .filter((k) => (k.goal || k.red) && k.e.minute != null && k.e.minute >= minMin && k.e.minute <= maxMin);

  const atMinute = cursor ?? maxMin;
  const snapped = cursor != null ? marks.find((k) => k.e.minute === cursor) ?? null : null;
  const at = valuesAt(usable, atMinute, mode); // in the chart's units (% or odds)
  const probsAt = valuesAt(usable, atMinute, "prob"); // readouts are always market %
  const shownProbs: Probs = { home: probsAt.home / 100, draw: probsAt.draw / 100, away: probsAt.away / 100 };
  const first = toProbs(usable[0]);

  // Market across a snapped event: just before vs just after.
  const across = snapped ? (() => {
    const before = [...usable].reverse().find((p) => p.min < snapped.e.minute!) ?? usable[0];
    const after = usable.find((p) => p.min > snapped.e.minute!) ?? usable[usable.length - 1];
    return { before: toProbs(before), after: toProbs(after) };
  })() : null;

  const hasGoalEvents = marks.some((k) => k.goal);
  const score = events.reduce((acc, e) => {
    if (e.minute == null || e.minute > atMinute || !/goal|penalty/i.test(e.type ?? "") || /missed/i.test(e.detail ?? "")) return acc;
    const own = /own/i.test(`${e.type ?? ""} ${e.detail ?? ""}`);
    const side = own ? (e.side === "home" ? "away" : "home") : e.side;
    if (side === "home") acc.h++; else if (side === "away") acc.a++;
    return acc;
  }, { h: 0, a: 0 });

  // Pointer -> continuous minute, snapping to an event when close to its line.
  const move = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((clientX - r.left) / r.width) * W;
    const near = marks.find((k) => Math.abs(x(k.e.minute!) - px) <= SNAP_PX);
    if (near) { setCursor(near.e.minute!); return; }
    const m = minMin + ((px - PAD.l) / plotW) * (maxMin - minMin);
    setCursor(m >= maxMin - 0.25 ? null : Math.max(minMin, m));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Escape") return;
    e.preventDefault();
    if (e.key === "Escape") return setCursor(null);
    const cur = cursor ?? maxMin;
    const next = cur + (e.key === "ArrowRight" ? 1 : -1);
    setCursor(next >= maxMin ? null : Math.max(minMin, next));
  };

  // End-of-line pills, nudged apart so they never overlap.
  const pills = OUTCOMES.map((o) => ({ o, v: val(usable[usable.length - 1], o) }))
    .sort((a, b) => y(a.v) - y(b.v))
    .reduce<{ o: Outcome; v: number; py: number }[]>((acc, p) => {
      acc.push({ ...p, py: Math.max(y(p.v), (acc[acc.length - 1]?.py ?? -Infinity) + 20) });
      return acc;
    }, []);
  // Second pass from the bottom: pills pushed past the floor move the ones above them up.
  for (let i = pills.length - 1; i >= 0; i--) {
    const floor = i === pills.length - 1 ? PAD.t + plotH : pills[i + 1].py - 20;
    pills[i].py = Math.min(pills[i].py, floor);
  }

  const yTicks = mode === "prob" ? [0, 25, 50, 75, 100] : [0, 0.25, 0.5, 0.75, 1].map((f) => domain.min + f * (domain.max - domain.min));
  // "KO" always labels the first point; quarter-hour ticks after it, skipping any too close to KO.
  const xTicks = [minMin, ...[15, 30, 45, 60, 75, 90, 105, 120].filter((m) => m - minMin >= 6 && m <= maxMin)];
  const fmtV = (v: number) => (mode === "prob" ? (v > 0 && v < 1 ? "<1%" : `${Math.round(v)}%`) : v.toFixed(2));
  const cx = x(atMinute);
  const tipLeft = Math.min(Math.max(cx / W, 0.12), 0.88);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">{final ? "Market · full match" : "Live market · Match winner"}</h2>
          <p className="font-data text-[10.5px] text-muted">Derived from bookmaker odds, not an EdgeIQ prediction. Dashed lines = EdgeIQ pre-match.</p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-full bg-chip p-0.5">
          {(["prob", "odds"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 font-body text-[11px] font-bold ${mode === m ? "bg-ink text-panel" : "text-muted"}`}>
              {m === "prob" ? "%" : "Odds"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 font-data text-xs">
        <span className={`font-semibold ${cursor == null ? "text-[var(--ea-live)]" : "text-ink"}`}>
          {cursor == null ? (final ? "Full time" : "Now") : `${Math.round(atMinute)}'`}
        </span>
        {cursor != null && hasGoalEvents && <span className="text-muted">· {names.home} {score.h}–{score.a} {names.away}</span>}
        {cursor != null && <button type="button" onClick={() => setCursor(null)} className="ml-auto font-semibold text-muted hover:text-ink">{final ? "Back to full time" : "Back to now"}</button>}
      </div>

      {/* Outcome readouts: the big numbers, following the cursor */}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-4" role="group" aria-label="Outcomes">
        {OUTCOMES.map((o) => {
          const d = Math.round((shownProbs[o] - first[o]) * 100);
          return (
            <button key={o} type="button" aria-pressed={focus === o} onClick={() => onFocus(o)}
              className={`min-w-0 rounded-[12px] border px-2.5 py-2 text-left transition-colors sm:px-3 ${focus === o ? "border-ink bg-chip" : "border-transparent hover:bg-chip/60"}`}>
              <span className="flex items-center gap-1.5 font-data text-[11px] text-muted">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(${LINE_VAR[o]})` }} />
                <span className="truncate">{o === "draw" ? "Draw" : names[o]}</span>
              </span>
              <span className="mt-0.5 block font-data text-2xl font-semibold leading-tight tabular-nums sm:text-3xl" title={MARKET_TIP[final ? "POST" : "LIVE"]}>{pct(shownProbs[o])}</span>
              <span className="block font-data text-[11px]">
                <span className={d > 0 ? "text-[var(--ea-up)]" : d < 0 ? "text-[var(--ea-down)]" : "text-muted"}>{d > 0 ? "▲" : d < 0 ? "▼" : ""}{Math.abs(d)}pp</span>
                <span className="hidden text-muted sm:inline"> since KO</span>
              </span>
              {edgeiq && <span className="block font-data text-[11px] text-[var(--ea-model)]" title={TOOLTIP.model}>EdgeIQ {pct(edgeiq[o])}</span>}
            </button>
          );
        })}
      </div>

      {/* The chart */}
      <div ref={wrap} className="relative mt-3 touch-pan-y select-none outline-none" tabIndex={0} onKeyDown={onKey}
        aria-label="Market chart. Move across it, or use the arrow keys, to see the market at any minute."
        onPointerMove={(e) => move(e.clientX)} onPointerDown={(e) => move(e.clientX)}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setCursor(null); }}>
        <svg data-market-chart role="img" viewBox={`0 0 ${W} ${H}`} className="block h-[230px] w-full overflow-visible sm:h-[300px]">
          <defs>
            {OUTCOMES.map((o) => (
              <linearGradient key={o} id={`fill-${o}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(${LINE_VAR[o]})`} stopOpacity={focus === o ? 0.28 : 0.12} />
                <stop offset="100%" stopColor={`var(${LINE_VAR[o]})`} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* grid: faint dashed rows, labels on the right */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={PAD.l + plotW} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="2 4" />
              <text x={PAD.l - 6} y={y(v) + 3.5} textAnchor="end" className="fill-[var(--ea-muted)] font-data text-[10px]">{fmtV(v)}</text>
            </g>
          ))}
          {xTicks.map((m) => (
            <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="fill-[var(--ea-muted)] font-data text-[10px]">{m === minMin ? "KO" : `${m}'`}</text>
          ))}

          {/* EdgeIQ pre-match reference: flat dashed line per outcome */}
          {mode === "prob" && edgeiq && OUTCOMES.map((o) => (
            <line key={o} x1={PAD.l} x2={PAD.l + plotW} y1={y(edgeiq[o] * 100)} y2={y(edgeiq[o] * 100)}
              stroke={`var(${LINE_VAR[o]})`} strokeDasharray="5 5" strokeWidth={1} opacity={focus == null || focus === o ? 0.55 : 0.15} />
          ))}

          {/* event lines */}
          {marks.map(({ e, goal }, i) => (
            <g key={i} opacity={snapped && snapped.e !== e ? 0.35 : 1}>
              <line x1={x(e.minute!)} x2={x(e.minute!)} y1={PAD.t - 6} y2={PAD.t + plotH} stroke={goal ? "var(--ink)" : "var(--ea-live)"} strokeOpacity={0.35} strokeDasharray="3 3" />
              <text x={x(e.minute!)} y={PAD.t - 9} textAnchor="middle" className="text-[12px]">{goal ? "⚽" : "🟥"}</text>
            </g>
          ))}

          {/* market lines: soft gradient area + smooth stroke; the focused outcome sits on top */}
          {[...OUTCOMES].sort((a, b) => Number(a === focus) - Number(b === focus)).map((o) => {
            const pts = usable.map((p) => [x(p.min), y(val(p, o))] as [number, number]);
            const line = monotonePath(pts);
            const area = `${line} L${pts[pts.length - 1][0]},${PAD.t + plotH} L${pts[0][0]},${PAD.t + plotH} Z`;
            const dim = focus != null && focus !== o;
            return (
              <g key={o} opacity={dim ? 0.35 : 1}>
                {/* Only the selected outcome gets the gradient fill, so the areas never muddy each other. */}
                {(focus ?? "home") === o && <path d={area} fill={`url(#fill-${o})`} />}
                <path d={line} fill="none" stroke={`var(${LINE_VAR[o]})`} strokeWidth={focus === o ? 3 : 2.25} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}

          {/* live end dots (pulsing while live) */}
          {OUTCOMES.map((o) => {
            const last = usable[usable.length - 1];
            return (
              <g key={o}>
                {!final && cursor == null && <circle cx={x(last.min)} cy={y(val(last, o))} r={8} fill={`var(${LINE_VAR[o]})`} opacity={0.25} className="animate-ping origin-center [transform-box:fill-box]" />}
                <circle cx={x(last.min)} cy={y(val(last, o))} r={3.5} fill={`var(${LINE_VAR[o]})`} />
              </g>
            );
          })}

          {/* end-of-line % pills */}
          {pills.map(({ o, v, py }) => (
            <g key={o} transform={`translate(${PAD.l + plotW + 6},${py - 9})`}>
              <rect width={44} height={18} rx={9} fill={`var(${LINE_VAR[o]})`} />
              <text x={22} y={12.5} textAnchor="middle" className="fill-[var(--accent-fg)] font-data text-[10.5px] font-bold">{fmtV(v)}</text>
            </g>
          ))}

          {/* cursor: glides with the pointer, locks onto events */}
          {cursor != null && (
            <g>
              <line x1={cx} x2={cx} y1={PAD.t - 6} y2={PAD.t + plotH} stroke="var(--ink)" strokeOpacity={0.7} strokeWidth={1} />
              {OUTCOMES.map((o) => (
                <circle key={o} cx={cx} cy={y(at[o])} r={4.5} fill="var(--surface)" stroke={`var(${LINE_VAR[o]})`} strokeWidth={2.5} />
              ))}
            </g>
          )}
        </svg>

        {/* floating tooltip at the cursor */}
        {cursor != null && (
          <div className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-line bg-panel/95 px-3 py-2 shadow-[var(--shadow)] backdrop-blur"
            style={{ left: `${tipLeft * 100}%` }}>
            {snapped ? (
              <p className="mb-1 whitespace-nowrap font-data text-[11px] font-semibold">
                {snapped.goal ? "⚽ Goal" : "🟥 Red card"} {snapped.e.minute}&apos;{snapped.e.player ? ` · ${snapped.e.player}` : ""}
              </p>
            ) : (
              <p className="mb-1 font-data text-[11px] font-semibold">{Math.round(atMinute)}&apos;</p>
            )}
            {OUTCOMES.map((o) => (
              <p key={o} className="flex items-center gap-1.5 whitespace-nowrap font-data text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(${LINE_VAR[o]})` }} />
                <span className="text-muted">{o === "draw" ? "Draw" : names[o]}</span>
                {across
                  ? <b className="ml-auto pl-2 tabular-nums">{pct(across.before[o])} → {pct(across.after[o])}</b>
                  : <b className="ml-auto pl-2 tabular-nums">{fmtV(at[o])}</b>}
              </p>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 font-data text-[10px] text-[var(--ea-muted)]">
        {updatedAt ? `${final ? "Final update" : "Updated"} ${ukTime(updatedAt, true)} · ` : ""}{mode === "prob" ? "margin-adjusted" : "decimal odds"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- match odds (combined)

/**
 * Match odds: one row per outcome combining the EdgeIQ model, the market and the best price,
 * so the same figures never appear twice. Live: EdgeIQ | Kick-off | Now | Chg. Pre-match:
 * EdgeIQ | Market now | Value Signal | Best odds. Full time: EdgeIQ | Kick-off | Closing | Result.
 * Columns without data are dropped.
 */
export function MatchOddsTable({ phase, names, edgeiq, kickoff, now, result, valueSignal, rows, selected, onSelect, compact = false, matchId, league, pick = null }: {
  phase: Phase;
  /** EdgeIQ's pre-match pick, marked with the gold Pick chip. */
  pick?: Outcome | null;
  names: Record<Outcome, string>;
  edgeiq: Probs | null;
  kickoff: Probs | null;
  now: Probs | null;
  result: Outcome | null;
  valueSignal: { side: Outcome; gap: number } | null;
  rows: PriceRow[] | null;
  selected: Outcome;
  onSelect: (o: Outcome) => void;
  /** Beside the chart: fills the chart's height, rows spread out, names allowed to wrap. */
  compact?: boolean;
  matchId: string;
  league: string;
}) {
  type Col = { key: string; label: string; tip?: string; width?: string; cell: (o: Outcome) => React.ReactNode };
  const cols: Col[] = [];
  const marketLabel = phase === "LIVE" ? "Now" : phase === "POST" ? "Closing" : "Market now";
  const best = (o: Outcome) => (phase === "PRE" ? bestPrice(rows ?? [], o).best : null);

  if (edgeiq) cols.push({ key: "eiq", label: "EdgeIQ", tip: TOOLTIP.model, cell: (o) => <span className="text-[var(--ea-model)]">{pct(edgeiq[o])}</span> });
  if ((phase === "LIVE" || phase === "POST") && kickoff) cols.push({ key: "ko", label: "Kick-off", cell: (o) => <span className="text-[var(--ea-muted)]">{pct(kickoff[o])}</span> });
  if (now) cols.push({ key: "now", label: marketLabel, tip: MARKET_TIP[phase], cell: (o) => <span className="font-semibold text-[var(--ea-market)]">{pct(now[o])}</span> });
  if (phase === "LIVE" && kickoff && now) cols.push({ key: "chg", label: "Chg", cell: (o) => {
    const d = Math.round((now[o] - kickoff[o]) * 100);
    return <span className={d > 0 ? "text-[var(--ea-up)]" : d < 0 ? "text-[var(--ea-down)]" : "text-muted"}>{d > 0 ? "▲" : d < 0 ? "▼" : ""}{Math.abs(d)}</span>;
  } });
  if (phase === "PRE" && valueSignal) cols.push({ key: "vs", label: "Value Signal", cell: (o) => valueSignal.side === o
    ? <span className="rounded-full bg-[var(--ea-signal)]/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-ink">{fmtPp(valueSignal.gap)}</span> : null });
  if (phase === "PRE" && OUTCOMES.some((o) => best(o))) cols.push({ key: "odds", label: "Best odds", tip: TOOLTIP.bestOdds, cell: (o) => {
    const b = best(o);
    return b ? <span className="inline-flex items-center gap-1.5 font-semibold"><BookmakerLogo cta={b.partner ? b.cta : null} name={b.name} />{b.price.toFixed(2)}</span> : null;
  } });
  if (phase === "POST" && result) cols.push({ key: "res", label: "Result", cell: (o) => (result === o ? <span aria-label="Result">✓</span> : null) });

  // EdgeIQ's pick: its own narrow column at the right edge of the row.
  if (pick) cols.push({ key: "pick", label: "", width: "w-12", cell: (o) => (pick === o
    ? <span className="inline-block rounded bg-[var(--ea-pick)]/15 px-1.5 py-px font-body text-[10px] font-semibold text-[var(--ea-pick)]">Pick</span> : null) });

  const title = phase === "LIVE" ? "Match odds · since kick-off" : phase === "POST" ? "Match odds · full time" : "Match odds";

  return (
    <div className={compact ? "flex h-full flex-col" : ""}>
      <h2 className="mb-3 font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h2>
      {!edgeiq && <p className="mb-2 font-data text-xs text-muted">EdgeIQ model not available for this fixture</p>}
      {cols.length > 0 && (
        <table className="w-full table-fixed border-collapse font-data text-[14px]">
          <thead>
            <tr>
              <th className={`${compact ? "w-[30%]" : "w-[32%]"} pb-2 text-left max-sm:w-[25%]`}><span className="sr-only">Outcome</span></th>
              {cols.map((c) => <th key={c.key} title={c.tip} className={`${c.width ?? ""} pb-2 text-right font-body text-[11px] font-medium text-[var(--ea-muted)]`}>{c.label || <span className="sr-only">{c.key === "pick" ? "EdgeIQ pick" : ""}</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {OUTCOMES.map((o) => (
              <tr key={o} onClick={() => onSelect(o)} className={`cursor-pointer border-t border-line/60 transition-colors ${selected === o ? "bg-chip" : "hover:bg-chip/60"}`}>
                <td className="py-2.5 pl-2 pr-2">
                  <button type="button" aria-pressed={selected === o} onClick={(e) => { e.stopPropagation(); onSelect(o); }}
                    className="break-words text-left font-body text-[14px] font-semibold">
                    {o === "draw" ? "Draw" : names[o]}
                  </button>
                </td>
                {cols.map((c) => <td key={c.key} className="py-2.5 pr-2 text-right">{c.cell(o)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Beside the chart: live, the best partner price per outcome merged into its tracked button
          (partner prices only, as on the homepage live cards); at full time the best closing price
          per outcome (archive, no links). Every tile keeps the same height. */}
      {compact && (phase === "LIVE" || phase === "POST") && OUTCOMES.some((o) => bestPrice(rows ?? [], o).best) && (() => {
        const at = OUTCOMES.map((o) => bestPrice(rows ?? [], o).at).filter(Boolean).sort().pop() ?? null;
        return (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 flex flex-wrap items-baseline gap-x-2 font-body text-xs font-medium text-[var(--ea-muted)]">
              {phase === "LIVE" ? "Best partner odds" : "Closing odds"}
              {at && <span className="font-normal normal-case tracking-normal">Odds at {ukTime(at, true)}</span>}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => {
                const { best, list } = bestPrice(rows ?? [], o);
                const b = phase === "LIVE" ? list.find((x) => x.partner && x.cta) : best;
                const label = <span className="mb-1 block truncate font-body text-xs font-medium text-muted">{o === "draw" ? "Draw" : names[o]}</span>;
                if (phase === "LIVE" && b) return (
                  <div key={o} className="min-w-0">
                    {label}
                    <a href={`/go/${b.cta!.affiliateId}`} rel="sponsored nofollow" target="_blank"
                      onClick={() => trackAffiliateClick({ bookmaker: b.cta!.affiliateId, matchId, league, odds: b.price, position: 1 })}
                      aria-label={`Go to ${b.name}: ${b.price.toFixed(2)} on ${o === "draw" ? "the draw" : names[o]}`} title={`Go to ${b.name}`}
                      className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[var(--ea-signal)] px-2 font-data text-[14px] font-semibold text-accent-fg transition-[filter] hover:brightness-105 active:brightness-95">
                      <BookmakerLogo cta={b.cta} name={b.name} />{b.price.toFixed(2)}
                    </a>
                  </div>
                );
                return (
                  <div key={o} className="min-w-0">
                    {label}
                    <div className="flex h-9 items-center justify-center gap-2 font-data text-[14px] font-semibold" title={b?.name}>
                      {b ? <><BookmakerLogo cta={b.partner ? b.cta : null} name={b.name} />{b.price.toFixed(2)}</> : <span className="text-muted">–</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {phase !== "LIVE" && <p className="mt-2 font-data text-[10px] text-[var(--ea-muted)]">Archived, not available to bet.</p>}
          </div>
        );
      })()}
      <div className={`mt-2.5 space-y-0.5 font-data text-[10px] text-[var(--ea-muted)] ${compact ? "mt-auto pt-3" : ""}`}>
        {edgeiq && <p>EdgeIQ = Edge Analysts&apos; frozen pre-match model.</p>}
        {cols.some((c) => c.key === "chg") && <p>Chg = market now compared against the market at kick-off (pp). Market figures are bookmaker-derived, not an EdgeIQ prediction.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- best odds (three columns, no tabs)

const VISIBLE_ROWS = 4;
const IMPLIED_TIP = "Implied probability (100 / odds). Includes bookmaker margin";
/** One fixed grid for every row in every column, so logos, prices and percentages always line up. */
const ROW_GRID = "grid grid-cols-[20px_minmax(0,1fr)_44px_48px_12px] items-center gap-2";

function Shell({ title, at, note = null, action = null, children }: {
  title: string; at: string | null; note?: string | null; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h2>
          {at && <span className="font-data text-[10.5px] text-[var(--ea-muted)]">Odds at {ukTime(at, true)}</span>}
        </div>
        {action}
      </div>
      {note && <p className="mb-3 font-data text-[11px] text-muted">{note}</p>}
      {children}
    </div>
  );
}

/**
 * Best odds (spec v3 9.3a): all three outcomes side by side, no tabs. Partners first, best price
 * first; the top row is highlighted with the only button. Columns are padded to the same number of
 * rows and every column reserves the button slot, so nothing staggers across columns.
 * PRE and LIVE: the latest prices, actionable (partners first, tracked links, "Go to" buttons).
 * POST: Closing odds (archive), no links.
 * OFF (postponed etc.): Odds unavailable.
 */
export function BestOddsPanel({ names, phase, rows, matchId, league }: {
  names: Record<Outcome, string>;
  phase: Phase;
  rows: PriceRow[] | null;
  matchId: string;
  league: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const lists = OUTCOMES.map((o) => ({ o, ...bestPrice(rows ?? [], o) }));
  const at = lists.reduce<string | null>((a, l) => (l.at && (!a || l.at > a) ? l.at : a), null);
  // Latest prices are actionable before and during the match; at full time they are closing odds (archive).
  const actionable = phase === "PRE" || phase === "LIVE";
  const longest = Math.max(0, ...lists.map((l) => l.list.length));
  const rowCount = expanded ? longest : Math.min(VISIBLE_ROWS, longest);
  const title = phase === "POST" ? "Closing odds" : "Best odds";

  if (phase === "OFF") return <Shell title="Best odds" at={null}><p className="font-data text-sm text-muted">Odds unavailable</p></Shell>;
  if (rows === null) return <Shell title={title} at={null}><p className="font-data text-sm text-muted">Loading prices…</p></Shell>;
  if (longest === 0) {
    if (phase === "POST") return null;
    return <Shell title={title} at={null}><p className="font-data text-sm text-muted">Odds unavailable</p></Shell>;
  }

  const rowNode = (b: PricedBook | undefined, i: number, o: Outcome) => {
    if (!b) return <div key={`pad-${i}`} className={`${ROW_GRID} h-9 px-2`} aria-hidden="true" />; // pad: keeps columns level
    const linked = actionable && b.partner;
    // The best partner price is the column's one button: price and "Go to" merged into a single tracked row.
    const primary = i === 0 && linked;
    const track = () => trackAffiliateClick({ bookmaker: b.cta!.affiliateId, matchId, league, odds: b.price, position: i + 1 });
    const inner = (
      <>
        <BookmakerLogo cta={b.partner ? b.cta : null} name={b.name} />
        <span className={primary ? "truncate font-body text-[12px] font-bold" : "truncate"}>{primary ? `Go to ${b.name}` : b.name}</span>
        <b className={primary ? "text-right text-[13px] font-bold" : "text-right font-semibold"}>{b.price.toFixed(2)}</b>
        <span className={`text-right text-[10.5px] ${primary ? "text-accent-fg/70" : "text-[var(--ea-muted)]"}`} title={IMPLIED_TIP}>{b.implied.toFixed(1)}%</span>
        <span className={primary ? "text-right" : "text-right text-muted"} aria-hidden="true">{linked ? "›" : ""}</span>
      </>
    );
    const cls = `${ROW_GRID} h-9 rounded-[8px] px-2 font-data text-xs ${primary ? "bg-[var(--ea-signal)] text-accent-fg" : ""}`;
    return linked
      ? <a key={b.bookmaker} href={`/go/${b.cta!.affiliateId}`} rel="sponsored nofollow" target="_blank" onClick={track} className={`${cls} ${primary ? "transition-[filter] hover:brightness-105 active:brightness-95" : "transition-colors hover:bg-chip"}`} aria-label={`${primary ? "Go to " : ""}${b.name} ${b.price.toFixed(2)} on ${o === "draw" ? "the draw" : names[o]}`}>{inner}</a>
      : <div key={b.bookmaker} className={cls}>{inner}</div>;
  };

  return (
    <Shell title={title} at={at}>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-3">
        {lists.map(({ o, list }) => (
          <div key={o} className="min-w-0">
            <h3 className="mb-1.5 flex h-7 items-center justify-between gap-2 border-b border-line pb-1 font-body text-[13px] font-semibold">
              <span className="truncate">{o === "draw" ? "Draw" : names[o]}</span>
            </h3>
            <div className="space-y-1">
              {rowNode(list[0], 0, o)}
              {/* Rows 2+: hidden on mobile until "Compare bookmakers"; padded so all columns are the same height. */}
              <div className={expanded ? "space-y-1" : "hidden space-y-1 md:block"}>
                {Array.from({ length: Math.max(0, rowCount - 1) }, (_, k) => rowNode(list[k + 1], k + 1, o))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {longest > 1 && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-3 font-data text-xs font-semibold text-muted hover:text-ink">
          {expanded ? "Show fewer bookmakers" : "Compare bookmakers ›"}
        </button>
      )}
    </Shell>
  );
}
