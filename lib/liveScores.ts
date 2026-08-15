/**
 * Real-time in-play fixtures from API-Football, filtered to the competitions
 * we track. This is the single source of truth for "is this live right now"
 * — shared by /api/live-scores (schedule page overlay) and getLiveMatches
 * (homepage live bar) so both agree. Deliberately NOT the match_stats
 * collection's `isLive` flag: that's written by a separate background
 * pipeline job that can lag behind actual kickoff by several minutes.
 */

// PL, CH, L1, L2, FAC, LC, CS — matches lib/types.ts League codes.
const TRACKED_LEAGUE_IDS = [39, 40, 41, 42, 45, 48, 528];

export interface LiveApiFixture {
  apiFixtureId: number;
  status: string; // API-Football short code: 1H | HT | 2H | ET | P | BT | …
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: string;
  awayTeam: string;
}

interface ApiFootballFixture {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number | null } };
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
