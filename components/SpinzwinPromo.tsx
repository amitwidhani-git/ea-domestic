import PromoBanner from "@/components/PromoBanner";

export default function SpinzwinPromo() {
  return (
    <PromoBanner
      id="spinzwin"
      name="Spinzwin"
      logo="/spinzwin-logo.png"
      logoClass="h-8 w-auto sm:h-10"
      headline={
        <>
          Bet £10 <span className="text-[#3CE619]">Get £20 Free Bets</span>
        </>
      }
      terms={
        <>
          New Players Only. Min £/€/$10 qualifying bets, stake not returned. Free bet - one-time stake
          of £/€/$20, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance
          first. Wager calculated on bonus bets only. Max conversion: £/€/$200. Free bets and Bonuses
          are valid for 7 days. Limited to 1 sport &amp; 5 casino brand/s within the network. Withdrawal
          requests void all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms
          apply.
        </>
      }
    />
  );
}
