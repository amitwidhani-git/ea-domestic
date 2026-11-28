"use client";
import { useState } from "react";
import { eventIcon, formatMinute, type MatchEvent } from "@/lib/matchEvents";

const KEY_EVENT = /goal|penalty|card|subst|var/i;
const MOBILE_VISIBLE = 5;

/**
 * Match feed (spec 10.2): newest first, Key (goals, cards, subs, VAR) or All,
 * left border in the team's colour. Scrolls inside its column on desktop;
 * on smaller screens shows the first few with "Show more".
 */
export default function MatchFeed({ events, homeName, awayName }: { events: MatchEvent[]; homeName: string; awayName: string }) {
  const [filter, setFilter] = useState<"key" | "all">("key");
  const [expanded, setExpanded] = useState(false);
  const list = [...events].reverse().filter((e) => filter === "all" || KEY_EVENT.test(`${e.type ?? ""} ${e.detail ?? ""}`));

  return (
    <div>
      <div className="mb-2 flex gap-1" role="group" aria-label="Filter events">
        {(["key", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${filter === f ? "bg-ink text-panel" : "text-muted hover:text-ink"}`}>
            {f === "key" ? "Key" : "All"}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="px-1 py-2 font-data text-xs text-muted">No events yet.</p>
      ) : (
        <ul className="space-y-1.5 xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto xl:pr-1">
          {list.map((e, i) => (
            <li key={i}
              className={`${!expanded && i >= MOBILE_VISIBLE ? "hidden xl:block" : "block"} border-l-2 py-1 pl-2.5 ${e.side === "away" ? "border-[var(--info)]" : e.side === "home" ? "border-[var(--accent)]" : "border-line"}`}>
              <div className="flex items-center gap-1.5 font-data text-[11px]">
                <span className="w-9 shrink-0 text-muted">{formatMinute(e.minute, e.extra)}</span>
                <span>{eventIcon(e)}</span>
                <span className="truncate font-semibold">{e.side === "home" ? homeName : e.side === "away" ? awayName : ""}</span>
              </div>
              <p className="ml-9 truncate font-data text-[11px] text-muted">
                {[e.detail, e.player].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      {list.length > MOBILE_VISIBLE && (
        <button onClick={() => setExpanded((x) => !x)} className="mt-2 font-data text-xs font-semibold text-muted hover:text-ink xl:hidden">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
