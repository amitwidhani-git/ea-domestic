/**
 * /api/schedule — full season fixtures joined to predictions.
 * Client-side fetched so the 2000-fixture list doesn't block SSR.
 * Reads from MongoDB when MONGODB_URI is set, falls back to data/fixtures.json.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

declare global { var _eaMongoClientSched: Promise<import("mongodb").MongoClient> | undefined; }

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

export async function GET() {
  try {
    const db = await getDb();
    if (db) {
      const matches = await db.collection("matches")
        .find({ season: "2026-27" })
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
          score: m.score ?? { home: null, away: null },
          prediction: p ? { probs: p.probs, pick: p.pick, frozen_at: p.frozenAt,
                            hash: p.hash, model_correct: p.modelCorrect } : null,
        };
      });
      return NextResponse.json(rows);
    }
  } catch (err) {
    console.error("Schedule API Mongo error:", err);
  }

  // Fallback to local JSON
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "fixtures.json"), "utf-8");
    const fixtures = JSON.parse(raw);
    return NextResponse.json(fixtures.map((f: Record<string, unknown>) => ({ ...f, status: "SCHEDULED", score: { home: null, away: null }, prediction: null })));
  } catch {
    return NextResponse.json([]);
  }
}
