"use client";
import { useEffect, useState } from "react";
import { LEAGUES } from "@/lib/leagues";
import type { TeamStatsDoc } from "@/lib/teamStats";

// Reuses the home/away identity colors MatchWidget already established for
// this exact "two sides of a fixture" comparison — keeps one consistent
// color language across the site instead of a one-off palette for this card.
const HOME_COLOR = "var(--accent)";
const AWAY_COLOR = "#60A5FA";

interface StatsInsightsProps {
  homeTeamId: string;
  awayTeamId: string;
  league: string;
  season: string;
  /** Display names to show before the fetch resolves — the API's own teamName wins once loaded. */
  homeTeam?: string;
  awayTeam?: string;
}

type SplitTab = "overall" | "home" | "away";
type TeamStatsResponse = { home: TeamStatsDoc | null; away: TeamStatsDoc | null };

function leagueName(code: string): string {
  return (LEAGUES as Record<string, { name: string }>)[code]?.name ?? code;
}

// ---------------------------------------------------------------- pieces

function TeamHeader({ name, matchCount, isEnriched, enrichedLeague, align }: {
  name: string; matchCount: number | undefined; isEnriched: boolean | undefined; enrichedLeague: string | null | undefined; align: "left" | "right";
}) {
  const insufficient = matchCount != null && matchCount < 3;
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="truncate font-display text-sm tracking-wide text-ink">{name}</p>
      {matchCount == null ? (
        <p className="font-data text-[9px] text-muted">No data</p>
      ) : insufficient ? (
        <p className="font-data text-[9px] text-loss">Insufficient data ({matchCount} match{matchCount === 1 ? "" : "es"})</p>
      ) : (
        <p className="font-data text-[9px] text-muted">Based on {matchCount} matches</p>
      )}
      {isEnriched && enrichedLeague && (
        <p className="font-data text-[8px] text-muted">({leagueName(enrichedLeague)} data)</p>
      )}
    </div>
  );
}

function StatRow({ label, homeValue, awayValue, format = (v: number) => v.toFixed(2) }: {
  label: string; homeValue: number | undefined; awayValue: number | undefined; format?: (v: number) => string;
}) {
  const hv = homeValue ?? 0;
  const av = awayValue ?? 0;
  const max = Math.max(hv, av, 0.01);
  const bothKnown = homeValue != null && awayValue != null;
  const homeWins = bothKnown && hv > av;
  const awayWins = bothKnown && av > hv;
  return (
    <div className="grid grid-cols-[1fr_78px_1fr] items-center gap-1.5">
      <div className="flex items-center justify-end gap-1.5">
        <span className={`font-data text-xs tabular-nums ${homeWins ? "font-bold text-ink" : "text-muted"}`}>
          {homeValue != null ? format(homeValue) : "—"}
        </span>
        <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-line/30">
          <span className="ml-auto block h-full rounded-full" style={{ width: `${(hv / max) * 100}%`, background: HOME_COLOR }} />
        </span>
      </div>
      <span className="text-center font-data text-[9px] uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-line/30">
          <span className="block h-full rounded-full" style={{ width: `${(av / max) * 100}%`, background: AWAY_COLOR }} />
        </span>
        <span className={`font-data text-xs tabular-nums ${awayWins ? "font-bold text-ink" : "text-muted"}`}>
          {awayValue != null ? format(awayValue) : "—"}
        </span>
      </div>
    </div>
  );
}

// Trend shape only — no axes, no hover; last-5 form at a glance.
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return <span className="font-data text-[9px] text-muted">—</span>;
  const w = 60, h = 18, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: pad + (values.length > 1 ? (i / (values.length - 1)) * (w - pad * 2) : (w - pad * 2) / 2),
    y: h - pad - ((v - min) / span) * (h - pad * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={color} />)}
    </svg>
  );
}

const CaretIcon = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ---------------------------------------------------------------- component

