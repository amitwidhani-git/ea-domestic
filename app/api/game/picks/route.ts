import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWeekPickCards, submitPick, GAME_COOKIE } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = (await cookies()).get(GAME_COOKIE)?.value ?? null;
  const cards = await getWeekPickCards(userId);
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const userId = (await cookies()).get(GAME_COOKIE)?.value;
  if (!userId) return NextResponse.json({ error: "Register to play." }, { status: 401 });

  let body: { matchId?: string; pick?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.matchId || !body.pick) return NextResponse.json({ error: "matchId and pick are required." }, { status: 400 });

  const result = await submitPick(userId, body.matchId, body.pick as "home" | "draw" | "away");
  if ("error" in result) return NextResponse.json(result, { status: 400 });

  return NextResponse.json({ success: true, crowdDistribution: result.crowd });
}
