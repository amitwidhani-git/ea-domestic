export default function LivescorebetBannerCard() {
  return (
    <div className="bg-panel p-4">
      <a
        href="/go/livescorebet"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden border border-[#FF5500]/40"
      >
        <img
          src="/livescorebet-banner-improved.svg"
          alt="LiveScoreBet — Bet £10 Get £30 in Free Bets"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-ink" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/livescorebet"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap border border-accent bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-bg transition-colors hover:bg-accent/80"
      >
        Claim Offer
      </a>
    </div>
  );
}
