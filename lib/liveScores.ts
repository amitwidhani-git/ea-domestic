/**
 * Real-time in-play fixtures from API-Football, filtered to the competitions
 * we track. This is the single source of truth for "is this live right now"
 * — shared by /api/live-scores (schedule page overlay) and getLiveMatches
 * (homepage live bar) so both agree. Deliberately NOT the match_stats
 * collection's `isLive` flag: that's written by a separate background
 * pipeline job that can lag behind actual kickoff by several minutes.
 */

import { LEAGUES } from "./leagues";
import type { RawMatchEvent } from "./matchEvents";

// getLiveFixtureEvents/getLiveFixtureStats fire one call per live fixture in
// parallel (potentially a dozen+ at once on a busy matchday), which occasionally
// trips a transient rate-limit or hiccup on a handful of them. Next's `fetch`
// cache doesn't distinguish that from a genuine "no events yet" response, so a
// single bad burst gets locked in and re-served as truth for the whole
// revalidate window. These two caches are rolled by hand instead: only a
// successful response is ever stored, and a failed attempt just serves
// whatever was last known-good (or empty, before anything's ever succeeded)
// rather than overwriting it — the next poll tries again fresh.
declare global {
  // eslint-disable-next-line no-var
  var _eaLiveEventsCache: Map<number, { data: RawMatchEvent[]; expiresAt: number }> | undefined;
  // eslint-disable-next-line no-var
  var _eaLiveStatsCache: Map<number, { data: LiveFixtureStats | null; expiresAt: number }> | undefined;
}
const LIVE_DETAIL_TTL_MS = 30_000;

/** Up to 2 retries with backoff — the per-fixture events/stats calls occasionally hit a transient failure even at limited concurrency. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let res = await fetch(url, init);
  for (const delayMs of [400, 900]) {
    if (res.ok) return res;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    res = await fetch(url, init);
  }
  return res;
}

// Every competition in the league registry, by its API-Football id.
const TRACKED_LEAGUE_IDS: number[] = Object.values(LEAGUES).map((l) => l.apiFootballId);

export interface LiveApiFixture {
  apiFixtureId: number;
  status: string; // API-Football short code: 1H | HT | 2H | ET | P | BT | …
  elapsed: number | null;
  /** Stoppage-time minute (e.g. 4 for "45+4"), straight from API-Football. */
  extra: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: string;
  awayTeam: string;
}

interface ApiFootballFixture {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number | null; extra?: number | null } };
  league?: { id?: number };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  goals?: { home?: number | null; away?: number | null };
}

export async function getLiveApiFixtures(): Promise<LiveApiFixture[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error("API-Football live fixtures request failed:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
    const raw: ApiFootballFixture[] = Array.isArray(data?.response) ? data.response : [];

    return raw
      .filter((f) => TRACKED_LEAGUE_IDS.includes(f.league?.id ?? -1) && typeof f.fixture?.id === "number")
      .map((f) => ({
        apiFixtureId: f.fixture!.id as number,
        status: f.fixture?.status?.short ?? "",
        elapsed: f.fixture?.status?.elapsed ?? null,
        extra: f.fixture?.status?.extra ?? null,
        homeScore: f.goals?.home ?? null,
        awayScore: f.goals?.away ?? null,
        homeTeam: f.teams?.home?.name ?? "",
        awayTeam: f.teams?.away?.name ?? "",
      }));
  } catch (err) {
    console.error("API-Football live fixtures error:", err);
    return [];
  }
}

/**
 * This one fixture's live status, straight from the same 60s-cached bulk
 * call getLiveApiFixtures() already makes — no extra API cost. The match
 * page uses this as its live-status source of truth instead of the
 * match_stats collection, which is written by a separate pipeline job that
 * can lag kickoff by several minutes (or not have a doc yet at all) — see
 * the file-level comment above. Returns null when the fixture isn't
 * currently live per API-Football (finished, not yet started, or untracked).
 */
export async function getLiveOverlayFor(apiFixtureId: number | null): Promise<LiveApiFixture | null> {
  if (apiFixtureId == null) return null;
  const fixtures = await getLiveApiFixtures();
  return fixtures.find((f) => f.apiFixtureId === apiFixtureId) ?? null;
}

interface ApiFootballEvent {
  time?: { elapsed?: number | null; extra?: number | null };
  team?: { id?: number | null };
  player?: { name?: string | null };
  assist?: { name?: string | null };
  type?: string | null;    // "Goal" | "Card" | "subst" | "Var"
  detail?: string | null;  // "Normal Goal" | "Yellow Card" | "Red Card" | …
}

