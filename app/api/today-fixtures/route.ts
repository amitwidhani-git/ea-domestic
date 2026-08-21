/**
 * GET /api/today-fixtures — today's scheduled matches with their
 * API-Football fixture IDs, so the client can cross-reference live scores
 * with our own match/prediction records.
 */
import { NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";
import { VISIBLE_LEAGUE_FILTER } from "@/lib/leagues";

declare global {
  // Persist the client promise across Next.js hot reloads in dev
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).connect();
    global._eaMongoClient.catch(() => {
      global._eaMongoClient = undefined; // retry next request on failure
    });
  }
  const client = await global._eaMongoClient;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

export async function GET() {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json([]);

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000 - 1); // today 23:59:59.999 UTC

    const matches = await db
      .collection("matches")
      .find({ kickoffUtc: { $gte: start.toISOString(), $lte: end.toISOString() }, ...VISIBLE_LEAGUE_FILTER })
      .project({ kickoffUtc: 1, "sourceRefs.apiFootballFixtureId": 1 })
      .toArray();

    const rows = matches.map((m) => ({
      match_id: String(m._id),
      kickoff_utc: m.kickoffUtc as string,
      api_fixture_id: (m.sourceRefs?.apiFootballFixtureId as number | undefined) ?? null,
    }));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Today-fixtures API error:", err);
    return NextResponse.json([]);
  }
}
