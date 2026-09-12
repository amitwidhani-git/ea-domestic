/**
 * Team-stats data layer — backs the StatsInsights match-card panel
 * (corners/cards/shots/xG splits + last-5 form) via the `team_stats`
 * collection. One doc per teamId+league+season, refreshed weekly by the
 * external pipeline (not part of this repo).
 */
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClient.catch(() => { global._eaMongoClient = undefined; });
  }
  return global._eaMongoClient;
}

async function db(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

export interface TeamStatsSplit {
  avg_corners_for: number;
  avg_corners_against: number;
  avg_corners_total: number;
  avg_yellow_cards: number;
  avg_red_cards: number;
  avg_cards_total: number;
  avg_shots_for: number;
  avg_shots_on_target: number;
  avg_shots_against: number;
  avg_possession: number;
  avg_xg_for: number;
  avg_xg_against: number;
  avg_saves: number;
  avg_fouls: number;
}

export interface TeamStatsForm {
  corners_for: number[];
  corners_against: number[];
  yellow_cards: number[];
  red_cards: number[];
  shots_for: number[];
  shots_on_target: number[];
  xg_for: number[];
}

export interface TeamStatsDoc {
  teamId: string;
  teamName: string;
  matchCount: number;
  statsCount: number;
  overall: TeamStatsSplit;
  home: TeamStatsSplit;
  away: TeamStatsSplit;
  form: TeamStatsForm;
  isEnriched: boolean;
  enrichedLeague: string | null;
  enrichedCount: number;
}

function mapDoc(doc: Record<string, unknown> | null): TeamStatsDoc | null {
  if (!doc) return null;
  return {
    teamId: doc.teamId as string,
    teamName: doc.teamName as string,
    matchCount: doc.matchCount as number,
    statsCount: doc.statsCount as number,
    overall: doc.overall as TeamStatsSplit,
    home: doc.home as TeamStatsSplit,
    away: doc.away as TeamStatsSplit,
    form: doc.form as TeamStatsForm,
    isEnriched: Boolean(doc.isEnriched),
    enrichedLeague: (doc.enrichedLeague as string | null) ?? null,
    enrichedCount: (doc.enrichedCount as number) ?? 0,
  };
}

/** Both team docs for a fixture — null for a side with no doc yet (new team, no matches logged). */
export async function getTeamStats(
  homeTeamId: string,
  awayTeamId: string,
  league: string,
  season: string
): Promise<{ home: TeamStatsDoc | null; away: TeamStatsDoc | null }> {
  const d = await db();
  const docs = await d
    .collection("team_stats")
    .find({ teamId: { $in: [homeTeamId, awayTeamId] }, league, season })
    .toArray();
  const byTeamId = new Map(docs.map((doc) => [doc.teamId as string, doc]));
  return {
    home: mapDoc(byTeamId.get(homeTeamId) ?? null),
    away: mapDoc(byTeamId.get(awayTeamId) ?? null),
  };
}
