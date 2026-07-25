/**
 * PromoStrip — compact horizontal affiliate strip.
 * Sits between the World Cup proof section and upcoming predictions on the homepage.
 * Scrolls horizontally on mobile. Each card: logo, name, badge, single CTA.
 * Ad disclosure on each card — ASA requirement.
 */
import type { Affiliate } from "@/lib/affiliates";
import { isLive } from "@/lib/affiliates";

export default function PromoStrip({ affiliates }: { affiliates: Affiliate[] }) {
  const live = affiliates.filter(isLive);
  if (live.length === 0) return null;

  return (
    <section aria-label="Betting partners">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-data text-[10px] uppercase tracking-[0.2em] text-ink">
          Betting Partners
        </h2>
        <span className="font-data text-[9px] text-ink">Ad · 18+ · T&Cs apply</span>
      </div>

      {/* Horizontal scroll on mobile, wrap on desktop */}
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {live.map((a) => {
          const banner = a.banners?.["120x60"];
          const hasBanner = banner && /^https?:\/\//.test(banner.src);
          return (
            <a
              key={a.id}
              href={`/go/${a.id}`}
              target="_blank"
              rel="sponsored noopener"
              aria-label={`${a.name} — ${a.tagline ?? "Sports Betting"}. ${a.termsLabel ?? "T&Cs apply"}`}
              className="group relative flex shrink-0 flex-col justify-between border border-line bg-panel transition-colors hover:border-accent/60"
              style={{ width: 160, minHeight: 88, padding: "10px 12px" }}
            >
              {/* Badge */}
              {a.badge && (
                <span className="absolute -top-2 right-2 bg-accent px-1.5 py-0.5 font-data text-[8px] font-semibold uppercase tracking-widest text-bg">
                  {a.badge}
                </span>
              )}

              {/* Top: logo + name */}
              <div className="flex items-center gap-2">
                {hasBanner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.src} width={banner.w} height={banner.h}
                    alt={`${a.name} logo`} className="h-6 w-auto object-contain" />
                ) : (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center font-display text-xs"
                    style={{ background: a.brandColor ?? "#C8FF00", color: "#080808" }}
                    aria-hidden="true"
                  >
                    {a.logoInitials}
                  </span>
                )}
                <div>
                  <p className="font-display text-sm leading-none tracking-wide text-ink group-hover:text-accent transition-colors">
                    {a.name}
                  </p>
                  {a.tagline && (
                    <p className="font-data text-[9px] text-ink">{a.tagline}</p>
                  )}
                </div>
              </div>

              {/* Bottom: CTA */}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-data text-[8px] uppercase tracking-widest text-ink">
                  Ad·18+
                </span>
                <span className="font-data text-[10px] font-semibold text-accent group-hover:underline">
                  Visit →
                </span>
              </div>
            </a>
          );
        })}
      </div>

      {/* Terms line */}
      <p className="mt-2 font-data text-[9px] text-ink">
        We earn commission if you sign up via these links — this does not affect our predictions or analysis.
        {" "}
        <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"
          className="underline hover:text-ink">BeGambleAware.org</a>
        {" · "}
        <a href="https://www.gamstop.co.uk" target="_blank" rel="noopener noreferrer"
          className="underline hover:text-ink">GamStop.co.uk</a>
      </p>
    </section>
  );
}
