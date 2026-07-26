export default function BetsunaCompactPromo() {
  return (
    <section>
      <div className="bg-[#F42807]/15 p-1.5 sm:p-2">
        <div className="flex items-center justify-between gap-2">
          <img
            src="/betsuna-logo.png"
            alt="Betsuna"
            className="h-4 w-auto shrink-0 object-contain sm:h-5"
          />
          <div className="hidden min-w-0 flex-1 px-2 text-center sm:block">
            <p className="font-display text-xs uppercase tracking-wide text-ink">
              Bet £10 <span className="text-[#F42807]">Get £50 Free Bet</span>
            </p>
            <p className="mt-0.5 font-data text-[7px] leading-relaxed text-ink">
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
            className="shrink-0 inline-flex items-center justify-center border border-[#F42807] bg-[#F42807] px-2 py-1 font-display text-[10px] tracking-wider text-[#f7f5f0] transition-colors hover:bg-[#c22006]"
          >
            Claim Offer
          </a>
        </div>
      </div>
      <span className="mt-1 block font-data text-[9px] text-ink" aria-label="Advertisement">
        Ad
      </span>
    </section>
  );
}
