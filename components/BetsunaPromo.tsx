import PromoBanner from "@/components/PromoBanner";

export default function BetsunaPromo() {
  return (
    <PromoBanner
      id="betsuna"
      name="Betsuna"
      logo="/betsuna-logo.png"
      logoClass="h-6 w-auto sm:h-8"
      headline={
        <>
          Bet £10 <span className="text-[#F42807]">Get £50 Free Bet</span>
        </>
      }
      terms={
        <>
          New Players Only. Wager from real balance first. 10X wager the bonus money within 30 days and
          10x wager any winnings from the free spins within 7 days. Contribution varies per game.
          Available on selected games only. Wager calculated on bonus bets only. Bonus and any winnings
          from the bonus are valid for 30 days / Free spins and any winnings from the free spins are
          valid for 7 days from receipt. Max conversion: 1 times the bonus amount or from free spins:
          20. Limited to 5 brands within the network. Withdrawal requests void all active/pending
          bonuses. Excluded Skrill and Neteller deposits. Full Terms Apply.
        </>
      }
    />
  );
}
