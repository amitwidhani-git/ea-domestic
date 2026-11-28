import type { Metadata } from "next";
import Link from "next/link";
import EdgesExplorer from "@/components/EdgesExplorer";
import LiveMatchesBar from "@/components/LiveMatchesBar";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetwayPromo from "@/components/BetwayPromo";
import RecentResultsTicker from "@/components/RecentResultsTicker";
import GameTeaser from "@/components/game/GameTeaser";
import { getEvSignals, getStats, getArticles, getLiveMatches } from "@/lib/data";
import { getResults } from "@/lib/results";
import { getRecordStats } from "@/lib/trackRecord";
import { LEAGUE_CODES } from "@/lib/leagues";

// Display order for grouping the best upcoming edges by competition.
const LEAGUE_ORDER = LEAGUE_CODES;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edge Analysts: Football Predictions & Odds Intelligence Platform",
  description: "Edge Analysts: football predictions & odds intelligence powered by EdgeIQ. Transparent and auditable with every prediction logged before kick-off.",
};

function TrustCell({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <div>
        <b className="block font-body text-[14px] font-semibold leading-snug">{title}</b>
        <span className="mt-1 block font-body text-[13px] leading-relaxed text-muted">{body}</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [signals, stats, articles, liveMatches, recentResultsData, recordStats] = await Promise.all([
    getEvSignals(), getStats(), getArticles(), getLiveMatches(), getResults({ limit: 12 }), getRecordStats(),
  ]);

  // getEvSignals() already returns one card per match — group by league/cup
  // and take the top two edges per competition, nearest day first (so today's
  // matches always lead over a bigger future edge), best edge as the
  // tiebreaker within the same day.
  const edgeOf = (s: (typeof signals)[number]) => s.bestValue.model_prob - s.bestValue.market_prob;
  const dayOf = (s: (typeof signals)[number]) => (s.kickoff_utc ? s.kickoff_utc.slice(0, 10) : null);
  const byDayThenEdge = (a: (typeof signals)[number], b: (typeof signals)[number]) => {
    const da = dayOf(a), db = dayOf(b);
    if (da !== db) {
      if (da == null) return 1;
      if (db == null) return -1;
      return da < db ? -1 : 1;
    }
    return edgeOf(b) - edgeOf(a);
  };
  const byLeague = new Map<string, (typeof signals)[number][]>();
  for (const s of signals) {
    const arr = byLeague.get(s.league) ?? [];
    arr.push(s);
    byLeague.set(s.league, arr);
  }
  // Top 2 per league keeps competition diversity in the mix, but the final
  // display order must still be nearest-day-first across leagues too —
  // otherwise a league earlier in LEAGUE_ORDER with a later match would
  // still render above a different league's match happening sooner.
  const topEdges = LEAGUE_ORDER
    .filter((lg) => byLeague.has(lg))
    .flatMap((lg) => byLeague.get(lg)!.sort(byDayThenEdge).slice(0, 2))
    .sort(byDayThenEdge);

  const all = stats.find((s) => s.league === "ALL");
  const accuracy = all ? Math.round(all.accuracy * 100) : null;
  // Proof strip: the last four ISO weeks of settled picks (the closest the weekly record gets to 30 days).
  const recent = recordStats.weekly.slice(-4).reduce((a, w) => ({ c: a.c + w.c, n: a.n + w.n }), { c: 0, n: 0 });
  const recentPct = recent.n > 0 ? Math.round((recent.c / recent.n) * 100) : null;
  const logged = all ? all.settled : 0;
  const stories = articles.slice(0, 3);

  // Division breakdown — the homepage teaser for the full audit trail.
  const DIVS: [string, string][] = [["PL", "Prem"], ["CH", "Champ"], ["L1", "League 1"], ["L2", "League 2"]];

  return (
    <div>
      <LivescorebetPromo />

      <div className="mt-5 space-y-10 sm:space-y-12">
        <LiveMatchesBar initial={liveMatches} />

        {/* ── HERO ── */}
        <section className="max-w-3xl">
          <h1 className="font-display text-[clamp(1.75rem,4.2vw,2.125rem)] font-semibold leading-[1.12] tracking-[-0.025em]">
            Edge Analysts: Football Predictions &amp; Odds Intelligence Platform
          </h1>
          <h2 className="mt-2 max-w-xl font-body text-[15px] font-medium leading-snug text-accent">
            Football Predictions, Frozen Pre-Kick-Off, Auditable Record
          </h2>
          {/* Proof strip: one line of audited record under the subhead. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-1 font-data text-[13px]">
            <span>
              <b className="font-medium">{logged.toLocaleString("en-GB")}</b> <span className="text-muted">predictions audited</span>
            </span>
            {recentPct != null && (
              <span>
                <span className="text-muted">Last 4 weeks</span> <b className="font-medium">{recentPct}%</b>
              </span>
            )}
            <Link href="/track-record" className="inline-flex w-full items-center gap-1 font-body text-[13px] font-medium text-accent-ink underline-offset-4 hover:underline sm:w-auto">
              View Track Record →
            </Link>
          </div>
        </section>

        {/* ── BEST UPCOMING EDGES ── */}
        {topEdges.length > 0 && <EdgesExplorer featured={topEdges} signals={signals} />}

        {/* ── TRACK RECORD ── */}
        <section>
          <h2 className="mb-3 flex items-baseline font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            Track record
            <Link href="/track-record" className="ml-auto font-body text-[13px] font-medium tracking-normal text-accent-ink underline-offset-4 hover:underline">See full audit →</Link>
          </h2>
          <div>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
              <div className="flex flex-col">
                <b className="font-data text-[36px] font-medium leading-none tracking-[-0.02em]">{accuracy != null ? `${accuracy}%` : "—"}</b>
                <em className="mt-1.5 font-body text-[12.5px] not-italic text-muted">Season accuracy</em>
              </div>
              <div className="flex flex-col">
                <b className="font-data text-[36px] font-medium leading-none tracking-[-0.02em]">{logged}</b>
                <em className="mt-1.5 font-body text-[12.5px] not-italic text-muted">Picks logged</em>
              </div>
              <p className="max-w-[320px] font-body text-[13px] leading-relaxed text-muted">
                Every call published before kick-off, hashed and time-stamped. Nothing edited after the whistle.
              </p>

              {/* Division breakdown — the depth signal: this isn't one number, it's four leagues. */}
              <div className="ml-auto grid grid-cols-4 gap-x-8">
                {DIVS.map(([lg, label]) => {
                  const d = stats.find((s) => s.league === lg);
                  return (
                    <div key={lg} className="text-center">
                      <b className="font-data text-[18px] font-medium leading-none">{d ? `${Math.round(d.accuracy * 100)}%` : "—"}</b>
                      <em className="mt-1.5 block font-body text-[11.5px] not-italic text-muted">{label}</em>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent settled picks — proof, not a promise: every row here is a real result,
                auto-updating as games settle, ticking past so every card stays the same size. */}
            <RecentResultsTicker initial={recentResultsData.results} />

            <Link
              href="/track-record"
              className="mt-4 inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              View the full audit trail →
            </Link>
          </div>
        </section>

        {/* ── LATEST ANALYSIS ── */}
        {stories.length > 0 && (
          <section>
            <h2 className="mb-3 font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">Top Stories</h2>
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((a) => (
                <Link key={a.slug} href={`/insights/articles/${a.slug}`}
                  className="group block">
                  <div className="font-body text-xs font-medium text-accent-ink">{a.category ?? "Analysis"}</div>
                  <h4 className="mt-1.5 font-body text-[16px] font-semibold leading-snug tracking-[-0.01em] underline-offset-4 group-hover:underline">{a.title}</h4>
                  <p className="mt-1.5 font-body text-[13px] leading-relaxed text-muted">{a.summary}</p>
                  <div className="mt-2 font-body text-xs text-muted">{a.published_at.slice(0, 10)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── WHAT MAKES US DIFFERENT ── */}
        <section>
          <h2 className="mb-3 font-body text-[17px] font-semibold leading-tight tracking-[-0.01em] text-ink">What Makes Us Different</h2>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <TrustCell title="Pre-match lock" body="We lock in every football prediction before kick-off and timestamp it, so we can never quietly change our pick after seeing the result."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>} />
            <TrustCell title="Every competition, one model" body="Our EdgeIQ model uses cross-league data across England, Scotland and Europe's top leagues, plus the Women's Super League, European cups and the Nations League. Promoted clubs carry earned ratings, so no cold-start guessing."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>} />
            <TrustCell title="Odds value signals, not tips" body="We publish value signals wherever our model probability and the best available bookmaker price diverge. Information to weigh, not a tip to follow and not gut feel."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>} />
          </div>
        </section>

        <GameTeaser />

        <BetwayPromo />
      </div>
    </div>
  );
}
