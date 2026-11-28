import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMatchDetail } from "@/lib/matchDetail";
import { decodeParam } from "@/lib/decodeParam";
import MatchLiveUpdater from "@/components/MatchLiveUpdater";
import { getFixtures } from "@/lib/data";
import type { RelatedFixtures } from "@/components/MatchExtras";
import BackLink from "@/components/BackLink";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetwayPromo from "@/components/BetwayPromo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;
  const d = await getMatchDetail(decodeParam(matchId));
  if (!d) return {};
  return { title: `${d.homeTeam.name} v ${d.awayTeam.name} — EdgeAnalysts` };
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId: rawMatchId } = await params;
  const matchId = decodeParam(rawMatchId);
  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  const isLive = detail.fixture.status === "LIVE";

  // Related fixtures from the existing upcoming-fixtures loader: same league next kick-offs and each team's next match.
  const upcoming = (await getFixtures()).map((f) => f.fixture).filter((f) => f.match_id !== matchId);
  const homeNext = upcoming.find((f) => f.home_team_id === detail.homeTeam.id || f.away_team_id === detail.homeTeam.id) ?? null;
  const awayNext = upcoming.find((f) => f.home_team_id === detail.awayTeam.id || f.away_team_id === detail.awayTeam.id) ?? null;
  const related: RelatedFixtures = {
    sameLeague: upcoming.filter((f) => f.league === detail.fixture.league && f.match_id !== homeNext?.match_id && f.match_id !== awayNext?.match_id).slice(0, 4),
    homeNext,
    awayNext,
  };

  return (
    <div className="space-y-6">
      <LivescorebetPromo />
      <BackLink fallbackHref="/insights" />
      <MatchLiveUpdater matchId={matchId} initialData={detail} isLive={isLive} related={related} />
      <BetwayPromo />
    </div>
  );
}
