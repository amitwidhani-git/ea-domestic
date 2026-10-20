import { Suspense } from "react";
import type { Metadata } from "next";
import { getLiveMatches } from "@/lib/liveFixtures";
import LiveDashboard from "@/components/live/LiveDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Matches",
  description: "Every in-play fixture we track, with live odds, probability swings, stats and events updating in real time.",
};

export default async function LivePage() {
  const initial = await getLiveMatches();
  return (
    <Suspense fallback={null}>
      <LiveDashboard initial={initial} />
    </Suspense>
  );
}
