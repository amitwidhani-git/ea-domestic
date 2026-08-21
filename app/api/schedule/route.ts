/**
 * /api/schedule — next-20-days fixtures joined to predictions.
 * Client-side fetched so the fixture list doesn't block SSR.
 * Reads from MongoDB when MONGODB_URI is set, falls back to data/fixtures.json.
 * Results are cached in-memory (per server instance) for a few minutes, and
 * a Cache-Control header lets the CDN/browser skip the round trip entirely.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { VISIBLE_LEAGUE_FILTER } from "@/lib/leagues";

declare global {
  var _eaMongoClientSched: Promise<import("mongodb").MongoClient> | undefined;
  var _eaScheduleCache: { key: string; rows: unknown[]; expiresAt: number } | undefined;
}

const DAYS_AHEAD = 30;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — plenty fresh for a schedule page, avoids hammering Mongo
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=60";

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!global._eaMongoClientSched) {
    const { MongoClient } = await import("mongodb");
    global._eaMongoClientSched = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClientSched.catch(() => { global._eaMongoClientSched = undefined; });
  }
  const client = await global._eaMongoClientSched;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

// Window anchored to the start of today (UTC) so today's kicked-off/settled
// fixtures still show, through DAYS_AHEAD days out. Historic/finished matches
// live on the Results page, not here. The cache key changes with the day so the
// window rolls forward once the TTL-based cache expires.
function dateWindow() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAYS_AHEAD * 86_400_000);
  return { startIso: start.toISOString(), endIso: end.toISOString(), cacheKey: start.toISOString().slice(0, 10) };
}

export async function GET() {
  const { startIso, endIso, cacheKey } = dateWindow();

  const cached = global._eaScheduleCache;
  if (cached && cached.key === cacheKey && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.rows, { headers: { "Cache-Control": CACHE_CONTROL } });
  }

  try {
    const db = await getDb();
    if (db) {
      const matches = await db.collection("matches")
        .find({ season: "2026-27", kickoffUtc: { $gte: startIso, $lt: endIso }, ...VISIBLE_LEAGUE_FILTER })
        .sort({ kickoffUtc: 1 })
        .toArray();

      const matchIds = matches.map((m) => m._id);
      const preds = await db.collection("predictions").find({ matchId: { $in: matchIds as any[] } }).toArray();
      const predMap = new Map(preds.map((p) => [String(p.matchId), p]));

      const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      const teams = await db.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray();
      const teamName = new Map(teams.map((t) => [String(t._id), String(t.name)]));

      const rows = matches.map((m) => {
        const mid = String(m._id);
        const p = predMap.get(mid);
        return {
          match_id: mid, league: m.league, season: m.season,
          kickoff_utc: m.kickoffUtc, status: m.status,
          home_team: teamName.get(String(m.homeTeamId)) ?? String(m.homeTeamId),
          away_team: teamName.get(String(m.awayTeamId)) ?? String(m.awayTeamId),
          home_team_id: String(m.homeTeamId),
          away_team_id: String(m.awayTeamId),
          score: m.score ?? { home: null, away: null },
          penalty_score: (m.penaltyScore as { home: number; away: number } | undefined) ?? null,
          api_fixture_id: (m.sourceRefs?.apiFootballFixtureId as number | undefined) ?? null,
          prediction: p ? { probs: p.probs, pick: p.pick, frozen_at: p.frozenAt,
                            hash: p.hash, model_correct: p.modelCorrect } : null,
        };
      });

      global._eaScheduleCache = { key: cacheKey, rows, expiresAt: Date.now() + CACHE_TTL_MS };
      return NextResponse.json(rows, { headers: { "Cache-Control": CACHE_CONTROL } });
    }
  } catch (err) {
    console.error("Schedule API Mongo error:", err);
  }

  // Fallback to local JSON
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "fixtures.json"), "utf-8");
    const fixtures = JSON.parse(raw);
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const rows = fixtures
      .map((f: Record<string, unknown>) => ({ ...f, status: "SCHEDULED", score: { home: null, away: null }, penalty_score: null, home_team_id: (f.home_team_id as string | undefined) ?? null, away_team_id: (f.away_team_id as string | undefined) ?? null, api_fixture_id: null, prediction: null }))
      .filter((f: { kickoff_utc: string }) => {
        const t = new Date(f.kickoff_utc).getTime();
        return t >= startMs && t < endMs;
      });

    global._eaScheduleCache = { key: cacheKey, rows, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(rows, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch {
    return NextResponse.json([]);
  }
}
