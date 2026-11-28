import PromoBanner from "@/components/PromoBanner";

export default function GrosvenorPromo() {
  return (
    <PromoBanner
      id="grosvenor"
      name="Grosvenor Sports"
      logo="/grosvenor-logo.png"
      logoClass="h-8 w-auto sm:h-10"
      headline={
        <>
          Double Your Odds <span className="text-[#E8B84B]">Any Bet Any Sports</span>
        </>
      }
      terms={
        <>
          New Customers Only. Customers need to have made a deposit of £10 to be eligible.
          Deposits made through PayPal and Paysafe will not qualify for our welcome offer.
          T&amp;Cs Apply. 18+ Only.
        </>
      }
    />
  );
}
