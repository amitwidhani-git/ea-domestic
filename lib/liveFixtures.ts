/**
 * Live, in-play fixtures — written by the GCP poller directly into the
 * `live_fixtures` collection (upserted on `fixtureId`, unique index). This is
 * a *different* pipeline from lib/liveScores.ts (which hits API-Football
 * on-demand for the existing /matches/[matchId] page) — the poller already
 * does that polling continuously and persists the result, including the
 * oddsHistory timeline no on-demand call could reconstruct.
 *
 * The poller stores API-Football's response shapes close to raw rather than
 * normalising them, so this module's job is entirely translation: numeric
 * strings -> numbers, stats keyed by team *name* -> keyed by home/away side,
 * and a defensive event mapper since `events` is empty in every sample seen
 * so far and its populated shape hasn't been observed firsthand.
 */
import { getDb } from "./data";
import { eventIcon, formatMinute, type MatchEvent } from "./matchEvents";

export { eventIcon, formatMinute };
export type { MatchEvent };

// ---------------------------------------------------------------- raw shape

interface RawTeamRef {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

interface RawOddsSnapshot {
  bookmaker?: string;
  type?: string;
  home?: string | number;
  draw?: string | number;
  away?: string | number;
  capturedAt?: string;
}

interface RawOddsHistoryPoint extends RawOddsSnapshot {
  minute?: number;
  min?: number;
  polledAt?: string;
}

// Confirmed against a live document: flatter than either API-Football's raw
// nested shape or the match_stats pipeline's RawMatchEvent — team/player are
// plain strings here, not nested objects, and teamId is the reliable side key.
interface RawPollerEvent {
  minute?: number | null;
  extra?: number | null;
  team?: string | null;
  teamId?: number | null;
  player?: string | null;
  assist?: string | null;
  type?: string | null;
  detail?: string | null;
  comments?: string | null;
}

export interface LiveFixtureDoc {
  fixtureId: number;
  league: { id: number; name: string; country: string; logo: string; round: string };
  home: RawTeamRef;
  away: RawTeamRef;
  score: {
    home: number | null;
    away: number | null;
    ht?: { home: number | null; away: number | null };
    ft?: { home: number | null; away: number | null };
  };
  status: { long?: string; short: string; elapsed: number | null };
  liveOdds?: RawOddsSnapshot;
  prematchOdds?: RawOddsSnapshot;
  oddsHistory?: RawOddsHistoryPoint[];
  /** Keyed by team *name* (as it appears in `home.name`/`away.name`), not by side. */
  stats?: Record<string, Record<string, number | string>>;
  events?: RawPollerEvent[];
  polledAt?: string;
  updatedAt?: string;
}

// ------------------------------------------------------------ public shape

export interface LiveOddsPoint {
  min: number;
  h: number;
  d: number;
  a: number;
}

export interface LiveTeamRef {
  id: number;
  name: string;
  logo: string;
}

export interface LiveMatch {
  fixtureId: number;
  league: { name: string; country: string; logo: string; round: string };
  home: LiveTeamRef;
  away: LiveTeamRef;
  score: { home: number; away: number; ht: { home: number | null; away: number | null } };
  status: { short: string; label: string; elapsed: number | null };
  lastEvent: MatchEvent | null;
  liveOdds: { home: number; draw: number; away: number } | null;
  prematchOdds: { home: number; draw: number; away: number } | null;
  oddsHistory: LiveOddsPoint[];
  stats: { home: Record<string, number | string>; away: Record<string, number | string> };
  events: MatchEvent[];
  updatedAt: string | null;
}

// API-Football short codes that mean "still on the pitch right now". PEN here
// is kept for the (ambiguous, varies by API-Football doc version) penalty
// in-progress code; FT/AET/PEN-shootout-finished/NS/PST/CANC/ABD are excluded.
const LIVE_STATUS_SHORTS = new Set(["1H", "HT", "2H", "ET", "BT", "P", "PEN", "SUSP", "INT"]);

const STATUS_LABELS: Record<string, string> = {
  "1H": "1st Half",
  HT: "Half-Time",
  "2H": "2nd Half",
  ET: "Extra Time",
  BT: "Break",
  P: "Penalties",
  PEN: "Penalties",
  SUSP: "Suspended",
  INT: "Interrupted",
};

function toNum(v: string | number | null | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function mapOddsSnapshot(raw: RawOddsSnapshot | undefined): { home: number; draw: number; away: number } | null {
  if (!raw) return null;
  const home = toNum(raw.home), draw = toNum(raw.draw), away = toNum(raw.away);
  if (home == null || draw == null || away == null) return null;
  return { home, draw, away };
}

function mapOddsHistory(raw: RawOddsHistoryPoint[] | undefined): LiveOddsPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      min: p.minute ?? p.min ?? 0,
      h: toNum(p.home),
      d: toNum(p.draw),
      a: toNum(p.away),
    }))
    .filter((p): p is LiveOddsPoint => p.h != null && p.d != null && p.a != null)
    .sort((a, b) => a.min - b.min);
}

