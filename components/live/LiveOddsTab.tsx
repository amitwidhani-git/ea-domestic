"use client";
import { useEffect, useRef, useState } from "react";
import type { LiveMatch, LiveOddsPoint } from "@/lib/liveFixtures";
import { oddsToProb, type OddsTriple } from "@/lib/liveOdds";

// This project's design tokens (bg-panel2/border-line/bg-muted/bg-info/bg-loss)
// stand in for the generic spec's var(--bg2)/var(--border)/grey/blue/red —
// same intent, mapped onto the site's existing palette rather than new hex values.

type Mode = "prob" | "odds";
type Side = "home" | "draw" | "away";

function Legend({ homeName, awayName }: { homeName: string; awayName: string }) {
  const dots: { side: Side; label: string; colorVar: string }[] = [
    { side: "home", label: homeName, colorVar: "--accent" },
    { side: "draw", label: "Draw", colorVar: "--info" },
    { side: "away", label: awayName, colorVar: "--danger" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {dots.map((d) => (
        <span key={d.side} className="flex items-center gap-1 font-body text-[10.5px] font-semibold text-muted">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(${d.colorVar})` }} />
          <span className="max-w-[110px] truncate">{d.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Shared between the canvas draw and the Y-axis label column so both agree
 * on the same scale — % Win is always fixed 0-100, Odds auto-scales to the data. */
function yDomain(points: LiveOddsPoint[], mode: Mode): { min: number; max: number } {
  if (mode === "prob") return { min: 0, max: 100 };
  if (points.length < 2) return { min: 0, max: 1 };
  const allVals = points.flatMap((p) => [p.h, p.d, p.a]);
  return { min: Math.min(...allVals) * 0.95, max: Math.max(...allVals) * 1.05 };
}

function Sparkline({ points, mode, domain }: { points: LiveOddsPoint[]; mode: Mode; domain: { min: number; max: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeTick, setThemeTick] = useState(0);

  // Canvas colours are read from computed CSS vars, so a theme flip needs an
  // explicit redraw trigger — the attribute change alone doesn't repaint canvas pixels.
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const style = getComputedStyle(document.documentElement);
    const muted = style.getPropertyValue("--muted").trim() || "#8A97A6";

    if (points.length < 2) {
      ctx.fillStyle = muted;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Not enough history yet", rect.width / 2, rect.height / 2);
      return;
    }

    const series = mode === "prob"
      ? points.map((p) => ({ min: p.min, ...oddsToProb({ home: p.h, draw: p.d, away: p.a }) }))
      : points.map((p) => ({ min: p.min, home: p.h, draw: p.d, away: p.a }));

    const minMin = series[0].min;
    const maxMin = Math.max(series[series.length - 1].min, minMin + 1);
    const ySpan = Math.max(0.001, domain.max - domain.min);

    const px = (min: number) => ((min - minMin) / (maxMin - minMin)) * (rect.width - 8) + 4;
    const py = (v: number) => rect.height - 4 - ((v - domain.min) / ySpan) * (rect.height - 8);

    const colors: Record<Side, string> = {
      home: style.getPropertyValue("--accent").trim() || "#00A876",
      draw: style.getPropertyValue("--info").trim() || "#1D4ED8",
      away: style.getPropertyValue("--danger").trim() || "#D64545",
    };

    (["home", "draw", "away"] as const).forEach((side) => {
      ctx.beginPath();
      series.forEach((s, i) => {
        const x = px(s.min), y = py(s[side]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = colors[side];
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();

      // Endpoint marker — the most recent value, at a glance.
      const last = series[series.length - 1];
      ctx.beginPath();
      ctx.arc(px(last.min), py(last[side]), 3, 0, Math.PI * 2);
      ctx.fillStyle = colors[side];
      ctx.fill();
    });
  }, [points, mode, domain, themeTick]);

  // block, not the canvas default inline: an inline canvas reserves a few
  // px of baseline descender space below it, showing up as a stray gap
  // before whatever sits underneath (here, the KO/minute label row).
  return <canvas ref={canvasRef} className="block h-[170px] w-full" aria-hidden="true" />;
}

function cardLabel(side: Side, match: LiveMatch): string {
  if (side === "home") return match.home.name;
  if (side === "away") return match.away.name;
  return "Draw";
}

/** Raw-direction movement: up is always green, down is always red, in both
 * modes — confirmed against the approved mockup (a shortened 2.20->1.95
 * price shows a red ▼, not green, so this is not favourability-adjusted). */
function movement(mode: Mode, current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return { delta: null as number | null, flat: true };
  const delta = mode === "prob" ? current - previous : Math.round((current - previous) * 100) / 100;
  return { delta, flat: delta === 0 };
}

const SIDE_SUFFIX: Record<Side, string> = { home: "H", draw: "D", away: "A" };

function OddsRow({ label, triple, mode, className }: { label: string; triple: OddsTriple | null; mode: Mode; className?: string }) {
  const fmt = (v: number) => (mode === "prob" ? `${v}%` : v.toFixed(2));
  const display = triple ? (mode === "prob" ? oddsToProb(triple) : triple) : null;
  return (
    <div className={className}>
      <div className="font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</div>
      {display ? (
        <div className="mt-1 flex items-baseline gap-2 font-data text-[12.5px] text-ink">
          {(["home", "draw", "away"] as const).map((side) => (
            <span key={side} className="inline-flex items-baseline gap-px">
              {fmt(display[side])}
              <span className="font-body text-[9px] font-bold text-muted">{SIDE_SUFFIX[side]}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-1 font-body text-[12.5px] text-muted">Not captured yet</div>
      )}
    </div>
  );
}

export default function LiveOddsTab({ match }: { match: LiveMatch }) {
  const [mode, setMode] = useState<Mode>("prob");

  const current = match.liveOdds;
  const pre = match.prematchOdds;
  const currentProb = current ? oddsToProb(current) : null;
  const preProb = pre ? oddsToProb(pre) : null;
  const domain = yDomain(match.oddsHistory, mode);

  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-panel2">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="font-body text-[12.5px] font-bold uppercase tracking-wide text-muted">Match Winner · In-Play</span>
        <div className="flex items-center gap-0.5 rounded-full bg-chip p-0.5">
          {(["prob", "odds"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 font-body text-[11px] font-bold transition-colors ${
                mode === m ? "bg-accent text-accent-fg" : "text-muted"
              }`}
            >
              {m === "prob" ? "% Win" : "Odds"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5 sm:p-4">
        {!current ? (
          <p className="font-body text-[13px] text-muted">Live odds aren&apos;t available for this match yet.</p>
        ) : (
          <>
            {mode === "prob" && currentProb && (
              <>
                <div
                  className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-line"
                  role="img"
                  aria-label={`${match.home.name} ${currentProb.home}%, draw ${currentProb.draw}%, ${match.away.name} ${currentProb.away}%`}
                >
                  {/* gap-px + the container's own bg-line shows through as a thin
                      separator between segments, so the draw slice stays visible
                      even when it's narrow enough to otherwise blend into its neighbours. */}
                  <div style={{ width: `${currentProb.home}%` }} className="bg-accent" />
                  <div style={{ width: `${currentProb.draw}%` }} className="bg-muted" />
                  <div style={{ width: `${currentProb.away}%` }} className="bg-info" />
                </div>
                <div className="mt-1 grid grid-cols-3 font-body text-[10.5px] font-semibold text-muted">
                  <span className="truncate text-left">{match.home.name}</span>
                  <span className="text-center">Draw</span>
                  <span className="truncate text-right">{match.away.name}</span>
                </div>
              </>
            )}

            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["home", "draw", "away"] as const).map((side) => {
                const value = mode === "prob" ? currentProb?.[side] : current[side];
                const prevValue = mode === "prob" ? preProb?.[side] : pre?.[side];
                const { delta, flat } = movement(mode, value, prevValue);
                const arrow = delta == null ? null : delta > 0 ? "▲" : delta < 0 ? "▼" : "–";
                const colorClass = flat ? "text-muted" : delta! > 0 ? "text-accent" : "text-loss";
                return (
                  <div key={side} className="rounded-[10px] border border-line bg-chip px-2.5 py-2 text-center">
                    <div className="truncate font-body text-[10px] font-semibold uppercase tracking-wide text-muted">{cardLabel(side, match)}</div>
                    <div className="mt-0.5 font-data text-[19px] font-bold leading-none">{mode === "prob" ? `${value}%` : value?.toFixed(2)}</div>
                    {/* No prematchOdds yet (common for matches already live when the poller
                        first captured them) — leave this blank rather than show a bare dash. */}
                    {arrow != null && (
                      <div className={`mt-0.5 font-data text-[10.5px] font-semibold ${colorClass}`}>
                        {arrow} {mode === "prob" ? `${Math.abs(delta!)}%` : Math.abs(delta!).toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">Odds Movement · 1X2</span>
                <Legend homeName={match.home.name} awayName={match.away.name} />
              </div>
              {/* Chart gets most of this tab's vertical space — everything else
                  above and below it is kept as compact as it'll legibly go. */}
              <div className="mt-1 grid grid-cols-[34px_1fr] gap-2">
                <div className="flex flex-col justify-between py-0.5 text-right font-data text-[9.5px] text-muted">
                  <span>{mode === "prob" ? `${Math.round(domain.max)}` : domain.max.toFixed(2)}</span>
                  <span>{mode === "prob" ? `${Math.round((domain.max + domain.min) / 2)}` : ((domain.max + domain.min) / 2).toFixed(2)}</span>
                  <span>{mode === "prob" ? `${Math.round(domain.min)}` : domain.min.toFixed(2)}</span>
                </div>
                <Sparkline points={match.oddsHistory} mode={mode} domain={domain} />
              </div>
              <div className="ml-[42px] flex justify-between font-data text-[10px] text-muted">
                <span>KO</span>
                <span>{match.status.elapsed != null ? match.status.elapsed : "now"}</span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 divide-x divide-line border-t border-line pt-2">
              <OddsRow label="Pre-match" triple={pre} mode={mode} />
              <OddsRow label="Current live" triple={current} mode={mode} className="pl-3" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
