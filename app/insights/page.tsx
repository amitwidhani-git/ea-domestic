import AffiliateCard from "@/components/AffiliateCard";
import AffiliateCta from "@/components/AffiliateCta";
import { getAffiliateForBookmaker, getAffiliateList, isLive } from "@/lib/affiliates";
import { getArticles, getEvSignals, getFixtures } from "@/lib/data";
import type { League } from "@/lib/types";
import LeagueBadge from "@/components/LeagueBadge";
export const dynamic = "force-dynamic";
const SEL_LABEL = { home: "Home", draw: "Draw", away: "Away" } as const;
export default async function InsightsPage() {
  const [signals, articles, fixtures, affiliateList] = await Promise.all([
    getEvSignals(), getArticles(), getFixtures(), getAffiliateList(),
  ]);
  const partners = affiliateList.filter(isLive);
  const fixtureBy = new Map(fixtures.map((f) => [f.fixture.match_id, f.fixture]));
  const affiliateBySignal = new Map(
    await Promise.all(signals.map(async (s) =>
      [`${s.match_id}-${s.selection}`, await getAffiliateForBookmaker(s.best_bookmaker)] as const))
  );
  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl tracking-wide">Value Signals</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Where the frozen model probability beats the best de-vigged bookmaker price.
          Positive EV is a mathematical edge — not a guarantee, but the same logic sharp bettors use.
        </p>
        {signals.length === 0 ? (
          <div className="mt-6 border border-line bg-panel px-6 py-10 text-center">
            <p className="font-display text-xl text-muted">No live signals yet</p>
            <p className="mt-1 font-data text-xs text-muted">EV signals publish once odds are connected — from August 2026</p>
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
                  <dl className="mt-3 grid grid-cols-3 gap-2 font-data text-[11px] text-muted">
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
      {partners.length > 0 && (
        <section>
          <h2 className="font-display text-2xl tracking-wide">Partners</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((a) => <AffiliateCard key={a.id} affiliate={a} />)}
          </div>
        </section>
      )}
      <section>
        <h2 className="font-display text-2xl tracking-wide">Analysis</h2>
        {articles.length === 0 ? (
          <p className="mt-4 font-data text-sm text-muted">Matchday articles publish here automatically.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {articles.map((a) => (
              <li key={a.slug} className="py-4">
                <p className="font-data text-[11px] text-muted">{a.published_at.slice(0, 10)}</p>
                <h3 className="mt-1 font-display text-xl tracking-wide">{a.title}</h3>
                <p className="mt-1 text-sm text-muted">{a.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
