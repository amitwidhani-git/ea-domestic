import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMatchDetail } from "@/lib/matchDetail";
import MatchLiveUpdater from "@/components/MatchLiveUpdater";
import BackLink from "@/components/BackLink";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;
  const d = await getMatchDetail(matchId);
  if (!d) return {};
  return { title: `${d.homeTeam.name} v ${d.awayTeam.name} — EdgeAnalysts` };
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  const isLive = detail.fixture.status === "LIVE";

  return (
    <div className="space-y-6">
      <BetanoPromo />
      <BackLink fallbackHref="/insights" />
      <MatchLiveUpdater matchId={matchId} initialData={detail} isLive={isLive} />
      <BetMazePromo />
    </div>
  );
}
