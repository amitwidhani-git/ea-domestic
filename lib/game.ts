/**
 * EdgeIQ Challenge — community prediction game (Phase 1 / Option B).
 * Reads matches/predictions/teams (owned by lib/data.ts et al.) but owns two
 * new collections: `users` (game players — unrelated to any site auth, there
 * isn't one yet) and `user_picks`.
 *
 * No cron infrastructure exists for the "weekly reset every Monday 00:00 UTC"
 * rule, so it's implemented lazily: every user doc carries `weekStart` (the
 * Monday ISO date its `weeklyPts` were last accumulated against). Anywhere
 * weeklyPts is read or ranked, it's compared against the *current* week's
 * Monday and treated as 0 if the stored week has passed — no scheduled job
 * needed, and it's always correct at read time.
 */
import { MongoClient, type Db } from "mongodb";
import type { League } from "./leagues";

declare global {
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClient.catch(() => { global._eaMongoClient = undefined; });
  }
  return global._eaMongoClient;
}

async function db(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

export const GAME_COOKIE = "edgeiq_user_id";
type Selection = "home" | "draw" | "away";

// ---------------------------------------------------------------- schema

export interface GameUser {
  _id: string;
  email: string;
  displayName: string;
  joinedAt: string;
  weeklyPts: number;
  seasonPts: number;
  streak: number;
  beatenEdgeIQ: number; // Phase 2 — always 0 for now
  /** Monday-00:00-UTC ISO date weeklyPts was last accumulated against — see file header. */
  weekStart: string;
  /** Settled-pick counters, for leaderboard "Picks/Correct/Accuracy" columns. */
  totalPicks: number;
  totalCorrect: number;
}

export interface UserPick {
  _id: string; // `${userId}-${matchId}`
  userId: string;
  matchId: string;
  pick: Selection;
  submittedAt: string;
  points: number | null;
  correct: boolean | null;
  beatenEdgeIQ: boolean | null; // Phase 2 — always null for now
}

// ---------------------------------------------------------------- helpers

/** ISO date (midnight UTC) of the Monday on/before `d`. */
export function mondayWeekStartIso(d = new Date()): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - diffToMonday);
  return utc.toISOString();
}

/** weeklyPts if the user has played since this week's Monday reset, else 0 (the lazy rollover). */
export function effectiveWeeklyPts(user: { weeklyPts: number; weekStart: string }): number {
  return user.weekStart === mondayWeekStartIso() ? user.weeklyPts : 0;
}

function ftrToResult(ftr: unknown): Selection | null {
  if (ftr === "H") return "home";
  if (ftr === "D") return "draw";
  if (ftr === "A") return "away";
  return null;
}

