/**
 * GET /api/matches/[matchId]/live — time-sensitive fields only, polled ~every 60s
 * during a match. Reads match_stats only; 204 (No Content) when the match isn't live.
 */
import { NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";

export const dynamic = "force-dynamic";

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

const noContent = () => new NextResponse(null, { status: 204 });

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  try {
    const db = await getDb();
    if (!db) return noContent();

    const stats = await db.collection("match_stats").findOne({ matchId });
    // match_stats carries a normalised isLive flag (status === "LIVE"); only
    // in-play matches get a live payload, everything else is 204.
    if (!stats || !stats.isLive) return noContent();

    return NextResponse.json({
      status: stats.status,
      afStatus: stats.afStatus ?? null,
      elapsed: stats.elapsed ?? null,
      extra: stats.extra ?? null,
      score: stats.score ?? null,
      events: stats.events ?? [],
      stats: stats.stats ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Match live API error:", err);
    return noContent();
  }
}
