import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import { getFixtures } from "@/lib/data";
import type { League } from "@/lib/types";

export const dynamic = "force-dynamic";

// World Cup 2026 final record — verified, never changes
const WC_STATS = [
  { stage: "Group Stage", correct: 13, total: 16 },
  { stage: "Round of 16", correct: 7, total: 8 },
  { stage: "Quarter-Final", correct: 4, total: 4 },
  { stage: "Semi-Final", correct: 1, total: 2 },
  { stage: "Final", correct: 1, total: 1 },
];
const WC_TOTAL = { correct: 26, total: 31 };

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;

export default async function HomePage() {
  const allFixtures = await getFixtures();
  const upcoming = allFixtures.filter((f) => f.prediction !== null).slice(0, 6);

  return (
    <div className="space-y-16">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border border-line bg-panel">
        {/* accent bar */}
        <div className="h-1 w-full bg-accent" />
        <div className="px-6 py-10 sm:px-10">
          <p className="font-data text-[11px] uppercase tracking-[0.25em] text-accent">
            Proven at the World Cup 2026
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none tracking-wide sm:text-7xl">
            BEAT THE<br />
            <span className="text-accent">BOOKMAKERS</span><br />
            WITH DATA
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Every prediction frozen before kick-off and published with a tamper-proof hash.
            No tipster gut-feel. No revised picks. Just a transparent model with a public track record
            — now covering all four English divisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/schedule"
              className="border border-accent bg-accent px-5 py-2.5 font-display text-lg tracking-wider text-bg transition-colors hover:bg-accent/80">
              VIEW FIXTURES
            </Link>
            <Link href="/track-record"
              className="border border-line px-5 py-2.5 font-display text-lg tracking-wider text-ink transition-colors hover:border-accent hover:text-accent">
              TRACK RECORD
            </Link>
          </div>
        </div>
      </section>

      {/* ── WORLD CUP PROOF STRIP ────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-wide">
            World Cup 2026 — Model Record
          </h2>
          <span className="font-data text-xs text-muted">
            edgeanalysts.com · predictions locked pre-match
          </span>
        </div>

        {/* headline number */}
        <div className="mb-4 flex items-end gap-4 border border-accent/30 bg-panel px-6 py-5">
          <span className="font-display text-6xl leading-none text-accent">
            {WC_TOTAL.correct}/{WC_TOTAL.total}
          </span>
          <div>
            <p className="font-display text-3xl leading-none text-ink">
              {((WC_TOTAL.correct / WC_TOTAL.total) * 100).toFixed(0)}%
            </p>
            <p className="mt-1 font-data text-[11px] uppercase tracking-widest text-muted">
              Overall accuracy · all matches predicted pre-kick-off
            </p>
          </div>
        </div>

        {/* per-stage breakdown */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {WC_STATS.map((s) => {
            const pct = Math.round((s.correct / s.total) * 100);
            const perfect = s.correct === s.total;
            return (
              <div key={s.stage}
                className={`border p-3 ${perfect ? "border-accent/60 bg-accent/5" : "border-line bg-panel"}`}>
                <p className="font-data text-[9px] uppercase tracking-widest text-muted">{s.stage}</p>
                <p className={`mt-2 font-display text-3xl leading-none ${perfect ? "text-accent" : "text-ink"}`}>
                  {pct}%
                </p>
                <p className="mt-1 font-data text-[10px] text-muted">
                  {s.correct}/{s.total} correct
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 font-data text-[10px] text-muted">
          Quarter-final and Final: 100% — every match called correctly at the tournament&apos;s
          business end. Predictions frozen before kick-off and still visible at edgeanalysts.com.
        </p>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-6 font-display text-2xl tracking-wide">What Makes Us Different</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Pre-match lock",
              body: "Every prediction is frozen before kick-off with a SHA-256 hash. Re-run the hash yourself to confirm nothing changed.",
            },
            {
              n: "02",
              title: "Four divisions, one model",
              body: "Dixon-Coles + cross-league Elo covers Premier League through League Two. Promoted clubs carry earned ratings — no cold-start guessing.",
            },
            {
              n: "03",
              title: "EV signals, not tips",
              body: "We publish where our model probability beats the best de-vigged bookmaker price. Positive expected value, not gut feel.",
            },
          ].map((c) => (
            <div key={c.n} className="border border-line bg-panel p-5">
              <p className="font-display text-4xl leading-none text-accent/40">{c.n}</p>
              <h3 className="mt-2 font-display text-xl tracking-wide">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── UPCOMING PREDICTIONS PREVIEW ─────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide">Latest Predictions</h2>
            <Link href="/schedule" className="font-data text-xs text-accent hover:underline">
              Full schedule →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(({ fixture, prediction }) => {
              const ko = new Date(fixture.kickoff_utc);
              const time = ko.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
              return (
                <article key={fixture.match_id} className="border border-line bg-panel p-4">
                  <div className="flex items-center justify-between">
                    <LeagueBadge league={fixture.league as League} />
                    <span className="font-data text-[11px] text-muted">{time}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-tight tracking-wide">
                    {fixture.home_team} <span className="text-muted">v</span> {fixture.away_team}
                  </h3>
                  {prediction && (
                    <div className="mt-3 space-y-2">
                      <ProbBar probs={prediction.probs} pick={prediction.pick} />
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-data text-xs">
                          Pick: <span className="text-accent">{PICK_LABEL[prediction.pick]}</span>
                        </span>
                        <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── NO PREDICTIONS YET ───────────────────────────────────────── */}
      {upcoming.length === 0 && (
        <section className="border border-line bg-panel px-6 py-10 text-center">
          <p className="font-display text-2xl tracking-wide text-muted">
            Predictions lock from 12 August
          </p>
          <p className="mt-2 text-sm text-muted">
            Model runs daily at 07:00 and freezes predictions 48h before kick-off.
          </p>
          <Link href="/schedule" className="mt-4 inline-block font-data text-xs text-accent hover:underline">
            Browse the full 2026/27 schedule →
          </Link>
        </section>
      )}

    </div>
  );
}