/** Stats are keyed by team *name* in the raw doc — match against home/away name, falling back to key order (poller has consistently written home's name first). */
function mapStats(
  raw: Record<string, Record<string, number | string>> | undefined,
  homeName: string,
  awayName: string
): { home: Record<string, number | string>; away: Record<string, number | string> } {
  const empty = {};
  if (!raw) return { home: empty, away: empty };
  const keys = Object.keys(raw);
  const homeKey = keys.find((k) => k === homeName) ?? keys[0];
  const awayKey = keys.find((k) => k === awayName) ?? keys.find((k) => k !== homeKey) ?? keys[1];
  return { home: (homeKey && raw[homeKey]) || empty, away: (awayKey && raw[awayKey]) || empty };
}

function mapEvent(e: RawPollerEvent, homeTeamId: number): MatchEvent {
  const side: MatchEvent["side"] = e.teamId != null ? (e.teamId === homeTeamId ? "home" : "away") : null;
  return {
    minute: e.minute ?? null,
    extra: e.extra ?? null,
    side,
    type: e.type ?? null,
    detail: e.detail ?? null,
    player: e.player ?? null,
    assist: e.assist ?? null,
  };
}

export function toLiveMatch(doc: LiveFixtureDoc): LiveMatch {
  const stats = mapStats(doc.stats, doc.home.name, doc.away.name);
  const events = Array.isArray(doc.events) ? doc.events.map((e) => mapEvent(e, doc.home.id)) : [];
  return {
    fixtureId: doc.fixtureId,
    league: { name: doc.league.name, country: doc.league.country, logo: doc.league.logo, round: doc.league.round },
    home: { id: doc.home.id, name: doc.home.name, logo: doc.home.logo },
    away: { id: doc.away.id, name: doc.away.name, logo: doc.away.logo },
    score: {
      home: doc.score.home ?? 0,
      away: doc.score.away ?? 0,
      ht: { home: doc.score.ht?.home ?? null, away: doc.score.ht?.away ?? null },
    },
    status: {
      short: doc.status.short,
      label: STATUS_LABELS[doc.status.short] ?? doc.status.long ?? doc.status.short,
      elapsed: doc.status.elapsed,
    },
    lastEvent: events.length > 0 ? events[events.length - 1] : null,
    liveOdds: mapOddsSnapshot(doc.liveOdds),
    prematchOdds: mapOddsSnapshot(doc.prematchOdds),
    oddsHistory: mapOddsHistory(doc.oddsHistory),
    stats,
    events,
    updatedAt: doc.updatedAt ?? doc.polledAt ?? null,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<LiveFixtureDoc>("live_fixtures");
}

/**
 * The GCP poller is meant to capture prematchOdds itself (T-5min before
 * kickoff), but in practice that field has been consistently empty — either
 * the capture step hasn't shipped yet, or it only fires for some fixtures.
 * Rather than leave the pre-match comparison blank, fall back to the same
 * odds_snapshots collection the /insights and match-detail pages already use
 * (joined via matches.sourceRefs.apiFootballFixtureId, the same link
 * lib/data.ts's getLiveMatches() uses), taking the best price per outcome
 * across bookmakers — the same "best price" convention ev_signals already
 * uses elsewhere on the site, not a single bookmaker's full triple.
 */
async function fallbackPrematchOdds(fixtureId: number): Promise<{ home: number; draw: number; away: number } | null> {
  const db = await getDb();
  const match = await db.collection("matches").findOne({ "sourceRefs.apiFootballFixtureId": fixtureId });
  if (!match) return null;

  const snaps = await db.collection("odds_snapshots").find({ matchId: String(match._id) }).toArray();
  if (snaps.length === 0) return null;

  const best = (side: "home" | "draw" | "away") =>
    Math.max(...snaps.map((s) => Number(s.prices?.[side])).filter((n) => Number.isFinite(n)));
  const home = best("home"), draw = best("draw"), away = best("away");
  return Number.isFinite(home) && Number.isFinite(draw) && Number.isFinite(away) ? { home, draw, away } : null;
}

async function withPrematchFallback(m: LiveMatch): Promise<LiveMatch> {
  if (m.prematchOdds) return m;
  const fallback = await fallbackPrematchOdds(m.fixtureId);
  return fallback ? { ...m, prematchOdds: fallback } : m;
}

export async function getLiveMatches(): Promise<LiveMatch[]> {
  const col = await collection();
  const docs = await col.find({ "status.short": { $in: [...LIVE_STATUS_SHORTS] } }).toArray();
  const matches = docs.map(toLiveMatch).sort((a, b) => (b.status.elapsed ?? 0) - (a.status.elapsed ?? 0));
  return Promise.all(matches.map(withPrematchFallback));
}

export async function getLiveMatch(fixtureId: number): Promise<LiveMatch | null> {
  const col = await collection();
  const doc = await col.findOne({ fixtureId });
  return doc ? withPrematchFallback(toLiveMatch(doc)) : null;
}

export async function getLiveOddsHistory(fixtureId: number): Promise<LiveOddsPoint[]> {
  const col = await collection();
  const doc = await col.findOne({ fixtureId }, { projection: { oddsHistory: 1 } });
  return mapOddsHistory(doc?.oddsHistory);
}
