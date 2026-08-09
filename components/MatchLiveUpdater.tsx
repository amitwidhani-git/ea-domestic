"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import MatchWidget from "@/components/MatchWidget";
import MatchSquadTab from "@/components/MatchSquadTab";
import type { MatchDetail, MatchEvent, MatchInjury, MatchNews, LineupPlayer, LineupTeam } from "@/lib/matchDetail";

// Both the matches and match_stats collections use normalised status values:
// SCHEDULED | LIVE | FINISHED. The raw API-Football code (FT/AET/PEN/HT/1H…)
// lives on fixture.afStatus and is only used for display labels.
const PRE = new Set(["SCHEDULED"]);
const LIVE = new Set(["LIVE"]);
const POST = new Set(["FINISHED"]);

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;
const HOME_COLOR = "#C8FF00";
const AWAY_COLOR = "#60A5FA";

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  suspension: { label: "SUSP", className: "border-loss text-loss" },
  high: { label: "OUT", className: "border-orange-500/60 text-orange-400" },
  medium: { label: "DOUBT", className: "border-yellow-500/60 text-yellow-400" },
  low: { label: "50/50", className: "border-muted text-muted" },
  international: { label: "INTL", className: "border-blue-500/60 text-blue-400" },
  unknown: { label: "?", className: "border-muted text-muted" },
};

const STAT_LABELS: { key: string; label: string }[] = [
  { key: "ball_possession", label: "Possession" },
  { key: "total_shots", label: "Total shots" },
  { key: "shots_on_goal", label: "Shots on target" },
  { key: "shots_off_goal", label: "Shots off target" },
  { key: "blocked_shots", label: "Blocked shots" },
  { key: "corner_kicks", label: "Corners" },
  { key: "offsides", label: "Offsides" },
  { key: "fouls", label: "Fouls" },
  { key: "yellow_cards", label: "Yellow cards" },
  { key: "red_cards", label: "Red cards" },
  { key: "goalkeeper_saves", label: "Saves" },
  { key: "total_passes", label: "Passes" },
  { key: "passes_accurate", label: "Accurate passes" },
];

function fmtKickoff(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")} UK`;
}
function countdown(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Kick off imminent";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Kicks off in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Kicks off in ${hrs}h`;
  return `Kicks off in ${Math.floor(hrs / 24)}d`;
}
function num(v: number | string | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}
function eventIcon(e: MatchEvent): string {
  const type = (e.type ?? "").toLowerCase();
  const detail = (e.detail ?? "").toLowerCase();
  if (type.includes("goal") || detail.includes("goal")) {
    if (detail.includes("own")) return "🥅";
    if (detail.includes("penalty")) return "⚽";
    return "⚽";
  }
  if (type.includes("card") || detail.includes("card")) return detail.includes("red") ? "🟥" : "🟨";
  if (type.includes("subst")) return "🔄";
  return "•";
}

