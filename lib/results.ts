/**
 * Shared results loader used by /api/results, the Results page (initial SSR),
 * and the homepage "Recent Results" strip — so no route self-fetches.
 *
 * Reads settled fixtures from the `matches` collection and joins predictions +
 * settled ev_signals in a single aggregation. Stats (predictions / correct /
 * accuracy / EV P&L) are computed over the WHOLE filtered set, independent of
 * pagination, so the header strip stays correct as you "Load more".
 */
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

async function db(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClient.catch(() => { global._eaMongoClient = undefined; });
  }
  const client = await global._eaMongoClient;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

// Stored match status is only ever "SCHEDULED" or "FINISHED" — AET/penalty
// detail lives in penaltyScore/ftr, not the status field.
const FINISHED_STATUS = "FINISHED";

export type ResultsOutcome = "all" | "correct" | "wrong" | "none";

export interface ResultTeam { id: string; name: string; apiFootballId: number | null }
export interface ResultEvSignal {
  selection: string;
  ev: number;
  bestPrice: number | null;
  bestBookmaker: string | null;
  settledResult: "WIN" | "LOSE" | "VOID";
}
export interface ResultPrediction {
  pick: string | null;
  probs: { home: number; draw: number; away: number } | null;
  modelCorrect: boolean | null;
  frozenAt: string | null;
  hash: string | null;
}
export interface ResultRow {
  matchId: string;
  league: string;
  kickoffUtc: string;
  homeTeam: ResultTeam;
  awayTeam: ResultTeam;
  score: { home: number; away: number } | null;
  penaltyScore: { home: number; away: number } | null;
  status: string;
  ftr: "H" | "D" | "A";
  prediction: ResultPrediction | null;
  evSignals: ResultEvSignal[];
}
export interface ResultsStats {
  predictions: number;
  correct: number;
  accuracy: number; // 0–100
  pnl: number;      // units
}
export interface ResultsResponse {
  results: ResultRow[];
  total: number;
  limit: number;
  offset: number;
  stats: ResultsStats;
}

export interface ResultsQuery {
  leagues?: string[];
  from?: string;
  to?: string;
  outcome?: ResultsOutcome;
  limit?: number;
  offset?: number;
}

const startOfDay = (s: string) => (s.length <= 10 ? `${s}T00:00:00.000Z` : s);
const endOfDay = (s: string) => (s.length <= 10 ? `${s}T23:59:59.999Z` : s);

function deriveFtr(score: Doc | null | undefined, stored: unknown): "H" | "D" | "A" {
  if (stored === "H" || stored === "D" || stored === "A") return stored;
  const h = score?.home ?? 0, a = score?.away ?? 0;
  return h > a ? "H" : h < a ? "A" : "D";
}

const EMPTY: ResultsResponse = { results: [], total: 0, limit: 0, offset: 0, stats: { predictions: 0, correct: 0, accuracy: 0, pnl: 0 } };

