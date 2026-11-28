import Link from "next/link";
import LivescorebetPromo from "@/components/LivescorebetPromo";
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
    <div className="space-y-10 sm:space-y-12">
      <LivescorebetPromo />

      <InsightsFixtures signals={signals} />

      <SettledSignalsSection settled={settled} />

      <section id="top-stories">
        <h2 className="font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">Top Stories</h2>
        {articles.length === 0 ? (
          <p className="mt-3 font-body text-[13px] text-muted">Top stories publish here automatically as the season unfolds.</p>
        ) : (
          <ul className="mt-3 space-y-6">
            {articles.map((a) => (
              <li key={a.slug}>
                <p className="font-body text-xs text-muted">{a.published_at.slice(0, 10)}</p>
                <h3 className="mt-1 font-body text-[16px] font-semibold leading-snug tracking-[-0.01em]">
                  <Link href={`/insights/articles/${a.slug}`} className="underline-offset-4 hover:underline">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-1.5 max-w-3xl font-body text-[13px] leading-relaxed text-muted">{a.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <BetwayPromo />
    </div>
  );
}
