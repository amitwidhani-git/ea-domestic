import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import LivescorebetBannerCard from "@/components/LivescorebetBannerCard";
import BetsunaBannerCard from "@/components/BetsunaBannerCard";
import MogobetBannerCard from "@/components/MogobetBannerCard";
import WorldCupProof from "@/components/WorldCupProof";
import SubscribeRegister from "@/components/SubscribeRegister";
import { getFixtures } from "@/lib/data";
import type { League } from "@/lib/types";

export const dynamic = "force-dynamic";

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;

export default async function HomePage() {
  const allFixtures = await getFixtures();
  // Grid below is sm:grid-cols-2 lg:grid-cols-3 — keep this a multiple of 6
  // so the last row is never short a card at either breakpoint.
  const upcoming = allFixtures.slice(0, 6);

  return (
    <div className="space-y-8">

      <BetanoPromo />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-panel">
        {/* accent bar */}
        <div className="h-1 w-full bg-accent" />
        <div className="px-6 py-10 sm:px-10">
          <h1 className="-mt-4 font-display uppercase tracking-[0.15em] text-ink text-[clamp(0.95rem,2vw,1.5rem)]">
            Edge Analysts: Football Predictions &amp; Odds Intelligence Platform
          </h1>
          <h2 className="mt-1 font-data text-[10px] uppercase tracking-[0.2em] text-accent sm:text-xs">
            Premier League &amp; EFL Predictions, Frozen Pre-Kick-Off, Auditable Record
          </h2>
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

      {/* ── UPCOMING PREDICTIONS PREVIEW ─────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide">Upcoming Matches</h2>
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
                    <span className="font-data text-[11px] text-ink">{time}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-tight tracking-wide">
                    {fixture.home_team} <span className="text-ink">v</span> {fixture.away_team}
                  </h3>
                  {prediction ? (
                    <div className="mt-3 space-y-2">
                      <ProbBar probs={prediction.probs} pick={prediction.pick} />
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-data text-xs">
                          EdgeIQ Prediction: <span className="text-accent">{PICK_LABEL[prediction.pick]}</span>
                        </span>
                        <FrozenStamp frozenAt={prediction.frozen_at} hash={prediction.hash} />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 font-data text-[10px] text-ink">
                      Prediction pending · locks 48h before kick-off
                    </p>
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
          <p className="font-display text-2xl tracking-wide text-ink">
            Predictions lock from 12 August
          </p>
          <p className="mt-2 text-sm text-ink">
            Model runs daily at 07:00 and freezes predictions 48h before kick-off.
          </p>
          <Link href="/schedule" className="mt-4 inline-block font-data text-xs text-accent hover:underline">
            Browse the full 2026/27 schedule →
          </Link>
        </section>
      )}

      {/* ── SUBSCRIBE / REGISTER ─────────────────────────────────────── */}
      <SubscribeRegister source="homepage" />

      {/* ── OUR PARTNERS ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-wide">Partner Offers</h2>
          <Link href="/insights#our-partners" className="font-data text-xs text-accent hover:underline">
            All Partner Offers →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LivescorebetBannerCard />
          <BetsunaBannerCard />
          <MogobetBannerCard />
        </div>
      </section>

      {/* ── WORLD CUP PROOF STRIP ────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-display text-2xl tracking-wide">Track Record</h2>
        <WorldCupProof />
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-6 font-display text-2xl tracking-wide">What Makes Us Different</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Pre Match Lock",
              body: "We lock in every football prediction before kick-off and timestamp it, so we can never quietly change our pick after seeing the result.",
              note: null,
            },
            {
              n: "02",
              title: "Four divisions, one model",
              body: "EdgeIQ model uses cross-league data points covering the Premier League through League Two. Promoted clubs carry earned ratings, so no cold-start guessing.",
              note: null,
            },
            {
              n: "03",
              title: "Odds Value Signals, Not Tips",
              body: "We publish Value Signals wherever our model probability and the best available bookmaker price diverge. Information to weigh, not a tip to follow and not gut feel.",
              note: "Cup picks settle on the final result including penalties. League picks settle on 90 minutes — a draw is a draw.",
            },
          ].map((c) => (
            <div key={c.n} className="border border-line bg-panel p-5">
              <p className="font-display text-4xl leading-none text-accent/40">{c.n}</p>
              <h3 className="mt-2 font-display text-xl tracking-wide">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">{c.body}</p>
              {c.note && <p className="mt-2 text-sm leading-relaxed text-ink">{c.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <BetMazePromo />

    </div>
  );
}
