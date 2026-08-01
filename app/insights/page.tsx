import Link from "next/link";
import AffiliateCta from "@/components/AffiliateCta";
import BetanoPromo from "@/components/BetanoPromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetMazePromo from "@/components/BetMazePromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import LeagueBadge from "@/components/LeagueBadge";
import { getAffiliateForBookmaker } from "@/lib/affiliates";
import { getArticles, getEvSignals, getSettledEvSignals } from "@/lib/data";
import type { EvSignal, SettledEvSignal } from "@/lib/types";

export const dynamic = "force-dynamic";

// Formats a UTC ISO string as Europe/London civil time, e.g. "Sat 16 Aug · 15:00 UK".
function kickoffLabel(iso: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${get("hour")}:${get("minute")} UK`;
}

// e.g. "31 Jul 08:24" — day/month/time only, no year/weekday.
function formatSignalTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}

// "betfair_ex_uk" -> "Betfair Ex Uk"
function formatBookmaker(id: string): string {
  return id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function pickLabel(s: { selection: "home" | "draw" | "away"; home_team: string; away_team: string }): string {
  if (s.selection === "draw") return "Draw";
  return `${s.selection === "home" ? s.home_team : s.away_team} to win`;
}

function EvCard({ signal, affiliate }: { signal: EvSignal; affiliate: Awaited<ReturnType<typeof getAffiliateForBookmaker>> }) {
  const edgePts = (signal.model_prob - signal.market_prob) * 100;
  return (
    <article className="border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <LeagueBadge league={signal.league} />
        <span className="border border-accent bg-accent/10 px-2 py-0.5 font-data text-xs font-semibold text-accent">
          +{(signal.ev * 100).toFixed(1)}% EV
        </span>
      </div>

      <h3 className="mt-2 font-display text-xl tracking-wide">
        {signal.home_team} <span className="text-ink">v</span> {signal.away_team}
      </h3>
      {signal.kickoff_utc && (
        <p className="mt-0.5 font-data text-[10px] text-muted">{kickoffLabel(signal.kickoff_utc)}</p>
      )}
      <p className="mt-0.5 font-data text-[10px] text-muted">
        Signal generated: {formatSignalTime(signal.created_at)}
      </p>

      <p className="mt-3 font-data text-sm text-accent">{pickLabel(signal)}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-[11px] text-ink">
        <span>Model: {(signal.model_prob * 100).toFixed(1)}%</span>
        <span className="text-muted">·</span>
        <span>Market: {(signal.market_prob * 100).toFixed(1)}%</span>
        <span className="text-muted">·</span>
        <span>Edge: {edgePts >= 0 ? "+" : ""}{edgePts.toFixed(1)}%</span>
      </div>

      <p className="mt-2 font-data text-xs text-ink">
        {signal.best_price.toFixed(2)} at {formatBookmaker(signal.best_bookmaker)}{" "}
        <span className="text-muted">(18+)</span>
      </p>
      <p className="mt-1 font-data text-[10px] text-muted">
        Kelly: {(signal.kelly_fraction * 100).toFixed(1)}%
      </p>

      {affiliate && (
        <div className="mt-4 border-t border-line pt-3 text-right">
          <AffiliateCta affiliate={affiliate} price={signal.best_price} />
        </div>
      )}
    </article>
  );
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
          If our probability differs from the price on offer, that&apos;s considered a Value Signal.
        </p>
        {signals.length === 0 ? (
          <div className="mt-6 border border-line bg-panel px-6 py-10 text-center">
            <p className="font-display text-xl text-ink">No live value signals</p>
            <p className="mt-1 font-data text-xs text-ink">Check back on matchdays.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {signals.map((s) => (
              <EvCard
                key={`${s.match_id}-${s.selection}`}
                signal={s}
                affiliate={affiliateBySignal.get(`${s.match_id}-${s.selection}`) ?? null}
              />
            ))}
          </div>
        )}
      </section>

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
                      <td className="py-2 pr-4 text-ink">{s.home_team} v {s.away_team}</td>
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
