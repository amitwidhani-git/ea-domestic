import AffiliateCta from "@/components/AffiliateCta";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import { getAffiliateForBookmaker } from "@/lib/affiliates";
import { getArticles, getEvSignals, getFixtures } from "@/lib/data";
import type { League } from "@/lib/types";
import LeagueBadge from "@/components/LeagueBadge";
export const dynamic = "force-dynamic";
const SEL_LABEL = { home: "Home", draw: "Draw", away: "Away" } as const;
export default async function InsightsPage() {
  const [signals, articles, fixtures] = await Promise.all([
    getEvSignals(), getArticles(), getFixtures(),
  ]);
  const fixtureBy = new Map(fixtures.map((f) => [f.fixture.match_id, f.fixture]));
  const affiliateBySignal = new Map(
    await Promise.all(signals.map(async (s) =>
      [`${s.match_id}-${s.selection}`, await getAffiliateForBookmaker(s.best_bookmaker)] as const))
  );
  return (
    <div className="space-y-12">
      <BetanoPromo />
      <section>
        <h1 className="font-display text-4xl tracking-wide">Odds Value Signals</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          We compare our model&apos;s predicted chances against the best odds on the market.
          When our numbers say a bet is worth more than the price on offer, that&apos;s a genuine edge.
        </p>
        {signals.length === 0 ? (
          <div className="mt-6 border border-line bg-panel px-6 py-10 text-center">
            <p className="font-display text-xl text-ink">No live signals yet</p>
            <p className="mt-1 font-data text-xs text-ink">EV signals publish once odds are connected — from August 2026</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {signals.map((s) => {
              const f = fixtureBy.get(s.match_id);
              const aff = affiliateBySignal.get(`${s.match_id}-${s.selection}`) ?? null;
              return (
                <article key={`${s.match_id}-${s.selection}`} className="border border-line bg-panel p-4">
                  <div className="flex items-center justify-between">
                    {f && <LeagueBadge league={f.league as League} />}
                    <span className="font-data text-lg font-semibold text-accent">+{(s.ev * 100).toFixed(1)}% EV</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl tracking-wide">
                    {f ? `${f.home_team} v ${f.away_team}` : s.match_id}
                  </h3>
                  <dl className="mt-3 grid grid-cols-3 gap-2 font-data text-[11px] text-ink">
                    <div><dt className="uppercase tracking-widest">Pick</dt><dd className="mt-1 text-ink">{SEL_LABEL[s.selection]}</dd></div>
                    <div><dt className="uppercase tracking-widest">Model</dt><dd className="mt-1 text-ink">{(s.model_prob * 100).toFixed(1)}%</dd></div>
                    <div><dt className="uppercase tracking-widest">Best price</dt><dd className="mt-1 text-ink">{s.best_price.toFixed(2)} · {s.best_bookmaker}</dd></div>
                  </dl>
                  {aff && <div className="mt-4 border-t border-line pt-3 text-right"><AffiliateCta affiliate={aff} price={s.best_price} /></div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section id="our-partners">
        <h2 className="font-display text-2xl tracking-wide">Partner Offers</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Compare UK football betting sites and free bet offers from trusted bookmakers, updated
          alongside our model-driven predictions for the Premier League, Championship, League One and
          League Two.
        </p>
        <div className="mt-4 space-y-4">
          <BetanoPromo />
          <MogobetPromo />
          <FruityKingPromo />
          <BetrinoPromo />
          <BetsunaPromo />
          <BetMazePromo />
          <SpinzwinPromo />
          <MonsterCasinoPromo />
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl tracking-wide">Top Stories</h2>
        {articles.length === 0 ? (
          <p className="mt-4 text-sm text-ink">Top stories publish here automatically as the season unfolds.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {articles.map((a) => (
              <li key={a.slug} className="py-4">
                <p className="font-data text-[11px] text-ink">{a.published_at.slice(0, 10)}</p>
                <h3 className="mt-1 font-display text-xl tracking-wide">{a.title}</h3>
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
