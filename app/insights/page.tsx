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
import { getAffiliateForBookmaker } from "@/lib/affiliates";
import { getArticles, getEvSignals, getSettledEvSignals } from "@/lib/data";
import type { SettledEvSignal } from "@/lib/types";

export const dynamic = "force-dynamic";

function pickLabel(s: { selection: "home" | "draw" | "away"; home_team: string; away_team: string }): string {
  if (s.selection === "draw") return "Draw";
  return `${s.selection === "home" ? s.home_team : s.away_team} to win`;
}

function settledPnl(s: SettledEvSignal): number {
  if (s.settled_result === "WIN") return s.best_price - 1;
  if (s.settled_result === "LOSE") return -1;
  return 0; // VOID — stake returned
}

export default async function InsightsPage() {
  const [signals, settled, articles] = await Promise.all([
    getEvSignals(), getSettledEvSignals(), getArticles(),
  ]);
  // Affiliate lookups happen server-side; the parallel array lines up with `signals`.
  const affiliates = await Promise.all(signals.map((s) => getAffiliateForBookmaker(s.best_bookmaker)));

  return (
    <div className="space-y-12">
      <BetanoPromo />

      <InsightsFixtures signals={signals} affiliates={affiliates} />

      <section>
        <h2 className="font-display text-2xl tracking-wide">Settled Odds Value Signals</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Every Value Signal we&apos;ve published, win or lose, the auditable record.
        </p>
        {settled.length === 0 ? (
          <p className="mt-4 font-data text-xs text-ink">No settled value signals yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-data text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-ink">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Match</th>
                  <th className="py-2 pr-4">Selection</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((s) => {
                  const pnl = settledPnl(s);
                  return (
                    <tr key={`${s.match_id}-${s.selection}`} className="border-b border-line/60 hover:bg-panel">
                      <td className="py-2 pr-4 text-ink">{s.created_at.slice(0, 10)}</td>
                      <td className="py-2 pr-4 text-ink">
                        <Link href={`/teams/${s.home_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{s.home_team}</Link> v <Link href={`/teams/${s.away_team_id}`} className="underline decoration-accent underline-offset-2 sm:no-underline hover:text-accent transition-colors">{s.away_team}</Link>
                      </td>
                      <td className="py-2 pr-4 text-ink">{pickLabel(s)}</td>
                      <td className="py-2 pr-4 text-ink">{s.best_price.toFixed(2)}</td>
                      <td className={`py-2 pr-4 font-bold ${s.settled_result === "WIN" ? "text-accent" : s.settled_result === "LOSE" ? "text-loss" : "text-ink"}`}>
                        {s.settled_result}
                      </td>
                      <td className={`py-2 font-bold ${pnl > 0 ? "text-accent" : pnl < 0 ? "text-loss" : "text-ink"}`}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
