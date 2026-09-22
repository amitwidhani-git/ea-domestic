export default function Bet10Promo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/10bet-logo.png"
          alt="10bet"
          className="h-8 w-auto shrink-0 object-contain sm:h-10"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            100% Welcome Bonus <span className="text-accent">Up To £50</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            Choose bonus at signup. Deposit and get 100% bonus up to £50. Wager bonus 10x.
            Withdrawals void bonus. Valid 30 days. Deposit used 1st. Odds, bet &amp; payment
            limits &amp; T&amp;Cs apply. 18+.
          </p>
        </div>
        <a
          href="/go/10bet"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-accent px-4 py-2 font-display text-base tracking-wider text-accent-fg transition-[filter] hover:brightness-105"
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
