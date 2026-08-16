export default function LivescorebetPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/livescorebet-logo.png"
          alt="LiveScoreBet"
          className="h-4 w-auto shrink-0 object-contain sm:h-5"
        />
        <div className="min-w-0 text-center sm:flex-1 sm:text-left">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Bet £10 <span className="text-[#FF5500]">Get £30 In Free Bets</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            New members only. £10+ bet on sports (ex. Virtuals) 1.5 min odds, settled within 14 days.
            Free Bets: accept in 7 days, valid 7 days; £20 use on sportsbook, £10 on Bet Builder. Stake
            not returned. T&amp;Cs + deposit exclusions apply. Bet Responsibly. GambleAware.org. 18+
          </p>
        </div>
        <a
          href="/go/livescorebet"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#FF5500] px-4 py-2.5 font-display text-base tracking-wider text-white transition-[filter] hover:brightness-105"
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
