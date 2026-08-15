import type { Metadata } from "next";
import Link from "next/link";
import ValueSignalCard from "@/components/ValueSignalCard";
import LiveMatchesBar from "@/components/LiveMatchesBar";
import { getEvSignals, getStats, getArticles, getLiveMatches } from "@/lib/data";

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
  const [signals, stats, articles, liveMatches] = await Promise.all([
    getEvSignals(), getStats(), getArticles(), getLiveMatches(),
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

  return (
    <div className="space-y-12">
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
      <section>
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-dashed border-line bg-panel px-5 py-4">
          <span className="rounded border border-line px-1.5 py-0.5 font-body text-[9.5px] font-bold uppercase tracking-wide text-muted">Ad · Partner</span>
          <div className="flex flex-col gap-0.5">
            <b className="font-body text-[14.5px]">New-customer offers from our licensed partners</b>
            <span className="font-body text-[12.5px] text-muted">Compare welcome offers before you back a pick · 18+</span>
          </div>
          <Link href="/insights#our-partners" className="ml-auto rounded-[9px] bg-ink px-4 py-2.5 font-body text-[13px] font-bold text-panel">See offers</Link>
        </div>
      </section>

      {/* ── TRACK RECORD ── */}
      <section>
        <h2 className="mb-3.5 flex items-center font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
          Track record
          <Link href="/track-record" className="ml-auto font-body text-xs font-semibold normal-case tracking-normal text-accent-ink hover:underline">See full audit →</Link>
        </h2>
        <div className="flex flex-wrap items-center gap-7 rounded-[14px] border border-line bg-panel p-6 shadow-[var(--shadow)]">
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
        </div>
      </section>

      {/* ── LATEST ANALYSIS ── */}
      {stories.length > 0 && (
        <section>
          <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Latest analysis</h2>
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

      {/* ── WHY EDGE ANALYSTS ── */}
      <section>
        <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Why Edge Analysts</h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <TrustCell title="Locked pre-kick-off" body="Predictions frozen and hashed before a ball is kicked."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>} />
          <TrustCell title="Four divisions, one model" body="Premier League to League Two, priced the same way."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>} />
          <TrustCell title="Value, not tips" body="We show the gap to the market — you decide."
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>} />
        </div>
      </section>
    </div>
  );
}
