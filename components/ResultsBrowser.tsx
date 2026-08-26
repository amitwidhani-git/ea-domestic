"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ClubCrest from "@/components/ClubCrest";
import type { League } from "@/lib/types";
import type { ResultRow, ResultsResponse, ResultsOutcome, ResultPrediction, ResultEvSignal } from "@/lib/results";

const LEAGUES: League[] = ["PL", "CH", "L1", "L2", "LC", "FAC", "CS", "SPL", "SCH"];
const OUTCOMES: { key: ResultsOutcome; label: string }[] = [
  { key: "all", label: "All results" },
  { key: "correct", label: "✓ Correct" },
  { key: "wrong", label: "✗ Wrong" },
  { key: "none", label: "— No prediction" },
];
const RANGES: { key: "7" | "30" | "season"; label: string }[] = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "season", label: "This season" },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
function rangeFrom(range: "7" | "30" | "season"): string {
  if (range === "season") {
    const now = new Date();
    const y = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return `${y}-07-01`;
  }
  const days = range === "7" ? 7 : 30;
  return ymd(new Date(Date.now() - days * 86_400_000));
}

function selLabel(sel: string | null, r: ResultRow): string {
  if (sel === "home") return r.homeTeam.name;
  if (sel === "away") return r.awayTeam.name;
  if (sel === "draw") return "Draw";
  return sel ?? "—";
}
function dayHeading(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(iso));
}
function dayKey(iso: string): string {
  // London-local calendar date, used to group cards under one heading.
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}
function kickoffTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function frozenHours(pred: ResultPrediction, kickoffUtc: string): number | null {
  if (!pred.frozenAt) return null;
  const h = (new Date(kickoffUtc).getTime() - new Date(pred.frozenAt).getTime()) / 3_600_000;
  return h > 0 ? Math.round(h) : null;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "accent" | "loss" }) {
  const color = tone === "accent" ? "text-accent" : tone === "loss" ? "text-loss" : "text-ink";
  return (
    <div className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <p className="font-data text-[9px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl leading-none ${color}`}>{value}</p>
    </div>
  );
}

function PredictionCell({ r }: { r: ResultRow }) {
  const p = r.prediction;
  if (!p || !p.pick || !p.probs)
    return (
      <span className="inline-block border border-line px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest text-muted"
        title="This fixture was added to the schedule after the prediction freeze window closed.">
        No prediction — added late
      </span>
    );
  const correct = p.modelCorrect === true;
  const wrong = p.modelCorrect === false;
  const prob = p.probs[p.pick as "home" | "draw" | "away"];
  const badge = correct ? "✓" : wrong ? "✗" : "•";
  const badgeColor = correct ? "text-accent" : wrong ? "text-loss" : "text-muted";
  const hrs = frozenHours(p, r.kickoffUtc);
  return (
    <div className="font-data text-xs">
      <p className={badgeColor}>
        <span className="font-display text-base">{badge}</span>{" "}
        <span className="text-ink">{selLabel(p.pick, r)}</span>
        {prob != null && <span className="text-muted"> ({Math.round(prob * 100)}%)</span>}
      </p>
      {hrs != null && <p className="mt-0.5 text-[9px] text-muted">Frozen {hrs}h before KO</p>}
      {p.hash && <p className="text-[9px] text-muted">Hash: {p.hash.slice(0, 8)}</p>}
    </div>
  );
}

function SignalsCell({ signals }: { signals: ResultEvSignal[]; }) {
  if (signals.length === 0) return <span className="font-data text-sm text-muted">—</span>;
  return (
    <div className="space-y-0.5 font-data text-xs">
      {signals.map((s, i) => {
        const win = s.settledResult === "WIN";
        const lose = s.settledResult === "LOSE";
        const pnl = win ? (s.bestPrice ?? 1) - 1 : lose ? -1 : 0;
        const color = win ? "text-accent" : lose ? "text-loss" : "text-muted";
        const label = s.selection === "draw" ? "Draw" : s.selection === "home" ? "Home" : s.selection === "away" ? "Away" : s.selection;
        return (
          <p key={i} className={color}>
            <span className="capitalize">{label}</span> @ {s.bestPrice?.toFixed(2) ?? "—"} → {s.settledResult}{" "}
            {s.settledResult !== "VOID" && <span>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}u</span>}
          </p>
        );
      })}
    </div>
  );
}

