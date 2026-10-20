/**
 * GET /api/live/:fixtureId/odds-history — just the oddsHistory timeline, for
 * the odds-tab sparkline. Kept separate from GET /api/live/:fixtureId so the
 * sparkline can refresh independently without re-fetching stats/events too.
 */
import { NextResponse } from "next/server";
import { getLiveOddsHistory } from "@/lib/liveFixtures";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const id = Number(fixtureId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_fixture_id" }, { status: 400 });

  try {
    const history = await getLiveOddsHistory(id);
    return NextResponse.json({ fixtureId: id, history });
  } catch (err) {
    console.error("Live odds-history API error:", err);
    return NextResponse.json({ fixtureId: id, history: [] });
  }
}
