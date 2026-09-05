export default function BetsunaPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/betsuna-logo.png"
          alt="Betsuna"
          className="h-6 w-auto shrink-0 object-contain sm:h-8"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Bet £10 <span className="text-[#F42807]">Get £50 Free Bet</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            New Players Only. Wager from real balance first. 10X wager the bonus money within 30 days and
            10x wager any winnings from the free spins within 7 days. Contribution varies per game.
            Available on selected games only. Wager calculated on bonus bets only. Bonus and any winnings
            from the bonus are valid for 30 days / Free spins and any winnings from the free spins are
            valid for 7 days from receipt. Max conversion: 1 times the bonus amount or from free spins:
            20. Limited to 5 brands within the network. Withdrawal requests void all active/pending
            bonuses. Excluded Skrill and Neteller deposits. Full Terms Apply.
          </p>
        </div>
        <a
          href="/go/betsuna"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#F42807] px-4 py-2 font-display text-base tracking-wider text-white transition-[filter] hover:brightness-105"
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
