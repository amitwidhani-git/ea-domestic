export default function BetrinoBannerCard() {
  return (
    <div className="bg-panel p-4">
      <a
        href="/go/betrino"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden border border-[#00DFB4]/40"
      >
        <img
          src="/betrino-banner-improved.svg"
          alt="Betrino — Bet £10 Get £10 Free"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-ink" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/betrino"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap border border-accent bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-bg transition-colors hover:bg-accent/80"
      >
        Claim Offer
      </a>
    </div>
  );
}
