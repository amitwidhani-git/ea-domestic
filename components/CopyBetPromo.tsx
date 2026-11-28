import PromoBanner from "@/components/PromoBanner";

export default function CopyBetPromo() {
  return (
    <PromoBanner
      id="copybet"
      name="CopyBet"
      logo="/copybet-logo.png"
      logoClass="h-[24.48px] w-auto sm:h-[30.6px]"
      headline={
        <>
          Bet £20 <span className="text-[#CEE53F]">Get £20</span>
        </>
      }
      terms={
        <>
          Plus up to 15% daily profit boost. T&amp;Cs apply. Responsible gambling. Betting
          involves risks. begambleaware.org
        </>
      }
    />
  );
}
