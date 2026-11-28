import PromoBanner from "@/components/PromoBanner";

export default function Bet10Promo() {
  return (
    <PromoBanner
      id="10bet"
      name="10bet"
      logo="/10bet-logo.png"
      logoClass="h-8 w-auto sm:h-10"
      headline={
        <>
          100% Welcome Bonus <span className="text-accent">Up To £50</span>
        </>
      }
      terms={
        <>
          Choose bonus at signup. Deposit and get 100% bonus up to £50. Wager bonus 10x.
          Withdrawals void bonus. Valid 30 days. Deposit used 1st. Odds, bet &amp; payment
          limits &amp; T&amp;Cs apply. 18+.
        </>
      }
    />
  );
}
