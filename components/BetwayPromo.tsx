export default function BetwayPromo() {
  return (
    <section>
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-panel p-3 text-center shadow-[var(--shadow)] sm:flex-row sm:justify-between sm:p-4 sm:text-left">
        {/* Placeholder wordmark — swap for the real Betway logo once a clean asset is available */}
        <span className="shrink-0 font-display text-2xl font-black tracking-tight text-ink">
          Betway
        </span>
        <div className="min-w-0 text-center sm:flex-1 sm:px-4">
          <p className="font-display text-xl uppercase tracking-wide sm:text-2xl">
            <span className="text-[#009900]">£30 Matched Free Bet</span>{" "}
            <span className="text-ink">If Your First Acca Loses</span>
          </p>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="rounded-md bg-[#0066FF] px-2 py-0.5 font-data text-[10px] font-bold uppercase tracking-wide text-white">
              +100 Free Spins
            </span>
            <span className="rounded-md bg-[#0066FF] px-2 py-0.5 font-data text-[10px] font-bold uppercase tracking-wide text-white">
              +£30 Uber Eats Voucher
            </span>
          </p>
          <p className="mt-2 font-data text-[7px] leading-relaxed text-muted">
            New UK customers only. Min Stake: £5. Maximum Free Bet: £30. First bet on a Football, Horse
            Racing, Tennis, Cricket or Basketball multiple with 3+ selections. Overall odds: 3.00 (2/1)
            or higher. Free Bets available upon settlement of the qualifying bet. 100 Free Spins on More
            Unusual Suspects (£0.10 per spin) credited on settlement of qualifying Acca bet. No wagering
            requirements on free spin winnings. Earn a £30 Uber Eats Voucher on successful Acca
            qualification. Debit Card deposit only (exclusions apply). This offer is valid 7 days from
            the new account being registered. 18+ GambleAware.org. Bet the Responsible Way. Full Terms
            apply.
          </p>
        </div>
        <a
          href="/go/betway"
          target="_blank"
          rel="sponsored noopener"
          className="shrink-0 inline-flex items-center justify-center rounded-[10px] bg-[#009900] px-4 py-2 font-display text-base tracking-wider text-white transition-[filter] hover:brightness-105"
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
