export default function BetrinoPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/betrino-logo.png"
          alt="Betrino"
          className="h-6 w-auto shrink-0 object-contain sm:h-8"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Bet £10 <span className="text-[#00DFB4]">Get £10 Free</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            New Players Only. Min £/€/$10 qualifying bets, stake not returned. Free bet - one-time stake
            of £/€/$10, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance
            first. Wager calculated on bonus bets only. Max conversion: £/€/$200. Free bets are valid for
            7 days. Limited to 1 sport &amp; 5 casino brand&apos;s within the network. Withdrawal requests
            void all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms Apply.
          </p>
        </div>
        <a
          href="/go/betrino"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#00DFB4] px-4 py-2 font-display text-base tracking-wider text-[#000818] transition-[filter] hover:brightness-105"
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