/** Actual result of a finished match — prefers the stored ftr, falls back to the score. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resultFromMatch(m: Record<string, any>): Selection | null {
  const fromFtr = ftrToResult(m.ftr);
  if (fromFtr) return fromFtr;
  const home = m.score?.home, away = m.score?.away;
  if (typeof home !== "number" || typeof away !== "number") return null;
  return home > away ? "home" : home < away ? "away" : "draw";
}

function stripEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------- users

export async function registerUser(email: string, displayName: string): Promise<{ userId: string; displayName: string } | { error: string }> {
  const cleanEmail = stripEmail(email);
  const cleanName = displayName.trim();
  if (!cleanEmail || !cleanEmail.includes("@")) return { error: "Enter a valid email address." };
  if (!cleanName) return { error: "Enter a display name." };
  if (cleanName.length > 30) return { error: "Display name must be 30 characters or fewer." };

  const d = await db();
  const existing = await d.collection<GameUser>("users").findOne({ email: cleanEmail });
  if (existing) return { userId: String(existing._id), displayName: existing.displayName ?? cleanName };

  const user: GameUser = {
    _id: crypto.randomUUID(),
    email: cleanEmail,
    displayName: cleanName,
    joinedAt: new Date().toISOString(),
    weeklyPts: 0,
    seasonPts: 0,
    streak: 0,
    beatenEdgeIQ: 0,
    weekStart: mondayWeekStartIso(),
    totalPicks: 0,
    totalCorrect: 0,
  };
  await d.collection<GameUser>("users").insertOne(user);
  return { userId: user._id, displayName: user.displayName };
}

export async function getUserById(userId: string): Promise<GameUser | null> {
  if (!userId) return null;
  const d = await db();
  return d.collection<GameUser>("users").findOne({ _id: userId });
}

// ---------------------------------------------------------------- picks feed

export interface GamePickCard {
  matchId: string;
  league: League;
  kickoffUtc: string;
  homeTeam: string; awayTeam: string;
  homeTeamId: string; awayTeamId: string;
  homeApiFootballId: number | null; awayApiFootballId: number | null;
  status: string; // SCHEDULED | LIVE | FINISHED
  locked: boolean; // kickoff has passed
  score: { home: number; away: number } | null;
  edgeIQ: { pick: Selection; probs: { home: number; draw: number; away: number } } | null;
  userPick: Selection | null;
  /** Only present once the user has picked this match. */
  crowd: { home: number; draw: number; away: number; total: number } | null;
  /** Only meaningful once status is FINISHED. */
  result: { pick: Selection; correct: boolean; points: number } | null;
  edgeIQCorrect: boolean | null;
}

/**
 * This week's fixtures (Monday 00:00 UTC through the following Monday), each
 * joined to EdgeIQ's frozen prediction, this user's own pick (if any), the
 * crowd's pick distribution (only once the user has picked), and — once
 * finished — the settled result. Powers both the Upcoming and Results tabs
 * from one call.
 */
export async function getWeekPickCards(userId: string | null): Promise<GamePickCard[]> {
  const d = await db();
  const weekStart = mondayWeekStartIso();
  const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 86_400_000).toISOString();
  const nowIso = new Date().toISOString();

  const matches = await d.collection("matches")
    .find({ kickoffUtc: { $gte: weekStart, $lt: weekEnd } })
    .sort({ kickoffUtc: 1 })
    .toArray();
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => String(m._id));
  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];

  const [preds, teams, userPicks, oddsMatchIds] = await Promise.all([
    d.collection("predictions").find({ matchId: { $in: matchIds } }).toArray(),
    d.collection("teams").find({ _id: { $in: teamIds as never[] } }).toArray(),
    userId ? d.collection<UserPick>("user_picks").find({ userId, matchId: { $in: matchIds } }).toArray() : Promise.resolve([]),
    d.collection("odds_snapshots").distinct("matchId", { matchId: { $in: matchIds } }),
  ]);

  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));
  const teamById = new Map(teams.map((t) => [String(t._id), t]));
  const userPickByMatch = new Map(userPicks.map((p) => [p.matchId, p]));
  const hasOdds = new Set(oddsMatchIds as string[]);

  // Only worth showing a match if it's a real, playable pick: EdgeIQ has
  // frozen a prediction and the market has odds. A match that's already
  // finished stays visible regardless (it's history/results, not a pick
  // opportunity) — but nothing not-yet-locked without both gets offered.
  const playableMatches = matches.filter((m) => {
    if (m.status === "FINISHED") return true;
    const mid = String(m._id);
    return predByMatch.has(mid) && hasOdds.has(mid);
  });

  // Crowd distribution only needs computing for matches the user has actually
  // picked (per spec — it's a reveal-after-you-play mechanic).
  const pickedMatchIds = userPicks.map((p) => p.matchId);
  const crowdCounts = pickedMatchIds.length
    ? await d.collection("user_picks").aggregate([
        { $match: { matchId: { $in: pickedMatchIds } } },
        { $group: { _id: { matchId: "$matchId", pick: "$pick" }, n: { $sum: 1 } } },
      ]).toArray()
    : [];
  const crowdByMatch = new Map<string, { home: number; draw: number; away: number; total: number }>();
  for (const row of crowdCounts) {
    const mid = row._id.matchId as string;
    const bucket = crowdByMatch.get(mid) ?? { home: 0, draw: 0, away: 0, total: 0 };
    bucket[row._id.pick as Selection] += row.n as number;
    bucket.total += row.n as number;
    crowdByMatch.set(mid, bucket);
  }

  return playableMatches.map((m) => {
    const mid = String(m._id);
    const homeId = String(m.homeTeamId), awayId = String(m.awayTeamId);
    const homeTeam = teamById.get(homeId), awayTeam = teamById.get(awayId);
    const pred = predByMatch.get(mid);
    const userPick = userPickByMatch.get(mid);
    const locked = (m.kickoffUtc as string) <= nowIso;
    const finished = m.status === "FINISHED";
    const actualResult = finished ? resultFromMatch(m) : null;

    return {
      matchId: mid,
      league: m.league as League,
      kickoffUtc: m.kickoffUtc as string,
      homeTeam: homeTeam ? String(homeTeam.name) : homeId,
      awayTeam: awayTeam ? String(awayTeam.name) : awayId,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeApiFootballId: homeTeam?.aliases?.apiFootball ?? null,
      awayApiFootballId: awayTeam?.aliases?.apiFootball ?? null,
      status: m.status as string,
      locked,
      score: m.score?.home != null && m.score?.away != null ? { home: m.score.home, away: m.score.away } : null,
      edgeIQ: pred ? { pick: pred.pick as Selection, probs: pred.probs as { home: number; draw: number; away: number } } : null,
      userPick: userPick?.pick ?? null,
      crowd: userPick ? crowdByMatch.get(mid) ?? { home: 0, draw: 0, away: 0, total: 0 } : null,
      result: actualResult && userPick
        ? { pick: userPick.pick, correct: userPick.pick === actualResult, points: userPick.pick === actualResult ? 3 : 0 }
        : null,
      edgeIQCorrect: actualResult && pred ? pred.pick === actualResult : null,
    };
  });
}

