/**
 * GET /api/matches/[matchId]/live — time-sensitive fields only, polled ~every 60s
 * during a match. Prefers live status/events straight from API-Football
 * (getLiveOverlayFor / getLiveFixtureEvents) over match_stats — that Mongo
 * collection is written by a separate pipeline job that can lag kickoff by
 * several minutes, or have no doc at all yet, which otherwise leaves a match
 * that's actually live showing 204/"kicks off imminent" on the match page.
 * 204 (No Content) only when neither source has anything live for this match.
 */
import { NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";
import { getLiveOverlayFor, getLiveFixtureEvents } from "@/lib/liveScores";

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

    const [stats, match] = await Promise.all([
      db.collection("match_stats").findOne({ matchId }),
      db.collection("matches").findOne({ _id: matchId as never }),
    ]);

    const apiFixtureId = (match?.sourceRefs?.apiFootballFixtureId as number | undefined) ?? null;
    const liveOverlay = await getLiveOverlayFor(apiFixtureId);

    if (!liveOverlay && (!stats || !stats.isLive)) return noContent();

    if (liveOverlay) {
      const events = apiFixtureId != null ? await getLiveFixtureEvents(apiFixtureId) : [];
      return NextResponse.json({
        status: "LIVE",
        afStatus: liveOverlay.status,
        elapsed: liveOverlay.elapsed,
        extra: liveOverlay.extra,
        score: { home: liveOverlay.homeScore ?? 0, away: liveOverlay.awayScore ?? 0 },
        events,
        stats: stats?.stats ?? null,
        updatedAt: new Date().toISOString(),
      });
    }

    // API-Football no longer (or not yet) reports this fixture as live — fall
    // back to whatever match_stats has (pre-match, finished, or the pipeline
    // has since caught up).
    return NextResponse.json({
      status: stats!.status,
      afStatus: stats!.afStatus ?? null,
      elapsed: stats!.elapsed ?? null,
      extra: stats!.extra ?? null,
      score: stats!.score ?? null,
      events: stats!.events ?? [],
      stats: stats!.stats ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Match live API error:", err);
    return noContent();
  }
}
