import PromoBanner from "@/components/PromoBanner";

export default function MogobetPromo() {
  return (
    <PromoBanner
      id="mogobet"
      name="MogoBet"
      logo="/mogobet-logo.png"
      logoClass="h-6 w-auto sm:h-8"
      headline={
        <>
          Deposit &amp; Bet £10 <span className="text-[#FF0B00]">Get £30 Free Bet</span>
        </>
      }
      terms={
        <>
          New Players Only. Min £10 qualifying bets, stake not returned. Free bet - one-time stake of
          £30, min odds 1.5, stake not returned. 1X wager the winnings. Wager from real balance first.
          Wager calculated on bonus bets only. Max conversion: £200. Free bets and Bonuses are valid for
          7 days. Limited to 1 sport &amp; 5 casino brand/s within the network. Withdrawal requests void
          all active/pending bonuses. Excluded Skrill and Neteller deposits. Full Terms Apply.
        </>
      }
    />
  );
}
