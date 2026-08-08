/**
 * GET /api/upcoming — all SCHEDULED fixtures in the next 14 days joined to
 * predictions and their best value signal. Client-fetched (potentially 100+
 * fixtures) so filtering/sorting happens in the browser, not on every request.
 */
import { NextResponse } from "next/server";
import { getUpcomingWithSignals } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getUpcomingWithSignals());
  } catch (err) {
    console.error("Upcoming API error:", err);
    return NextResponse.json([]);
  }
}
