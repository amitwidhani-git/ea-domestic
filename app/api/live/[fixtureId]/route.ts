/**
 * GET /api/live/:fixtureId — one live fixture's full document (score, odds,
 * stats, events). Polled every 30s by the /live dashboard's active main
 * panel. 404 when this fixtureId has no live_fixtures doc (never went live,
 * or already expired/finished and removed by the poller).
 */
import { NextResponse } from "next/server";
import { getLiveMatch } from "@/lib/liveFixtures";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const id = Number(fixtureId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_fixture_id" }, { status: 400 });

  try {
    const match = await getLiveMatch(id);
    if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(match);
  } catch (err) {
    console.error("Live fixture API error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
