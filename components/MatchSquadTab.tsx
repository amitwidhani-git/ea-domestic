"use client";
import ClubCrest from "@/components/ClubCrest";
import type { MatchDetail, MatchInjury, LineupTeam, LineupPlayer, FormResult, MatchTeam, TeamSquad, SquadPlayer, SquadPosition } from "@/lib/matchDetail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  suspension: { label: "SUSP", className: "border-loss text-loss" },
  high: { label: "OUT", className: "border-orange-500/60 text-orange-400" },
  medium: { label: "DOUBT", className: "border-yellow-500/60 text-yellow-400" },
  low: { label: "50/50", className: "border-muted text-muted" },
  international: { label: "INTL", className: "border-blue-500/60 text-blue-400" },
  unknown: { label: "?", className: "border-muted text-muted" },
};

function posGroup(pos: string | null): { label: string; className: string } {
  const p = (pos ?? "").toUpperCase();
  if (p === "G" || p === "GK") return { label: "GK", className: "border-muted text-muted" };
  if (p === "D" || /CB|LB|RB|LWB|RWB|DEF/.test(p)) return { label: "DEF", className: "border-blue-500/60 text-blue-400" };
  if (p === "M" || /CDM|CAM|CM|DM|AM|MID/.test(p)) return { label: "MID", className: "border-yellow-500/60 text-yellow-400" };
  return { label: "ATT", className: "border-accent text-accent" };
}

function ratingColor(r: number | string | null | undefined): string {
  if (r == null) return "text-muted";
  const n = typeof r === "number" ? r : parseFloat(r);
  if (isNaN(n)) return "text-muted";
  if (n >= 8.0) return "text-accent";
  if (n >= 7.0) return "text-green-400";
  if (n >= 6.0) return "text-ink";
  return "text-loss";
}

const fmtRating = (att: number | null) =>
  att == null ? "—" : `${att >= 0 ? "+" : ""}${att.toFixed(2)}`;

// ---------------------------------------------------------------- section 1

