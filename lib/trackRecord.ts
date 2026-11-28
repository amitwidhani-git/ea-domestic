/**
 * Track Record data layer.
 *
 * Everything on the page is computed live from `predictions`, `matches` and
 * `odds_snapshots` (record stats, market comparison, pulse, integrity, Game
 * record). The weekly `track_record_snapshots` doc written by
 * build_track_record.py is still read for competition tiers, the deleted count
 * and as the market comparison's fallback.
 *
 * Everything returned here is plain JSON (strings/numbers/booleans) so it can
 * cross the server -> client boundary and sit in Next's data cache.
 */

import { unstable_cache } from "next/cache";
import { MongoClient, type Db } from "mongodb";
import { getDb, getPredictionCoverage } from "./data";
import { LEAGUES, LEAGUE_CODES } from "./leagues";
import type { League } from "./types";

export const TRACK_RECORD_TAG = "track-record";
export const MIN_SAMPLE = 20;
export const CHANCE_BASELINE = 33.3;
/** Market calls below this market probability are treated as likely odds-feed errors and hidden. */
const MIN_MARKET_CALL_PROB = 10;
/** EdgeIQ and the market "agree" on a shared wrong pick only while no outcome differs by this many points. */
const DIVERGENCE_THRESHOLD = 10;
const GAMES_PER_PAGE = 50;
const TZ = "Europe/London";

// ---------------------------------------------------------------- connection

declare global {
  // eslint-disable-next-line no-var
  var _eaTrackRecordClient: Promise<MongoClient> | undefined;
}

/**
 * Optional read-only connection (MONGODB_TRACK_RECORD_URI) for this page;
 * falls back to the site's shared connection when it isn't set.
 */
async function trDb(): Promise<Db> {
  const uri = process.env.MONGODB_TRACK_RECORD_URI;
  if (!uri) return getDb();
  if (!global._eaTrackRecordClient) {
    global._eaTrackRecordClient = new MongoClient(uri, { maxPoolSize: 3, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaTrackRecordClient.catch(() => {
      global._eaTrackRecordClient = undefined;
    });
  }
  const client = await global._eaTrackRecordClient;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

// ---------------------------------------------------------------- formatting

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const shortDateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ, timeZoneName: "short",
});
const dayTimeFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ, timeZoneName: "short",
});

/** Date-only strings ("2026-08-08") are calendar dates, so pin them to midday UTC to avoid any day shift. */
const asDate = (s: string) => new Date(s.length === 10 ? `${s}T12:00:00Z` : s);
// Newer ICU builds abbreviate September as "Sept"; keep every month to three letters.
const sep = (s: string) => s.replace(/\bSept\b/g, "Sep");
export const fmtDate = (s: string) => sep(dateFmt.format(asDate(s)));
const fmtShortDate = (s: string) => sep(shortDateFmt.format(asDate(s)));
const fmtDateTime = (s: string) => sep(dateTimeFmt.format(asDate(s)));
const fmtDayTime = (s: string) => sep(dayTimeFmt.format(asDate(s)));

function fmtRange(start: string, end: string): string {
  const s = asDate(start), e = asDate(end);
  return s.getUTCFullYear() === e.getUTCFullYear() ? `${fmtShortDate(start)} to ${fmtDate(end)}` : `${fmtDate(start)} to ${fmtDate(end)}`;
}

/** Monday of an ISO week ("2026-W31" -> "2026-07-27"). */
function isoWeekMonday(week: string): string | null {
  const m = week.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const mondayW1 = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400_000;
  return new Date(mondayW1 + (Number(m[2]) - 1) * 7 * 86400_000).toISOString().slice(0, 10);
}

const matchLabel = (s: string) => s.replace(/\s+vs\.?\s+/i, " v ");
const pct = (c: number, n: number) => (n ? (c / n) * 100 : 0);
const leagueName = (code: string, fallback: string) => (LEAGUES as Record<string, { name: string }>)[code]?.name ?? fallback;

// ---------------------------------------------------------------- snapshot

