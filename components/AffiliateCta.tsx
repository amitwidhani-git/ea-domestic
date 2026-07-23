import type { Affiliate } from "@/lib/affiliates";
export default function AffiliateCta({ affiliate, price }: { affiliate: Affiliate; price?: number }) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-2">
        <span className="font-data text-[9px] uppercase tracking-widest text-muted" aria-label="Advertisement">Ad·18+</span>
        <a href={`/go/${affiliate.id}`} target="_blank" rel="sponsored noopener"
          className="border border-accent bg-accent/10 px-3 py-1.5 font-data text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-bg">
          {price ? `Back at ${price.toFixed(2)} · ${affiliate.name}` : affiliate.name} →
        </a>
      </span>
      {affiliate.termsHref && <a href={affiliate.termsHref} target="_blank" rel="nofollow noopener" className="font-data text-[9px] text-muted underline">{affiliate.termsLabel ?? "T&Cs apply"}</a>}
    </span>
  );
}
