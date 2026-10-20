/**
 * GET /api/live — every currently in-play fixture, from the GCP poller's
 * live_fixtures collection. Empty array (not an error) when nothing is live.
 * Backs both the /live dashboard's sidebar (60s poll) and the homepage's
 * "Live Now" link visibility check.
 */
import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/liveFixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ matches: await getLiveMatches() });
  } catch (err) {
    console.error("Live fixtures API error:", err);
    return NextResponse.json({ matches: [] });
  }
}
