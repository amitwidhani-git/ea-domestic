export default function BetanoPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/betano-logo.png"
          alt="Betano"
          className="h-[24.48px] w-auto shrink-0 object-contain sm:h-[30.6px]"
        />
        <div className="min-w-0 text-center sm:flex-1 sm:px-4">
          <p className="flex flex-wrap items-baseline justify-center gap-2">
            <span className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">Football Rewards:</span>
            <span className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
              Bet £10 <span className="text-[#ff3c00]">Get £30</span>
            </span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            18+ New Customers. Opt in, deposit and bet £10+ on any football (odds 1/1+) within 3 days of
            sign up. Get 3x£10 Free Bets for set football markets. Bonuses expire in 14 days. Click for
            T&amp;Cs. GambleAware.org
          </p>
        </div>
        <a
          href="/go/betano"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#ff3c00] px-[17px] py-[8.5px] font-display text-[15.3px] tracking-wider text-white transition-[filter] hover:brightness-105"
        >
          Claim Offer
        </a>
      </div>
      <span className="mt-1.5 block font-data text-[9px] text-muted" aria-label="Advertisement">
        Ad
      </span>
    </section>
  );
}
