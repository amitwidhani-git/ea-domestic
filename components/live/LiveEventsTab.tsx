"use client";
import type { LiveMatch } from "@/lib/liveFixtures";
import { eventIcon, formatMinute } from "@/lib/matchEvents";

export default function LiveEventsTab({ match }: { match: LiveMatch }) {
  if (match.events.length === 0) {
    return <p className="font-body text-[13px] text-muted">No events yet.</p>;
  }

  const reversed = [...match.events].reverse();

  return (
    <ul className="divide-y divide-line">
      {reversed.map((e, i) => {
        const team = e.side === "home" ? match.home.name : e.side === "away" ? match.away.name : null;
        return (
          <li key={i} className="flex items-center gap-2.5 py-2.5">
            <span className="w-10 shrink-0 font-data text-[12px] font-bold text-muted">{formatMinute(e.minute, e.extra)}</span>
            <span className="text-base" aria-hidden="true">{eventIcon(e)}</span>
            <span className="min-w-0 flex-1 truncate font-body text-[13px]">
              {e.player ?? e.detail ?? "Event"}
              {e.assist && <span className="text-muted"> ({e.assist})</span>}
            </span>
            {team && <span className="shrink-0 font-body text-[11px] text-muted">{team}</span>}
          </li>
        );
      })}
    </ul>
  );
}
