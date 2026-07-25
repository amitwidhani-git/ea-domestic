/**
 * BestOddsBar — sits below the prob bar on every prediction card.
 *
 * When an EV signal exists for this match: shows the specific best price
 * from the matched affiliate (highest-intent placement).
 *
 * When no odds match: rotates through active affiliates deterministically
 * based on match_id hash so the same fixture always shows the same affiliate
 * (no flicker, consistent on re-render).
 *
 * Always carries Ad·18+ and T&Cs — ASA requirement adjacent to a price.
 */
import type { Affiliate } from "@/lib/affiliates";

interface Props {
  matchId: string;
  affiliates: Affiliate[];
  // When odds data is available (from fetch_odds.py)
  bestPrice?: number;
  bestBookmaker?: string;
  pick?: "home" | "draw" | "away";
  ev?: number; // if positive, show EV badge
}

const PICK_LABEL = { home: "Home", draw: "Draw", away: "Away" } as const;

function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

export default function BestOddsBar({ matchId, affiliates, bestPrice, bestBookmaker, pick, ev }: Props) {
  if (affiliates.length === 0) return null;

  // Pick affiliate: matched bookmaker first, else rotate by match hash
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matched = bestBookmaker
    ? affiliates.find((a) =>
        norm(a.id) === norm(bestBookmaker) ||
        norm(a.name) === norm(bestBookmaker) ||
        (a.aliases ?? []).some((al) => norm(al) === norm(bestBookmaker))
      )
    : null;
  const affiliate = matched ?? affiliates[hashIndex(matchId, affiliates.length)];
  const showEv = ev !== undefined && ev > 0.05;

  return (
    <div
      className="mt-3 flex items-center justify-between gap-2 border-t pt-3"
      style={{ borderColor: "rgba(247,245,240,0.08)" }}
    >
      {/* Left: affiliate identity */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center font-display text-xs"
          style={{
            background: affiliate.brandColor ?? "#C8FF00",
            color: "#080808",
          }}
          aria-hidden="true"
        >
          {affiliate.logoInitials}
        </span>
        <div className="min-w-0">
          <p className="font-data text-[10px] leading-none text-ink truncate">
            {affiliate.name}
            {affiliate.badge && (
              <span className="ml-1.5 border border-accent/50 px-1 py-0.5 text-[8px] text-accent">
                {affiliate.badge}
              </span>
            )}
          </p>
          {affiliate.termsHref && (
            <a
              href={affiliate.termsHref}
              target="_blank"
              rel="nofollow noopener"
              className="font-data text-[9px] text-ink underline leading-none"
            >
              {affiliate.termsLabel ?? "T&Cs apply"}
            </a>
          )}
        </div>
      </div>

      {/* Right: price + CTA */}
      <div className="flex shrink-0 items-center gap-2">
        {showEv && (
          <span className="font-data text-[9px] text-accent border border-accent/40 px-1.5 py-0.5">
            +{((ev ?? 0) * 100).toFixed(0)}% EV
          </span>
        )}
        {bestPrice && pick && (
          <span className="font-data text-xs font-semibold text-ink">
            {PICK_LABEL[pick]} {bestPrice.toFixed(2)}
          </span>
        )}
        <span className="font-data text-[9px] text-ink" aria-label="Advertisement">
          Ad·18+
        </span>
        <a
          href={`/go/${affiliate.id}`}
          target="_blank"
          rel="sponsored noopener"
          className="border border-accent bg-accent/10 px-2.5 py-1 font-data text-[11px] font-semibold text-accent transition-colors hover:bg-accent hover:text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap"
        >
          {bestPrice ? `Back at ${bestPrice.toFixed(2)}` : "Claim Offer"} →
        </a>
      </div>
    </div>
  );
}