export async function submitPick(userId: string, matchId: string, pick: Selection): Promise<{ crowd: { home: number; draw: number; away: number; total: number } } | { error: string }> {
  if (!["home", "draw", "away"].includes(pick)) return { error: "Invalid pick." };

  const d = await db();
  const match = await d.collection("matches").findOne({ _id: matchId as never });
  if (!match) return { error: "Match not found." };
  if ((match.kickoffUtc as string) <= new Date().toISOString()) return { error: "This match has already kicked off — picks are locked." };

  const pickId = `${userId}-${matchId}`;
  const existing = await d.collection<UserPick>("user_picks").findOne({ _id: pickId });
  if (existing) return { error: "You've already picked this match." };

  const doc: UserPick = {
    _id: pickId, userId, matchId, pick,
    submittedAt: new Date().toISOString(),
    points: null, correct: null, beatenEdgeIQ: null,
  };
  try {
    await d.collection<UserPick>("user_picks").insertOne(doc);
  } catch {
    return { error: "You've already picked this match." };
  }

  const counts = await d.collection("user_picks").aggregate([
    { $match: { matchId } },
    { $group: { _id: "$pick", n: { $sum: 1 } } },
  ]).toArray();
  const crowd = { home: 0, draw: 0, away: 0, total: 0 };
  for (const c of counts) { crowd[c._id as Selection] = c.n as number; crowd.total += c.n as number; }
  return { crowd };
}

// ---------------------------------------------------------------- settlement

