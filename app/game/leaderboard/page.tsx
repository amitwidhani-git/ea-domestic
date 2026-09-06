import type { Metadata } from "next";
import { cookies } from "next/headers";
import BetanoPromo from "@/components/BetanoPromo";
import LeaderboardClient from "./LeaderboardClient";
import { getLeaderboard, GAME_COOKIE } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EdgeIQ Challenge Leaderboard — Edge Analysts",
  description: "This week and season-long rankings for the EdgeIQ Challenge prediction game.",
};

export default async function LeaderboardPage() {
  const userId = (await cookies()).get(GAME_COOKIE)?.value ?? null;
  const initial = await getLeaderboard("weekly", 1, 20, userId);

  return (
    <div className="space-y-6">
      <BetanoPromo />
      <div>
        <h1 className="font-display text-4xl tracking-wide">EdgeIQ Challenge Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Ranked by points from correct H/D/A picks — 3pts a win, locked at kick-off.
        </p>
      </div>
      <LeaderboardClient initialType="weekly" initialData={initial} viewerUserId={userId} />
    </div>
  );
}
