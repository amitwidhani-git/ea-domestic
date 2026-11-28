import PromoBanner from "@/components/PromoBanner";

export default function BetwayPromo() {
  return (
    <PromoBanner
      id="betway"
      name="Betway"
      logo="/betway-logo.png"
      logoClass="h-6 w-auto sm:h-8"
      headline={
        <>
          <span className="text-[#009900]">£30 Matched Free Bet</span>{" "}
          <span className="text-ink">If Your First Acca Loses</span>
        </>
      }
      extras={
        <p className="mt-1.5 flex flex-wrap items-center justify-start gap-1.5">
          <span className="rounded-md bg-[#0066FF] px-2 py-0.5 font-data text-[10px] font-bold uppercase tracking-wide text-white">
            +100 Free Spins
          </span>
          <span className="rounded-md bg-[#0066FF] px-2 py-0.5 font-data text-[10px] font-bold uppercase tracking-wide text-white">
            +£30 Uber Eats Voucher
          </span>
        </p>
      }
      terms={
        <>
          New UK customers only. Min Stake: £5. Maximum Free Bet: £30. First bet on a Football, Horse
          Racing, Tennis, Cricket or Basketball multiple with 3+ selections. Overall odds: 3.00 (2/1)
          or higher. Free Bets available upon settlement of the qualifying bet. 100 Free Spins on More
          Unusual Suspects (£0.10 per spin) credited on settlement of qualifying Acca bet. No wagering
          requirements on free spin winnings. Earn a £30 Uber Eats Voucher on successful Acca
          qualification. Debit Card deposit only (exclusions apply). This offer is valid 7 days from
          the new account being registered. 18+ GambleAware.org. Bet the Responsible Way. Full Terms
          apply.
        </>
      }
    />
  );
}
