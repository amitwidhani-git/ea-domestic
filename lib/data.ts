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
import type { Article, ArticleDetail, EvOutcome, EvSignal, Fixture, League, LeagueStats, Prediction, Result, SettledEvSignal, TrackRecordRow, UpcomingFixtureWithSignal } from "./types";
import { resolveCtaAffiliates, getAffiliateList, pickRandomAffiliate, type CtaAffiliate } from "./affiliates";
import { LEAGUE_CODES } from "./leagues";
import { getLiveApiFixtures } from "./liveScores";

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
    // $in: [true, false] reliably matches settled predictions across drivers,
    // where { $ne: null } can behave inconsistently.
    .find({ modelCorrect: { $in: [true, false] } })
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
    })
    // The query above is ordered by frozenAt (when the pick was locked in),
    // which doesn't track kickoff order — predictions get frozen in batches
    // that don't line up with match date. Re-sort by the actual kickoff time
    // so "most recent" means the most recently played match, not the most
    // recently frozen pick.
    .sort((a, b) => (a.fixture.kickoff_utc < b.fixture.kickoff_utc ? 1 : a.fixture.kickoff_utc > b.fixture.kickoff_utc ? -1 : 0));
}

// ---------------------------------------------------------------- stats

export async function getStats(): Promise<LeagueStats[]> {
  const d = await db();

  const pipeline = [
    { $match: { modelCorrect: { $in: [true, false] } } },
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

  const order: (League | "ALL")[] = ["ALL", ...LEAGUE_CODES];

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

/**
 * Prediction coverage for the current season: how many of this season's played
 * (FINISHED) fixtures we made a settled prediction for. Season-scoped because the
 * matches collection also holds 20k+ historical finished fixtures — a bare
 * count of status:"FINISHED" would be meaningless here.
 */
export async function getPredictionCoverage(): Promise<{ predicting: number; totalFinished: number }> {
  const d = await db();
  const seasons = (await d.collection("matches").distinct("season", { status: "FINISHED" })).sort();
  const latest = seasons[seasons.length - 1];
  if (!latest) return { predicting: 0, totalFinished: 0 };

  const finished = await d
    .collection("matches")
    .find({ status: "FINISHED", season: latest }, { projection: { _id: 1 } })
    .toArray();
  const ids = finished.map((m) => m._id);
  const predicting = ids.length
    ? await d.collection("predictions").countDocuments({ matchId: { $in: ids as any[] }, modelCorrect: { $in: [true, false] } })
    : 0;

  return { predicting, totalFinished: finished.length };
}

// ---------------------------------------------------------------- ev signals

interface FixtureInfo {
  homeTeam: string; awayTeam: string; homeTeamId: string; awayTeamId: string; kickoffUtc: string;
  homeApiFootballId: number | null; awayApiFootballId: number | null;
}

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
  const teamApiFootballId = new Map(teamDocs.map((t) => [String(t._id), (t.aliases?.apiFootball as number | undefined) ?? null]));

  const out = new Map<string, FixtureInfo>();
  for (const id of uniqueIds) {
    const m = matchById.get(id);
    out.set(id, {
      homeTeam: m ? teamName.get(String(m.homeTeamId)) ?? String(m.homeTeamId) : id,
      awayTeam: m ? teamName.get(String(m.awayTeamId)) ?? String(m.awayTeamId) : "",
      homeTeamId: m ? String(m.homeTeamId) : "",
      awayTeamId: m ? String(m.awayTeamId) : "",
      kickoffUtc: m ? (m.kickoffUtc as string) : "",
      homeApiFootballId: m ? teamApiFootballId.get(String(m.homeTeamId)) ?? null : null,
      awayApiFootballId: m ? teamApiFootballId.get(String(m.awayTeamId)) ?? null : null,
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
 * Live (unsettled) value signals, one card per MATCH — not per selection.
 * A fixture often has more than one ev_signals doc clearing MIN_EV (e.g. both
 * an underdog win and the draw), which used to render as separate,
 * confusing cards for the same match. Now each match contributes its
 * model's own top pick (always shown) plus whichever selection has the
 * highest EV (`bestValue`, guaranteed to clear MIN_EV) — identical when the
 * model's pick is itself the best value, distinct otherwise.
 *
 * Shown in kickoff order (soonest match first) so the page reads as "what's
 * coming up", not a leaderboard. kickoff_utc only exists after the matches
 * join below, so candidate selection happens by EV in Mongo (highest value,
 * capped at 20 matches) and the final display order is applied afterwards.
 */
export async function getEvSignals(): Promise<EvSignal[]> {
  const d = await db();

  const candidates = await d
    .collection("ev_signals")
    .find({ settledResult: null, ev: { $gte: MIN_EV } })
    .sort({ ev: -1 })
    .toArray();
  const matchIds: string[] = [];
  for (const c of candidates) {
    const mid = String(c.matchId);
    if (!matchIds.includes(mid)) matchIds.push(mid);
    if (matchIds.length >= 20) break;
  }
  if (matchIds.length === 0) return [];

  const [allSignals, preds, info, snaps] = await Promise.all([
    d.collection("ev_signals").find({ matchId: { $in: matchIds as any[] } }).toArray(),
    d.collection("predictions").find({ matchId: { $in: matchIds as any[] } }).toArray(),
    attachFixtureInfo(d, matchIds),
    // Live odds snapshots — the same source the Compare-books drawer reads —
    // so the "Back" CTAs never show a price/bookmaker that's gone stale
    // relative to what's in the drawer underneath them.
    d.collection("odds_snapshots").find({ matchId: { $in: matchIds as any[] } }).toArray(),
  ]);

  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));
  const signalsByMatch = new Map<string, typeof allSignals>();
  for (const s of allSignals) {
    const mid = String(s.matchId);
    const bucket = signalsByMatch.get(mid);
    if (bucket) bucket.push(s); else signalsByMatch.set(mid, [s]);
  }
  const snapsByMatch = new Map<string, typeof snaps>();
  for (const snap of snaps) {
    const mid = String(snap.matchId);
    const bucket = snapsByMatch.get(mid);
    if (bucket) bucket.push(snap); else snapsByMatch.set(mid, [snap]);
  }

  // One affiliate-list fetch resolves both the live snapshot rows and every
  // stored bestBookmaker fallback in a single pass.
  const bookmakerKeys = [...snaps.map((s) => String(s.bookmaker)), ...allSignals.map((s) => String(s.bestBookmaker))];
  const ctaByBookmaker = await resolveCtaAffiliates(bookmakerKeys);

  function resolveOutcome(mid: string, doc: (typeof allSignals)[number]) {
    const selection = doc.selection as EvOutcome["selection"];

    // Default to the stored snapshot (may be stale) so there's always a value.
    let bestPrice = doc.bestPrice as number;
    let bestBookmaker = doc.bestBookmaker as string;
    let cta = ctaByBookmaker.get(bestBookmaker) ?? null;

    // Prefer the highest live price among bookmakers we actually have a real
    // (non-fallback) affiliate deal with — that's the only price a "Back"
    // click can honestly promise, and it's what Compare-books marks "Bet"-able.
    const liveGenuineRows = (snapsByMatch.get(mid) ?? [])
      .map((snap) => {
        const price = snap.prices?.[selection];
        return { bookmaker: String(snap.bookmaker), price: typeof price === "number" ? price : null, cta: ctaByBookmaker.get(String(snap.bookmaker)) ?? null };
      })
      .filter((r): r is { bookmaker: string; price: number; cta: CtaAffiliate } => r.price !== null && !!r.cta && !r.cta.isFallback);

    if (liveGenuineRows.length > 0) {
      const best = liveGenuineRows.reduce((a, b) => (b.price > a.price ? b : a));
      bestPrice = best.price;
      bestBookmaker = best.bookmaker;
      cta = best.cta;
    }

    const outcome: EvOutcome = {
      selection, model_prob: doc.modelProb as number, market_prob: doc.marketProb as number,
      ev: doc.ev as number, best_price: bestPrice, best_bookmaker: bestBookmaker, cta,
    };
    return outcome;
  }

  const rows: EvSignal[] = [];
  for (const mid of matchIds) {
    const docs = signalsByMatch.get(mid) ?? [];
    const pred = predByMatch.get(mid);
    if (!pred || docs.length === 0) continue; // can't show "model recommends" without a prediction

    const pick = pred.pick as "home" | "draw" | "away";
    const bestValueDoc = docs.reduce((a, b) => ((b.ev as number) > (a.ev as number) ? b : a));
    const modelDoc = docs.find((s) => s.selection === pick) ?? bestValueDoc;

    const f = info.get(mid);
    rows.push({
      match_id: mid,
      league: (bestValueDoc.league ?? modelDoc.league) as League,
      created_at: bestValueDoc.createdAt as string,
      home_team: f?.homeTeam ?? mid,
      away_team: f?.awayTeam ?? "",
      home_team_id: f?.homeTeamId ?? "",
      away_team_id: f?.awayTeamId ?? "",
      home_api_football_id: f?.homeApiFootballId ?? null,
      away_api_football_id: f?.awayApiFootballId ?? null,
      kickoff_utc: f?.kickoffUtc ?? "",
      model: resolveOutcome(mid, modelDoc),
      bestValue: resolveOutcome(mid, bestValueDoc),
      sameAsModel: modelDoc.selection === bestValueDoc.selection,
    });
  }

  return rows.sort((a, b) => {
    if (!a.kickoff_utc) return 1; // unresolved fixtures sink to the bottom
    if (!b.kickoff_utc) return -1;
    if (a.kickoff_utc !== b.kickoff_utc) return a.kickoff_utc < b.kickoff_utc ? -1 : 1;
    return b.bestValue.ev - a.bestValue.ev; // same kickoff — higher edge first
  });
}

// ---------------------------------------------------------------- live matches

export interface LiveMatchCard {
  matchId: string;
  league: League;
  homeTeam: string; awayTeam: string;
  homeTeamId: string; awayTeamId: string;
  homeApiFootballId: number | null; awayApiFootballId: number | null;
  score: { home: number; away: number } | null;
  elapsed: number | null;
  afStatus: string | null; // raw API-Football code (1H/HT/2H/…) for display
  modelPick: "home" | "draw" | "away" | null;
  modelProb: number | null;  // our model's probability of modelPick
  marketProb: number | null; // market-implied probability of that same outcome
  cta: CtaAffiliate | null;  // random Betano/LiveScoreBet split — no single "best bookmaker" for a live match
}

/**
 * Currently in-play matches for the homepage live bar, sourced from the same
 * real-time API-Football feed as /api/live-scores (not the match_stats
 * collection's `isLive` flag — that's written by a separate background
 * pipeline job that can lag several minutes behind actual kickoff). Empty
 * array (not an error) when nothing is live right now.
 */
export async function getLiveMatches(): Promise<LiveMatchCard[]> {
  const liveFixtures = await getLiveApiFixtures();
  if (liveFixtures.length === 0) return [];

  const d = await db();
  const apiIds = liveFixtures.map((f) => f.apiFixtureId);
  const matches = await d.collection("matches").find({ "sourceRefs.apiFootballFixtureId": { $in: apiIds } }).toArray();
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => String(m._id));
  const [preds, sigs, affiliateList] = await Promise.all([
    d.collection("predictions").find({ matchId: { $in: matchIds as any[] } }).toArray(),
    d.collection("ev_signals").find({ matchId: { $in: matchIds as any[] } }).toArray(),
    getAffiliateList(),
  ]);
  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));
  const sigByKey = new Map(sigs.map((s) => [`${s.matchId}:${s.selection}`, s]));

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teams = teamIds.length ? await d.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray() : [];
  const teamById = new Map(teams.map((t) => [String(t._id), t]));

  const fixtureByApiId = new Map(liveFixtures.map((f) => [f.apiFixtureId, f]));

  return matches.map((m): LiveMatchCard => {
    const mid = String(m._id);
    const apiId = m.sourceRefs?.apiFootballFixtureId as number | undefined;
    const live = apiId != null ? fixtureByApiId.get(apiId) : undefined;
    const p = predByMatch.get(mid);
    const pick = p?.pick as "home" | "draw" | "away" | undefined;
    const sig = pick ? sigByKey.get(`${mid}:${pick}`) : undefined;
    const homeId = String(m.homeTeamId);
    const awayId = String(m.awayTeamId);
    const homeTeam = teamById.get(homeId);
    const awayTeam = teamById.get(awayId);

    return {
      matchId: mid,
      league: (m.league ?? "PL") as League,
      homeTeam: homeTeam ? String(homeTeam.name) : homeId,
      awayTeam: awayTeam ? String(awayTeam.name) : awayId,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeApiFootballId: homeTeam?.aliases?.apiFootball ?? null,
      awayApiFootballId: awayTeam?.aliases?.apiFootball ?? null,
      score: live ? { home: live.homeScore ?? 0, away: live.awayScore ?? 0 } : null,
      elapsed: live?.elapsed ?? null,
      afStatus: live?.status ?? null,
      modelPick: pick ?? null,
      modelProb: pick && p?.probs ? (p.probs[pick] as number) : null,
      marketProb: sig ? (sig.marketProb as number) : null,
      cta: pickRandomAffiliate(affiliateList),
    };
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

/**
 * All SCHEDULED fixtures in the next 14 days, each joined to its prediction
 * (null until frozen) and its best value signal (highest EV, unsettled) — but
 * only when that best EV clears MIN_EV, so the "EV badge" means genuine value
 * rather than a raw best-of-three-selections that may be negative.
 */
export async function getUpcomingWithSignals(): Promise<UpcomingFixtureWithSignal[]> {
  const d = await db();
  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + 14 * 86400_000).toISOString();

  const matches = await d
    .collection("matches")
    .find({ status: "SCHEDULED", kickoffUtc: { $gte: now, $lte: horizon } })
    .sort({ kickoffUtc: 1 })
    .toArray();

  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m._id);

  const preds = await d.collection("predictions").find({ matchId: { $in: matchIds as any[] } }).toArray();
  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));

  const sigs = await d
    .collection("ev_signals")
    .find({ matchId: { $in: matchIds as any[] }, settledResult: null, ev: { $gte: MIN_EV } })
    .toArray();
  const bestSignalByMatch = new Map<string, (typeof sigs)[number]>();
  for (const s of sigs) {
    const mid = String(s.matchId);
    const cur = bestSignalByMatch.get(mid);
    if (!cur || (s.ev as number) > (cur.ev as number)) bestSignalByMatch.set(mid, s);
  }

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teamDocs = await d.collection("teams").find({ _id: { $in: teamIds as any[] } }).toArray();
  const teamName = new Map(teamDocs.map((t) => [String(t._id), String(t.name)]));
  const teamApiFootballId = new Map(teamDocs.map((t) => [String(t._id), (t.aliases?.apiFootball as number | undefined) ?? null]));

  return matches.map((m) => {
    const mid = String(m._id);
    const p = predByMatch.get(mid);
    const s = bestSignalByMatch.get(mid);
    const fixture: Fixture = {
      match_id: mid,
      league: m.league as League,
      season: m.season as string,
      kickoff_utc: m.kickoffUtc as string,
      home_team: teamName.get(String(m.homeTeamId)) ?? String(m.homeTeamId),
      away_team: teamName.get(String(m.awayTeamId)) ?? String(m.awayTeamId),
      home_team_id: String(m.homeTeamId),
      away_team_id: String(m.awayTeamId),
      home_api_football_id: teamApiFootballId.get(String(m.homeTeamId)) ?? null,
      away_api_football_id: teamApiFootballId.get(String(m.awayTeamId)) ?? null,
    };
    return {
      fixture,
      prediction: p
        ? {
            match_id: mid,
            model_version: p.modelVersion as string,
            probs: p.probs as Prediction["probs"],
            pick: p.pick as Prediction["pick"],
            frozen_at: p.frozenAt as string,
            hash: p.hash as string,
            model_correct: p.modelCorrect as boolean | null,
          }
        : null,
      bestSignal: s
        ? {
            selection: s.selection as "home" | "draw" | "away",
            ev: s.ev as number,
            best_price: s.bestPrice as number,
            best_bookmaker: s.bestBookmaker as string,
          }
        : null,
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
