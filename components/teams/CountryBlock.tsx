"use client";
import type { ReactNode } from "react";
import type { League } from "@/lib/leagues";
import type { TeamDoc } from "./LeagueSection";
import { useEuroFilter } from "./EuroFilterContext";

/**
 * Wraps one country's block (header + its LeagueSections). Hides the whole
 * block — header included — when a European filter is active and none of
 * this country's teams are in that competition, so filtering never leaves a
 * country header sitting above a blank space.
 */
export default function CountryBlock({
  country, teamsByLeague, euroBadges, children,
}: {
  country: string;
  teamsByLeague: Record<string, TeamDoc[]>;
  euroBadges: Record<string, League[]>;
  children: ReactNode;
}) {
  const [filter] = useEuroFilter();
  if (filter) {
    const anyVisible = Object.values(teamsByLeague).some((teams) =>
      teams.some((t) => (euroBadges[t._id] ?? []).includes(filter)),
    );
    if (!anyVisible) return null;
  }
  return (
    <div className="space-y-8">
      <h2 className="font-data text-xs font-bold uppercase tracking-[0.15em] text-muted">{country}</h2>
      {children}
    </div>
  );
}
