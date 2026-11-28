"use client";
import { useState } from "react";
import { formatMinute, type MatchEvent } from "@/lib/matchEvents";
import type { LineupPlayer, LineupTeam } from "@/lib/matchDetail";
import { shortCode } from "@/lib/marketDisplay";

type Side = "home" | "away";

const lastName = (n: string | null) => (n ?? "").split(" ").slice(-1)[0];

/** Cards and substitutions for a player, matched by name against the match events. */
function playerEvents(events: MatchEvent[], side: Side, name: string | null) {
  if (!name) return { yellow: false, red: false, cameOn: null as MatchEvent | null };
  const mine = events.filter((e) => e.side === side && (e.player === name || (e as { assist?: string | null }).assist === name));
  return {
    yellow: mine.some((e) => e.player === name && /yellow/i.test(e.detail ?? "")),
    red: mine.some((e) => e.player === name && /red/i.test(e.detail ?? "")),
    cameOn: mine.find((e) => /subst/i.test(e.type ?? "")) ?? null,
  };
}

function CardIcon({ red }: { red: boolean }) {
  return <span className={`inline-block h-2.5 w-[7px] rounded-[1px] ${red ? "bg-loss" : "bg-caution"}`} aria-label={red ? "Red card" : "Yellow card"} />;
}

/** Static formation from API-Football grid slots ("row:col", row 1 = goalkeeper). No ball tracking. */
function Pitch({ team, side, events }: { team: LineupTeam; side: Side; events: MatchEvent[] }) {
  const rows = new Map<number, (LineupPlayer & { col: number })[]>();
  for (const p of team.startXI) {
    const [r, c] = String(p.grid ?? "").split(":").map(Number);
    if (!Number.isFinite(r)) continue;
    const arr = rows.get(r) ?? [];
    arr.push({ ...p, col: Number.isFinite(c) ? c : 0 });
    rows.set(r, arr);
  }
  if (rows.size === 0) return <p className="font-data text-xs text-muted">Formation not available.</p>;
  const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]); // forwards at the top, keeper at the bottom
  return (
    <div className="flex flex-col justify-between gap-3 rounded-[10px] border border-line bg-panel2 px-2 py-3" aria-label={`${team.formation ?? ""} formation`}>
      {ordered.map(([r, players]) => (
        <div key={r} className="flex justify-around">
          {players.sort((a, b) => b.col - a.col).map((p) => {
            const ev = playerEvents(events, side, p.name);
            return (
              <div key={`${p.number}-${p.name}`} className="flex w-14 flex-col items-center text-center">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-line bg-panel font-data text-[11px] font-bold">
                  {p.number ?? ""}
                  {(ev.red || ev.yellow) && <span className="absolute -right-1 -top-1"><CardIcon red={ev.red} /></span>}
                </span>
                <span className="mt-0.5 w-full truncate font-data text-[10px] text-muted">{lastName(p.name)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Lineups (spec 10.2): Pitch / List and team toggles, subs who came on, card icons. Rendered only when lineups exist. */
export default function LineupsModule({ lineups, events, homeName, awayName }: {
  lineups: { home: LineupTeam; away: LineupTeam };
  events: MatchEvent[];
  homeName: string;
  awayName: string;
}) {
  const [view, setView] = useState<"pitch" | "list">("pitch");
  const [side, setSide] = useState<Side>("home");
  const team = lineups[side];
  const cameOn = team.substitutes
    .map((p) => ({ p, ev: playerEvents(events, side, p.name).cameOn }))
    .filter((x) => x.ev);
  const toggle = (active: boolean) => `rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${active ? "bg-ink text-panel" : "text-muted hover:text-ink"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Lineup view">
          <button className={toggle(view === "pitch")} aria-pressed={view === "pitch"} onClick={() => setView("pitch")}>Pitch</button>
          <button className={toggle(view === "list")} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
        </div>
        <div className="flex gap-1" role="group" aria-label="Team">
          <button className={toggle(side === "home")} aria-pressed={side === "home"} onClick={() => setSide("home")} title={homeName}>{shortCode(homeName)}</button>
          <button className={toggle(side === "away")} aria-pressed={side === "away"} onClick={() => setSide("away")} title={awayName}>{shortCode(awayName)}</button>
        </div>
      </div>
      <p className="font-data text-[11px] text-muted">{[team.formation, team.coach].filter(Boolean).join(" · ")}</p>

      {view === "pitch" ? (
        <Pitch team={team} side={side} events={events} />
      ) : (
        <ul className="space-y-1 font-data text-xs">
          {team.startXI.map((p) => {
            const ev = playerEvents(events, side, p.name);
            return (
              <li key={`${p.number}-${p.name}`} className="flex items-center gap-2">
                <span className="w-6 text-right text-muted">{p.number ?? ""}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {(ev.red || ev.yellow) && <CardIcon red={ev.red} />}
                <span className="w-4 text-[10px] text-muted">{p.pos ?? ""}</span>
              </li>
            );
          })}
        </ul>
      )}

      {cameOn.length > 0 && (
        <div>
          <p className="mb-1 font-body text-xs font-medium text-muted">Came on</p>
          <ul className="space-y-0.5 font-data text-xs">
            {cameOn.map(({ p, ev }) => (
              <li key={`${p.number}-${p.name}`} className="flex gap-2">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-muted">{formatMinute(ev!.minute, ev!.extra)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
