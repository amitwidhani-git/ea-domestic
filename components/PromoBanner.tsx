"use client";
import { trackAffiliateClick } from "@/lib/gtag";

const External = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </svg>
);

/**
 * Operator promotion as one clickable surface: the headline is the tracked
 * /go/ link (same destination, rel and affiliate_click event the Claim Offer
 * button had), stretched over the whole banner so logo, terms and the
 * "Claim Offer" cue all click through. There are no other interactive
 * elements inside, so nothing is nested in the link.
 */
export default function PromoBanner({ id, name, logo, logoClass, headline, extras = null, terms }: {
  /** Affiliate id: the /go/ path segment and the tracked bookmaker. */
  id: string;
  name: string;
  logo: string;
  logoClass: string;
  headline: React.ReactNode;
  extras?: React.ReactNode;
  terms: React.ReactNode;
}) {
  return (
    <section aria-label={`Advertisement: ${name}`}
      className="promo-card promo-flat group relative -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 rounded-[6px] px-3 py-3 transition-colors sm:grid-cols-[148px_minmax(0,1fr)_auto]">
      <img src={logo} alt={name} className={`col-start-1 row-start-1 max-w-[148px] shrink-0 object-contain object-left sm:row-span-2 ${logoClass}`} />

      <span className="col-start-2 row-start-1 justify-self-end self-start font-data text-[10.5px] text-muted sm:col-start-3">Ad</span>

      <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1">
        <p className="font-display text-lg uppercase leading-tight tracking-wide text-ink sm:text-xl">
          <a href={`/go/${id}`} target="_blank" rel="sponsored noopener"
            onClick={() => trackAffiliateClick({ bookmaker: id })}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            <span className="sr-only">{name}: </span>
            {headline}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        {extras}
        <p className="mt-1.5 font-data text-[10.5px] leading-relaxed text-muted">{terms}</p>
      </div>

      <span aria-hidden="true"
        className="col-span-2 row-start-3 inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-ink underline-offset-4 group-hover:underline sm:col-span-1 sm:col-start-3 sm:row-start-2 sm:justify-self-end sm:self-end">
        Claim Offer <External />
      </span>
    </section>
  );
}
