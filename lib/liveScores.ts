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
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${apiFixtureId}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      console.error("API-Football live events request failed:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
    const raw: ApiFootballEvent[] = Array.isArray(data?.response) ? data.response : [];
    return raw.map((e) => ({
      elapsed: e.time?.elapsed ?? null,
      extra: e.time?.extra ?? null,
      kind: e.type ?? null,
      detail: e.detail ?? null,
      teamId: e.team?.id ?? null,
      playerName: e.player?.name ?? null,
      assistName: e.assist?.name ?? null,
    }));
  } catch (err) {
    console.error("API-Football live events error:", err);
    return [];
  }
}
