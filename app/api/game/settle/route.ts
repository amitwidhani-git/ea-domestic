/**
 * POST /api/game/settle — internal. Called by the results pipeline right
 * after it marks a match FINISHED (see fetch_results.py). Not for public/
 * browser use: scores real points, so it's gated on a shared secret rather
 * than the game's own player cookie.
 */
import { NextResponse } from "next/server";
import { settleMatch } from "@/lib/game";

export async function POST(req: Request) {
  const key = process.env.INTERNAL_API_KEY;
  if (!key || req.headers.get("x-internal-key") !== key) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { matchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.matchId) return NextResponse.json({ error: "matchId is required." }, { status: 400 });

  const result = await settleMatch(body.matchId);
  return NextResponse.json(result);
}
