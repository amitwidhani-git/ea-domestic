export default function FruityKingCompactPromo() {
  return (
    <section>
      <div className="bg-[#0090C0] p-1.5 sm:p-2">
        <div className="flex items-center justify-between gap-2">
          <img
            src="/fruityking-logo.png"
            alt="Fruity King"
            className="h-4 w-auto shrink-0 object-contain sm:h-5"
          />
          <div className="hidden min-w-0 flex-1 px-2 text-center sm:block">
            <p className="font-display text-xs uppercase tracking-wide text-ink">
              Bet £10 <span className="text-[#F08020]">Get £30 Free Bets</span>
            </p>
            <p className="mt-0.5 font-data text-[7px] leading-relaxed text-ink">
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
            className="shrink-0 inline-flex items-center justify-center border border-[#F08020] bg-[#F08020] px-2 py-1 font-display text-[10px] tracking-wider text-[#f7f5f0] transition-colors hover:bg-[#c9691a]"
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
