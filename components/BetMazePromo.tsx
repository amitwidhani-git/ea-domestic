export default function BetMazePromo() {
  return (
    <section>
      <div className="bg-[#0EA5E9]/15 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <img
            src="/betmaze-logo.png"
            alt="BETMAZE"
            className="mt-4 h-8 w-auto shrink-0 object-contain sm:h-10"
          />
          <div className="hidden min-w-0 flex-1 text-center sm:block">
            <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
              Bet £10 <span className="text-[#FFC21E]">Get £10 Free Bet</span>
            </p>
            <p className="mt-1 font-data text-[7px] leading-relaxed text-ink">
              New Players Only. Min £10 qualifying bets, stake not returned. Free bet - one-time stake of
              £10, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance first.
              Wager calculated on bonus bets only. Max conversion: £200. Free bets and Bonuses are valid
              for 7 days. Limited to 1 sport &amp; 5 casino brand/s within the network. Withdrawal
              requests void all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms
              Apply.
            </p>
          </div>
          <a
            href="/go/betmaze"
            target="_blank"
            rel="sponsored noopener"
            className="shrink-0 inline-flex items-center justify-center border border-[#FFC21E] bg-[#FFC21E] px-4 py-2 font-display text-base tracking-wider text-[#0A0E1E] transition-colors hover:bg-[#e0a800]"
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
