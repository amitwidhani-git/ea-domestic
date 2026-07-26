export default function BetrinoCompactPromo() {
  return (
    <section>
      <div className="bg-[#00DFB4]/15 p-1.5 sm:p-2">
        <div className="flex items-center justify-between gap-2">
          <img
            src="/betrino-logo.png"
            alt="Betrino"
            className="h-4 w-auto shrink-0 object-contain sm:h-5"
          />
          <div className="hidden min-w-0 flex-1 px-2 text-center sm:block">
            <p className="font-display text-xs uppercase tracking-wide text-ink">
              Bet £10 <span className="text-[#00DFB4]">Get £10 Free</span>
            </p>
            <p className="mt-0.5 font-data text-[7px] leading-relaxed text-ink">
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
            className="shrink-0 inline-flex items-center justify-center border border-[#00DFB4] bg-[#00DFB4] px-2 py-1 font-display text-[10px] tracking-wider text-[#000818] transition-colors hover:bg-[#00c4a0]"
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
