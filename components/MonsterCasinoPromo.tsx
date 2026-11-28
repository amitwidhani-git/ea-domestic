import PromoBanner from "@/components/PromoBanner";

export default function MonsterCasinoPromo() {
  return (
    <PromoBanner
      id="monster-sports"
      name="Monster Casino & Sports"
      logo="/monstercasino-logo.png"
      logoClass="h-8 w-auto sm:h-10"
      headline={
        <>
          Bet £10 <span className="text-[#4095EC]">Get £30 Free Bets</span>
        </>
      }
      terms={
        <>
          New Players Only. Min £/€/$10 qualifying bets, stake not returned. Free bet - one-time stake
          of £/€/$30, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance
          first. Wager calculated on bonus bets only. Max conversion: £/€/$200. Free bets and Bonuses
          are valid for 7 days. Withdrawal requests void all active/pending bonuses. Full Terms apply.
        </>
      }
    />
  );
}