function ResultCard({ r }: { r: ResultRow }) {
  const correct = r.prediction?.modelCorrect === true;
  const wrong = r.prediction?.modelCorrect === false;
  const tint = correct ? "border-accent/20 bg-accent/5" : wrong ? "border-loss/20 bg-loss/5" : "border-line bg-panel";
  return (
    <article className={`grid gap-3 rounded-[14px] border p-4 shadow-[var(--shadow)] sm:grid-cols-12 sm:items-center ${tint}`}>
      {/* Left: teams + score */}
      <div className="sm:col-span-5">
        <div className="flex items-center gap-2">
          <LeagueBadge league={r.league as League} />
          <span className="font-data text-[10px] text-muted">{kickoffTime(r.kickoffUtc)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 font-display text-lg tracking-wide">
          <ClubCrest apiFootballId={r.homeTeam.apiFootballId} clubName={r.homeTeam.name} size={24} />
          <span className="truncate">{r.homeTeam.name}</span>
          <span className="shrink-0 px-1 text-ink">{r.score ? `${r.score.home} – ${r.score.away}` : "–"}</span>
          <span className="truncate">{r.awayTeam.name}</span>
          <ClubCrest apiFootballId={r.awayTeam.apiFootballId} clubName={r.awayTeam.name} size={24} />
        </div>
        {r.penaltyScore && (
          <p className="mt-0.5 font-data text-[10px] text-muted">(pens {r.penaltyScore.home}–{r.penaltyScore.away})</p>
        )}
      </div>

      {/* Centre: prediction */}
      <div className="sm:col-span-3">
        <p className="mb-1 font-data text-[9px] uppercase tracking-widest text-muted sm:hidden">Prediction</p>
        <PredictionCell r={r} />
      </div>

      {/* Right: EV signals */}
      <div className="sm:col-span-3">
        <p className="mb-1 font-data text-[9px] uppercase tracking-widest text-muted sm:hidden">Value Signals</p>
        <SignalsCell signals={r.evSignals} />
      </div>

      {/* Far right: link */}
      <div className="sm:col-span-1 sm:text-right">
        <Link href={`/matches/${r.matchId}`} className="font-data text-[10px] text-muted transition-colors hover:text-accent">
          View stats →
        </Link>
      </div>
    </article>
  );
}

export default function ResultsBrowser({ initial }: { initial: ResultsResponse }) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [outcome, setOutcome] = useState<ResultsOutcome>("all");
  const [range, setRange] = useState<"7" | "30" | "season">("30");
  const [data, setData] = useState<ResultsResponse>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const didMount = useRef(false);

  const buildParams = (offset: number) => {
    const p = new URLSearchParams();
    if (leagues.length) p.set("league", leagues.join(","));
    p.set("from", rangeFrom(range));
    p.set("outcome", outcome);
    p.set("limit", "50");
    p.set("offset", String(offset));
    return p.toString();
  };

  // Refetch page 0 whenever a filter changes (skip the initial mount — we already have SSR data).
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/results?${buildParams(0)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ResultsResponse | null) => { if (!cancelled && json) setData(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagues, outcome, range]);

  const loadMore = () => {
    setLoadingMore(true);
    fetch(`/api/results?${buildParams(data.results.length)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ResultsResponse | null) => {
        if (json) setData((prev) => ({ ...json, results: [...prev.results, ...json.results] }));
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const clearFilters = () => { setLeagues([]); setOutcome("all"); setRange("30"); };
  const toggleLeague = (l: League) => setLeagues((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const { results, total, stats } = data;

  // Accuracy counts predictions only — we list every settled fixture (some were
  // added after the freeze window and have no model pick), so dividing by the
  // fixture count would understate accuracy. Derived from the loaded rows, whose
  // `prediction` is reliably null when absent (the server stats miscount those).
  const withPrediction = results.filter((r) => r.prediction !== null);
  const correctCount = withPrediction.filter((r) => r.prediction?.modelCorrect === true).length;
  const accuracyPct = withPrediction.length > 0 ? (correctCount / withPrediction.length * 100).toFixed(1) : "0.0";
  const withoutPrediction = results.length - withPrediction.length;

  // Group loaded rows by London calendar day, preserving descending order.
  const groups: { key: string; label: string; rows: ResultRow[] }[] = [];
  for (const r of results) {
    const k = dayKey(r.kickoffUtc);
    let g = groups[groups.length - 1];
    if (!g || g.key !== k) { g = { key: k, label: dayHeading(r.kickoffUtc), rows: [] }; groups.push(g); }
    g.rows.push(r);
  }

  const pill = (active: boolean) =>
    `shrink-0 border px-3 py-1.5 font-data text-xs uppercase tracking-widest transition-colors ${
      active ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"
    }`;

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div>
        <h1 className="font-display text-4xl tracking-wide">Results</h1>
        <p className="mt-1 font-data text-xs text-muted">Settled predictions with verified outcomes</p>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Predictions made" value={String(withPrediction.length)} />
        <StatCard label="Correct" value={String(correctCount)} />
        <StatCard label="Accuracy" value={`${accuracyPct}%`} />
        <StatCard label="EV P&L" value={`${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(1)}u`} tone={stats.pnl >= 0 ? "accent" : "loss"} />
      </div>
      {withoutPrediction > 0 && (
        <p className="font-data text-xs text-muted text-center">
          Accuracy calculated from {withPrediction.length} predictions. {withoutPrediction} fixture(s) had no prediction (added to schedule after freeze window).
        </p>
      )}

      {/* ── FILTER ROW ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {/* League pills */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLeagues([])} className={pill(leagues.length === 0)}>All</button>
            {LEAGUES.map((l) => (
              <button key={l} onClick={() => toggleLeague(l)} className={pill(leagues.includes(l))}>{l}</button>
            ))}
          </div>
          {/* Outcome */}
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button key={o.key} onClick={() => setOutcome(o.key)} className={pill(outcome === o.key)}>{o.label}</button>
            ))}
          </div>
        </div>
        {/* Date range */}
        <div className="flex flex-wrap gap-2">
          {RANGES.map((rg) => (
            <button key={rg.key} onClick={() => setRange(rg.key)} className={pill(range === rg.key)}>{rg.label}</button>
          ))}
        </div>
      </div>

      {/* ── RESULTS LIST ── */}
      {loading ? (
        <p className="font-data text-sm text-muted">Loading results…</p>
      ) : results.length === 0 ? (
        <div className="border border-line bg-panel p-8 text-center">
          <p className="font-data text-sm text-muted">No results found for the selected filters.</p>
          <button onClick={clearFilters} className="mt-3 border border-line px-4 py-2 font-data text-xs uppercase tracking-widest text-ink transition-colors hover:border-accent hover:text-accent">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.key}>
                <h2 className="mb-2 font-data text-[11px] uppercase tracking-widest text-muted">{g.label}</h2>
                <div className="space-y-2">
                  {g.rows.map((r) => <ResultCard key={r.matchId} r={r} />)}
                </div>
              </div>
            ))}
          </div>

          {/* ── PAGINATION ── */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="font-data text-[10px] text-muted">Showing {results.length} of {total} fixtures ({withPrediction.length} predicted)</p>
            {results.length < total && (
              <button onClick={loadMore} disabled={loadingMore}
                className="border border-line px-5 py-2 font-data text-xs uppercase tracking-widest text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
