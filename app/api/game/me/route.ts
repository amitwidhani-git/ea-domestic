import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, effectiveWeeklyPts, GAME_COOKIE, GAME_ENABLED } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!GAME_ENABLED) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const userId = (await cookies()).get(GAME_COOKIE)?.value;
  if (!userId) return NextResponse.json(null);
  const user = await getUserById(userId);
  if (!user) return NextResponse.json(null);
  return NextResponse.json({
    userId: String(user._id),
    displayName: user.displayName,
    weeklyPts: effectiveWeeklyPts(user),
    seasonPts: user.seasonPts,
    streak: user.streak,
  });
}
