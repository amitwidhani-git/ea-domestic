export default function FruityKingBannerCard() {
  return (
    <div className="bg-panel p-4">
      <a
        href="/go/fruity-king"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden border border-[#F08020]/40"
      >
        <img
          src="/fruityking-banner-preview-4x.png"
          alt="Fruity King — Bet £10 Get £30 Free Bets"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-ink" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/fruity-king"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap border border-accent bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-accent-fg transition-colors hover:bg-accent/80"
      >
        Claim Offer
      </a>
    </div>
  );
}
