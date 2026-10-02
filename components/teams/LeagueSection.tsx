"use client";
import type { ComponentType } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import LeagueBadge from "@/components/LeagueBadge";
import { flagUrl } from "@/lib/countryFlags";
import { LEAGUES, NL_TIERS, NL_TIER_LABEL, leagueLogoUrl, type League, type NLTier } from "@/lib/leagues";
import { useEuroFilter } from "./EuroFilterContext";

export interface TeamDoc {
  _id: string;
  league: League;
  name: string;
  aliases?: { apiFootball?: number | null };
  elo?: number | null;
  /** Nations League strength tier — undefined/null for every league except NL, and for the rare NL team with no tier assigned yet. */
  nlTier?: NLTier | null;
}

function EloBar({ elo, min, max }: { elo: number; min: number; max: number }) {
  const pct = max > min ? ((elo - min) / (max - min)) * 100 : 100;
  return (
    <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-line/30" aria-hidden="true">
      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, pct)}%` }} />
    </span>
  );
}

function ClubCard({ team, badges, eloRange }: { team: TeamDoc; badges: League[]; eloRange?: { min: number; max: number } }) {
  const flag = eloRange ? flagUrl(team._id) : null; // only national teams (NL) carry a flag
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
        <p className="flex items-center gap-1.5 truncate font-display text-lg tracking-wide text-ink">
          {flag && <img src={flag} alt="" width={16} height={12} className="shrink-0 object-contain" />}
          <span className="truncate">{team.name}</span>
        </p>
        {team.elo != null ? (
          eloRange ? (
            <>
              <p className="mt-0.5 font-data text-xs text-muted">Elo {team.elo}</p>
              <EloBar elo={team.elo} min={eloRange.min} max={eloRange.max} />
            </>
          ) : (
            <p className="mt-0.5 font-data text-xs text-muted">Elo {team.elo}</p>
          )
        ) : (
          <span className="mt-0.5 inline-block border border-accent px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest text-accent">
            New
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamGrid({ teams, euroBadges, eloRange }: { teams: TeamDoc[]; euroBadges: Record<string, League[]>; eloRange?: { min: number; max: number } }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {teams.map((team) => (
        <ClubCard key={team._id} team={team} badges={euroBadges[team._id] ?? []} eloRange={eloRange} />
      ))}
    </div>
  );
}

/**
 * One league's squad grid. Renders nothing when the active European filter
 * (see EuroFilterContext) leaves zero teams visible, so an emptied-out
 * section doesn't leave a dangling header above a blank grid.
 *
 * Nations League (league === "NL") is the one exception to "one flat grid
 * per league" — its 50+ teams are only meaningful grouped by strength tier,
 * so this renders four tier sub-sections (League A-D) instead, each with
 * its own anchor (#NL-A etc.) and an Elo strength bar scaled across the
 * whole Nations League field.
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

  const isNationsLeague = league === "NL";
  const elos = teams.map((t) => t.elo).filter((e): e is number => e != null);
  const eloRange = isNationsLeague && elos.length > 0 ? { min: Math.min(...elos), max: Math.max(...elos) } : undefined;

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

      {isNationsLeague ? (
        <div className="space-y-8">
          {NL_TIERS.map((tier) => {
            const tierTeams = visible.filter((t) => t.nlTier === tier);
            if (tierTeams.length === 0) return null;
            return (
              <div key={tier} id={`NL-${tier}`} className="scroll-mt-20">
                <h4 className="mb-3 font-data text-[11px] font-bold uppercase tracking-widest text-muted">{NL_TIER_LABEL[tier]}</h4>
                <TeamGrid teams={tierTeams} euroBadges={euroBadges} eloRange={eloRange} />
              </div>
            );
          })}
          {(() => {
            const unranked = visible.filter((t) => !t.nlTier);
            if (unranked.length === 0) return null;
            return (
              <div>
                <h4 className="mb-3 font-data text-[11px] font-bold uppercase tracking-widest text-muted">Unranked</h4>
                <TeamGrid teams={unranked} euroBadges={euroBadges} eloRange={eloRange} />
              </div>
            );
          })()}
        </div>
      ) : (
        <TeamGrid teams={visible} euroBadges={euroBadges} />
      )}
    </section>
  );
}
