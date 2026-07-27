export default function FruityKingPromo() {
  return (
    <section>
      <div className="bg-[#0090C0] p-3 sm:p-4">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <img
            src="/fruityking-logo.png"
            alt="Fruity King"
            className="h-6 w-auto shrink-0 object-contain sm:h-8"
          />
          <div className="min-w-0 text-center sm:flex-1">
            <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
              Bet £10 <span className="text-[#F08020]">Get £30 Free Bets</span>
            </p>
            <p className="mt-1 font-data text-[7px] leading-relaxed text-ink">
              New Players Only. Min £/€/$10 qualifying bets, stake not returned. Free bet - one-time stake
              of £/€/$30, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance
              first. Wager calculated on bonus bets only. Max conversion: £/€/$200. Free bets and Bonuses
              are valid for 7 days. Limited to 1 sport &amp; 5 casino brand/s within the network. Withdrawal
              requests void all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms
              apply.
            </p>
          </div>
          <a
            href="/go/fruity-king"
            target="_blank"
            rel="sponsored noopener"
            className="shrink-0 inline-flex items-center justify-center border border-[#F08020] bg-[#F08020] px-4 py-2 font-display text-base tracking-wider text-[#f7f5f0] transition-colors hover:bg-[#c9691a]"
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
