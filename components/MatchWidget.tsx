"use client";
import { useState } from "react";

type Outcome = "home" | "draw" | "away";

export interface OddsSnapshot {
  bookmaker: string;
  displayName: string;
  prices: { home: number; draw: number; away: number };
  impliedProbs: { home: number; draw: number; away: number };
  overround: number;
  fetchedAt: string;
}

interface BestSignal {
  selection: Outcome;
  ev: number;
  bestPrice: number;
  bestBookmaker: string;
}

interface SeriesPoint { t: number; home: number; draw: number; away: number }

const OUTCOMES: Outcome[] = ["home", "draw", "away"];
const COLORS: Record<Outcome, string> = { home: "var(--accent)", draw: "#6B7280", away: "#60A5FA" };
// Status values are normalised (SCHEDULED | LIVE | FINISHED); the raw API-Football
// code lives on afStatus, not here. AET/pens detail is in penaltyScore/ftr.
const LIVE_STATUSES = new Set(["LIVE"]);
const FINISHED_STATUSES = new Set(["FINISHED"]);

// ---------------------------------------------------------------- data helpers

function deVig(prices: { home: number; draw: number; away: number }): { home: number; draw: number; away: number } | null {
  const { home, draw, away } = prices ?? ({} as OddsSnapshot["prices"]);
  if (!(home > 0) || !(draw > 0) || !(away > 0)) return null;
  const rh = 1 / home, rd = 1 / draw, ra = 1 / away;
  const total = rh + rd + ra;
  return { home: rh / total, draw: rd / total, away: ra / total };
}

// One implied-probability point per unique fetchedAt, taken from the sharpest
// book (Betfair Exchange first, else the lowest overround), de-vigged.
function buildSeries(snaps: OddsSnapshot[]): SeriesPoint[] {
  const byTime = new Map<string, OddsSnapshot[]>();
  for (const s of snaps) {
    if (!byTime.has(s.fetchedAt)) byTime.set(s.fetchedAt, []);
    byTime.get(s.fetchedAt)!.push(s);
  }
  const points: SeriesPoint[] = [];
  for (const [ts, group] of byTime) {
    const sharp =
      group.find((g) => g.bookmaker === "betfair_ex_uk") ??
      group.reduce((a, b) => (b.overround < a.overround ? b : a), group[0]);
    const p = sharp && deVig(sharp.prices);
    if (p) points.push({ t: new Date(ts).getTime(), ...p });
  }
  return points.sort((a, b) => a.t - b.t);
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const dx = (p1.x - p0.x) * 0.3;
    d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function fmtDate(t: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(t));
}
function fmtTime(t: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
}

// ---------------------------------------------------------------- component

interface MatchWidgetProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffUtc: string;
  modelProbs?: { home: number; draw: number; away: number };
  modelPick?: Outcome;
  currentScore?: { home: number; away: number } | null;
  status?: string;
  elapsed?: number | null;
  bestSignal?: BestSignal;
  oddsData?: OddsSnapshot[];
}

// Feature toggle — off by default. Set NEXT_PUBLIC_MATCH_WIDGET_ENABLED=true
// (e.g. in .env.local) to monitor the widget before releasing it publicly.
const MATCH_WIDGET_ENABLED = process.env.NEXT_PUBLIC_MATCH_WIDGET_ENABLED === "true";

export default function MatchWidget(props: MatchWidgetProps) {
  // Hook-free gate so the early return below never sits above conditional hooks.
  if (!MATCH_WIDGET_ENABLED) return null;
  return <MatchWidgetInner {...props} />;
}

