export default function Bet247Promo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/247bet-logo.png"
          alt="247Bet"
          className="h-6 w-auto shrink-0 object-contain sm:h-7"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Bet £20 <span className="text-[#26DE2E]">Get A £20 Free Bet</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            New players only. T&amp;Cs apply. Play responsibly. gamcare.org.uk. 18+ for New Players Only.
            Min deposit £20. Offer is a £20 free bet when you bet £20 in one single transaction, on any
            sports at odds of 2.00 or higher. Free Bet credited upon qualifying bet settlement. Free Bet
            can be redeemed on any sports market and used in one single transaction. Winnings from free
            bet are cash and immediately withdrawable. Free bet expires 7 days after being credited. Free
            Bets not withdrawable. Bet stakes not included in returns. Affordability checks apply. Terms
            apply. Please gamble responsibly. GambleAware.org.
          </p>
        </div>
        <a
          href="/go/247bet"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#26DE2E] px-4 py-2 font-display text-base tracking-wider text-[#0A0E1E] transition-[filter] hover:brightness-105"
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
