import Link from "next/link";
import BetanoPromo from "@/components/BetanoPromo";
import BetMazePromo from "@/components/BetMazePromo";
import SpinzwinBannerCard from "@/components/SpinzwinBannerCard";
import MonsterCasinoBannerCard from "@/components/MonsterCasinoBannerCard";
import FruityKingBannerCard from "@/components/FruityKingBannerCard";
import TrackRecordTabs from "@/components/TrackRecordTabs";
import { getStats, getTrackRecord, getPredictionCoverage } from "@/lib/data";
// Revalidate every 5 min so new results (fetch_results.py runs 07:30 BST) appear
// automatically without a redeploy.
export const revalidate = 300;
export default async function TrackRecordPage() {
  const [rows, stats, coverage] = await Promise.all([getTrackRecord(), getStats(), getPredictionCoverage()]);
  return (
    <div className="space-y-10">
      <BetanoPromo />
      <section>
        <h1 className="font-display text-4xl tracking-wide">Track Record</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          This is a permanent log, not a highlight reel. Every prediction goes live before
          kick-off and is never altered, removed, or rewritten, whether it&apos;s a win, loss, or draw.
        </p>
        <Link href="/results" className="mt-3 inline-block font-data text-xs text-accent hover:underline">
          View full results →
        </Link>
      </section>

      {/* ── STAT HERO + DIVISION GRID ── */}
      {(() => {
        const all = stats.find((s) => s.league === "ALL");
        if (!all) return null;
        const DIVS: [string, string][] = [["PL", "Prem"], ["CH", "Champ"], ["L1", "League 1"], ["L2", "League 2"]];
        return (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-7 rounded-[14px] border border-line bg-panel p-6 shadow-[var(--shadow)]">
              <div className="flex flex-col">
                <b className="font-data text-[44px] font-semibold leading-none tracking-[-0.03em]">{Math.round(all.accuracy * 100)}%</b>
                <em className="mt-1 font-body text-xs not-italic uppercase tracking-wider text-muted">All competitions</em>
              </div>
              <div className="flex flex-col">
                <b className="font-data text-[44px] font-semibold leading-none tracking-[-0.03em]">{all.correct}/{all.settled}</b>
                <em className="mt-1 font-body text-xs not-italic uppercase tracking-wider text-muted">Correct picks</em>
              </div>
              <p className="max-w-[300px] font-body text-[12.5px] text-muted">
                Aggregate stats and recent results are always public. Every pick is logged before kick-off, hashed and time-stamped.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DIVS.map(([lg, label]) => {
                const d = stats.find((s) => s.league === lg);
                return (
                  <div key={lg} className="rounded-xl border border-line bg-panel p-3.5 text-center shadow-[var(--shadow)]">
                    <b className="font-data text-[22px] font-semibold">{d ? `${Math.round(d.accuracy * 100)}%` : "—"}</b>
                    <em className="mt-0.5 block font-body text-[10px] not-italic uppercase tracking-wider text-muted">{label}</em>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      <TrackRecordTabs rows={rows} stats={stats} coverage={coverage} />

      {/* ── OUR PARTNERS ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-wide">Partner Offers</h2>
          <Link href="/insights#our-partners" className="font-data text-xs text-accent hover:underline">
            All Partner Offers →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SpinzwinBannerCard />
          <MonsterCasinoBannerCard />
          <FruityKingBannerCard />
        </div>
      </section>

      <BetMazePromo />
    </div>
  );
}
