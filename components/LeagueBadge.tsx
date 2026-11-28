"use client";
import { useState } from "react";
import type { League } from "@/lib/types";
import { LEAGUE_NAMES } from "@/lib/types";
import { LEAGUES, leagueLogoUrl } from "@/lib/leagues";

export default function LeagueBadge({ league }: { league: League }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      title={LEAGUE_NAMES[league]}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center border ${LEAGUES[league].badgeColor}`}
    >
      {failed ? (
        <span className="font-data text-[8px] leading-none tracking-tighter">{league}</span>
      ) : (
        // Light backing chip: several league logos (Eredivisie, Ligue 1, Scottish
        // Championship) are dark navy on transparent and vanish on the dark theme.
        <img
          src={leagueLogoUrl(league)}
          alt={league}
          width={20}
          height={20}
          className="h-5 w-5 rounded-[3px] bg-white object-contain p-px"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
