/**
 * GET /api/results — settled fixtures with prediction outcomes + EV P&L.
 * Delegates to lib/results so the Results page and homepage reuse the loader.
 *
 * Query params:
 *   ?league=PL,CH,LC   comma-separated league filter
 *   ?from=2026-08-01   date from (inclusive)
 *   ?to=2026-08-09     date to (inclusive)
 *   ?outcome=correct   correct | wrong | none | all (default all)
 *   ?limit=50          page size (default 50, max 100)
 *   ?offset=0          page offset (default 0)
 */
import { NextResponse } from "next/server";
import { getResults, type ResultsOutcome } from "@/lib/results";

export const dynamic = "force-dynamic";

const OUTCOMES: ResultsOutcome[] = ["all", "correct", "wrong", "none"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagues = searchParams.get("league")?.split(",").map((s) => s.trim()).filter(Boolean);
  const rawOutcome = searchParams.get("outcome") ?? "all";
  const outcome: ResultsOutcome = (OUTCOMES as string[]).includes(rawOutcome) ? (rawOutcome as ResultsOutcome) : "all";

  try {
    const data = await getResults({
      leagues,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      outcome,
      limit: Number(searchParams.get("limit")) || 50,
      offset: Number(searchParams.get("offset")) || 0,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Results API error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