export default function StatsInsights({ homeTeamId, awayTeamId, league, season, homeTeam, awayTeam }: StatsInsightsProps) {
  const [data, setData] = useState<TeamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SplitTab>("overall");
  const [shotsOpen, setShotsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ home: homeTeamId, away: awayTeamId, league, season });
    fetch(`/api/team-stats?${params}`)
      .then((r) => r.json())
      .then((d: TeamStatsResponse) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ home: null, away: null }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [homeTeamId, awayTeamId, league, season]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-line/60" />
        <div className="h-20 animate-pulse rounded bg-line/60" />
      </div>
    );
  }

  const home = data?.home ?? null;
  const away = data?.away ?? null;
  if (!home && !away) {
    return <p className="py-2 font-data text-xs text-muted">Stats aren&apos;t available for this fixture yet.</p>;
  }

  const homeName = home?.teamName ?? homeTeam ?? "Home";
  const awayName = away?.teamName ?? awayTeam ?? "Away";
  const homeSplit = home?.[tab];
  const awaySplit = away?.[tab];
  const combined = (a: number | undefined, b: number | undefined) =>
    a != null && b != null ? (a + b) / 2 : null;
  const cornersCombined = combined(homeSplit?.avg_corners_total, awaySplit?.avg_corners_total);
  const cardsCombined = combined(homeSplit?.avg_cards_total, awaySplit?.avg_cards_total);

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-2">
        <TeamHeader name={homeName} matchCount={home?.matchCount} isEnriched={home?.isEnriched} enrichedLeague={home?.enrichedLeague} align="left" />
        <TeamHeader name={awayName} matchCount={away?.matchCount} isEnriched={away?.isEnriched} enrichedLeague={away?.enrichedLeague} align="right" />
      </div>

      <div className="flex gap-1 rounded-[8px] border border-line p-0.5">
        {(["overall", "home", "away"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 rounded-[6px] py-1 font-data text-[10px] capitalize tracking-wide transition-colors ${tab === t ? "bg-accent/10 text-accent" : "text-muted hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── CORNERS ── */}
      <section className="space-y-1.5">
        <h4 className="font-data text-[9px] uppercase tracking-widest text-muted">Corners · avg per match</h4>
        <StatRow label="For" homeValue={homeSplit?.avg_corners_for} awayValue={awaySplit?.avg_corners_for} />
        <StatRow label="Against" homeValue={homeSplit?.avg_corners_against} awayValue={awaySplit?.avg_corners_against} />
        {cornersCombined != null && (
          <p className="text-center font-data text-[10px] text-muted">
            Combined: {homeSplit!.avg_corners_total.toFixed(1)} + {awaySplit!.avg_corners_total.toFixed(1)} = avg{" "}
            <span className="text-ink">{cornersCombined.toFixed(2)}</span> combined
          </p>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-14 truncate font-data text-[9px] text-muted">{homeName}</span>
            <Sparkline values={home?.form.corners_for ?? []} color={HOME_COLOR} />
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkline values={away?.form.corners_for ?? []} color={AWAY_COLOR} />
            <span className="w-14 truncate text-right font-data text-[9px] text-muted">{awayName}</span>
          </div>
        </div>
      </section>

      {/* ── CARDS ── */}
      <section className="space-y-1.5 border-t border-line pt-3">
        <h4 className="font-data text-[9px] uppercase tracking-widest text-muted">Cards · avg per match</h4>
        <StatRow label="Yellow" homeValue={homeSplit?.avg_yellow_cards} awayValue={awaySplit?.avg_yellow_cards} />
        <StatRow label="Red" homeValue={homeSplit?.avg_red_cards} awayValue={awaySplit?.avg_red_cards} />
        {cardsCombined != null && (
          <p className="text-center font-data text-[10px] text-muted">
            Combined: <span className="text-ink">{cardsCombined.toFixed(2)}</span> cards per match on average
          </p>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-14 truncate font-data text-[9px] text-muted">{homeName}</span>
            <Sparkline values={home?.form.yellow_cards ?? []} color={HOME_COLOR} />
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkline values={away?.form.yellow_cards ?? []} color={AWAY_COLOR} />
            <span className="w-14 truncate text-right font-data text-[9px] text-muted">{awayName}</span>
          </div>
        </div>
      </section>

      {/* ── SHOTS & xG (collapsed by default) ── */}
      <section className="border-t border-line pt-3">
        <button type="button" onClick={() => setShotsOpen((o) => !o)}
          className="flex w-full items-center justify-between font-data text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-ink">
          Shots &amp; xG
          <CaretIcon open={shotsOpen} />
        </button>
        {shotsOpen && (
          <div className="mt-2 space-y-1.5">
            <StatRow label="Shots" homeValue={homeSplit?.avg_shots_for} awayValue={awaySplit?.avg_shots_for} format={(v) => v.toFixed(1)} />
            <StatRow label="On Target" homeValue={homeSplit?.avg_shots_on_target} awayValue={awaySplit?.avg_shots_on_target} format={(v) => v.toFixed(1)} />
            <StatRow label="xG For" homeValue={homeSplit?.avg_xg_for} awayValue={awaySplit?.avg_xg_for} />
            <StatRow label="Possession" homeValue={homeSplit?.avg_possession} awayValue={awaySplit?.avg_possession} format={(v) => `${v.toFixed(1)}%`} />
          </div>
        )}
      </section>
    </div>
  );
}
