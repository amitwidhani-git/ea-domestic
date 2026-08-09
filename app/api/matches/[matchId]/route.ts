/**
 * GET /api/matches/[matchId] — full match context for the detail page.
 * Delegates to lib/matchDetail so the server page can share the same loader.
 */
import { NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/matchDetail";

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  try {
    const detail = await getMatchDetail(matchId);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    console.error("Match detail API error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
