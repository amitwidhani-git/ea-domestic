export default function FruityKingBannerCard() {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <a
        href="/go/fruity-king"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden rounded-[10px] border border-[#F08020]/40"
      >
        <img
          src="/fruityking-banner-preview-4x.png"
          alt="Fruity King — Bet £10 Get £30 Free Bets"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-muted" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/fruity-king"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap rounded-[10px] bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-accent-fg transition-[filter] hover:brightness-105"
      >
        Claim Offer
      </a>
    </div>
  );
}
