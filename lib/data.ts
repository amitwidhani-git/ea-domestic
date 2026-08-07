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
import type { Article, ArticleDetail, EvSignal, Fixture, League, LeagueStats, Prediction, Result, SettledEvSignal, TrackRecordRow } from "./types";

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
      home_team_id: String(m.homeTeamId),
      away_team_id: String(m.awayTeamId),
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
          home_team_id: String(m.homeTeamId),
          away_team_id: String(m.awayTeamId),
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
          penalty_score: m.penaltyScore
            ? { home: m.penaltyScore.home as number, away: m.penaltyScore.away as number }
            : null,
          status: m.status as string,
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

interface FixtureInfo { homeTeam: string; awayTeam: string; homeTeamId: string; awayTeamId: string; kickoffUtc: string }

// Shared by getEvSignals/getSettledEvSignals — resolves matchId -> display
// names + kickoff via a single matches+teams join instead of N+1 lookups.
async function attachFixtureInfo(d: Db, matchIds: string[]): Promise<Map<string, FixtureInfo>> {
  const uniqueIds = [...new Set(matchIds)];
  if (uniqueIds.length === 0) return new Map();

  const matches = await d.collection("matches").find({ _id: { $in: uniqueIds as any[] } }).toArray();
  const matchById = new Map(matches.map((m) => [String(m._id), m]));

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teamDocs = await d.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray();
  const teamName = new Map(teamDocs.map((t) => [String(t._id), String(t.name)]));

  const out = new Map<string, FixtureInfo>();
  for (const id of uniqueIds) {
    const m = matchById.get(id);
    out.set(id, {
      homeTeam: m ? teamName.get(String(m.homeTeamId)) ?? String(m.homeTeamId) : id,
      awayTeam: m ? teamName.get(String(m.awayTeamId)) ?? String(m.awayTeamId) : "",
      homeTeamId: m ? String(m.homeTeamId) : "",
      awayTeamId: m ? String(m.awayTeamId) : "",
      kickoffUtc: m ? (m.kickoffUtc as string) : "",
    });
  }
  return out;
}

// Every match gets one ev_signals doc per selection (home/draw/away), most of
// which are negative EV — i.e. not actually value. Without this floor the
// unsettled query includes that noise, which both crowds out other matches
// under the limit and shows multiple contradictory cards for the same fixture.
const MIN_EV = 0.05;

/**
 * Live (unsettled, positive-value) EV signals, shown in kickoff order (soonest
 * match first) so the page reads as "what's coming up", not a leaderboard.
 * kickoff_utc only exists after the matches join below, so candidate
 * selection happens by EV in Mongo (highest value, capped at 20) and the
 * final display order is applied afterwards once kickoff is known.
 */
export async function getEvSignals(): Promise<EvSignal[]> {
  const d = await db();
  const signals = await d
    .collection("ev_signals")
    .find({ settledResult: null, ev: { $gte: MIN_EV } })
    .sort({ ev: -1 })
    .limit(20)
    .toArray();

  const info = await attachFixtureInfo(d, signals.map((s) => String(s.matchId)));

  const rows = signals.map((s) => {
    const f = info.get(String(s.matchId));
    return {
      match_id: String(s.matchId),
      league: s.league as League,
      selection: s.selection as EvSignal["selection"],
      model_prob: s.modelProb as number,
      market_prob: s.marketProb as number,
      best_price: s.bestPrice as number,
      best_bookmaker: s.bestBookmaker as string,
      ev: s.ev as number,
      kelly_fraction: s.kellyFraction as number,
      book_count: s.bookCount as number,
      created_at: s.createdAt as string,
      home_team: f?.homeTeam ?? String(s.matchId),
      away_team: f?.awayTeam ?? "",
      home_team_id: f?.homeTeamId ?? "",
      away_team_id: f?.awayTeamId ?? "",
      kickoff_utc: f?.kickoffUtc ?? "",
    };
  });

  return rows.sort((a, b) => {
    if (!a.kickoff_utc) return 1; // unresolved fixtures sink to the bottom
    if (!b.kickoff_utc) return -1;
    if (a.kickoff_utc !== b.kickoff_utc) return a.kickoff_utc < b.kickoff_utc ? -1 : 1;
    return b.ev - a.ev; // same kickoff — higher edge first
  });
}

/** Settled EV signals (WIN/LOSE/VOID), most recent first — the public track record. */
export async function getSettledEvSignals(): Promise<SettledEvSignal[]> {
  const d = await db();
  const signals = await d
    .collection("ev_signals")
    .find({ settledResult: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  const info = await attachFixtureInfo(d, signals.map((s) => String(s.matchId)));

  return signals.map((s) => {
    const f = info.get(String(s.matchId));
    return {
      match_id: String(s.matchId),
      league: s.league as League,
      selection: s.selection as SettledEvSignal["selection"],
      best_price: s.bestPrice as number,
      best_bookmaker: s.bestBookmaker as string,
      ev: s.ev as number,
      created_at: s.createdAt as string,
      settled_result: s.settledResult as SettledEvSignal["settled_result"],
      home_team: f?.homeTeam ?? String(s.matchId),
      away_team: f?.awayTeam ?? "",
      home_team_id: f?.homeTeamId ?? "",
      away_team_id: f?.awayTeamId ?? "",
    };
  });
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
    slug: (a.slug as string) ?? String(a._id),
    title: a.title as string,
    published_at: a.publishedAt as string,
    summary: a.summary as string,
  }));
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const d = await db();
  const a = await d.collection("articles").findOne({ slug });
  if (!a) return null;

  return {
    slug: a.slug as string,
    title: a.title as string,
    dek: a.dek as string | undefined,
    published_at: a.publishedAt as string,
    updated_at: a.updatedAt as string | undefined,
    author: a.author as string | undefined,
    summary: a.summary as string,
    sections: (a.sections as ArticleDetail["sections"]) ?? [],
    disclaimer: a.disclaimer as string | undefined,
  };
}
