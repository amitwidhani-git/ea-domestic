/**
 * GET /api/live-scores — in-play scores from API-Football, filtered to the
 * competitions we track. Route-level cached for 60s (revalidate) so at most
 * one upstream API-Football call happens per minute regardless of traffic —
 * the schedule page's own 60s client poll rides on top of this cache, it
 * does not multiply the upstream call rate.
 */
import { NextResponse } from "next/server";

export const revalidate = 60;

// PL, CH, L1, L2, FAC, LC, CS — matches lib/types.ts League codes.
const TRACKED_LEAGUE_IDS = [39, 40, 41, 42, 45, 48, 528];

interface LiveFixture {
  apiFixtureId: number;
  status: string;
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

function emptyResponse() {
  return NextResponse.json({ fixtures: [] as LiveFixture[], fetchedAt: new Date().toISOString() });
}

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return emptyResponse();

  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("API-Football live-scores request failed:", res.status, await res.text().catch(() => ""));
      return emptyResponse();
    }

    const data = await res.json();
    const raw: ApiFootballFixture[] = Array.isArray(data?.response) ? data.response : [];

    const fixtures: LiveFixture[] = raw
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

    return NextResponse.json({ fixtures, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("API-Football live-scores error:", err);
    return emptyResponse();
  }
}
