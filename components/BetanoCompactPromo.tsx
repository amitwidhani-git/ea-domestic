export default function BetanoCompactPromo() {
  return (
    <section>
      <div className="bg-[#ff3c00]/15 p-1.5 sm:p-2">
        <div className="flex items-center justify-between gap-2">
          <img
            src="/betano-logo.png"
            alt="Betano"
            className="h-4 w-auto shrink-0 object-contain sm:h-5"
          />
          <div className="hidden min-w-0 flex-1 px-2 text-center sm:block">
            <p className="font-display text-xs uppercase tracking-wide text-ink">
              Bet £10 <span className="text-[#ff3c00]">Get £30</span>
            </p>
            <p className="mt-0.5 font-data text-[7px] leading-relaxed text-ink">
              18+ New Customers. Opt in, deposit and bet £10+ on any football (odds 1/1+) within 3 days of
              sign up. Get 3x£10 Free Bets for set football markets. Bonuses expire in 14 days. Click for
              T&amp;Cs. GambleAware.org
            </p>
          </div>
          <a
            href="/go/betano"
            target="_blank"
            rel="sponsored noopener"
            className="shrink-0 inline-flex items-center justify-center border border-[#ff3c00] bg-[#ff3c00] px-2 py-1 font-display text-[10px] tracking-wider text-[#f7f5f0] transition-colors hover:bg-[#e42f00]"
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
