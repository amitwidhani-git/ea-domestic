"use client";
import type { LiveMatch } from "@/lib/liveFixtures";

// Raw label keys as written by the poller (API-Football's own stat names).
// Not every field is present for every match (varies by competition/fixture),
// so rows are filtered down to whichever ones actually showed up below —
// no "Fouls" field exists in this source, unlike the match_stats pipeline
// that powers /matches/[matchId], so that's left out rather than faked.
const STAT_ROWS: { key: string; label: string }[] = [
  { key: "Ball Possession", label: "Possession" },
  { key: "Total Shots", label: "Shots" },
  { key: "Shots on Goal", label: "Shots on Target" },
  { key: "Shots off Goal", label: "Shots off Target" },
  { key: "Shots insidebox", label: "Shots Inside Box" },
  { key: "Shots outsidebox", label: "Shots Outside Box" },
  { key: "Blocked Shots", label: "Blocked Shots" },
  { key: "expected_goals", label: "xG" },
  { key: "Corner Kicks", label: "Corners" },
  { key: "Free Kicks", label: "Free Kicks" },
  { key: "Offsides", label: "Offsides" },
  { key: "Yellow Cards", label: "Yellow Cards" },
  { key: "Red Cards", label: "Red Cards" },
];

function numeric(v: number | string | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function Row({ label, home, away }: { label: string; home: number | string; away: number | string }) {
  const h = numeric(home), a = numeric(away);
  const total = h + a;
  const homePct = total > 0 ? (h / total) * 100 : 50;
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between font-data text-[13px] font-semibold">
        <span>{home}</span>
        <span className="font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <span>{away}</span>
      </div>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line">
        <div style={{ width: `${homePct}%` }} className="bg-accent" />
        <div style={{ width: `${100 - homePct}%` }} className="bg-info" />
      </div>
    </div>
  );
}

export default function LiveStatsTab({ match }: { match: LiveMatch }) {
  const rows = STAT_ROWS.filter((r) => match.stats.home[r.key] !== undefined || match.stats.away[r.key] !== undefined);

  if (rows.length === 0) {
    return <p className="font-body text-[13px] text-muted">Match stats aren&apos;t available yet — check back once the game is underway.</p>;
  }

  return (
    <div className="divide-y divide-line">
      {rows.map((r) => (
        <Row key={r.key} label={r.label} home={match.stats.home[r.key] ?? 0} away={match.stats.away[r.key] ?? 0} />
      ))}
    </div>
  );
}
