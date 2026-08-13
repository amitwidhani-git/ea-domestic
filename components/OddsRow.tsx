"use client";
import { useState } from "react";
import Link from "next/link";
import type { EvSignal } from "@/lib/types";
import type { OddsFormat } from "@/components/ValueSignalCard";

interface ApiOddsRow {
  bookmaker: string;
  displayName: string;
  prices: { home: number | null; draw: number | null; away: number | null };
}

// ---- odds display helpers (mirrors ValueSignalCard) ----------------------
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
function decToFrac(dec: number): string {
  const x = dec - 1;
  if (x <= 0) return dec.toFixed(2);
  if (Math.abs(x - 1) < 1e-9) return "Evens";
  let best = { a: 1, b: 1, e: Infinity };
  for (let b = 1; b <= 20; b++) {
    const a = Math.round(x * b);
    if (a < 1) continue;
    const e = Math.abs(a / b - x);
    if (e < best.e - 1e-9) best = { a, b, e };
  }
  const g = gcd(best.a, best.b) || 1;
  return `${best.a / g}/${best.b / g}`;
}
function showPrice(dec: number | null | undefined, fmt: OddsFormat): string {
  if (dec == null) return "—";
  return fmt === "frac" ? decToFrac(dec) : dec.toFixed(2);
}

function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")}`;
}

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function OddsRow({ signal, oddsFmt }: { signal: EvSignal; oddsFmt: OddsFormat }) {
  const [open, setOpen] = useState(false);
  const [odds, setOdds] = useState<ApiOddsRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const model = signal.model_prob * 100;
  const edge = model - signal.market_prob * 100;
  const pickName = signal.selection === "draw" ? "Draw" : signal.selection === "home" ? signal.home_team : signal.away_team;

  function toggle() {
    setOpen((o) => !o);
    if (odds === null && !loading) {
      setLoading(true);
      fetch(`/api/odds/${encodeURIComponent(signal.match_id)}`)
        .then((r) => r.json())
        .then((data: ApiOddsRow[]) => setOdds(Array.isArray(data) ? data : []))
        .catch(() => setOdds([]))
        .finally(() => setLoading(false));
    }
  }

  const priceRows = (odds ?? [])
    .map((o) => ({ book: o.bookmaker, name: o.displayName, price: o.prices?.[signal.selection] ?? null }))
    .filter((r): r is { book: string; name: string; price: number } => typeof r.price === "number")
    .sort((a, b) => b.price - a.price);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow)]">
      <div className="flex items-center gap-3 p-3.5">
        <span className="hidden shrink-0 rounded-md bg-chip px-1.5 py-1 font-data text-[10.5px] font-semibold tracking-wide text-muted sm:inline-block">{signal.league}</span>

        <div className="min-w-0 flex-1">
          <div className="truncate font-body text-[14.5px] font-semibold">
            <Link href={`/teams/${signal.home_team_id}`} className="hover:text-accent">{signal.home_team}</Link>
            <span className="text-muted"> v </span>
            <Link href={`/teams/${signal.away_team_id}`} className="hover:text-accent">{signal.away_team}</Link>
          </div>
          <div className="mt-0.5 font-body text-[11px] text-muted">
            {kickoffLabel(signal.kickoff_utc)} · <Link href={`/matches/${signal.match_id}`} className="text-accent-ink hover:underline">Match centre →</Link>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3.5">
          <div className="hidden text-right sm:block">
            <b className="block font-body text-[13px]">{pickName} · {model.toFixed(0)}%</b>
            <span className={`font-body text-[11.5px] font-semibold ${edge > 0 ? "text-accent-ink" : "text-muted"}`}>
              {edge > 0 ? `+${edge.toFixed(0)}% edge` : "no edge"}
            </span>
          </div>
          <a href={`/go/${signal.best_bookmaker}`} rel="sponsored nofollow" target="_blank"
            className="inline-flex items-center gap-2 rounded-[9px] bg-accent px-3 py-2 font-body text-[13px] font-bold text-white transition-[filter] hover:brightness-105">
            <span className="font-data text-sm">{showPrice(signal.best_price, oddsFmt)}</span>
            <Arrow />
          </a>
          <button onClick={toggle} aria-label={open ? "Hide prices" : "Show all prices"} className="flex text-muted transition-transform hover:text-ink"
            style={{ transform: open ? "rotate(180deg)" : "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-panel2 p-3.5">
          <p className="mb-2 font-data text-[10.5px] uppercase tracking-wide text-muted">All prices · {pickName} win</p>
          {loading ? (
            <p className="font-data text-xs text-muted">Loading prices…</p>
          ) : priceRows.length === 0 ? (
            <p className="font-data text-xs text-muted">No bookmaker prices available yet.</p>
          ) : (
            priceRows.map((r, i) => (
              <div key={r.book} className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 hover:bg-panel">
                <span className="font-body text-[13.5px] font-semibold">{r.name}</span>
                {i === 0 && <span className="rounded bg-accent/10 px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-accent-ink">Best</span>}
                <span className="ml-auto font-data text-sm font-semibold">{showPrice(r.price, oddsFmt)}</span>
                <a href={`/go/${r.book}`} rel="sponsored nofollow" target="_blank"
                  className="inline-flex items-center gap-1 rounded-[7px] bg-accent px-3 py-1.5 font-body text-[11.5px] font-bold text-white hover:brightness-105">Bet</a>
              </div>
            ))
          )}
          <Link href={`/matches/${signal.match_id}`} className="mt-3 block border-t border-line pt-3 text-center font-body text-[12.5px] font-semibold text-accent-ink hover:underline">
            Full analysis →
          </Link>
          <p className="mt-2 text-center font-data text-[10px] text-muted">Prices illustrative · 18+ · Gamble responsibly · BeGambleAware.org</p>
        </div>
      )}
    </div>
  );
}
