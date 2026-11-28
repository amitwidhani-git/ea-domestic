import type { MatchEvent } from "@/lib/matchEvents";

type SideStats = Record<string, number | string>;

const num = (v: number | string | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Red cards for one side: the stats feed when it has the figure, otherwise counted from events. */
export function redCardCount(stats: { home: SideStats; away: SideStats } | null, events: MatchEvent[], side: "home" | "away"): number {
  const fromStats = num(stats?.[side]?.red_cards);
  if (fromStats != null) return fromStats;
  return events.filter((e) => e.side === side && /red/i.test(e.detail ?? "")).length;
}

/** Small red-card icon(s) for a team name; nothing when the count is zero. */
export function RedCards({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" title={`${count} red card${count > 1 ? "s" : ""}`} aria-label={`${count} red card${count > 1 ? "s" : ""}`}>
      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
        <span key={i} className="inline-block h-3 w-2 rounded-[1.5px] bg-[var(--ea-down)]" aria-hidden="true" />
      ))}
    </span>
  );
}

const ITEMS: { key: string; label: string; tooltip?: string; mobile: boolean; decimals?: number }[] = [
  { key: "expected_goals", label: "xG", tooltip: "Expected goals, from API-Football. Not an EdgeIQ output", mobile: true, decimals: 2 },
  { key: "corner_kicks", label: "Corners", mobile: true },
];

/**
 * Key stats strip under the model/market panels (live and full time only):
 * the stats that explain market movement. Items missing from the feed are
 * hidden rather than shown as 0. Numbers and bars only, no betting markets.
 */
export default function KeyStatsStrip({ stats }: { stats: { home: SideStats; away: SideStats } | null }) {
  if (!stats) return null;
  const items = ITEMS
    .map((it) => ({ ...it, home: num(stats.home?.[it.key]), away: num(stats.away?.[it.key]) }))
    .filter((it) => it.home != null && it.away != null) as (typeof ITEMS[number] & { home: number; away: number })[];
  const y = { h: num(stats.home?.yellow_cards), a: num(stats.away?.yellow_cards) };
  const r = { h: num(stats.home?.red_cards), a: num(stats.away?.red_cards) };
  const hasCards = y.h != null && y.a != null && r.h != null && r.a != null;
  if (items.length === 0 && !hasCards) return null;

  return (
    <div className="space-y-2">
      <span className="block font-body text-xs font-medium text-muted">Key stats</span>
      {items.map((it) => {
        const total = it.home + it.away;
        const homePct = total > 0 ? (it.home / total) * 100 : 0; // 0-0: empty bar, not a fake 50/50 split
        const fmt = (v: number) => (it.decimals ? v.toFixed(it.decimals) : String(v));
        return (
          <div key={it.key} className={`${it.mobile ? "grid" : "hidden sm:grid"} grid-cols-[64px_44px_1fr_44px] items-center gap-2 font-data text-xs`} title={it.tooltip}>
            <span className="text-muted">{it.label}</span>
            <b className="text-right font-semibold">{fmt(it.home)}</b>
            <span className="flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <span className="h-full bg-[var(--ea-model)]" style={{ width: `${homePct}%` }} />
            </span>
            <b className="font-semibold">{fmt(it.away)}</b>
          </div>
        );
      })}
      {/* Cards as counts per team (Y yellow, R red); one line on mobile is xG and corners, cards show as icons in the score header. */}
      {hasCards && (
        <div className="hidden items-center gap-2 font-data text-xs sm:flex">
          <span className="w-16 text-muted">Cards</span>
          <span>Y <b>{y.h}</b> R <b className={r.h! > 0 ? "text-[var(--ea-live)]" : ""}>{r.h}</b></span>
          <span className="text-line">|</span>
          <span>Y <b>{y.a}</b> R <b className={r.a! > 0 ? "text-[var(--ea-live)]" : ""}>{r.a}</b></span>
        </div>
      )}
    </div>
  );
}

/** One-line key stats for the match hero (xG, corners, cards). Missing stats are left out. */
export function KeyStatsInline({ stats }: { stats: { home: SideStats; away: SideStats } | null }) {
  if (!stats) return null;
  const pair = (k: string, dp = 0) => {
    const h = num(stats.home?.[k]), a = num(stats.away?.[k]);
    return h != null && a != null ? `${dp ? h.toFixed(dp) : h}–${dp ? a.toFixed(dp) : a}` : null;
  };
  const xg = pair("expected_goals", 2), corners = pair("corner_kicks");
  const yh = num(stats.home?.yellow_cards), ya = num(stats.away?.yellow_cards), rh = num(stats.home?.red_cards), ra = num(stats.away?.red_cards);
  const cards = yh != null && ya != null && rh != null && ra != null ? `Y${yh} R${rh} | Y${ya} R${ra}` : null;
  if (!xg && !corners && !cards) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs">
      {xg && <span title="Expected goals, from API-Football. Not an EdgeIQ output"><span className="text-muted">xG</span> <b>{xg}</b></span>}
      {corners && <span><span className="text-muted">Corners</span> <b>{corners}</b></span>}
      {cards && <span className="hidden sm:inline"><span className="text-muted">Cards</span> <b>{cards}</b></span>}
    </span>
  );
}
