import PromoBanner from "@/components/PromoBanner";

export default function BetrinoPromo() {
  return (
    <PromoBanner
      id="betrino"
      name="Betrino"
      logo="/betrino-logo.png"
      logoClass="h-6 w-auto sm:h-8"
      headline={
        <>
          Bet £10 <span className="text-[#00DFB4]">Get £10 Free</span>
        </>
      }
      terms={
        <>
          New Players Only. Min £/€/$10 qualifying bets, stake not returned. Free bet - one-time stake
          of £/€/$10, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance
          first. Wager calculated on bonus bets only. Max conversion: £/€/$200. Free bets are valid for
          7 days. Limited to 1 sport &amp; 5 casino brand&apos;s within the network. Withdrawal requests
          void all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms Apply.
        </>
      }
    />
  );
}
