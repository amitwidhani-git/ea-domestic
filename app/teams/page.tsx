import Link from "next/link";
import { MongoClient, type Db } from "mongodb";
import ClubCrest from "@/components/ClubCrest";
import { LEAGUE_NAMES } from "@/lib/types";

export const metadata = {
  title: "Clubs — EdgeAnalysts",
  description: "All 104 EFL clubs with model ratings, squad news and upcoming fixtures.",
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
  league: DomesticLeague;
  name: string;
  aliases?: { apiFootball?: number | null };
  elo?: number | null;
}

type DomesticLeague = "PL" | "CH" | "L1" | "L2";
const LEAGUE_ORDER: DomesticLeague[] = ["PL", "CH", "L1", "L2"];
const LEAGUE_LOGO_ID: Record<DomesticLeague, number> = { PL: 39, CH: 40, L1: 41, L2: 42 };

async function getTeams(): Promise<Map<DomesticLeague, TeamDoc[]>> {
  const teams = await (await db())
    .collection<TeamDoc>("teams")
    .find({ league: { $in: LEAGUE_ORDER } })
    .sort({ name: 1 })
    .toArray();

  const grouped = new Map<DomesticLeague, TeamDoc[]>();
  for (const league of LEAGUE_ORDER) grouped.set(league, []);
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl tracking-wide">Clubs</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          104 clubs across the English football pyramid. Click any club for squad news, model
          ratings and upcoming fixtures.
        </p>
      </div>

      {LEAGUE_ORDER.map((league) => {
        const teams = grouped.get(league) ?? [];
        if (teams.length === 0) return null;
        return (
          <section key={league}>
            <div className="mb-4 flex items-center gap-2 border-b border-line pb-2">
              <img
                src={`https://media.api-sports.io/football/leagues/${LEAGUE_LOGO_ID[league]}.png`}
                alt={`${LEAGUE_NAMES[league]} logo`}
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
              <h2 className="font-display text-2xl tracking-wide">{LEAGUE_NAMES[league]}</h2>
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
}
