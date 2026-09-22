export default function GrosvenorPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 promo-card rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        <img
          src="/grosvenor-logo.png"
          alt="Grosvenor Sports"
          className="h-8 w-auto shrink-0 object-contain sm:h-10"
        />
        <div className="min-w-0 text-center sm:flex-1">
          <p className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
            Double Your Odds <span className="text-[#E8B84B]">Any Bet Any Sports</span>
          </p>
          <p className="mt-1 font-data text-[7px] leading-relaxed text-muted">
            New Customers Only. Customers need to have made a deposit of £10 to be eligible.
            Deposits made through PayPal and Paysafe will not qualify for our welcome offer.
            T&amp;Cs Apply. 18+ Only.
          </p>
        </div>
        <a
          href="/go/grosvenor"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#E8B84B] px-4 py-2 font-display text-base tracking-wider text-[#1C183D] transition-[filter] hover:brightness-105"
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
