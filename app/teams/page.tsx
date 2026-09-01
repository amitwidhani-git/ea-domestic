import Link from "next/link";
import { MongoClient, type Db } from "mongodb";
import ClubCrest from "@/components/ClubCrest";
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
import { LEAGUE_NAMES } from "@/lib/types";
import { COUNTRIES, COUNTRY_LEAGUES, LEAGUES, leagueLogoUrl, type League } from "@/lib/leagues";

// Strip banner shown above every league section from the second one onward
// (Premier League leads the page under the fixed BetanoPromo, so it gets none).
// Full partner set (matches the /insights "Partner Offers" list); reshuffled
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

interface TeamDoc {
  _id: string;
  league: League;
  name: string;
  aliases?: { apiFootball?: number | null };
  elo?: number | null;
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

function ClubCard({ team }: { team: TeamDoc }) {
  return (
    <Link
      href={`/teams/${team._id}`}
      className="flex items-center gap-3 border border-line bg-panel p-4 transition-colors hover:border-accent hover:bg-panel2"
    >
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

export default async function TeamsPage() {
  const grouped = await getTeams();
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
    <div className="space-y-10">
      <BetanoPromo />
      <div>
        <h1 className="font-display text-4xl tracking-wide">Teams</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          {totalTeams} teams across every league we track. Click any team for squad news, model
          ratings and upcoming fixtures.
        </p>
      </div>

      {COUNTRIES.map((country) => {
        const leagues = COUNTRY_LEAGUES[country].filter((code) => (grouped.get(code) ?? []).length > 0);
        if (leagues.length === 0) return null;
        return (
          <div key={country} className="space-y-8">
            <h2 className="font-data text-xs font-bold uppercase tracking-[0.15em] text-muted">{country}</h2>
            {leagues.map((league) => {
              const teams = grouped.get(league) ?? [];
              const ordinal = leagueOrder.indexOf(league);
              const StripPromo = ordinal >= 1 ? promoRotation[ordinal - 1] : null;
              return (
                <section key={league} id={league} className="scroll-mt-20">
                  {StripPromo && (
                    <div className="mb-8">
                      <StripPromo />
                    </div>
                  )}
                  <div className="mb-4 flex items-center gap-2 border-b border-line pb-2">
                    <img
                      src={leagueLogoUrl(league)}
                      alt={`${LEAGUE_NAMES[league]} logo`}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    <h3 className="font-display text-2xl tracking-wide">{LEAGUE_NAMES[league]}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {teams.map((team) => (
                      <ClubCard key={team._id} team={team} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        );
      })}

      <BetMazePromo />
    </div>
  );
}
