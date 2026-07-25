import type { Affiliate } from "@/lib/affiliates";
export default function AffiliateCard({ affiliate }: { affiliate: Affiliate }) {
  const banner = affiliate.banners?.["120x60"];
  const hasBanner = banner && /^https?:\/\//.test(banner.src);
  return (
    <article className="relative border border-line bg-panel p-4">
      {affiliate.badge && <span className="absolute -top-2 right-3 bg-accent px-1.5 py-0.5 font-data text-[9px] font-semibold uppercase tracking-widest text-bg">{affiliate.badge}</span>}
      <div className="flex items-center gap-3">
        {hasBanner ? <img src={banner.src} width={banner.w} height={banner.h} alt={`${affiliate.name} offer`} /> :
          <span className="flex h-10 w-10 items-center justify-center font-display text-lg" style={{ background: affiliate.brandColor ?? "#C8FF00", color: "#080808" }}>{affiliate.logoInitials}</span>}
        <div>
          <h3 className="font-display text-lg leading-none tracking-wide">{affiliate.name}</h3>
          {affiliate.tagline && <p className="mt-1 font-data text-[10px] text-ink">{affiliate.tagline}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-data text-[9px] uppercase tracking-widest text-ink">Ad·18+</span>
        <a href={`/go/${affiliate.id}`} target="_blank" rel="sponsored noopener" className="font-data text-xs font-semibold text-accent hover:underline">Visit →</a>
      </div>
      {affiliate.termsHref && <a href={affiliate.termsHref} target="_blank" rel="nofollow noopener" className="mt-1 inline-block font-data text-[9px] text-ink underline">{affiliate.termsLabel ?? "T&Cs apply"}</a>}
    </article>
  );
}
