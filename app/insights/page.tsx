import Link from "next/link";
import BetanoPromo from "@/components/BetanoPromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetMazePromo from "@/components/BetMazePromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import InsightsFixtures from "@/components/InsightsFixtures";
import SettledSignalsSection from "@/components/SettledSignalsSection";
import { getAffiliateList, isLive } from "@/lib/affiliates";
import { getArticles, getEvSignals, getSettledEvSignals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [signals, settled, articles, affiliateList] = await Promise.all([
    getEvSignals(), getSettledEvSignals(), getArticles(), getAffiliateList(),
  ]);
  // Full live partner list — InsightsFixtures randomly picks from it for the
  // affiliate bars inserted every 8 cards in the value/fixtures lists.
  const affiliates = affiliateList.filter(isLive);

  return (
    <div className="space-y-12">
      <BetanoPromo />

      <InsightsFixtures signals={signals} affiliates={affiliates} />

      <SettledSignalsSection settled={settled} />

      <section id="our-partners">
        <h2 className="font-display text-2xl tracking-wide">Partner Offers</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Compare UK football betting sites and free bet offers from trusted bookmakers, updated
          alongside our model-driven predictions for the Premier League, Championship, League One and
          League Two.
        </p>
        <div className="mt-4 space-y-4">
          <BetanoPromo />
          <LivescorebetPromo />
          <MogobetPromo />
          <FruityKingPromo />
          <BetrinoPromo />
          <BetsunaPromo />
          <BetMazePromo />
          <SpinzwinPromo />
          <MonsterCasinoPromo />
        </div>
      </section>
      <section id="top-stories">
        <h2 className="font-display text-2xl tracking-wide">Top Stories</h2>
        {articles.length === 0 ? (
          <p className="mt-4 text-sm text-ink">Top stories publish here automatically as the season unfolds.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {articles.map((a) => (
              <li key={a.slug} className="py-4">
                <p className="font-data text-[11px] text-ink">{a.published_at.slice(0, 10)}</p>
                <h3 className="mt-1 font-display text-xl tracking-wide">
                  <Link href={`/insights/articles/${a.slug}`} className="hover:text-accent">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-ink">{a.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <BetMazePromo />
    </div>
  );
}
