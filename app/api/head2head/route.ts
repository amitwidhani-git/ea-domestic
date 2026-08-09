/**
 * GET /api/head2head?home={teamId}&away={teamId} — head-to-head record.
 * Cached 24h. Returns null when there's no record (or the collection is empty).
 */
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";
import { normalizeMeeting, computeH2H } from "@/lib/h2h";

export const revalidate = 86400;

const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=3600";

declare global {
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClient.catch(() => { global._eaMongoClient = undefined; });
  }
  const client = await global._eaMongoClient;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

export async function GET(req: NextRequest) {
  const home = req.nextUrl.searchParams.get("home");
  const away = req.nextUrl.searchParams.get("away");
  if (!home || !away) {
    return NextResponse.json({ error: "missing home/away param" }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) return NextResponse.json(null, { headers: { "Cache-Control": CACHE_CONTROL } });

    const doc = await db.collection("head2head").findOne({ homeTeamId: home, awayTeamId: away });
    if (!doc) return NextResponse.json(null, { headers: { "Cache-Control": CACHE_CONTROL } });

    // Recompute the win split from the meetings, attributed to the two fixture
    // teams (the stored homeWins/awayWins dropped a side's away wins).
    const meetings = doc.meetings ?? [];
    return NextResponse.json(
      {
        meetings: meetings.map(normalizeMeeting),
        ...computeH2H(meetings, home, away),
      },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (err) {
    console.error("H2H API error:", err);
    return NextResponse.json(null);
  }
}