/** Snapshot doc as written by build_track_record.py (only the fields we read). */
export interface TrackRecordSnapshot {
  _id: string;
  generatedAt: string;
  period: { start: string; end: string; label?: string };
  overall: { correct: number; total: number; accuracy: number };
  by_league: { league: string; name: string; tier: string; correct: number; total: number; accuracy: number }[];
  confidence: { total: number; bands: { label: string; said: number; correct: number; total: number }[] };
  draws: { model_avg_prob: number; actual_rate: number; total: number };
  integrity: { logged: number; edited: number; deleted: number };
  model_vs_market: {
    total: number; model_correct: number; market_correct: number;
    aligned_correct: number; aligned_wrong: number;
    model_edge: number; market_edge: number; both_wrong_div: number;
    model_calls: { match: string; league: string; date: string; model_prob: number; market_prob_actual: number; divergence: number }[];
  };
  weekly_trend: { week: string; correct: number; total: number; accuracy: number }[];
}

export const SNAPSHOT_ID_RE = /^(all-time|\d{4}-W\d{2}|\d{4}-\d{2})$/;

export const getSnapshot = unstable_cache(
  async (id: string): Promise<TrackRecordSnapshot | null> => {
    if (!SNAPSHOT_ID_RE.test(id)) return null;
    const d = await trDb();
    const doc = await d.collection("track_record_snapshots").findOne({ _id: id as never });
    // JSON round-trip strips any BSON types (ObjectId/Date) before the doc crosses the cache/RSC boundary.
    return doc ? (JSON.parse(JSON.stringify(doc)) as TrackRecordSnapshot) : null;
  },
  ["track-record-snapshot"],
  { revalidate: 3600, tags: [TRACK_RECORD_TAG] }
);

// ---------------------------------------------------------------- live facts

export interface LiveFacts {
  logged: number;
  /** Predictions frozen at or after their match's kick-off. Computed, not stored. */
  editedAfterKickoff: number;
  lastLogged: { label: string; time: string; hash: string } | null;
  pulse: { locked: number; nextKickoff: string | null; awaiting: number; updated: string };
  updatedIso: string;
  recent: { matchId: string; label: string; correct: boolean }[];
  coverage: { predicting: number; totalFinished: number };
}

/** Matches in these states never kick off as scheduled, so their pending picks aren't "awaiting a result". */
const NOT_PLAYED = ["POSTPONED", "CANCELLED", "CANCELED", "ABANDONED", "SUSPENDED"];

async function teamNames(d: Db, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const docs = await d.collection("teams").find({ _id: { $in: unique as never[] } }, { projection: { name: 1 } }).toArray();
  return new Map(docs.map((t) => [String(t._id), String(t.name)]));
}

const withMatch = [
  { $lookup: { from: "matches", localField: "matchId", foreignField: "_id", as: "m" } },
  { $unwind: "$m" },
];

