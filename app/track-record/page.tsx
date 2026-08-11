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
