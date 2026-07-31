"use client";
import { useState } from "react";
import type { League } from "@/lib/types";
import { LEAGUE_NAMES } from "@/lib/types";

const COLOURS: Record<League, string> = {
  PL: "border-purple-500/60 text-purple-400",
  CH: "border-sky-500/60 text-sky-400",
  L1: "border-emerald-500/60 text-emerald-400",
  L2: "border-amber-500/60 text-amber-400",
  FAC: "border-red-500/60 text-red-400",
  LC: "border-orange-500/60 text-orange-400",
  CS: "border-yellow-500/60 text-yellow-400",
};

// API-Football's static league-logo CDN — no API call needed for these.
// Exported so other league-aware UI (e.g. the schedule page filters) can
// reuse the same URLs without redefining them.
export const LEAGUE_LOGO_URL: Record<League, string> = {
  PL: "https://media.api-sports.io/football/leagues/39.png",
  CH: "https://media.api-sports.io/football/leagues/40.png",
  L1: "https://media.api-sports.io/football/leagues/41.png",
  L2: "https://media.api-sports.io/football/leagues/42.png",
  FAC: "https://media.api-sports.io/football/leagues/45.png",
  LC: "https://media.api-sports.io/football/leagues/48.png",
  CS: "https://media.api-sports.io/football/leagues/528.png",
};

export default function LeagueBadge({ league }: { league: League }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      title={LEAGUE_NAMES[league]}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center border ${COLOURS[league]}`}
    >
      {failed ? (
        <span className="font-data text-[8px] leading-none tracking-tighter">{league}</span>
      ) : (
        <img
          src={LEAGUE_LOGO_URL[league]}
          alt={league}
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
