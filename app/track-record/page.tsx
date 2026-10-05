import type { Metadata } from "next";
import Link from "next/link";
import BetanoPromo from "@/components/BetanoPromo";
import BetwayPromo from "@/components/BetwayPromo";
import GrosvenorBannerCard from "@/components/GrosvenorBannerCard";
import CopyBetBannerCard from "@/components/CopyBetBannerCard";
import Bet10BannerCard from "@/components/Bet10BannerCard";
import TrackRecordDashboard, { SHOW_FULL_RESULTS_LINK, TABS, type TrackRecordTab } from "@/components/track-record/TrackRecordDashboard";
import { buildReport, getGameRecord, getLiveFacts, getRecordStats, getSnapshot, parseGameQuery } from "@/lib/trackRecord";

// Fallback refresh. Data is cached per query in lib/trackRecord (snapshot hourly,
// live facts and Game record every 5 min) and flushed on demand by
// POST /api/revalidate/track-record after build_track_record.py's Monday run.
export const revalidate = 3600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseTab(sp: Record<string, string | string[] | undefined>): TrackRecordTab {
  const t = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return TABS.some((x) => x.key === t) ? (t as TrackRecordTab) : "record";
}

const DESCRIPTION =
  "Every Edge Analysts prediction, logged before kick-off and never edited or deleted. EdgeIQ's hit rate by competition, confidence and week, compared against the market favourite, with every settled game.";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const tab = parseTab(sp);
  // Canonical keeps the tab (and Game record page) but drops filters, so filtered views consolidate.
  const page = tab === "games" ? parseGameQuery(sp).page : 1;
  const canonical = tab === "record" ? "/track-record" : tab === "games" && page > 1 ? `/track-record?tab=games&page=${page}` : `/track-record?tab=${tab}`;
  const label = TABS.find((t) => t.key === tab)!.label;
  return {
    title: tab === "record" ? "Track Record | Edge Analysts" : `Track Record: ${label} | Edge Analysts`,
    description: DESCRIPTION,
    alternates: { canonical },
  };
}

export default async function TrackRecordPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = parseTab(sp);
  const gameQuery = parseGameQuery(sp);

  const [snap, live, stats, games] = await Promise.all([
    getSnapshot("all-time"),
    getLiveFacts(),
    getRecordStats(),
    tab === "games" ? getGameRecord(gameQuery) : Promise.resolve(null),
  ]);
  const report = snap ? buildReport(snap, live, stats) : null;
  const gameLeagues = report ? report.competitions.filter((c) => c.n > 0).map(({ code, name }) => ({ code, name })) : [];

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edgeanalysts.com";
  const jsonLd = report && {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Edge Analysts EdgeIQ prediction track record",
    description: DESCRIPTION,
    url: `${site}/track-record`,
    dateModified: report.generatedAt,
    temporalCoverage: `${report.period.start}/${report.period.end}`,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Edge Analysts", url: site },
    variableMeasured: ["Picks logged", "Picks correct", "Hit rate by competition", "Hit rate by confidence band", "Weekly hit rate"],
    distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${site}/api/track-record/all-time` },
  };

  return (
    <div className="space-y-10">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <BetanoPromo />

      {report ? (
        <TrackRecordDashboard report={report} tab={tab} games={games} gameQuery={gameQuery} gameLeagues={gameLeagues} />
      ) : (
        <section>
          <h1 className="font-display text-4xl tracking-wide">Track Record</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink">The track record is being refreshed. Please check back shortly.</p>
          {SHOW_FULL_RESULTS_LINK && (
            <Link href="/results" className="mt-3 inline-block font-data text-xs text-accent hover:underline">
              View full results →
            </Link>
          )}
        </section>
      )}

      {/* ── OUR PARTNERS ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-wide">Partner Offers</h2>
          <Link href="/offers" className="font-data text-xs text-accent hover:underline">
            All Partner Offers →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Bet10BannerCard />
          <CopyBetBannerCard />
          <GrosvenorBannerCard />
        </div>
      </section>

      <BetwayPromo />
    </div>
  );
}