export const getLiveFacts = unstable_cache(
  async (): Promise<LiveFacts> => {
    const d = await trDb();
    const preds = d.collection("predictions");
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    const [integrity, latest, pending, recentRaw, coverage] = await Promise.all([
      // Both fields are "YYYY-MM-DDTHH:MM:SSZ" strings, so string comparison is chronological.
      preds.aggregate<{ before: number; after: number }>([
        ...withMatch,
        { $group: { _id: null, before: { $sum: { $cond: [{ $lt: ["$frozenAt", "$m.kickoffUtc"] }, 1, 0] } }, after: { $sum: { $cond: [{ $gte: ["$frozenAt", "$m.kickoffUtc"] }, 1, 0] } } } },
      ]).toArray(),
      preds.find({}, { projection: { matchId: 1, frozenAt: 1, hash: 1 } }).sort({ frozenAt: -1 }).limit(1).toArray(),
      preds.aggregate<{ upcoming: number; awaiting: number; next: string | null }>([
        { $match: { modelCorrect: null } },
        ...withMatch,
        { $match: { "m.status": { $nin: NOT_PLAYED } } },
        {
          $group: {
            _id: null,
            upcoming: { $sum: { $cond: [{ $gt: ["$m.kickoffUtc", nowIso] }, 1, 0] } },
            awaiting: { $sum: { $cond: [{ $lte: ["$m.kickoffUtc", nowIso] }, 1, 0] } },
            next: { $min: { $cond: [{ $gt: ["$m.kickoffUtc", nowIso] }, "$m.kickoffUtc", null] } },
          },
        },
      ]).toArray(),
      preds.aggregate<{ matchId: string; modelCorrect: boolean; m: { kickoffUtc: string; homeTeamId: string; awayTeamId: string } }>([
        { $match: { modelCorrect: { $in: [true, false] } } },
        ...withMatch,
        { $match: { "m.kickoffUtc": { $lte: nowIso } } },
        { $sort: { "m.kickoffUtc": -1, matchId: 1 } },
        { $limit: 20 },
        { $project: { matchId: 1, modelCorrect: 1, "m.kickoffUtc": 1, "m.homeTeamId": 1, "m.awayTeamId": 1 } },
      ]).toArray(),
      getPredictionCoverage(),
    ]);

    let lastLogged: LiveFacts["lastLogged"] = null;
    const last = latest[0];
    const lastMatch = last ? await d.collection("matches").findOne({ _id: last.matchId }, { projection: { homeTeamId: 1, awayTeamId: 1 } }) : null;
    const names = await teamNames(d, [
      ...recentRaw.flatMap((r) => [r.m.homeTeamId, r.m.awayTeamId]),
      ...(lastMatch ? [String(lastMatch.homeTeamId), String(lastMatch.awayTeamId)] : []),
    ]);
    const name = (id: string) => names.get(String(id)) ?? String(id);
    if (last && lastMatch) {
      lastLogged = {
        label: `${name(lastMatch.homeTeamId)} v ${name(lastMatch.awayTeamId)}`,
        time: fmtDateTime(String(last.frozenAt)),
        hash: String(last.hash ?? "").slice(0, 8),
      };
    }

    const p = pending[0];
    return {
      logged: integrity[0]?.before ?? 0,
      editedAfterKickoff: integrity[0]?.after ?? 0,
      lastLogged,
      pulse: {
        locked: p?.upcoming ?? 0,
        nextKickoff: p?.next ? fmtDayTime(p.next) : null,
        awaiting: p?.awaiting ?? 0,
        updated: fmtDateTime(nowIso),
      },
      updatedIso: nowIso,
      // Fetched newest-first to take the latest 20, then shown in kick-off order.
      recent: recentRaw
        .slice()
        .reverse()
        .map((r) => ({ matchId: r.matchId, label: `${name(r.m.homeTeamId)} v ${name(r.m.awayTeamId)}`, correct: r.modelCorrect })),
      coverage,
    };
  },
  ["track-record-live"],
  { revalidate: 300, tags: [TRACK_RECORD_TAG] }
);

// ---------------------------------------------------------------- live record stats

/**
 * Everything on the "Our record" tab, computed live from settled predictions
 * so new results appear within minutes rather than at the next snapshot.
 * Definitions mirror build_track_record.py (verified to reproduce the
 * snapshot exactly over its own period): bands by the pick's probability,
 * draws by the match's full-time result, weeks by ISO week of kick-off (UTC).
 */
export interface RecordStats {
  overall: { correct: number; total: number };
  byLeague: { code: string; c: number; n: number }[];
  bands: { band: string; said: number; c: number; n: number }[];
  draws: { modelAvg: number; actual: number; n: number };
  weekly: { week: string; c: number; n: number }[];
  first: string | null;
  last: string | null;
}

const BANDS = [
  { band: "Under 40%", min: 0, max: 0.4 },
  { band: "40 to 45%", min: 0.4, max: 0.45 },
  { band: "45 to 50%", min: 0.45, max: 0.5 },
  { band: "50 to 60%", min: 0.5, max: 0.6 },
  { band: "60% and up", min: 0.6, max: Infinity },
];

