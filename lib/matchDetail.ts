/**
 * Shared match-detail loader used by both /api/matches/[matchId] and the
 * server-rendered match page, so neither self-fetches nor duplicates the query.
 * match_stats / head2head collections may not exist yet — those sections
 * degrade to null/[] (a query on a missing collection returns nothing).
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

export type Side = "home" | "away";

export interface MatchTeam {
  id: string;
  name: string;
  elo: number | null;
  league: string | null;
  apiFootballId: number | null;
  att: number | null;
  deff: number | null;
  coach: string | null;
  venue: string | null;
}

export interface FormResult {
  matchId: string;
  opponent: string;
  homeOrAway: "H" | "A";
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
}

export type SquadPosition = "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";
export interface SquadPlayer {
  playerId: number | null;
  name: string | null;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
}
export interface TeamSquad {
  players: SquadPlayer[];
  byPosition: Record<SquadPosition, SquadPlayer[]>;
  totalPlayers: number | null;
}

export interface MatchPrediction {
  match_id: string;
  model_version: string | null;
  probs: { home: number; draw: number; away: number } | null;
  pick: "home" | "draw" | "away" | null;
  frozen_at: string | null;
  hash: string | null;
  model_correct: boolean | null;
}

export interface MatchEvSignal {
  selection: "home" | "draw" | "away";
  ev: number;
  model_prob: number | null;
  market_prob: number | null;
  best_price: number | null;
  best_bookmaker: string | null;
  kelly_fraction: number | null;
  book_count: number | null;
  settled_result: string | null;
  created_at: string | null;
}

export interface MatchEvent {
  minute: number | null;
  side: Side | null;
  type: string | null;    // goal | card | subst
  detail: string | null;  // "Normal Goal" | "Yellow Card" | "Red Card" | "Penalty" | "Own Goal" ...
  player: string | null;
  assist: string | null;
}

export interface LineupPlayer { number: number | null; name: string | null; pos: string | null; rating: number | string | null }
export interface LineupTeam { formation: string | null; coach: string | null; startXI: LineupPlayer[]; substitutes: LineupPlayer[] }

export interface H2HMeeting {
  date: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
}

export interface MatchInjury {
  playerName: string | null; position: string | null; injuryType: string | null;
  severity: string | null; reason: string | null; updatedAt: string | null;
}
export interface MatchNews { title: string | null; url: string | null; published_at: string | null; source: string | null; summary: string | null }

export interface MatchDetail {
  fixture: {
    matchId: string;
    league: string | null;
    kickoffUtc: string | null;
    status: string | null;      // normalised: SCHEDULED | LIVE | FINISHED
    afStatus: string | null;    // raw API-Football code for display: FT | AET | PEN | HT | 1H …
    elapsed: number | null;
    score: { home: number; away: number } | null;
    penaltyScore: { home: number; away: number } | null;
    venue: string | null;
    referee: string | null;
    apiFootballFixtureId: number | null;
  };
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  prediction: MatchPrediction | null;
  evSignals: MatchEvSignal[];
  stats: { home: Record<string, number | string>; away: Record<string, number | string> } | null;
  events: MatchEvent[];
  lineups: { home: LineupTeam; away: LineupTeam } | null;
  playerStats: Doc[];
  homeInjuries: MatchInjury[];
  awayInjuries: MatchInjury[];
  homeNews: MatchNews[];
  awayNews: MatchNews[];
  headToHead: { meetings: H2HMeeting[]; homeWins: number; draws: number; awayWins: number } | null;
  homeForm: FormResult[];
  awayForm: FormResult[];
  homeSquad: TeamSquad | null;
  awaySquad: TeamSquad | null;
}

function mapTeam(id: string, t: Doc | undefined, att: number | null, deff: number | null): MatchTeam {
  return {
    id,
    name: t ? String(t.name) : id,
    elo: t?.elo ?? null,
    league: t?.league ?? null,
    apiFootballId: t?.aliases?.apiFootball ?? null,
    att,
    deff,
    coach: t?.coach ?? null,
    venue: t?.venue ?? null,
  };
}

// Last `limit` FINISHED matches for a team before a given date, most recent first.
async function getTeamForm(d: Db, teamId: string, beforeDate: string, limit = 5): Promise<Doc[]> {
  return d
    .collection("matches")
    .find({
      $or: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: "FINISHED",
      "score.home": { $ne: null },
      kickoffUtc: { $lt: beforeDate },
    })
    .sort({ kickoffUtc: -1 })
    .limit(limit)
    .toArray();
}

function mapForm(matches: Doc[], teamId: string) {
  return matches.map((m) => {
    const isHome = m.homeTeamId === teamId;
    const gf = (isHome ? m.score?.home : m.score?.away) ?? 0;
    const ga = (isHome ? m.score?.away : m.score?.home) ?? 0;
    const result: "W" | "D" | "L" = gf > ga ? "W" : gf < ga ? "L" : "D";
    return {
      matchId: String(m._id),
      opponentSlug: String(isHome ? m.awayTeamId : m.homeTeamId),
      homeOrAway: (isHome ? "H" : "A") as "H" | "A",
      goalsFor: gf as number,
      goalsAgainst: ga as number,
      result,
    };
  });
}
const SQUAD_POSITIONS: SquadPosition[] = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
const mapSquadPlayer = (p: Doc): SquadPlayer => ({
  playerId: p.playerId ?? null,
  name: p.name ?? null,
  age: p.age ?? null,
  number: p.number ?? null,
  position: p.position ?? null,
  photo: p.photo ?? null,
});
function mapSquad(doc: Doc | null): TeamSquad | null {
  if (!doc) return null;
  const players: SquadPlayer[] = (doc.players ?? []).map(mapSquadPlayer);
  // Prefer the stored byPosition grouping; fall back to grouping players ourselves.
  const byPosition = SQUAD_POSITIONS.reduce((acc, pos) => {
    const src = doc.byPosition?.[pos];
    acc[pos] = Array.isArray(src) ? src.map(mapSquadPlayer) : players.filter((p) => p.position === pos);
    return acc;
  }, {} as Record<SquadPosition, SquadPlayer[]>);
  return { players, byPosition, totalPlayers: doc.totalPlayers ?? players.length };
}
const mapEvSignal = (s: Doc): MatchEvSignal => ({
  selection: s.selection,
  ev: s.ev,
  model_prob: s.modelProb ?? null,
  market_prob: s.marketProb ?? null,
  best_price: s.bestPrice ?? null,
  best_bookmaker: s.bestBookmaker ?? null,
  kelly_fraction: s.kellyFraction ?? null,
  book_count: s.bookCount ?? null,
  settled_result: s.settledResult ?? null,
  created_at: toIso(s.createdAt),
});
const mapInjury = (i: Doc): MatchInjury => ({
  playerName: i.playerName ?? null, position: i.position ?? null, injuryType: i.injuryType ?? null,
  severity: i.severity ?? null, reason: i.reason ?? null, updatedAt: toIso(i.updatedAt),
});
const mapNews = (a: Doc): MatchNews => ({
  title: a.title ?? null, url: a.url ?? null, published_at: toIso(a.publishedAt), source: a.source ?? null, summary: a.summary ?? null,
});

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const d = await db();
  if (!d) return null;

  const match = await d.collection("matches").findOne({ _id: matchId as never });
  if (!match) return null;

  const apiId = (match.sourceRefs?.apiFootballFixtureId as number | undefined) ?? null;
  const homeId = String(match.homeTeamId);
  const awayId = String(match.awayTeamId);

  const beforeDate = String(match.kickoffUtc ?? new Date().toISOString());

  const [prediction, evSignals, matchStats, homeInjuries, awayInjuries, homeNews, awayNews, h2h, homeFormRaw, awayFormRaw, modelRun, homeSquadRaw, awaySquadRaw] =
    await Promise.all([
      d.collection("predictions").findOne({ matchId }),
      d.collection("ev_signals").find({ matchId }).toArray(),
      d.collection("match_stats").findOne({ matchId }),
      d.collection("injuries").find({ teamId: homeId }).toArray(),
      d.collection("injuries").find({ teamId: awayId }).toArray(),
      d.collection("club_news").find({ teamId: homeId }).sort({ publishedAt: -1 }).limit(3).toArray(),
      d.collection("club_news").find({ teamId: awayId }).sort({ publishedAt: -1 }).limit(3).toArray(),
      d.collection("head2head").findOne({ homeTeamId: homeId, awayTeamId: awayId }),
      getTeamForm(d, homeId, beforeDate),
      getTeamForm(d, awayId, beforeDate),
      d.collection("model_runs").findOne({}, { sort: { createdAt: -1 } }),
      d.collection("squads").findOne({ teamId: homeId }),
      d.collection("squads").findOne({ teamId: awayId }),
    ]);

  const homeFormMapped = mapForm(homeFormRaw, homeId);
  const awayFormMapped = mapForm(awayFormRaw, awayId);

  // Resolve every referenced team (both sides + all form opponents) in one lookup.
  const teamIds = [...new Set([homeId, awayId, ...homeFormMapped.map((f) => f.opponentSlug), ...awayFormMapped.map((f) => f.opponentSlug)])];
  const teams = await d.collection("teams").find({ _id: { $in: teamIds as never[] } }).toArray();
  const teamById = new Map(teams.map((t) => [String(t._id), t]));
  const nameOf = (slug: string) => String(teamById.get(slug)?.name ?? slug);
  const resolveForm = (arr: ReturnType<typeof mapForm>): FormResult[] =>
    arr.map((f) => ({
      matchId: f.matchId,
      opponent: nameOf(f.opponentSlug),
      homeOrAway: f.homeOrAway,
      goalsFor: f.goalsFor,
      goalsAgainst: f.goalsAgainst,
      result: f.result,
    }));

  const att = (id: string) => (modelRun?.att?.[id] as number | undefined) ?? null;
  const deff = (id: string) => (modelRun?.deff?.[id] as number | undefined) ?? null;

  return {
    fixture: {
      matchId: String(match._id),
      league: match.league ?? null,
      kickoffUtc: match.kickoffUtc ?? null,
      status: matchStats?.status ?? match.status ?? null,
      afStatus: matchStats?.afStatus ?? null,
      elapsed: matchStats?.elapsed ?? null,
      score: match.score ?? null,
      penaltyScore: match.penaltyScore ?? null,
      venue: match.venue ?? null,
      referee: matchStats?.referee ?? match.referee ?? null,
      apiFootballFixtureId: apiId,
    },
    homeTeam: mapTeam(homeId, teamById.get(homeId), att(homeId), deff(homeId)),
    awayTeam: mapTeam(awayId, teamById.get(awayId), att(awayId), deff(awayId)),
    prediction: prediction
      ? {
          match_id: String(prediction.matchId),
          model_version: prediction.modelVersion ?? null,
          probs: prediction.probs ?? null,
          pick: prediction.pick ?? null,
          frozen_at: toIso(prediction.frozenAt),
          hash: prediction.hash ?? null,
          model_correct: prediction.modelCorrect ?? null,
        }
      : null,
    evSignals: evSignals.map(mapEvSignal),
    stats: matchStats?.stats ?? null,
    events: (matchStats?.events ?? []) as MatchEvent[],
    lineups: matchStats?.lineups ?? null,
    playerStats: matchStats?.playerStats ?? [],
    homeInjuries: homeInjuries.map(mapInjury),
    awayInjuries: awayInjuries.map(mapInjury),
    homeNews: homeNews.map(mapNews),
    awayNews: awayNews.map(mapNews),
    headToHead: h2h
      ? { meetings: h2h.meetings ?? [], homeWins: h2h.homeWins ?? 0, draws: h2h.draws ?? 0, awayWins: h2h.awayWins ?? 0 }
      : null,
    homeForm: resolveForm(homeFormMapped),
    awayForm: resolveForm(awayFormMapped),
    homeSquad: mapSquad(homeSquadRaw),
    awaySquad: mapSquad(awaySquadRaw),
  };
}
