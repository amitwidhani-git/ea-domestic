export default function Bet10BannerCard() {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <a
        href="/go/10bet"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden rounded-[10px]"
      >
        <img
          src="/10bet-banner-improved.svg"
          alt="10bet — Sports Welcome Bonus, 100% up to £50"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-muted" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/10bet"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap rounded-[10px] bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-accent-fg transition-[filter] hover:brightness-105"
      >
        Claim Offer
      </a>
    </div>
  );
}
