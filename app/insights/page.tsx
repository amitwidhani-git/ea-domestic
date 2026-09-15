import Link from "next/link";
import BetanoPromo from "@/components/BetanoPromo";
import BetwayPromo from "@/components/BetwayPromo";
import InsightsFixtures from "@/components/InsightsFixtures";
import SettledSignalsSection from "@/components/SettledSignalsSection";
import { getArticles, getEvSignals, getSettledEvSignals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [signals, settled, articles] = await Promise.all([
    getEvSignals(), getSettledEvSignals(), getArticles(),
  ]);

  return (
    <div className="space-y-12">
      <BetanoPromo />

      <InsightsFixtures signals={signals} />

      <SettledSignalsSection settled={settled} />

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
      <BetwayPromo />
    </div>
  );
}
