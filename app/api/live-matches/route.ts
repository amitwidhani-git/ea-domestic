/**
 * GET /api/live-matches — currently in-play matches for the homepage live
 * bar. Delegates to lib/data so the client poller and the homepage SSR
 * fetch share one loader. Empty array (not an error) when nothing is live.
 */
import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getLiveMatches());
  } catch (err) {
    console.error("Live matches API error:", err);
    return NextResponse.json([]);
  }
}
