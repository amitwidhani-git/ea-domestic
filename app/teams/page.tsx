import Link from "next/link";
import { MongoClient, type Db } from "mongodb";
import ClubCrest from "@/components/ClubCrest";
import { LEAGUE_NAMES } from "@/lib/types";
import { COUNTRIES, COUNTRY_LEAGUES, LEAGUES, leagueLogoUrl, type League } from "@/lib/leagues";

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

  return (
    <div className="space-y-10">
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
              return (
                <section key={league} id={league} className="scroll-mt-20">
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
    </div>
  );
}
