"use client";
import type { ComponentType } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import LeagueBadge from "@/components/LeagueBadge";
import { LEAGUES, leagueLogoUrl, type League } from "@/lib/leagues";
import { useEuroFilter } from "./EuroFilterContext";

export interface TeamDoc {
  _id: string;
  league: League;
  name: string;
  aliases?: { apiFootball?: number | null };
  elo?: number | null;
}

function ClubCard({ team, badges }: { team: TeamDoc; badges: League[] }) {
  return (
    <Link
      href={`/teams/${team._id}`}
      className="relative flex items-center gap-3 border border-line bg-panel p-4 transition-colors hover:border-accent hover:bg-panel2"
    >
      {badges.length > 0 && (
        <span className="absolute right-2 top-2 flex gap-1" title="Playing in European competition this season">
          {badges.map((b) => <LeagueBadge key={b} league={b} />)}
        </span>
      )}
      <ClubCrest apiFootballId={team.aliases?.apiFootball ?? null} clubName={team.name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg tracking-wide text-ink">{team.name}</p>
        {team.elo != null ? (
          <p className="mt-0.5 font-data text-xs text-muted">Elo {team.elo}</p>
        ) : (
          <span className="mt-0.5 inline-block border border-accent px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest text-accent">
            New
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * One league's squad grid. Renders nothing when the active European filter
 * (see EuroFilterContext) leaves zero teams visible, so an emptied-out
 * section doesn't leave a dangling header above a blank grid.
 */
export default function LeagueSection({
  league, teams, euroBadges, stripPromo: StripPromo,
}: {
  league: League;
  teams: TeamDoc[];
  euroBadges: Record<string, League[]>;
  stripPromo?: ComponentType | null;
}) {
  const [filter] = useEuroFilter();
  const visible = filter ? teams.filter((t) => (euroBadges[t._id] ?? []).includes(filter)) : teams;
  if (visible.length === 0) return null;

  return (
    <section id={league} className="scroll-mt-20">
      {StripPromo && (
        <div className="mb-8">
          <StripPromo />
        </div>
      )}
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-2">
        <img
          src={leagueLogoUrl(league)}
          alt={`${LEAGUES[league].name} logo`}
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
        />
        <h3 className="font-display text-2xl tracking-wide">{LEAGUES[league].name}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((team) => (
          <ClubCard key={team._id} team={team} badges={euroBadges[team._id] ?? []} />
        ))}
      </div>
    </section>
  );
}