export default function MatchLiveUpdater({
  matchId, initialData, isLive,
}: {
  matchId: string;
  initialData: MatchDetail;
  isLive: boolean;
}) {
  const [data, setData] = useState<MatchDetail>(initialData);
  const status = data.fixture.status ?? "";
  const phase: "PRE" | "LIVE" | "POST" = LIVE.has(status) ? "LIVE" : POST.has(status) ? "POST" : "PRE";

  const [tab, setTab] = useState<"prediction" | "stats" | "h2h" | "lineups" | "squad" | "news">(
    isLive || POST.has(initialData.fixture.status ?? "") ? "stats" : "prediction"
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const liveActive = LIVE.has(status);

  // Poll live endpoint every 60s while the match is live; stops once FT/AET/PEN.
  useEffect(() => {
    if (!liveActive) return;
    let cancelled = false;
    const poll = () => {
      fetch(`/api/matches/${encodeURIComponent(matchId)}/live`)
        .then((r) => (r.status === 204 || !r.ok ? null : r.json()))
        .then((live) => {
          if (cancelled || !live) return;
          setData((prev) => ({
            ...prev,
            fixture: {
              ...prev.fixture,
              status: live.status ?? prev.fixture.status,
              afStatus: live.afStatus ?? prev.fixture.afStatus,
              elapsed: live.elapsed ?? prev.fixture.elapsed,
              score: live.score ?? prev.fixture.score,
            },
            events: live.events ?? prev.events,
            stats: live.stats ?? prev.stats,
          }));
          setLastUpdated(new Date());
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [liveActive, matchId]);

  // 1s ticker so "updated Xs ago" counts up.
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Pre-match: re-render every minute so the "Kicks off in …" countdown updates.
  useEffect(() => {
    if (phase !== "PRE") return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [phase]);

  const { fixture, homeTeam, awayTeam, evSignals } = data;
  const score = fixture.score;
  const hasScore = !!score && score.home != null && score.away != null;
  const bestSignal = useMemo(() => {
    const live = evSignals.filter((s) => s.settled_result == null && s.best_price != null).sort((a, b) => b.ev - a.ev)[0];
    return live ? { selection: live.selection, ev: live.ev, bestPrice: live.best_price as number, bestBookmaker: live.best_bookmaker ?? "" } : undefined;
  }, [evSignals]);

  // ── status chip ──
  let statusChip: React.ReactNode = null;
  if (phase === "LIVE") {
    statusChip = (
      <span className="inline-flex items-center gap-1 font-data text-xs text-green-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" aria-hidden="true" />
        {fixture.afStatus === "HT" ? "HT" : fixture.elapsed != null ? `${fixture.elapsed}'` : "LIVE"}
      </span>
    );
  } else if (phase === "POST") {
    // Status is normalised to "FINISHED"; the FT/AET/PEN detail for display comes
    // from afStatus (falling back to penaltyScore when match_stats is absent).
    const pens = fixture.penaltyScore ? ` (pens ${fixture.penaltyScore.home}-${fixture.penaltyScore.away})` : "";
    const label =
      fixture.afStatus === "PEN" ? "AET"
      : fixture.afStatus === "AET" ? "AET"
      : fixture.afStatus === "FT" ? "FT"
      : fixture.penaltyScore ? "AET" : "FT";
    statusChip = <span className="font-data text-[10px] uppercase tracking-widest text-muted">{label}{pens}</span>;
  } else {
    statusChip = <span className="font-data text-[10px] text-muted">{countdown(fixture.kickoffUtc)}</span>;
  }

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "prediction", label: "Prediction" },
    { key: "stats", label: "Match Stats" },
    { key: "h2h", label: "Head to Head" },
    { key: "lineups", label: "Lineups" },
    { key: "squad", label: "Squad" },
    { key: "news", label: "News" },
  ];

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="border border-line bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <ClubCrest apiFootballId={homeTeam.apiFootballId} clubName={homeTeam.name} size={48} />
            <Link href={`/teams/${homeTeam.id}`} className="truncate font-display text-2xl tracking-wide hover:text-accent">{homeTeam.name}</Link>
          </div>
          <div className="shrink-0 text-center">
            <div className="font-display text-3xl text-ink">
              {hasScore && score ? `${score.home} – ${score.away}` : phase === "PRE" ? "v" : "–"}
            </div>
            <div className="mt-0.5">
              {phase === "PRE" && !hasScore
                ? <span className="font-data text-sm text-muted">{countdown(fixture.kickoffUtc)}</span>
                : statusChip}
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 min-w-0">
            <Link href={`/teams/${awayTeam.id}`} className="truncate text-right font-display text-2xl tracking-wide hover:text-accent">{awayTeam.name}</Link>
            <ClubCrest apiFootballId={awayTeam.apiFootballId} clubName={awayTeam.name} size={48} />
          </div>
        </div>
        <p className="mt-3 text-center font-data text-[11px] text-muted">
          {fixture.league} · {fmtKickoff(fixture.kickoffUtc)}
        </p>
        {(fixture.venue || fixture.referee) && (
          <p className="mt-0.5 text-center font-data text-[10px] text-muted">
            {[fixture.venue, fixture.referee ? `Ref: ${fixture.referee}` : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${
              tab === t.key ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prediction" && <PredictionTab data={data} phase={phase} bestSignal={bestSignal} />}
      {tab === "stats" && <StatsTab data={data} phase={phase} />}
      {tab === "h2h" && <H2HTab data={data} />}
      {tab === "lineups" && <LineupsTab data={data} phase={phase} />}
      {tab === "squad" && <MatchSquadTab data={data} phase={phase} />}
      {tab === "news" && <NewsTab data={data} />}

      {phase === "LIVE" && lastUpdated && (
        <p className="text-center font-data text-[10px] text-muted">
          <span className="text-green-400">●</span> Last updated {Math.max(0, Math.round((nowTick - lastUpdated.getTime()) / 1000))}s ago
        </p>
      )}
    </div>
  );

  // (Header uses prediction/fixture from closure; tabs are declared below.)
}

// ---------------------------------------------------------------- tabs

function PredictionTab({ data, phase, bestSignal }: {
  data: MatchDetail; phase: "PRE" | "LIVE" | "POST";
  bestSignal?: { selection: "home" | "draw" | "away"; ev: number; bestPrice: number; bestBookmaker: string };
}) {
  const { fixture, homeTeam, awayTeam, prediction, evSignals } = data;
  return (
    <div className="space-y-6">
      {!prediction || !prediction.probs ? (
        <p className="font-data text-sm text-muted">Prediction not available for this fixture.</p>
      ) : (
        <>
          {phase === "POST" && prediction.model_correct != null && (
            <div className="border border-line bg-panel p-4">
              <span className={`font-display text-3xl ${prediction.model_correct ? "text-accent" : "text-loss"}`}>
                {prediction.model_correct ? "✓ CORRECT" : "✗ WRONG"}
              </span>
              {prediction.pick && (
                <p className="mt-1 font-data text-xs text-ink">
                  Model picked {PICK_LABEL[prediction.pick]} ({(prediction.probs[prediction.pick] * 100).toFixed(0)}%)
                  {fixture.score ? ` — result was ${fixture.score.home}–${fixture.score.away}` : ""}
                </p>
              )}
            </div>
          )}

          <div className="border border-line bg-panel p-4">
            <ProbBar probs={prediction.probs} pick={prediction.pick ?? "home"} />
            {prediction.pick && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                <span className="font-data text-xs">EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[prediction.pick]}</span></span>
                {prediction.frozen_at && prediction.hash && <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} />}
              </div>
            )}
          </div>

          <MatchWidget
            matchId={fixture.matchId}
            homeTeam={homeTeam.name}
            awayTeam={awayTeam.name}
            homeTeamId={homeTeam.id}
            awayTeamId={awayTeam.id}
            kickoffUtc={fixture.kickoffUtc ?? ""}
            modelProbs={prediction.probs}
            modelPick={prediction.pick ?? undefined}
            currentScore={fixture.score}
            status={fixture.status ?? "SCHEDULED"}
            elapsed={fixture.elapsed}
            bestSignal={bestSignal}
          />
        </>
      )}

      {evSignals.length > 0 && (
        <div>
          <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">Value Signals</p>
          <div className="divide-y divide-line/60 border border-line">
            {evSignals.map((s, i) => {
              const sel = s.selection === "draw" ? "Draw" : s.selection === "home" ? homeTeam.name : awayTeam.name;
              const kelly = s.kelly_fraction != null ? `${(s.kelly_fraction * 100).toFixed(1)}%` : "—";
              return (
                <div key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 font-data text-xs">
                  <span className="text-ink">{sel} @ {s.best_price?.toFixed(2) ?? "—"} <span className="text-muted">({s.best_bookmaker})</span></span>
                  <span className={s.ev > 0 ? "text-accent" : "text-muted"}>Edge {s.ev >= 0 ? "+" : ""}{(s.ev * 100).toFixed(1)}% · Kelly {kelly}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <InjurySection data={data} />
    </div>
  );
}

function StatBar({ home, away, label }: { home: number | string; away: number | string; label: string }) {
  const h = num(home), a = num(away);
  const total = h + a || 1;
  return (
    <div>
      <div className="flex items-center justify-between font-data text-xs text-ink">
        <span>{home ?? 0}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
        <span>{away ?? 0}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded bg-line/30">
        <div className="h-full" style={{ width: `${(h / total) * 100}%`, background: HOME_COLOR }} />
        <div className="h-full" style={{ width: `${(a / total) * 100}%`, background: AWAY_COLOR }} />
      </div>
    </div>
  );
}

function StatsTab({ data, phase }: { data: MatchDetail; phase: "PRE" | "LIVE" | "POST" }) {
  const { stats, events, homeTeam, awayTeam } = data;
  return (
    <div className="space-y-6">
      {phase === "LIVE" && (
        <p className="font-data text-[10px] text-muted"><span className="text-green-400">●</span> Updating every 60s</p>
      )}

      {!stats ? (
        <div className="space-y-2">
          <p className="font-data text-sm text-muted">
            {phase === "PRE" ? "Match stats will appear here once the game kicks off." : "Match stats not available."}
          </p>
          {phase === "PRE" && <p className="font-data text-[10px] text-muted">Recent form data not yet available.</p>}
        </div>
      ) : (
        <div className="space-y-3 border border-line bg-panel p-4">
          <div className="flex items-center justify-between font-display text-sm">
            <span className="text-accent">{homeTeam.name}</span>
            <span className="text-sky-400">{awayTeam.name}</span>
          </div>
          {STAT_LABELS.filter(({ key }) => stats.home[key] != null || stats.away[key] != null).map(({ key, label }) => (
            <StatBar key={key} home={stats.home[key] ?? 0} away={stats.away[key] ?? 0} label={label} />
          ))}
        </div>
      )}

      {events && events.length > 0 && (
        <div>
          <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">Timeline</p>
          <div className="space-y-2 border border-line bg-panel p-4">
            {[...events].reverse().map((e, i) => {
              const away = e.side === "away";
              return (
                <div key={i} className={`flex items-center gap-2 ${away ? "flex-row-reverse text-right" : ""}`}>
                  <span className="w-8 shrink-0 font-data text-[10px] text-muted">{e.minute != null ? `${e.minute}'` : ""}</span>
                  <span>{eventIcon(e)}</span>
                  <span className="font-data text-xs" style={{ color: away ? AWAY_COLOR : HOME_COLOR }}>{e.player ?? ""}</span>
                  {e.detail && <span className="font-data text-[10px] text-muted">{e.detail}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function H2HTab({ data }: { data: MatchDetail }) {
  const { headToHead, homeTeam, awayTeam } = data;
  if (!headToHead || (headToHead.meetings.length === 0 && headToHead.homeWins + headToHead.draws + headToHead.awayWins === 0)) {
    return <p className="font-data text-sm text-muted">No previous meetings found.</p>;
  }
  const { homeWins, draws, awayWins, meetings } = headToHead;
  const total = homeWins + draws + awayWins || 1;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between font-data text-xs">
          <span className="text-accent">{homeTeam.name} {homeWins}</span>
          <span className="text-muted">Draws {draws}</span>
          <span className="text-sky-400">{awayTeam.name} {awayWins}</span>
        </div>
        <div className="mt-1 flex h-2 overflow-hidden rounded bg-line/30">
          <div className="h-full" style={{ width: `${(homeWins / total) * 100}%`, background: HOME_COLOR }} />
          <div className="h-full" style={{ width: `${(draws / total) * 100}%`, background: "#8a8a8a" }} />
          <div className="h-full" style={{ width: `${(awayWins / total) * 100}%`, background: AWAY_COLOR }} />
        </div>
      </div>

      {meetings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse font-data text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-muted">
                <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Home</th><th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Away</th><th className="py-2 pr-3">Comp</th><th className="py-2">R</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, i) => {
                const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
                const homeIsUs = m.homeTeam === homeTeam.name;
                const usScore = homeIsUs ? hs : as, themScore = homeIsUs ? as : hs;
                const res = usScore > themScore ? "W" : usScore < themScore ? "L" : "D";
                return (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-muted">{m.date ? String(m.date).slice(0, 10) : ""}</td>
                    <td className="py-2 pr-3">{m.homeTeam}</td>
                    <td className="py-2 pr-3 text-ink">{hs}–{as}</td>
                    <td className="py-2 pr-3">{m.awayTeam}</td>
                    <td className="py-2 pr-3 text-muted">{m.competition}</td>
                    <td className={`py-2 font-bold ${res === "W" ? "text-accent" : res === "L" ? "text-loss" : "text-muted"}`}>{res}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LineupColumn({ team, lineup, showRatings }: { team: string; lineup: LineupTeam | undefined; showRatings: boolean }) {
  if (!lineup) return null;
  const row = (p: LineupPlayer, i: number) => (
    <li key={i} className="flex items-center gap-2 font-data text-xs text-ink">
      <span className="w-5 shrink-0 text-right text-muted">{p.number ?? ""}</span>
      <span className="flex-1 truncate">{p.name}{p.pos ? <span className="text-muted"> ({p.pos})</span> : null}</span>
      {showRatings && p.rating != null && <span className="text-accent">{p.rating} ★</span>}
    </li>
  );
  return (
    <div>
      <p className="font-display text-lg tracking-wide">{team}</p>
      <p className="font-data text-[10px] text-muted">{lineup.formation ? `Formation ${lineup.formation}` : ""}{lineup.coach ? ` · ${lineup.coach}` : ""}</p>
      <ul className="mt-2 space-y-1">{(lineup.startXI ?? []).map(row)}</ul>
      {(lineup.substitutes ?? []).length > 0 && (
        <>
          <div className="my-2 border-t border-line" />
          <p className="font-data text-[9px] uppercase tracking-widest text-muted">Substitutes</p>
          <ul className="mt-1 space-y-1">{(lineup.substitutes ?? []).map(row)}</ul>
        </>
      )}
    </div>
  );
}

function LineupsTab({ data, phase }: { data: MatchDetail; phase: "PRE" | "LIVE" | "POST" }) {
  const { lineups, homeTeam, awayTeam } = data;
  return (
    <div className="space-y-6">
      {!lineups ? (
        <p className="font-data text-sm text-muted">Lineups confirmed approximately 1 hour before kick-off.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <LineupColumn team={homeTeam.name} lineup={lineups.home} showRatings={phase === "POST"} />
          <LineupColumn team={awayTeam.name} lineup={lineups.away} showRatings={phase === "POST"} />
        </div>
      )}
      <InjurySection data={data} />
    </div>
  );
}

function NewsColumn({ team, articles }: { team: string; articles: MatchNews[] }) {
  return (
    <div>
      <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">Latest {team} News</p>
      {articles.length === 0 ? (
        <p className="font-data text-xs text-muted">No recent news.</p>
      ) : (
        <div className="divide-y divide-line/60 border border-line">
          {articles.map((a, i) => (
            <div key={i} className="px-3 py-3">
              <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-accent">{a.title}</a>
              {a.published_at && <p className="mt-1 font-data text-[10px] text-muted">{a.published_at.slice(0, 10)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsTab({ data }: { data: MatchDetail }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <NewsColumn team={data.homeTeam.name} articles={data.homeNews} />
      <NewsColumn team={data.awayTeam.name} articles={data.awayNews} />
    </div>
  );
}

function InjuryList({ injuries }: { injuries: MatchInjury[] }) {
  if (injuries.length === 0) return <p className="font-data text-xs text-muted">No reported absences.</p>;
  return (
    <div className="space-y-1">
      {injuries.map((inj, i) => {
        const badge = SEVERITY_BADGE[inj.severity ?? "unknown"] ?? SEVERITY_BADGE.unknown;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={`inline-block shrink-0 border px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest ${badge.className}`}>{badge.label}</span>
            <span className="font-data text-xs text-ink">{inj.playerName}{inj.position ? <span className="text-muted"> · {inj.position}</span> : null}{inj.injuryType ? <span className="text-muted"> · {inj.injuryType}</span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

function InjurySection({ data }: { data: MatchDetail }) {
  return (
    <div>
      <h2 className="font-display text-xl tracking-wide">Squad Absences</h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">{data.homeTeam.name}</p>
          <InjuryList injuries={data.homeInjuries} />
        </div>
        <div>
          <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">{data.awayTeam.name}</p>
          <InjuryList injuries={data.awayInjuries} />
        </div>
      </div>
    </div>
  );
}
