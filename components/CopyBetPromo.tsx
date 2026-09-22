export default function CopyBetPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/copybet-logo.png"
          alt="CopyBet"
          className="h-[24.48px] w-auto shrink-0 object-contain sm:h-[30.6px]"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Bet £20 <span className="text-[#CEE53F]">Get £20</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            Plus up to 15% daily profit boost. T&amp;Cs apply. Responsible gambling. Betting
            involves risks. begambleaware.org
          </p>
        </div>
        <a
          href="/go/copybet"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#CEE53F] px-4 py-2 font-display text-base tracking-wider text-[#19283C] transition-[filter] hover:brightness-105"
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
