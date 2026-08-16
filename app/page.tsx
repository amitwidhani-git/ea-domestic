import type { Metadata } from "next";
import Link from "next/link";
import ValueSignalCard from "@/components/ValueSignalCard";
import LiveMatchesBar from "@/components/LiveMatchesBar";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import RecentResultsTicker from "@/components/RecentResultsTicker";
import { getEvSignals, getStats, getArticles, getLiveMatches } from "@/lib/data";
import { getResults } from "@/lib/results";

// Display order for grouping the best upcoming edges by competition.
const LEAGUE_ORDER = ["PL", "CH", "L1", "L2", "FAC", "LC", "CS"];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edge Analysts: Football Predictions & Odds Intelligence Platform",
  description: "Premier League & EFL Predictions, Frozen Pre-Kick-Off, Auditable Record",
};

function TrustCell({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <div>
        <b className="block font-body text-[13.5px]">{title}</b>
        <span className="font-body text-xs text-muted">{body}</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [signals, stats, articles, liveMatches, recentResultsData] = await Promise.all([
    getEvSignals(), getStats(), getArticles(), getLiveMatches(), getResults({ limit: 12 }),
  ]);

  // Best upcoming edge per match (a match can carry more than one signal),
  // then the top two per league/cup, in standard competition order.
  const edgeOf = (s: (typeof signals)[number]) => s.model_prob - s.market_prob;
  const bestPerMatch = new Map<string, (typeof signals)[number]>();
  for (const s of signals) {
    const cur = bestPerMatch.get(s.match_id);
    if (!cur || edgeOf(s) > edgeOf(cur)) bestPerMatch.set(s.match_id, s);
  }
  const byLeague = new Map<string, (typeof signals)[number][]>();
  for (const s of bestPerMatch.values()) {
    const arr = byLeague.get(s.league) ?? [];
    arr.push(s);
    byLeague.set(s.league, arr);
  }
  const topEdges = LEAGUE_ORDER
    .filter((lg) => byLeague.has(lg))
    .flatMap((lg) => byLeague.get(lg)!.sort((a, b) => edgeOf(b) - edgeOf(a)).slice(0, 2));

  const all = stats.find((s) => s.league === "ALL");
  const accuracy = all ? Math.round(all.accuracy * 100) : null;
  const logged = all ? all.settled : 0;
  const stories = articles.slice(0, 3);

  // Division breakdown — the homepage teaser for the full audit trail.
  const DIVS: [string, string][] = [["PL", "Prem"], ["CH", "Champ"], ["L1", "League 1"], ["L2", "League 2"]];

  return (
    <div>
      <BetanoPromo />

      <div className="mt-5 space-y-12">
        <LiveMatchesBar initial={liveMatches} />

        {/* ── HERO ── */}
        <section className="max-w-3xl pt-2">
          <h1 className="font-display text-[clamp(1.9rem,5vw,2.4rem)] font-extrabold leading-[1.07] tracking-[-0.03em]">
            Edge Analysts: Football Predictions &amp; Odds Intelligence Platform
          </h1>
          <h2 className="mt-3.5 max-w-xl font-body text-base font-bold text-accent">
            Premier League &amp; EFL Predictions, Frozen Pre-Kick-Off, Auditable Record
          </h2>
        </section>

        {/* ── BEST UPCOMING EDGES ── */}
        {topEdges.length > 0 && (
          <section>
            <h2 className="mb-3.5 flex items-center font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
              Best upcoming edges
              <Link href="/insights" className="ml-auto font-body text-xs font-semibold normal-case tracking-normal text-accent-ink hover:underline">Full odds →</Link>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {topEdges.map((s) => (
                <ValueSignalCard key={`${s.match_id}-${s.selection}`} signal={s} oddsFmt="frac" featured />
              ))}
            </div>
          </section>
        )}

        {/* ── NATIVE OFFER ── */}
        <LivescorebetPromo />

        {/* ── TRACK RECORD ── */}
        <section>
          <h2 className="mb-3.5 flex items-center font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
            Track record
            <Link href="/track-record" className="ml-auto font-body text-xs font-semibold normal-case tracking-normal text-accent-ink hover:underline">See full audit →</Link>
          </h2>
          <div className="rounded-[14px] border border-line bg-panel p-6 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center gap-7">
              <div className="flex flex-col">
                <b className="font-data text-[44px] font-semibold leading-none tracking-[-0.03em]">{accuracy != null ? `${accuracy}%` : "—"}</b>
                <em className="mt-1 font-body text-xs not-italic uppercase tracking-wider text-muted">Season accuracy</em>
              </div>
              <div className="flex flex-col">
                <b className="font-data text-[44px] font-semibold leading-none tracking-[-0.03em]">{logged}</b>
                <em className="mt-1 font-body text-xs not-italic uppercase tracking-wider text-muted">Picks logged</em>
              </div>
              <p className="max-w-[280px] font-body text-[12.5px] text-muted">
                Every call published before kick-off, hashed and time-stamped. Nothing edited after the whistle.
              </p>

              {/* Division breakdown — the depth signal: this isn't one number, it's four leagues. */}
              <div className="ml-auto grid grid-cols-4 gap-2.5">
                {DIVS.map(([lg, label]) => {
                  const d = stats.find((s) => s.league === lg);
                  return (
                    <div key={lg} className="rounded-[10px] border border-line bg-panel2 px-3 py-2 text-center">
                      <b className="font-data text-[17px] font-semibold leading-none">{d ? `${Math.round(d.accuracy * 100)}%` : "—"}</b>
                      <em className="mt-1 block font-body text-[9px] not-italic uppercase tracking-wider text-muted">{label}</em>
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
              className="mt-5 inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 font-body text-[13px] font-bold text-panel"
            >
              View the full audit trail →
            </Link>
          </div>
        </section>

        {/* ── LATEST ANALYSIS ── */}
        {stories.length > 0 && (
          <section>
            <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Top Stories</h2>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((a) => (
                <Link key={a.slug} href={`/insights/articles/${a.slug}`}
                  className="rounded-xl border border-line bg-panel p-4 shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5">
                  <div className="font-body text-[10px] font-bold uppercase tracking-wider text-accent-ink">Analysis</div>
                  <h4 className="mt-2 font-body text-[15px] font-semibold leading-snug">{a.title}</h4>
                  <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-muted">{a.summary}</p>
                  <div className="mt-2.5 font-body text-[10.5px] text-muted">{a.published_at.slice(0, 10)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── WHAT MAKES US DIFFERENT ── */}
        <section>
          <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">What Makes Us Different</h2>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <TrustCell title="Pre Match Lock" body="We lock in every football prediction before kick-off and timestamp it, so we can never quietly change our pick after seeing the result."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>} />
            <TrustCell title="Four divisions, one model" body="EdgeIQ model uses cross-league data points covering the Premier League through League Two. Promoted clubs carry earned ratings, so no cold-start guessing."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>} />
            <TrustCell title="Odds Value Signals, Not Tips" body="We publish Value Signals wherever our model probability and the best available bookmaker price diverge. Information to weigh, not a tip to follow and not gut feel."
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>} />
          </div>
        </section>

        <BetMazePromo />
      </div>
    </div>
  );
}