/** Scores every unsettled pick for one finished match, and rolls each picker's points/streak forward. Idempotent. */
export async function settleMatch(matchId: string): Promise<{ settled: number }> {
  const d = await db();
  const match = await d.collection("matches").findOne({ _id: matchId as never });
  if (!match || match.status !== "FINISHED") return { settled: 0 };

  const result = resultFromMatch(match);
  if (!result) return { settled: 0 };

  const picks = await d.collection<UserPick>("user_picks").find({ matchId, correct: null }).toArray();
  const weekStart = mondayWeekStartIso();

  let settled = 0;
  for (const p of picks) {
    const correct = p.pick === result;
    const points = correct ? 3 : 0;
    await d.collection<UserPick>("user_picks").updateOne({ _id: p._id }, { $set: { correct, points } });

    const user = await d.collection<GameUser>("users").findOne({ _id: p.userId });
    if (!user) continue;
    const carriedWeeklyPts = user.weekStart === weekStart ? user.weeklyPts : 0;
    await d.collection<GameUser>("users").updateOne({ _id: p.userId }, {
      $set: {
        weeklyPts: carriedWeeklyPts + points,
        weekStart,
        streak: correct ? (user.streak ?? 0) + 1 : 0,
      },
      $inc: { seasonPts: points, totalPicks: 1, totalCorrect: correct ? 1 : 0 },
    });
    settled++;
  }
  return { settled };
}

// ---------------------------------------------------------------- leaderboard

export interface LeaderboardRow {
  userId: string; displayName: string;
  picks: number; correct: number; accuracy: number;
  points: number; streak: number;
}

export async function getLeaderboard(
  type: "weekly" | "season", page: number, limit: number, viewerUserId: string | null,
): Promise<{ rows: LeaderboardRow[]; total: number; viewerRank: number | null; edgeIQ: { correct: number; settled: number; accuracy: number } }> {
  const d = await db();
  const weekStart = mondayWeekStartIso();
  const pointsField = type === "weekly"
    ? { $cond: [{ $eq: ["$weekStart", weekStart] }, "$weeklyPts", 0] }
    : "$seasonPts";

  const base = [
    { $addFields: { rankPoints: pointsField } },
    { $sort: { rankPoints: -1 as const, seasonPts: -1 as const } },
  ];

  const [rows, total, viewer, edgeIQAgg] = await Promise.all([
    d.collection<GameUser>("users").aggregate<GameUser & { rankPoints: number }>([
      ...base,
      { $skip: Math.max(0, (page - 1) * limit) },
      { $limit: limit },
    ]).toArray(),
    d.collection("users").countDocuments({}),
    viewerUserId ? d.collection<GameUser>("users").findOne({ _id: viewerUserId }) : Promise.resolve(null),
    // EdgeIQ's own overall settled accuracy — same "ALL" total the Track Record page shows.
    d.collection("predictions").aggregate([
      { $match: { modelCorrect: { $in: [true, false] } } },
      { $group: { _id: null, settled: { $sum: 1 }, correct: { $sum: { $cond: ["$modelCorrect", 1, 0] } } } },
    ]).toArray(),
  ]);

  let viewerRank: number | null = null;
  if (viewer) {
    const viewerPoints = type === "weekly" ? effectiveWeeklyPts(viewer) : viewer.seasonPts;
    viewerRank = 1 + await d.collection<GameUser>("users").countDocuments({
      $expr: { $gt: [type === "weekly" ? pointsField : "$seasonPts", viewerPoints] },
    });
  }

  const edgeIQTotals = edgeIQAgg[0] as { settled?: number; correct?: number } | undefined;
  const edgeIQSettled = edgeIQTotals?.settled ?? 0;
  const edgeIQCorrect = edgeIQTotals?.correct ?? 0;

  return {
    rows: rows.map((u) => ({
      userId: String(u._id),
      displayName: u.displayName ?? "Anonymous",
      picks: u.totalPicks ?? 0,
      correct: u.totalCorrect ?? 0,
      accuracy: u.totalPicks ? (u.totalCorrect ?? 0) / u.totalPicks : 0,
      points: u.rankPoints,
      streak: u.streak ?? 0,
    })),
    total,
    viewerRank,
    edgeIQ: { correct: edgeIQCorrect, settled: edgeIQSettled, accuracy: edgeIQSettled ? edgeIQCorrect / edgeIQSettled : 0 },
  };
}

// ---------------------------------------------------------------- profile

