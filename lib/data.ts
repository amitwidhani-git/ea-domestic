/**
 * Data access layer — MongoDB Atlas backed.
 *
 * Drop-in replacement for the file-based lib/data.ts.
 * Pages and components are unchanged — only this file knows about storage.
 *
 * Requires: npm install mongodb
 * Env var:  MONGODB_URI  (same connection string as the pipeline)
 * Optional: MONGODB_DB   (default: "edgeanalysts")
 */

import { MongoClient, type Db } from "mongodb";
import type { Article, EvSignal, Fixture, League, LeagueStats, Prediction, Result, TrackRecordRow } from "./types";

// ---------------------------------------------------------------- connection

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

// ---------------------------------------------------------------- fixtures

export interface FixtureWithPrediction {
  fixture: Fixture;
  prediction: Prediction | null;
}

/**
 * Upcoming fixtures joined to their frozen predictions (null until frozen), soonest first.
 * "Upcoming" = SCHEDULED or LIVE, kickoff in the next 45 days.
 */
export async function getFixtures(): Promise<FixtureWithPrediction[]> {
  const d = await db();
  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + 45 * 86400_000).toISOString();

  const matches = await d
    .collection("matches")
    .find({
      status: { $in: ["SCHEDULED", "LIVE"] },
      kickoffUtc: { $gte: now, $lte: horizon },
    })
    .sort({ kickoffUtc: 1 })
    .toArray();

  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m._id);
  const preds = await d
    .collection("predictions")
    .find({ matchId: { $in: matchIds as any[] } })
    .toArray();
  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));

  // Look up team display names once
  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teamDocs = await d.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray();
  const teamName = new Map(teamDocs.map((t) => [String(t._id), String(t.name)]));

  return matches.map((m) => {
    const pred = predByMatch.get(String(m._id)) ?? null;
    const fixture: Fixture = {
      match_id: String(m._id),
      league: m.league as League,
      season: m.season as string,
      kickoff_utc: m.kickoffUtc as string,
      home_team: teamName.get(String(m.homeTeamId)) ?? (String(m.homeTeamId)),
      away_team: teamName.get(String(m.awayTeamId)) ?? (String(m.awayTeamId)),
    };
    const prediction: Prediction | null = pred
      ? {
          match_id: String(pred.matchId),
          model_version: pred.modelVersion as string,
          probs: pred.probs as Prediction["probs"],
          pick: pred.pick as Prediction["pick"],
          frozen_at: pred.frozenAt as string,
          hash: pred.hash as string,
          model_correct: pred.modelCorrect as boolean | null,
        }
      : null;
    return { fixture, prediction };
  });
}

// ---------------------------------------------------------------- track record

export async function getTrackRecord(): Promise<TrackRecordRow[]> {
  const d = await db();

  const preds = await d
    .collection("predictions")
    .find({ modelCorrect: { $ne: null } })
    .sort({ frozenAt: -1 })
    .limit(500) // last 500 settled — plenty for the page, fast query
    .toArray();

  if (preds.length === 0) return [];

  const matchIds = preds.map((p) => String(p.matchId));
  const matches = await d.collection("matches").find({ _id: { $in: matchIds as any[] } }).toArray();
  const matchById = new Map(matches.map((m) => [String(m._id), m]));

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teamDocs = await d.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray();
  const teamName = new Map(teamDocs.map((t) => [String(t._id), String(t.name)]));

  return preds
    .filter((p) => matchById.has(String(p.matchId)))
    .map((p) => {
      const m = matchById.get(String(p.matchId))!;
      return {
        fixture: {
          match_id: String(m._id),
          league: m.league as League,
          season: m.season as string,
          kickoff_utc: m.kickoffUtc as string,
          home_team: teamName.get(String(m.homeTeamId)) ?? (String(m.homeTeamId)),
          away_team: teamName.get(String(m.awayTeamId)) ?? (String(m.awayTeamId)),
        },
        prediction: {
          match_id: String(p.matchId),
          model_version: p.modelVersion as string,
          probs: p.probs as Prediction["probs"],
          pick: p.pick as Prediction["pick"],
          frozen_at: p.frozenAt as string,
          hash: p.hash as string,
          model_correct: p.modelCorrect as boolean,
        },
        result: {
          match_id: String(m._id),
          fthg: (m.score?.home ?? 0) as number,
          ftag: (m.score?.away ?? 0) as number,
          ftr: m.ftr as Result["ftr"],
        },
      };
    });
}

// ---------------------------------------------------------------- stats

export async function getStats(): Promise<LeagueStats[]> {
  const d = await db();

  const pipeline = [
    { $match: { modelCorrect: { $ne: null } } },
    {
      $lookup: {
        from: "matches",
        localField: "matchId",
        foreignField: "_id",
        as: "match",
      },
    },
    { $unwind: "$match" },
    {
      $group: {
        _id: "$match.league",
        settled: { $sum: 1 },
        correct: { $sum: { $cond: ["$modelCorrect", 1, 0] } },
      },
    },
  ];

  const rows = await d.collection("predictions").aggregate(pipeline).toArray();
  const totals = rows.reduce(
    (acc, r) => ({ settled: acc.settled + r.settled, correct: acc.correct + r.correct }),
    { settled: 0, correct: 0 }
  );

  const byLeague = new Map(rows.map((r) => [String(r._id), r]));

  const order: (League | "ALL")[] = ["ALL", "PL", "CH", "L1", "L2", "FAC", "LC", "CS"];

  return order
    .filter((k) => k === "ALL" ? totals.settled > 0 : byLeague.has(k))
    .map((league) => {
      const b = league === "ALL" ? totals : byLeague.get(league)!;
      return {
        league,
        settled: b.settled,
        correct: b.correct,
        accuracy: b.settled ? b.correct / b.settled : 0,
      };
    });
}

// ---------------------------------------------------------------- ev signals

export async function getEvSignals(): Promise<EvSignal[]> {
  const d = await db();
  const now = new Date().toISOString();
  const signals = await d
    .collection("ev_signals")
    .find({ settledResult: null, createdAt: { $gte: new Date(Date.now() - 86400_000).toISOString() } })
    .sort({ ev: -1 })
    .limit(20)
    .toArray();

  return signals.map((s) => ({
    match_id: String(s.matchId),
    selection: s.selection as EvSignal["selection"],
    model_prob: s.modelProb as number,
    market_prob: s.marketProb as number,
    best_price: s.bestPrice as number,
    best_bookmaker: s.bestBookmaker as string,
    ev: s.ev as number,
    created_at: s.createdAt as string,
  }));
}

// ---------------------------------------------------------------- articles

export async function getArticles(): Promise<Article[]> {
  const d = await db();
  const docs = await d
    .collection("articles")
    .find({})
    .sort({ publishedAt: -1 })
    .limit(20)
    .toArray();

  return docs.map((a) => ({
    slug: String(a._id),
    title: a.title as string,
    published_at: a.publishedAt as string,
    summary: a.summary as string,
  }));
}
