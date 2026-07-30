export default function LivescorebetPromo() {
  return (
    <section>
      <div className="bg-[#FF5500]/15 p-3 sm:p-4">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <img
            src="/livescorebet-logo.png"
            alt="LiveScoreBet"
            className="h-4 w-auto shrink-0 object-contain sm:h-5"
          />
          <div className="min-w-0 text-center sm:flex-1">
            <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
              Bet £10 <span className="text-[#FF5500]">Get £30 In Free Bets</span>
            </p>
            <p className="mt-1 font-data text-[7px] leading-relaxed text-ink">
              New members only. £10+ bet on sports (ex. Virtuals) 1.5 min odds, settled within 14 days.
              Free Bets: accept in 7 days, valid 7 days; £20 use on sportsbook, £10 on Bet Builder. Stake
              not returned. T&amp;Cs + deposit exclusions apply. Bet Responsibly. GambleAware.org. 18+
            </p>
          </div>
          <a
            href="/go/livescorebet"
            target="_blank"
            rel="sponsored noopener"
            className="shrink-0 inline-flex items-center justify-center border border-[#FF5500] bg-[#FF5500] px-4 py-2 font-display text-base tracking-wider text-[#f7f5f0] transition-colors hover:bg-[#cc4400]"
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
