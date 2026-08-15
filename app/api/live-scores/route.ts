/**
 * GET /api/live-scores — in-play scores from API-Football, filtered to the
 * competitions we track. Route-level cached for 60s (revalidate) so at most
 * one upstream API-Football call happens per minute regardless of traffic —
 * the schedule page's own 60s client poll rides on top of this cache, it
 * does not multiply the upstream call rate. Delegates to lib/liveScores so
 * the homepage live bar shares the exact same real-time source.
 */
import { NextResponse } from "next/server";
import { getLiveApiFixtures } from "@/lib/liveScores";

export const revalidate = 60;

export async function GET() {
  const fixtures = await getLiveApiFixtures();
  return NextResponse.json({ fixtures, fetchedAt: new Date().toISOString() });
}