export async function getResults(q: ResultsQuery = {}): Promise<ResultsResponse> {
  const d = await db();
  if (!d) return EMPTY;

  const limit = Math.min(Math.max(q.limit ?? 50, 1), 100);
  const offset = Math.max(q.offset ?? 0, 0);
  const outcome: ResultsOutcome = q.outcome ?? "all";

  const from = q.from ? startOfDay(q.from) : new Date(Date.now() - 30 * 86_400_000).toISOString();
  const to = q.to ? endOfDay(q.to) : new Date().toISOString();

  const matchStage: Doc = {
    status: FINISHED_STATUS,
    kickoffUtc: { $gte: from, $lte: to },
  };
  if (q.leagues && q.leagues.length > 0) matchStage.league = { $in: q.leagues };

  // per-signal P&L expression (WIN → price-1, LOSE → -1, VOID → 0)
  const signalPnl = {
    $switch: {
      branches: [
        { case: { $eq: ["$$s.settledResult", "WIN"] }, then: { $subtract: [{ $ifNull: ["$$s.bestPrice", 1] }, 1] } },
        { case: { $eq: ["$$s.settledResult", "LOSE"] }, then: -1 },
      ],
      default: 0,
    },
  };

  const pipeline: Doc[] = [
    { $match: matchStage },
    { $sort: { kickoffUtc: -1 } },
    { $lookup: { from: "predictions", localField: "_id", foreignField: "matchId", as: "pred" } },
    { $addFields: { pred: { $first: "$pred" } } },
  ];

  if (outcome === "correct") pipeline.push({ $match: { "pred.modelCorrect": true } });
  else if (outcome === "wrong") pipeline.push({ $match: { "pred.modelCorrect": false } });
  else if (outcome === "none") pipeline.push({ $match: { pred: null } });

  pipeline.push(
    {
      $lookup: {
        from: "ev_signals",
        let: { mid: "$_id" },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$matchId", "$$mid"] }, { $ne: ["$settledResult", null] }] } } }],
        as: "sigs",
      },
    },
    {
      $facet: {
        total: [{ $count: "n" }],
        rows: [{ $skip: offset }, { $limit: limit }],
        stats: [
          {
            $project: {
              hasPred: { $cond: [{ $ne: ["$pred", null] }, 1, 0] },
              correct: { $cond: [{ $eq: ["$pred.modelCorrect", true] }, 1, 0] },
              pnl: { $reduce: { input: "$sigs", initialValue: 0, in: { $add: ["$$value", { $let: { vars: { s: "$$this" }, in: signalPnl } }] } } },
            },
          },
          { $group: { _id: null, predictions: { $sum: "$hasPred" }, correct: { $sum: "$correct" }, pnl: { $sum: "$pnl" } } },
        ],
      },
    },
  );

  const agg = await d.collection("matches").aggregate(pipeline).toArray();
  const facet = agg[0] ?? { total: [], rows: [], stats: [] };
  const total: number = facet.total[0]?.n ?? 0;
  const rows: Doc[] = facet.rows ?? [];
  const statsRaw = facet.stats[0] ?? { predictions: 0, correct: 0, pnl: 0 };
  const stats: ResultsStats = {
    predictions: statsRaw.predictions ?? 0,
    correct: statsRaw.correct ?? 0,
    accuracy: statsRaw.predictions ? (statsRaw.correct / statsRaw.predictions) * 100 : 0,
    pnl: Math.round((statsRaw.pnl ?? 0) * 100) / 100,
  };

  // Resolve team display names + crests for the paged rows only.
  const teamIds = [...new Set(rows.flatMap((r) => [String(r.homeTeamId), String(r.awayTeamId)]))];
  const teams = teamIds.length ? await d.collection("teams").find({ _id: { $in: teamIds as never[] } }).toArray() : [];
  const teamById = new Map(teams.map((t) => [String(t._id), t]));
  const mapTeam = (id: string): ResultTeam => {
    const t = teamById.get(id);
    return { id, name: t ? String(t.name) : id, apiFootballId: t?.aliases?.apiFootball ?? null };
  };

  const results: ResultRow[] = rows.map((r) => {
    const p = r.pred;
    const sigs: Doc[] = (r.sigs ?? []).sort((a: Doc, b: Doc) => (b.ev ?? 0) - (a.ev ?? 0));
    return {
      matchId: String(r._id),
      league: r.league ?? null,
      kickoffUtc: r.kickoffUtc ?? null,
      homeTeam: mapTeam(String(r.homeTeamId)),
      awayTeam: mapTeam(String(r.awayTeamId)),
      score: r.score ?? null,
      penaltyScore: r.penaltyScore ?? null,
      status: r.status ?? null,
      ftr: deriveFtr(r.score, r.ftr),
      prediction: p
        ? {
            pick: p.pick ?? null,
            probs: p.probs ?? null,
            modelCorrect: p.modelCorrect ?? null,
            frozenAt: toIso(p.frozenAt),
            hash: p.hash ?? null,
          }
        : null,
      evSignals: sigs.map((s) => ({
        selection: s.selection,
        ev: s.ev ?? 0,
        bestPrice: s.bestPrice ?? null,
        bestBookmaker: s.bestBookmaker ?? null,
        settledResult: s.settledResult,
      })),
    };
  });

  return { results, total, limit, offset, stats };
}