function MatchWidgetInner({
  matchId, homeTeam, awayTeam, kickoffUtc,
  modelProbs, currentScore, status = "SCHEDULED", elapsed,
  bestSignal, oddsData,
}: MatchWidgetProps) {
  const [snapshots, setSnapshots] = useState<OddsSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  function open() {
    setIsOpen(true);
    if (fetched || loading) return;
    if (oddsData) {
      setSnapshots(oddsData);
      setFetched(true);
      return;
    }
    setLoading(true);
    fetch(`/api/odds/${encodeURIComponent(matchId)}`)
      .then((r) => r.json())
      .then((data: OddsSnapshot[]) => setSnapshots(Array.isArray(data) ? data : []))
      .catch(() => setSnapshots([]))
      .finally(() => { setLoading(false); setFetched(true); });
  }

  const toggleClass =
    "flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1 border-t border-line font-data text-[10px] text-muted transition-colors hover:text-accent";

  if (!isOpen) {
    return (
      <button type="button" onClick={open} className={toggleClass}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 15V1M1 15H15M4 11l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Match Intelligence ▾
      </button>
    );
  }

  const isLive = LIVE_STATUSES.has(status);
  const isFinished = FINISHED_STATUSES.has(status);
  const series = buildSeries(snapshots);
  const latest = series.length ? series[series.length - 1] : null;

  // ---- chart geometry (viewBox 400x120, preserveAspectRatio none) ----
  const kickoffMs = new Date(kickoffUtc).getTime();
  const nowMs = Date.now();
  const minTime = series.length ? series[0].t : kickoffMs - 3_600_000;
  let maxTime = isLive ? Math.max(nowMs, kickoffMs) : kickoffMs;
  maxTime = Math.max(maxTime, series.length ? series[series.length - 1].t : maxTime);
  if (maxTime <= minTime) maxTime = minTime + 1;
  const xScale = (t: number) => ((t - minTime) / (maxTime - minTime)) * 380 + 10;
  const yScale = (p: number) => 120 - p * 110 - 5;

  const closeBtn = (
    <button type="button" onClick={() => setIsOpen(false)} className={toggleClass}>
      Close ▴
    </button>
  );

  return (
    <div className="border-t border-line bg-panel2">
      {loading && !fetched ? (
        <div className="space-y-2 px-3 py-4">
          <div className="h-24 animate-pulse rounded bg-line/60" />
        </div>
      ) : (
        <div className="space-y-3 px-3 pt-3">
          {/* ── SCORE / STATUS HEADER ── */}
          {(isLive || isFinished) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`font-display ${isLive ? "text-2xl" : "text-xl"} text-ink`}>
                {homeTeam} {currentScore ? `${currentScore.home} – ${currentScore.away}` : "–"} {awayTeam}
              </span>
              {isLive ? (
                <span className="inline-flex items-center gap-1 font-data text-xs text-live">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
                  LIVE{elapsed != null ? <span className="text-muted"> {elapsed}&apos;</span> : null}
                </span>
              ) : (
                <span className="font-data text-[10px] uppercase tracking-widest text-muted">Full time</span>
              )}
            </div>
          )}

          {/* ── PROBABILITY CHART ── */}
          <div>
            <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">Win Probability</p>
            <div className="overflow-x-auto">
              <div className="relative min-w-[280px]" style={{ height: 120 }}>
                <svg viewBox="0 0 400 120" preserveAspectRatio="none" width="100%" height="120" className="block">
                  {/* 50% reference */}
                  <line x1="10" y1={yScale(0.5)} x2="390" y2={yScale(0.5)} stroke="#232323" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                  {/* model reference lines (dotted horizontal) */}
                  {modelProbs && OUTCOMES.map((k) => (
                    <line key={`m-${k}`} x1="10" y1={yScale(modelProbs[k])} x2="390" y2={yScale(modelProbs[k])}
                      stroke={COLORS[k]} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
                  ))}

                  {/* kickoff vertical line once we're past it */}
                  {nowMs > kickoffMs && kickoffMs >= minTime && kickoffMs <= maxTime && (
                    <line x1={xScale(kickoffMs)} y1="0" x2={xScale(kickoffMs)} y2="120"
                      stroke="#8a8a8a" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                  )}

                  {series.length >= 2 ? (
                    OUTCOMES.map((k) => {
                      const pts = series.map((s) => ({ x: xScale(s.t), y: yScale(s[k]) }));
                      return (
                        <g key={`l-${k}`}>
                          <path d={smoothPath(pts)} fill="none" stroke={COLORS[k]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          {pts.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="3" fill={COLORS[k]} />
                          ))}
                        </g>
                      );
                    })
                  ) : series.length === 1 ? (
                    OUTCOMES.map((k) => (
                      <line key={`s-${k}`} x1="10" y1={yScale(series[0][k])} x2="390" y2={yScale(series[0][k])}
                        stroke={COLORS[k]} strokeWidth="1.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                    ))
                  ) : null}
                </svg>

                {/* model labels (HTML overlay so text isn't stretched by preserveAspectRatio="none") */}
                {modelProbs && OUTCOMES.map((k) => (
                  <span key={`ml-${k}`}
                    className="pointer-events-none absolute right-1 font-data text-[8px]"
                    style={{ top: yScale(modelProbs[k]) - 10, color: COLORS[k] }}>
                    Model {(modelProbs[k] * 100).toFixed(0)}%
                  </span>
                ))}

                {series.length < 2 && (
                  <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-data text-[10px] text-muted">
                    Market data building — check back later
                  </span>
                )}
              </div>
            </div>

            {/* x-axis labels */}
            <div className="mt-1 flex justify-between font-data text-[8px] text-muted">
              <span>{series.length ? fmtDate(series[0].t) : ""}</span>
              <span>KO {fmtTime(kickoffMs)}</span>
            </div>

            {/* legend */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-[9px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3" style={{ background: COLORS.home }} /> Market Home</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3" style={{ background: COLORS.draw }} /> Market Draw</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3" style={{ background: COLORS.away }} /> Market Away</span>
              <span className="inline-flex items-center gap-1"><span className="h-0 w-3 border-t border-dotted border-muted" /> Model probability</span>
            </div>
          </div>

          {/* ── CURRENT PROBABILITIES ── */}
          <div className="space-y-1.5">
            {OUTCOMES.map((k) => {
              const market = latest ? latest[k] : null;
              const model = modelProbs ? modelProbs[k] : null;
              const label = k === "draw" ? "Draw" : k === "home" ? homeTeam : awayTeam;
              return (
                <div key={`cp-${k}`} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[k] }} aria-hidden="true" />
                  <span className="w-24 shrink-0 truncate font-data text-xs text-ink">{label}</span>
                  <div className="flex-1 space-y-0.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-line/30">
                      <div className="h-full" style={{ width: `${(market ?? 0) * 100}%`, background: COLORS[k] }} />
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-line/30">
                      <div className="h-full" style={{ width: `${(model ?? 0) * 100}%`, background: COLORS[k], opacity: 0.45 }} />
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right font-data text-xs text-ink">
                    Market {market != null ? `${(market * 100).toFixed(1)}%` : "—"}
                  </span>
                  <span className="w-16 shrink-0 text-right font-data text-xs text-muted">
                    Model {model != null ? `${(model * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── EV SIGNAL ── */}
          {status === "SCHEDULED" && bestSignal && modelProbs && bestSignal.bestPrice > 0 && (() => {
            const sel = bestSignal.selection;
            const modelP = modelProbs[sel];
            const marketP = latest ? latest[sel] : 1 / bestSignal.bestPrice;
            const kelly = Math.max(0, (bestSignal.bestPrice * modelP - 1) / (bestSignal.bestPrice - 1));
            const selName = sel === "draw" ? "Draw" : sel === "home" ? homeTeam : awayTeam;
            return (
              <div className="rounded-[10px] border border-accent/30 bg-accent/5 p-2 font-data text-xs text-ink">
                ⚡ Value: {selName} @ {bestSignal.bestPrice.toFixed(2)} ({bestSignal.bestBookmaker})<br />
                Model {(modelP * 100).toFixed(1)}% vs market {(marketP * 100).toFixed(1)}% · Edge: +{(bestSignal.ev * 100).toFixed(1)}% · Kelly: {(kelly * 100).toFixed(1)}%
              </div>
            );
          })()}
        </div>
      )}

      {closeBtn}
    </div>
  );
}
