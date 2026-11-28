import PromoBanner from "@/components/PromoBanner";

export default function Bet247Promo() {
  return (
    <PromoBanner
      id="247bet"
      name="247Bet"
      logo="/247bet-logo.png"
      logoClass="h-6 w-auto sm:h-7"
      headline={
        <>
          Bet £20 <span className="text-[#26DE2E]">Get A £20 Free Bet</span>
        </>
      }
      terms={
        <>
          New players only. T&amp;Cs apply. Play responsibly. gamcare.org.uk. 18+ for New Players Only.
          Min deposit £20. Offer is a £20 free bet when you bet £20 in one single transaction, on any
          sports at odds of 2.00 or higher. Free Bet credited upon qualifying bet settlement. Free Bet
          can be redeemed on any sports market and used in one single transaction. Winnings from free
          bet are cash and immediately withdrawable. Free bet expires 7 days after being credited. Free
          Bets not withdrawable. Bet stakes not included in returns. Affordability checks apply. Terms
          apply. Please gamble responsibly. GambleAware.org.
        </>
      }
    />
  );
}
