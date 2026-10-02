import { Suspense } from "react";
import { MongoClient, type Db } from "mongodb";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import Bet247Promo from "@/components/Bet247Promo";
import BetwayPromo from "@/components/BetwayPromo";
import LeagueSection, { type TeamDoc } from "@/components/teams/LeagueSection";
import CountryBlock from "@/components/teams/CountryBlock";
import EuroFilterBar from "@/components/teams/EuroFilterBar";
import { EuroFilterProvider } from "@/components/teams/EuroFilterContext";
import { COUNTRIES, COUNTRY_LEAGUES, CONTINENTAL_LEAGUES, LEAGUES, type League } from "@/lib/leagues";

// Strip banner shown above every league section from the second one onward
// (Premier League leads the page under the fixed BetanoPromo, so it gets none).
// Full partner set (matches the /offers list); reshuffled
// per request so the order varies on each visit without a partner repeating
// back to back.
const STRIP_PROMOS: React.ComponentType[] = [
  BetanoPromo, LivescorebetPromo, BetsunaPromo, BetrinoPromo, MogobetPromo,
  FruityKingPromo, MonsterCasinoPromo, SpinzwinPromo, BetMazePromo,
  Bet247Promo, BetwayPromo,
];

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// `count` promo picks from `pool`: every pick differs from the one before it,
// and a partner only recurs after the whole pool has been shown once. Built by
// laying down reshuffled full permutations back to back, swapping the seam when
// a block would open on the partner the previous block closed with.
function promoSequence<T>(pool: readonly T[], count: number): T[] {
  const out: T[] = [];
  while (out.length < count) {
    const block = shuffled(pool);
    if (out.length > 0 && block.length > 1 && block[0] === out[out.length - 1]) {
      [block[0], block[1]] = [block[1], block[0]];
    }
    out.push(...block);
  }
  return out.slice(0, count);
}

export const metadata = {
  title: "Teams — EdgeAnalysts",
  description: "Every club we track with model ratings, squad news and upcoming fixtures.",
};

export const dynamic = "force-dynamic";

declare global {
  // Persist the client promise across Next.js hot reloads in dev
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).connect();
    global._eaMongoClient.catch(() => {
      global._eaMongoClient = undefined; // retry next request on failure
    });
  }
  return global._eaMongoClient;
}

async function db(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

// Domestic leagues only — a cup competition (isCup: true, e.g. Champions
// League) has no standalone squad list; its clubs already appear under
// their own domestic league.
const DOMESTIC_LEAGUES: League[] = (Object.keys(LEAGUES) as League[]).filter((code) => !LEAGUES[code].isCup);

async function getTeams(): Promise<Map<League, TeamDoc[]>> {
  const teams = await (await db())
    .collection<TeamDoc>("teams")
    .find({ league: { $in: DOMESTIC_LEAGUES } })
    .sort({ name: 1 })
    .toArray();

  const grouped = new Map<League, TeamDoc[]>();
  for (const league of DOMESTIC_LEAGUES) grouped.set(league, []);
  for (const team of teams) {
    grouped.get(team.league)?.push(team);
  }
  return grouped;
}

/**
 * Which European competition (if any) each team is in this season. UCL/UEL/
 * UECL teams play their day-to-day football in a domestic league — there's
 * no standalone squad list for these (see DOMESTIC_LEAGUES above) — so this
 * is read as an overlay badge on the team's existing domestic card instead,
 * via the `matches` collection (the only place that reliably carries both
 * `league` and both team ids for every fixture; `predictions` has neither).
 * Scoped to each competition's own latest season so a team that played
 * Champions League three years ago doesn't carry the badge forever.
 */
async function getEuroBadges(): Promise<Record<string, League[]>> {
  const d = await db();
  const badges = new Map<string, Set<League>>();

  await Promise.all(
    CONTINENTAL_LEAGUES.map(async (league) => {
      const seasons = await d.collection("matches").distinct("season", { league });
      const latest = (seasons as string[]).sort().pop();
      if (!latest) return;
      const matches = await d
        .collection("matches")
        .find({ league, season: latest }, { projection: { homeTeamId: 1, awayTeamId: 1 } })
        .toArray();
      for (const m of matches) {
        for (const teamId of [String(m.homeTeamId), String(m.awayTeamId)]) {
          if (!badges.has(teamId)) badges.set(teamId, new Set());
          badges.get(teamId)!.add(league);
        }
      }
    }),
  );

  const out: Record<string, League[]> = {};
  for (const [teamId, set] of badges) out[teamId] = [...set];
  return out;
}

export default async function TeamsPage() {
  const [grouped, euroBadges] = await Promise.all([getTeams(), getEuroBadges()]);
  const totalTeams = [...grouped.values()].reduce((n, teams) => n + teams.length, 0);

  // Flat render order of the league sections (countries in display order, then
  // leagues within each). The first section (Premier League) is preceded by the
  // fixed BetanoPromo; every section after it gets a randomised strip promo,
  // none repeating until the whole pool has been shown and never back to back.
  const leagueOrder: League[] = COUNTRIES.flatMap((country) =>
    COUNTRY_LEAGUES[country].filter((code) => (grouped.get(code) ?? []).length > 0),
  );
  const promoRotation = promoSequence(STRIP_PROMOS, Math.max(0, leagueOrder.length - 1));

  return (
    <Suspense fallback={null}>
      <EuroFilterProvider>
        <div className="space-y-10">
          <BetanoPromo />
          <div>
            <h1 className="font-display text-4xl tracking-wide">Teams</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink">
              {totalTeams} teams across every league we track. Click any team for squad news, model
              ratings and upcoming fixtures.
            </p>
          </div>

          <EuroFilterBar />

          {COUNTRIES.map((country) => {
            const leagues = COUNTRY_LEAGUES[country].filter((code) => (grouped.get(code) ?? []).length > 0);
            if (leagues.length === 0) return null;
            const teamsByLeague = Object.fromEntries(leagues.map((lg) => [lg, grouped.get(lg) ?? []]));
            return (
              <CountryBlock key={country} country={country} teamsByLeague={teamsByLeague} euroBadges={euroBadges}>
                {leagues.map((league) => {
                  const teams = grouped.get(league) ?? [];
                  const ordinal = leagueOrder.indexOf(league);
                  const StripPromo = ordinal >= 1 ? promoRotation[ordinal - 1] : null;
                  return (
                    <LeagueSection key={league} league={league} teams={teams} euroBadges={euroBadges} stripPromo={StripPromo} />
                  );
                })}
              </CountryBlock>
            );
          })}

          <BetwayPromo />
        </div>
      </EuroFilterProvider>
    </Suspense>
  );
}
