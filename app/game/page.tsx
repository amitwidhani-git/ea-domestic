import type { Metadata } from "next";
import { cookies } from "next/headers";
import BetanoPromo from "@/components/BetanoPromo";
import GameClient from "./GameClient";
import { getUserById, getWeekPickCards, getLeaderboard, effectiveWeeklyPts, GAME_COOKIE } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EdgeIQ Challenge — Edge Analysts",
  description: "Pick the result for every match. See how you compare to EdgeIQ and the crowd.",
};

export default async function GamePage() {
  const userId = (await cookies()).get(GAME_COOKIE)?.value ?? null;
  const [user, cards, leaderboard] = await Promise.all([
    userId ? getUserById(userId) : Promise.resolve(null),
    getWeekPickCards(userId),
    getLeaderboard("weekly", 1, 5, userId),
  ]);

  return (
    <div className="space-y-6">
      <BetanoPromo />
      <GameClient
        initialUser={user ? { userId: String(user._id), displayName: user.displayName, weeklyPts: effectiveWeeklyPts(user), seasonPts: user.seasonPts, streak: user.streak } : null}
        initialCards={cards}
        initialLeaderboard={leaderboard}
      />
    </div>
  );
}
