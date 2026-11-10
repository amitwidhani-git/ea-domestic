import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeaderboard, GAME_COOKIE, GAME_ENABLED } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!GAME_ENABLED) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "season" ? "season" : "weekly";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));

  const userId = (await cookies()).get(GAME_COOKIE)?.value ?? null;
  const data = await getLeaderboard(type, page, limit, userId);
  return NextResponse.json({ ...data, page, limit, type });
}
