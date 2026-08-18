export default function MonsterCasinoBannerCard() {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <a
        href="/go/monster-sports"
        target="_blank"
        rel="sponsored noopener"
        className="block overflow-hidden rounded-[10px] border border-[#F0D000]/40"
      >
        <img
          src="/monstercasino-banner-improved.svg"
          alt="Monster Casino & Sports — Bet £10 Get £30 Free Bets"
          className="block h-auto w-full"
        />
      </a>
      <span className="mt-1 block font-data text-[9px] text-muted" aria-label="Advertisement">
        Ad
      </span>
      <a
        href="/go/monster-sports"
        target="_blank"
        rel="sponsored noopener"
        className="mt-2 flex items-center justify-center whitespace-nowrap rounded-[10px] bg-accent px-[17px] py-1 font-display text-[15.3px] tracking-wider text-accent-fg transition-[filter] hover:brightness-105"
      >
        Claim Offer
      </a>
    </div>
  );
}
