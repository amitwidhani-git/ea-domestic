import PromoBanner from "@/components/PromoBanner";

export default function BetanoPromo() {
  return (
    <PromoBanner
      id="betano"
      name="Betano"
      logo="/betano-logo.png"
      logoClass="h-[24.48px] w-auto sm:h-[30.6px]"
      headline={
        <>
          Football Rewards: Bet £10 <span className="text-[#ff3c00]">Get £30</span>
        </>
      }
      terms={
        <>
          18+ New Customers. Opt in, deposit and bet £10+ on any football (odds 1/1+) within 3 days of
          sign up. Get 3x£10 Free Bets for set football markets. Bonuses expire in 14 days. Click for
          T&amp;Cs. GambleAware.org
        </>
      }
    />
  );
}