function OverviewColumn({ team, lineup }: { team: MatchTeam; lineup: LineupTeam | undefined }) {
  return (
    <div className="rounded border border-line bg-panel2 p-3">
      <div className="flex items-center gap-2">
        <ClubCrest apiFootballId={team.apiFootballId} clubName={team.name} size={32} />
        <span className="font-display text-lg tracking-wide">{team.name}</span>
      </div>
      <dl className="mt-3 space-y-1 font-data text-xs">
        <div className="flex justify-between"><dt className="text-muted">Coach</dt><dd className="text-ink">{team.coach ?? "To be confirmed"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Formation</dt><dd className="text-ink">{lineup?.formation ?? "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Elo</dt><dd className="text-ink">{team.elo != null ? Math.round(team.elo) : "—"}</dd></div>
        {team.att != null && <div className="flex justify-between"><dt className="text-muted">Attack</dt><dd className={team.att > 0 ? "text-accent" : "text-loss"}>{fmtRating(team.att)}</dd></div>}
        {team.deff != null && <div className="flex justify-between"><dt className="text-muted">Defence</dt><dd className={team.deff > 0 ? "text-accent" : "text-loss"}>{fmtRating(team.deff)}</dd></div>}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------- section 2

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

// ---------------------------------------------------------------- section 3 (pre-match XI)

function XIColumn({ team, lineup }: { team: string; lineup: LineupTeam | undefined }) {
  if (!lineup) return null;
  const row = (p: LineupPlayer, i: number) => {
    const badge = posGroup(p.pos);
    return (
      <li key={i} className="flex items-center gap-2 font-data text-xs">
        <span className="w-5 shrink-0 text-right text-muted">{p.number ?? ""}</span>
        <span className="flex-1 truncate text-ink">{p.name}</span>
        <span className={`shrink-0 border px-1 py-0.5 text-[8px] uppercase tracking-widest ${badge.className}`}>{badge.label}</span>
      </li>
    );
  };
  return (
    <div>
      <p className="font-display text-lg tracking-wide">{team}</p>
      <ul className="mt-2 space-y-1">{(lineup.startXI ?? []).map(row)}</ul>
      {(lineup.substitutes ?? []).length > 0 && (
        <div className="mt-2 border-t border-line pt-2">
          <p className="font-data text-[9px] uppercase tracking-widest text-muted">Substitutes</p>
          <p className="mt-1 font-data text-[11px] leading-relaxed text-muted">
            {(lineup.substitutes ?? []).map((p) => p.name).filter(Boolean).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- section 3 (pre-match squad)

const SQUAD_GROUPS: { key: SquadPosition; label: string; badge: string; badgeClass: string }[] = [
  { key: "Goalkeeper", label: "Goalkeepers", badge: "GK", badgeClass: "border-muted text-muted" },
  { key: "Defender", label: "Defenders", badge: "DEF", badgeClass: "border-blue-500/60 text-blue-400" },
  { key: "Midfielder", label: "Midfielders", badge: "MID", badgeClass: "border-yellow-500/60 text-yellow-400" },
  { key: "Attacker", label: "Attackers", badge: "ATT", badgeClass: "border-accent text-accent" },
];

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.replace(/\./g, " ").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function SquadPlayerRow({ p }: { p: SquadPlayer }) {
  return (
    <li className="flex items-center gap-2 font-data text-xs">
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo} alt="" loading="lazy" width={24} height={24}
          className="h-6 w-6 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-[9px] text-muted">{initials(p.name)}</span>
      )}
      <span className="w-6 shrink-0 text-right text-muted">{p.number != null ? `#${p.number}` : ""}</span>
      <span className="flex-1 truncate text-ink">{p.name}</span>
      {p.age != null && <span className="shrink-0 text-muted">{p.age}</span>}
    </li>
  );
}

function SquadColumn({ team, squad }: { team: string; squad: TeamSquad | null }) {
  if (!squad || squad.players.length === 0) {
    return (
      <div>
        <p className="font-display text-lg tracking-wide">{team}</p>
        <p className="mt-1 font-data text-xs text-muted">Squad not available.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-display text-lg tracking-wide">{team}</p>
      <div className="mt-2 space-y-3">
        {SQUAD_GROUPS.map(({ key, label, badge, badgeClass }) => {
          const players = squad.byPosition[key] ?? [];
          if (players.length === 0) return null;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center gap-2">
                <span className={`border px-1 py-0.5 font-data text-[8px] uppercase tracking-widest ${badgeClass}`}>{badge}</span>
                <span className="font-data text-[9px] uppercase tracking-widest text-muted">{label}</span>
              </div>
              <ul className="space-y-1">
                {players.map((p, i) => <SquadPlayerRow key={p.playerId ?? i} p={p} />)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- section 3 (post-match table)

interface PlayerStat {
  playerName?: string; teamId?: string; rating?: number | string | null; minutes?: number | null;
  goals?: number | null; assists?: number | null; shots?: number | null; shotsOnTarget?: number | null;
  passes?: number | null; passAccuracy?: number | null; yellowCards?: number | null; redCards?: number | null;
}

function ratingNum(p: PlayerStat): number {
  const n = typeof p.rating === "number" ? p.rating : parseFloat(String(p.rating ?? ""));
  return isNaN(n) ? -1 : n;
}

function PerformanceTable({ title, players }: { title: string; players: PlayerStat[] }) {
  const sorted = [...players].sort((a, b) => ratingNum(b) - ratingNum(a));
  const motm = sorted.find((p) => ratingNum(p) >= 0);
  return (
    <div>
      <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse font-data text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[9px] uppercase tracking-widest text-muted">
              <th className="py-1.5 pr-2">Player</th>
              <th className="hidden py-1.5 pr-2 sm:table-cell">Pos</th>
              <th className="hidden py-1.5 pr-2 sm:table-cell">Mins</th>
              <th className="py-1.5 pr-2 text-right">Rating</th>
              <th className="py-1.5 pr-2 text-right">Goals</th>
              <th className="hidden py-1.5 pr-2 text-right sm:table-cell">Assists</th>
              <th className="hidden py-1.5 pr-2 text-right sm:table-cell">Shots</th>
              <th className="hidden py-1.5 text-right sm:table-cell">Pass%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={i} className="border-b border-line/60">
                <td className="py-1.5 pr-2 text-ink">
                  {p.playerName}
                  {(p.goals ?? 0) > 0 ? " ⚽" : ""}
                  {(p.redCards ?? 0) > 0 ? " 🟥" : (p.yellowCards ?? 0) > 0 ? " 🟨" : ""}
                </td>
                <td className="hidden py-1.5 pr-2 text-muted sm:table-cell">—</td>
                <td className="hidden py-1.5 pr-2 text-ink sm:table-cell">{p.minutes ?? "—"}</td>
                <td className={`py-1.5 pr-2 text-right font-semibold ${ratingColor(p.rating)}`}>{p.rating ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right text-ink">{p.goals ?? 0}</td>
                <td className="hidden py-1.5 pr-2 text-right text-ink sm:table-cell">{p.assists ?? 0}</td>
                <td className="hidden py-1.5 pr-2 text-right text-ink sm:table-cell">{p.shots ?? 0}</td>
                <td className="hidden py-1.5 text-right text-ink sm:table-cell">{p.passAccuracy != null ? `${p.passAccuracy}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {motm && (
        <div className="mt-2 rounded border border-accent/30 bg-accent/5 p-3 font-data text-xs">
          <p className="text-[9px] uppercase tracking-widest text-muted">★ Best performer</p>
          <p className="mt-1 text-ink">
            {motm.playerName} <span className={ratingColor(motm.rating)}>{motm.rating}</span>
            {(motm.goals ?? 0) > 0 ? ` · ${motm.goals} goal${(motm.goals ?? 0) > 1 ? "s" : ""}` : ""}
            {(motm.shotsOnTarget ?? 0) > 0 ? ` · ${motm.shotsOnTarget} shots on target` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- section 4 (form)

function FormRow({ team, form }: { team: string; form: FormResult[] }) {
  const wins = form.filter((f) => f.result === "W").length;
  const draws = form.filter((f) => f.result === "D").length;
  const losses = form.filter((f) => f.result === "L").length;
  const gf = form.reduce((s, f) => s + f.goalsFor, 0);
  const ga = form.reduce((s, f) => s + f.goalsAgainst, 0);
  const pillClass = (r: FormResult["result"]) =>
    r === "W" ? "bg-green-500/20 text-green-400 border-green-500/30"
      : r === "D" ? "bg-gray-500/20 text-gray-400 border-gray-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <div>
      <p className="font-display text-lg tracking-wide">{team}</p>
      {form.length === 0 ? (
        <p className="mt-1 font-data text-xs text-muted">No recent results.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1">
            {form.map((f, i) => (
              <span key={i}
                title={`vs ${f.opponent} (${f.homeOrAway}) ${f.goalsFor}-${f.goalsAgainst}`}
                className={`flex h-6 w-6 items-center justify-center border font-data text-[10px] font-semibold ${pillClass(f.result)}`}>
                {f.result}
              </span>
            ))}
          </div>
          <p className="mt-1 font-data text-xs text-muted">W{wins} D{draws} L{losses}  {gf}:{ga}</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- main

export default function MatchSquadTab({ data, phase }: { data: MatchDetail; phase: "PRE" | "LIVE" | "POST" }) {
  const { homeTeam, awayTeam, lineups, homeInjuries, awayInjuries, playerStats, homeForm, awayForm, homeSquad, awaySquad } = data;
  const stats = (playerStats ?? []) as PlayerStat[];
  const hasStats = stats.length > 0;
  const homePlayers = stats.filter((p) => p.teamId === homeTeam.id);
  const awayPlayers = stats.filter((p) => p.teamId === awayTeam.id);
  const noInjuries = homeInjuries.length === 0 && awayInjuries.length === 0;

  return (
    <div className="space-y-8">
      {/* ── Team overview ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <OverviewColumn team={homeTeam} lineup={lineups?.home} />
        <OverviewColumn team={awayTeam} lineup={lineups?.away} />
      </div>

      {/* ── Reported absences ── */}
      <div>
        <h2 className="font-display text-xl tracking-wide">Reported Absences</h2>
        {noInjuries ? (
          <p className="mt-3 font-data text-xs text-muted">No reported absences.</p>
        ) : (
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">{homeTeam.name}</p>
              <InjuryList injuries={homeInjuries} />
            </div>
            <div>
              <p className="mb-2 font-data text-[9px] uppercase tracking-widest text-muted">{awayTeam.name}</p>
              <InjuryList injuries={awayInjuries} />
            </div>
          </div>
        )}
      </div>

      {/* ── Player stats / lineups / squad ── */}
      <div>
        <h2 className="mb-3 font-display text-xl tracking-wide">{hasStats ? "Player Performance" : lineups ? "Confirmed Lineups" : "Current Squad"}</h2>
        {hasStats ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <PerformanceTable title={`${homeTeam.name} Performance`} players={homePlayers} />
            <PerformanceTable title={`${awayTeam.name} Performance`} players={awayPlayers} />
          </div>
        ) : lineups ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <XIColumn team={homeTeam.name} lineup={lineups.home} />
            <XIColumn team={awayTeam.name} lineup={lineups.away} />
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <SquadColumn team={homeTeam.name} squad={homeSquad} />
              <SquadColumn team={awayTeam.name} squad={awaySquad} />
            </div>
            <p className="mt-4 font-data text-xs text-muted">Lineups confirmed ~1 hour before kick-off.</p>
          </>
        )}
      </div>

      {/* ── Form guide ── */}
      <div>
        <h2 className="mb-3 font-display text-xl tracking-wide">Form Guide</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormRow team={homeTeam.name} form={homeForm} />
          <FormRow team={awayTeam.name} form={awayForm} />
        </div>
      </div>
    </div>
  );
}
