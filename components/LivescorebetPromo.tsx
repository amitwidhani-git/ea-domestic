import PromoBanner from "@/components/PromoBanner";

export default function LivescorebetPromo() {
  return (
    <PromoBanner
      id="livescorebet"
      name="LiveScoreBet"
      logo="/livescorebet-logo.png"
      logoClass="h-4 w-auto sm:h-5"
      headline={
        <>
          Bet £10 <span className="text-[#FF5500]">Get £30 In Free Bets</span>
        </>
      }
      terms={
        <>
          New members only. £10+ bet on sports (ex. Virtuals) 1.5 min odds, settled within 14 days.
          Free Bets: accept in 7 days, valid 7 days; £20 use on sportsbook, £10 on Bet Builder. Stake
          not returned. T&amp;Cs + deposit exclusions apply. Bet Responsibly. GambleAware.org. 18+
        </>
      }
    />
  );
}
