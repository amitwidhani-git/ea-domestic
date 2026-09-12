/**
 * GET /api/team-stats?home={teamId}&away={teamId}&league={code}&season={season}
 * Corners/cards/shots/xG splits + last-5 form for both sides of a fixture,
 * from the `team_stats` collection (refreshed weekly). Cached 1h.
 */
import { NextRequest, NextResponse } from "next/server";
import { getTeamStats } from "@/lib/teamStats";

export const revalidate = 3600;

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=600";

export async function GET(req: NextRequest) {
  const home = req.nextUrl.searchParams.get("home") ?? req.nextUrl.searchParams.get("homeTeamId");
  const away = req.nextUrl.searchParams.get("away") ?? req.nextUrl.searchParams.get("awayTeamId");
  const league = req.nextUrl.searchParams.get("league");
  const season = req.nextUrl.searchParams.get("season");
  if (!home || !away || !league || !season) {
    return NextResponse.json({ error: "missing home/away/league/season param" }, { status: 400 });
  }

  try {
    const stats = await getTeamStats(home, away, league, season);
    return NextResponse.json(stats, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (err) {
    console.error("team-stats API error:", err);
    return NextResponse.json({ home: null, away: null });
  }
}