function isoWeek(iso: string): string {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3); // Thursday of this week decides the year
  const year = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((t.getTime() - jan4.getTime()) / 86400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const TOP_DIVISIONS = new Set(["PL", "SPL", "BL1", "DED", "FL1", "PD", "PPL", "SA"]);
/** Fallback tier for a competition the snapshot doesn't list yet (same grouping build_track_record.py uses). */
function tierOf(code: string): Tier {
  if (code === "WSL") return "women";
  if (code === "NL") return "international";
  if ((LEAGUES as Record<string, { isCup: boolean }>)[code]?.isCup) return "cup";
  return TOP_DIVISIONS.has(code) ? "top" : "lower";
}

export const getRecordStats = unstable_cache(
  async (): Promise<RecordStats> => {
    const d = await trDb();
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const rows = await d
      .collection("predictions")
      .aggregate<{ pick: "home" | "draw" | "away"; probs: Record<"home" | "draw" | "away", number>; ok: boolean; k: string; lg: string; ftr: string | null }>([
        { $match: { modelCorrect: { $in: [true, false] } } },
        { $project: { matchId: 1, pick: 1, probs: 1, modelCorrect: 1 } },
        { $lookup: { from: "matches", localField: "matchId", foreignField: "_id", as: "m", pipeline: [{ $project: { kickoffUtc: 1, league: 1, ftr: 1 } }] } },
        { $unwind: "$m" },
        // Same guard as lib/data.ts: a settled pick on a match that hasn't kicked off is a pipeline error, not a result.
        { $match: { "m.kickoffUtc": { $lte: nowIso } } },
        { $project: { _id: 0, pick: 1, probs: 1, ok: "$modelCorrect", k: "$m.kickoffUtc", lg: "$m.league", ftr: "$m.ftr" } },
      ])
      .toArray();

    const leagues = new Map<string, { c: number; n: number }>();
    const weeks = new Map<string, { c: number; n: number }>();
    const bands = BANDS.map((b) => ({ ...b, c: 0, n: 0, said: 0 }));
    let correct = 0, drawProb = 0, draws = 0;
    let first: string | null = null, last: string | null = null;

    for (const r of rows) {
      const hit = r.ok ? 1 : 0;
      correct += hit;
      const lg = leagues.get(r.lg) ?? { c: 0, n: 0 };
      lg.c += hit; lg.n++; leagues.set(r.lg, lg);
      const wk = isoWeek(r.k);
      const w = weeks.get(wk) ?? { c: 0, n: 0 };
      w.c += hit; w.n++; weeks.set(wk, w);
      const p = r.probs?.[r.pick] ?? 0;
      const b = bands.find((x) => p >= x.min && p < x.max);
      if (b) { b.c += hit; b.n++; b.said += p; }
      drawProb += r.probs?.draw ?? 0;
      if (r.ftr === "D") draws++;
      if (!first || r.k < first) first = r.k;
      if (!last || r.k > last) last = r.k;
    }

    const n = rows.length;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    return {
      overall: { correct, total: n },
      byLeague: [...leagues].map(([code, v]) => ({ code, ...v })),
      bands: bands.filter((b) => b.n > 0).map((b) => ({ band: b.band, said: round1((b.said / b.n) * 100), c: b.c, n: b.n })),
      draws: { modelAvg: n ? round1((drawProb / n) * 100) : 0, actual: n ? round1((draws / n) * 100) : 0, n },
      weekly: [...weeks].sort(([a], [b]) => (a < b ? -1 : 1)).map(([week, v]) => ({ week, ...v })),
      first,
      last,
    };
  },
  ["track-record-stats"],
  { revalidate: 300, tags: [TRACK_RECORD_TAG] }
);

// ---------------------------------------------------------------- live market comparison

/**
 * The "Compared against the market" tab, computed live. Definitions reproduce
 * build_track_record.py (within 1 to 3 matches per bucket over its 1 Aug to
 * 3 Oct snapshot): the market's probability for each outcome is the median of
 * the bookmakers' implied probabilities and its favourite is the highest;
 * "agree" is both right, or both wrong on the same pick with every outcome
 * within DIVERGENCE_THRESHOLD points; divergence is the largest gap on any outcome.
 *
 * One deliberate difference: only prices fetched before kick-off count.
 * odds_snapshots keeps each bookmaker's latest fetch, which for many finished
 * matches is an in-play price that already reflects the score (the script
 * counted those). Matches with no pre-kick-off price are left out.
 */
export interface MarketStats {
  total: number;
  modelCorrect: number;
  marketCorrect: number;
  aligned: { correct: number; wrong: number };
  diverged: { model: number; market: number; neither: number };
  /** Model right, market wrong, largest divergence first. Probabilities in %. */
  calls: { match: string; date: string; modelProb: number; marketProb: number; divergence: number }[];
  first: string | null;
  last: string | null;
}

const OUTCOMES = ["home", "draw", "away"] as const;
type Outcome3 = (typeof OUTCOMES)[number];
const FTR: Record<Outcome3, string> = { home: "H", draw: "D", away: "A" };

/** Exact median of an array field of `$pre` (sorted on the server). */
function medianOf(field: string) {
  return {
    $let: {
      vars: { s: { $sortArray: { input: { $map: { input: "$pre", in: `$$this.${field}` } }, sortBy: 1 } }, n: { $size: "$pre" } },
      in: {
        $cond: [
          { $eq: [{ $mod: ["$$n", 2] }, 1] },
          { $arrayElemAt: ["$$s", { $floor: { $divide: ["$$n", 2] } }] },
          { $avg: [{ $arrayElemAt: ["$$s", { $subtract: [{ $divide: ["$$n", 2] }, 1] }] }, { $arrayElemAt: ["$$s", { $divide: ["$$n", 2] }] }] },
        ],
      },
    },
  };
}

type MarketRow = {
  pick: Outcome3;
  probs: Record<Outcome3, number>;
  ok: boolean;
  m: { kickoffUtc: string; ftr: string; homeTeamId: string; awayTeamId: string };
  /** The market's probability per outcome: median implied probability across pre-kick-off prices. */
  kp: Record<Outcome3, number>;
};

export const getMarketStats = unstable_cache(
  async (): Promise<MarketStats> => {
    const d = await trDb();
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const [settled, market] = await Promise.all([
      d.collection("predictions")
        .aggregate<Omit<MarketRow, "kp"> & { matchId: string }>([
          { $match: { modelCorrect: { $in: [true, false] } } },
          { $project: { _id: 0, matchId: 1, pick: 1, probs: 1, ok: "$modelCorrect" } },
          { $lookup: { from: "matches", localField: "matchId", foreignField: "_id", as: "m", pipeline: [{ $project: { _id: 0, kickoffUtc: 1, ftr: 1, homeTeamId: 1, awayTeamId: 1 } }] } },
          { $unwind: "$m" },
          { $match: { "m.kickoffUtc": { $lte: nowIso }, "m.ftr": { $in: ["H", "D", "A"] } } },
        ])
        .toArray(),
      // Medians are taken on the server: reading the ~40k price rows out takes about a minute, and a
      // $lookup per price row ~20s; grouping by match first means one kick-off lookup per match (~2s).
      // Both timestamps are "YYYY-MM-DDTHH:MM:SSZ" strings, so string comparison is chronological.
      d.collection("odds_snapshots")
        .aggregate<{ _id: string } & Record<Outcome3, number>>([
          { $match: { impliedProbs: { $type: "object" } } },
          { $group: { _id: "$matchId", o: { $push: { f: "$fetchedAt", h: "$impliedProbs.home", d: "$impliedProbs.draw", a: "$impliedProbs.away" } } } },
          { $lookup: { from: "matches", localField: "_id", foreignField: "_id", as: "m", pipeline: [{ $project: { _id: 0, kickoffUtc: 1 } }] } },
          { $set: { pre: { $filter: { input: "$o", cond: { $lt: ["$$this.f", { $first: "$m.kickoffUtc" }] } } } } },
          { $match: { "pre.0": { $exists: true } } },
          { $project: { home: medianOf("h"), draw: medianOf("d"), away: medianOf("a") } },
        ])
        .toArray(),
    ]);
    const kpBy = new Map(market.map(({ _id, home, draw, away }) => [_id, { home, draw, away }]));
    const rows: MarketRow[] = settled.flatMap((r) => { const kp = kpBy.get(r.matchId); return kp ? [{ ...r, kp }] : []; });

    let modelCorrect = 0, marketCorrect = 0;
    const aligned = { correct: 0, wrong: 0 }, diverged = { model: 0, market: 0, neither: 0 };
    const callRows: (MarketRow & { div: number })[] = [];
    let first: string | null = null, last: string | null = null;

    for (const r of rows) {
      const kp = r.kp;
      const fav = OUTCOMES.reduce((a, b) => (kp[b] > kp[a] ? b : a), "home" as Outcome3);
      const mOk = r.ok, kOk = FTR[fav] === r.m.ftr;
      const div = Math.max(...OUTCOMES.map((k) => Math.abs((r.probs?.[k] ?? 0) - kp[k]))) * 100;
      modelCorrect += mOk ? 1 : 0;
      marketCorrect += kOk ? 1 : 0;
      if (mOk && kOk) aligned.correct++;
      else if (mOk) { diverged.model++; if (div >= DIVERGENCE_THRESHOLD) callRows.push({ ...r, div }); }
      else if (kOk) diverged.market++;
      else if (fav === r.pick && div < DIVERGENCE_THRESHOLD) aligned.wrong++;
      else diverged.neither++;
      if (!first || r.m.kickoffUtc < first) first = r.m.kickoffUtc;
      if (!last || r.m.kickoffUtc > last) last = r.m.kickoffUtc;
    }

    callRows.sort((a, b) => b.div - a.div).splice(20);
    const names = await teamNames(d, callRows.flatMap((r) => [r.m.homeTeamId, r.m.awayTeamId]));
    const name = (id: string) => names.get(String(id)) ?? String(id);
    const round1 = (v: number) => Math.round(v * 10) / 10;
    return {
      total: rows.length,
      modelCorrect,
      marketCorrect,
      aligned,
      diverged,
      calls: callRows.map((r) => ({
        match: `${name(r.m.homeTeamId)} v ${name(r.m.awayTeamId)}`,
        date: r.m.kickoffUtc.slice(0, 10),
        modelProb: round1((r.probs?.[r.pick] ?? 0) * 100),
        marketProb: round1(r.kp[r.pick] * 100),
        divergence: round1(r.div),
      })),
      first,
      last,
    };
  },
  ["track-record-market"],
  { revalidate: 900, tags: [TRACK_RECORD_TAG] }
);

// ---------------------------------------------------------------- report

export type Tier = "top" | "lower" | "cup" | "women" | "international";

export interface Report {
  /** When the live figures were last refreshed. */
  asOf: string;
  generatedAt: string;
  /** Range of kick-offs covered by the live "Our record" figures. */
  period: { start: string; end: string };
  /** Kick-offs covered by the market comparison. */
  marketPeriod: string;
  /** False when the live comparison was unavailable and the weekly snapshot was used instead. */
  marketLive: boolean;
  integrity: { logged: number; edited: number; deleted: number };
  lastLogged: LiveFacts["lastLogged"];
  unpredicted: { fixtures: number; withoutPick: number };
  overall: { correct: number; total: number };
  chanceBaseline: number;
  competitions: { code: string; name: string; tier: Tier; c: number; n: number }[];
  confidence: { sample: string; bands: { band: string; said: number; c: number; n: number }[] };
  draws: { modelAvg: number; actual: number; n: number };
  pulse: LiveFacts["pulse"] & { live: boolean };
  trend: {
    weeks: { wk: string; rate: number; c: number; n: number }[];
    /** Weeks under MIN_SAMPLE picks: left off the chart but listed beneath it. */
    small: { wk: string; c: number; n: number }[];
  };
  modelCalls: { match: string; date: string; marketProb: number; modelProb: number }[];
  market: {
    sample: string;
    model: { c: number; n: number };
    market: { c: number; n: number };
    aligned: { correct: number; wrong: number };
    diverged: { model: number; market: number; neither: number };
    /** Stays false until bookmaker prices are de-vigged (some stored rows have overrounds far outside a normal book). */
    edgeReady: boolean;
  };
  recent: LiveFacts["recent"];
}

export function buildReport(snap: TrackRecordSnapshot, live: LiveFacts, stats: RecordStats, liveMarket: MarketStats | null): Report {
  const mvm = snap.model_vs_market;
  // Live comparison when it has data; otherwise the last weekly snapshot, in the same shape.
  const useLive = !!(liveMarket?.total && liveMarket.first && liveMarket.last);
  const mk: MarketStats = useLive ? liveMarket! : {
    total: mvm.total,
    modelCorrect: mvm.model_correct,
    marketCorrect: mvm.market_correct,
    aligned: { correct: mvm.aligned_correct, wrong: mvm.aligned_wrong },
    diverged: { model: mvm.model_edge, market: mvm.market_edge, neither: mvm.both_wrong_div },
    calls: mvm.model_calls.map((m) => ({ match: matchLabel(m.match), date: m.date, modelProb: m.model_prob, marketProb: m.market_prob_actual, divergence: m.divergence })),
    first: snap.period.start,
    last: snap.period.end,
  };
  const marketRange = fmtRange(mk.first!.slice(0, 10), mk.last!.slice(0, 10));
  const liveRange = stats.first && stats.last ? fmtRange(stats.first, stats.last) : marketRange;
  // Prefer the pipeline's tier for each competition; fall back for any it doesn't list yet.
  const snapTier = new Map(snap.by_league.map((r) => [r.league, r.tier as Tier]));
  const weekRows = stats.weekly.map((w) => {
    const monday = isoWeekMonday(w.week);
    return { wk: monday ? fmtShortDate(monday) : w.week, rate: Math.round(pct(w.c, w.n)), c: w.c, n: w.n };
  });

  return {
    asOf: live.pulse.updated,
    generatedAt: live.updatedIso,
    period: { start: (stats.first ?? snap.period.start).slice(0, 10), end: (stats.last ?? snap.period.end).slice(0, 10) },
    marketPeriod: marketRange,
    marketLive: useLive,
    integrity: { logged: live.logged, edited: live.editedAfterKickoff, deleted: snap.integrity.deleted },
    lastLogged: live.lastLogged,
    unpredicted: { fixtures: live.coverage.totalFinished, withoutPick: Math.max(0, live.coverage.totalFinished - live.coverage.predicting) },
    overall: stats.overall,
    chanceBaseline: CHANCE_BASELINE,
    competitions: stats.byLeague
      .map((r) => ({ code: r.code, name: leagueName(r.code, r.code), tier: snapTier.get(r.code) ?? tierOf(r.code), c: r.c, n: r.n }))
      .sort((a, b) => LEAGUE_CODES.indexOf(a.code as League) - LEAGUE_CODES.indexOf(b.code as League)),
    confidence: { sample: `${stats.overall.total} matches, ${liveRange}`, bands: stats.bands },
    draws: stats.draws,
    pulse: { ...live.pulse, live: true },
    trend: {
      weeks: weekRows.filter((w) => w.n >= MIN_SAMPLE),
      small: weekRows.filter((w) => w.n < MIN_SAMPLE).map(({ wk, c, n }) => ({ wk, c, n })),
    },
    modelCalls: mk.calls
      .filter((m) => m.marketProb >= MIN_MARKET_CALL_PROB)
      .sort((a, b) => b.divergence - a.divergence)
      .slice(0, 3)
      .map((m) => ({ match: m.match, date: fmtShortDate(m.date), marketProb: Math.round(m.marketProb), modelProb: Math.round(m.modelProb) })),
    market: {
      sample: `${mk.total} matches, ${marketRange}`,
      model: { c: mk.modelCorrect, n: mk.total },
      market: { c: mk.marketCorrect, n: mk.total },
      aligned: mk.aligned,
      diverged: mk.diverged,
      edgeReady: false,
    },
    recent: live.recent,
  };
}

// ---------------------------------------------------------------- game record

export type GameOutcome = "all" | "correct" | "wrong";

export interface GameQuery {
  page: number;
  league: League | null;
  outcome: GameOutcome;
  team: string;
}

export interface GameRow {
  matchId: string;
  date: string;
  league: League;
  home: { id: string; name: string };
  away: { id: string; name: string };
  pick: "home" | "draw" | "away";
  pickLabel: string;
  prob: number;
  score: string;
  correct: boolean;
  loggedAt: string;
}

export interface GamePage {
  rows: GameRow[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
}

export function parseGameQuery(sp: Record<string, string | string[] | undefined>): GameQuery {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const page = Math.min(Math.max(parseInt(one("page"), 10) || 1, 1), 10_000);
  const lg = one("league");
  const out = one("result");
  return {
    page,
    league: (LEAGUE_CODES as string[]).includes(lg) ? (lg as League) : null,
    outcome: out === "correct" || out === "wrong" ? out : "all",
    team: one("team").trim().slice(0, 60),
  };
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getGameRecord = unstable_cache(
  async (q: GameQuery): Promise<GamePage> => {
    const d = await trDb();
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const empty: GamePage = { rows: [], total: 0, page: q.page, pages: 0, perPage: GAMES_PER_PAGE };

    let teamIds: string[] | null = null;
    if (q.team) {
      const found = await d.collection("teams").find({ name: { $regex: escapeRegex(q.team), $options: "i" } }, { projection: { _id: 1 } }).limit(100).toArray();
      teamIds = found.map((t) => String(t._id));
      if (!teamIds.length) return empty;
    }

    const matchFilter: Record<string, unknown> = { "m.kickoffUtc": { $lte: nowIso } };
    if (q.league) matchFilter["m.league"] = q.league;
    if (teamIds) matchFilter.$or = [{ "m.homeTeamId": { $in: teamIds } }, { "m.awayTeamId": { $in: teamIds } }];

    const [res] = await d
      .collection("predictions")
      .aggregate<{ rows: Record<string, any>[]; total: { n: number }[] }>([
        { $match: { modelCorrect: q.outcome === "correct" ? true : q.outcome === "wrong" ? false : { $in: [true, false] } } },
        { $project: { matchId: 1, pick: 1, probs: 1, frozenAt: 1, modelCorrect: 1 } },
        { $lookup: { from: "matches", localField: "matchId", foreignField: "_id", as: "m", pipeline: [{ $project: { league: 1, kickoffUtc: 1, homeTeamId: 1, awayTeamId: 1, score: 1, penaltyScore: 1 } }] } },
        { $unwind: "$m" },
        { $match: matchFilter },
        { $sort: { "m.kickoffUtc": -1, matchId: 1 } },
        { $facet: { rows: [{ $skip: (q.page - 1) * GAMES_PER_PAGE }, { $limit: GAMES_PER_PAGE }], total: [{ $count: "n" }] } },
      ])
      .toArray();

    const total = res?.total[0]?.n ?? 0;
    const raw = res?.rows ?? [];
    const names = await teamNames(d, raw.flatMap((r) => [String(r.m.homeTeamId), String(r.m.awayTeamId)]));

    const rows: GameRow[] = raw.map((r) => {
      const home = { id: String(r.m.homeTeamId), name: names.get(String(r.m.homeTeamId)) ?? String(r.m.homeTeamId) };
      const away = { id: String(r.m.awayTeamId), name: names.get(String(r.m.awayTeamId)) ?? String(r.m.awayTeamId) };
      const pick = r.pick as GameRow["pick"];
      const pens = r.m.penaltyScore ? ` (pens ${r.m.penaltyScore.home}-${r.m.penaltyScore.away})` : "";
      return {
        matchId: String(r.matchId),
        date: fmtDate(String(r.m.kickoffUtc)),
        league: r.m.league as League,
        home,
        away,
        pick,
        pickLabel: pick === "home" ? home.name : pick === "away" ? away.name : "Draw",
        prob: Math.round((r.probs?.[pick] ?? 0) * 100),
        score: `${r.m.score?.home ?? 0}-${r.m.score?.away ?? 0}${pens}`,
        correct: !!r.modelCorrect,
        loggedAt: fmtDateTime(String(r.frozenAt)),
      };
    });

    return { rows, total, page: q.page, pages: Math.ceil(total / GAMES_PER_PAGE), perPage: GAMES_PER_PAGE };
  },
  ["track-record-games"],
  { revalidate: 300, tags: [TRACK_RECORD_TAG] }
);