export interface GameProfileHistoryRow {
  matchId: string; homeTeam: string; awayTeam: string; kickoffUtc: string;
  pick: Selection; correct: boolean | null; points: number | null;
  edgeIQPick: Selection | null; edgeIQAgreed: boolean | null;
}

export interface GameProfile {
  user: { displayName: string; joinedAt: string; seasonPts: number; weeklyPts: number; streak: number };
  picks: number; correct: number; accuracy: number;
  agreedWithEdgeIQPct: number | null;
  beatenEdgeIQ: number;
  history: GameProfileHistoryRow[];
}

export async function getGameProfile(userId: string): Promise<GameProfile | null> {
  const d = await db();
  const user = await d.collection<GameUser>("users").findOne({ _id: userId });
  if (!user) return null;

  const picks = await d.collection<UserPick>("user_picks").find({ userId }).sort({ submittedAt: -1 }).limit(200).toArray();
  const matchIds = picks.map((p) => p.matchId);
  const [matches, preds] = await Promise.all([
    matchIds.length ? d.collection("matches").find({ _id: { $in: matchIds as never[] } }).toArray() : Promise.resolve([]),
    matchIds.length ? d.collection("predictions").find({ matchId: { $in: matchIds } }).toArray() : Promise.resolve([]),
  ]);
  const matchById = new Map(matches.map((m) => [String(m._id), m]));
  const predByMatch = new Map(preds.map((p) => [String(p.matchId), p]));
  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teams = teamIds.length ? await d.collection("teams").find({ _id: { $in: teamIds as never[] } }).toArray() : [];
  const teamName = new Map(teams.map((t) => [String(t._id), String(t.name)]));

  let agreedCount = 0, comparableCount = 0;
  const history: GameProfileHistoryRow[] = picks
    .filter((p) => matchById.has(p.matchId))
    .map((p) => {
      const m = matchById.get(p.matchId)!;
      const pred = predByMatch.get(p.matchId);
      const edgeIQPick = (pred?.pick as Selection | undefined) ?? null;
      if (edgeIQPick) {
        comparableCount++;
        if (edgeIQPick === p.pick) agreedCount++;
      }
      return {
        matchId: p.matchId,
        homeTeam: teamName.get(String(m.homeTeamId)) ?? String(m.homeTeamId),
        awayTeam: teamName.get(String(m.awayTeamId)) ?? String(m.awayTeamId),
        kickoffUtc: m.kickoffUtc as string,
        pick: p.pick,
        correct: p.correct,
        points: p.points,
        edgeIQPick,
        edgeIQAgreed: edgeIQPick ? edgeIQPick === p.pick : null,
      };
    });

  return {
    user: { displayName: user.displayName, joinedAt: user.joinedAt, seasonPts: user.seasonPts, weeklyPts: effectiveWeeklyPts(user), streak: user.streak ?? 0 },
    picks: user.totalPicks ?? 0,
    correct: user.totalCorrect ?? 0,
    accuracy: user.totalPicks ? (user.totalCorrect ?? 0) / user.totalPicks : 0,
    agreedWithEdgeIQPct: comparableCount ? agreedCount / comparableCount : null,
    beatenEdgeIQ: user.beatenEdgeIQ ?? 0,
    history,
  };
}

/** Homepage teaser: total players + this week's current #1 (by effective weekly points). */
export async function getGameTeaserStats(): Promise<{ players: number; topPlayer: string | null }> {
  const d = await db();
  const weekStart = mondayWeekStartIso();
  const [players, top] = await Promise.all([
    d.collection("users").countDocuments({}),
    d.collection<GameUser>("users").aggregate([
      { $addFields: { rankPoints: { $cond: [{ $eq: ["$weekStart", weekStart] }, "$weeklyPts", 0] } } },
      { $match: { rankPoints: { $gt: 0 } } },
      { $sort: { rankPoints: -1 } },
      { $limit: 1 },
    ]).toArray(),
  ]);
  return { players, topPlayer: (top[0] as GameUser | undefined)?.displayName ?? null };
}
