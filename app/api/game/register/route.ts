import { NextResponse } from "next/server";
import { registerUser, GAME_COOKIE } from "@/lib/game";

export async function POST(req: Request) {
  let body: { email?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await registerUser(body.email ?? "", body.displayName ?? "");
  if ("error" in result) return NextResponse.json(result, { status: 400 });

  const res = NextResponse.json(result);
  res.cookies.set(GAME_COOKIE, result.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