/**
 * Goal/card/substitution events for one fixture, fetched directly from
 * API-Football (a separate endpoint from the bulk live-fixtures call, so
 * this one genuinely costs an extra API call per poll — only call it for a
 * fixture already confirmed live via getLiveOverlayFor). Returned in the
 * same RawMatchEvent shape the match_stats pipeline uses, so it goes
 * through the same mapMatchEvent() mapping either way.
 */
export async function getLiveFixtureEvents(apiFixtureId: number): Promise<RawMatchEvent[]> {
  if (!global._eaLiveEventsCache) global._eaLiveEventsCache = new Map();
  const cache = global._eaLiveEventsCache;
  const cached = cache.get(apiFixtureId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return cached?.data ?? [];

  try {
    const res = await fetchWithRetry(`https://v3.football.api-sports.io/fixtures/events?fixture=${apiFixtureId}`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("API-Football live events request failed:", res.status, await res.text().catch(() => ""));
      return cached?.data ?? [];
    }

    const data = await res.json();
    const raw: ApiFootballEvent[] = Array.isArray(data?.response) ? data.response : [];
    const mapped: RawMatchEvent[] = raw.map((e) => ({
      elapsed: e.time?.elapsed ?? null,
      extra: e.time?.extra ?? null,
      kind: e.type ?? null,
      detail: e.detail ?? null,
      teamId: e.team?.id ?? null,
      playerName: e.player?.name ?? null,
      assistName: e.assist?.name ?? null,
    }));
    cache.set(apiFixtureId, { data: mapped, expiresAt: Date.now() + LIVE_DETAIL_TTL_MS });
    return mapped;
  } catch (err) {
    console.error("API-Football live events error:", err);
    return cached?.data ?? [];
  }
}

export interface LiveFixtureStats {
  home: Record<string, number | string>;
  away: Record<string, number | string>;
}

interface ApiFootballStatItem {
  type?: string | null;   // "Ball Possession" | "Total Shots" | …
  value?: number | string | null;
}
interface ApiFootballTeamStats {
  team?: { id?: number | null };
  statistics?: ApiFootballStatItem[];
}

// API-Football's stat labels, mapped to the same snake_case keys the
// match_stats pipeline already uses (STAT_LABELS in MatchLiveUpdater.tsx),
// so either source renders through the same UI unchanged.
const STAT_TYPE_TO_KEY: Record<string, string> = {
  "Ball Possession": "ball_possession",
  "Total Shots": "total_shots",
  "Shots on Goal": "shots_on_goal",
  "Shots off Goal": "shots_off_goal",
  "Blocked Shots": "blocked_shots",
  "Corner Kicks": "corner_kicks",
  "Offsides": "offsides",
  "Fouls": "fouls",
  "Yellow Cards": "yellow_cards",
  "Red Cards": "red_cards",
  "Goalkeeper Saves": "goalkeeper_saves",
  "Total passes": "total_passes",
  "Passes accurate": "passes_accurate",
};

/**
 * Team statistics (shots, possession, cards, passes, …) for one fixture,
 * fetched directly from API-Football — a third endpoint alongside the live
 * fixture list and events, so only call this for a fixture already
 * confirmed live via getLiveOverlayFor. Returns null when API-Football has
 * no statistics for this fixture yet (e.g. the first minute or two).
 */
export async function getLiveFixtureStats(apiFixtureId: number, homeApiFootballId: number | null): Promise<LiveFixtureStats | null> {
  if (!global._eaLiveStatsCache) global._eaLiveStatsCache = new Map();
  const cache = global._eaLiveStatsCache;
  const cached = cache.get(apiFixtureId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return cached?.data ?? null;

  try {
    const res = await fetchWithRetry(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${apiFixtureId}`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("API-Football live stats request failed:", res.status, await res.text().catch(() => ""));
      return cached?.data ?? null;
    }

    const data = await res.json();
    const raw: ApiFootballTeamStats[] = Array.isArray(data?.response) ? data.response : [];
    if (raw.length === 0) return cached?.data ?? null;

    const toRecord = (items: ApiFootballStatItem[] | undefined): Record<string, number | string> => {
      const out: Record<string, number | string> = {};
      for (const item of items ?? []) {
        const key = item.type ? STAT_TYPE_TO_KEY[item.type] : undefined;
        if (key && item.value != null) out[key] = item.value;
      }
      return out;
    };

    const homeEntry = homeApiFootballId != null ? raw.find((r) => r.team?.id === homeApiFootballId) ?? raw[0] : raw[0];
    const awayEntry = raw.find((r) => r !== homeEntry) ?? raw[1];

    const result: LiveFixtureStats = { home: toRecord(homeEntry?.statistics), away: toRecord(awayEntry?.statistics) };
    cache.set(apiFixtureId, { data: result, expiresAt: Date.now() + LIVE_DETAIL_TTL_MS });
    return result;
  } catch (err) {
    console.error("API-Football live stats error:", err);
    return cached?.data ?? null;
  }
}
