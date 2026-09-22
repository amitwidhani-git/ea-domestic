import type { Metadata } from "next";
import type { ComponentType } from "react";
import BetanoPromo from "@/components/BetanoPromo";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import MogobetPromo from "@/components/MogobetPromo";
import FruityKingPromo from "@/components/FruityKingPromo";
import BetrinoPromo from "@/components/BetrinoPromo";
import BetsunaPromo from "@/components/BetsunaPromo";
import BetMazePromo from "@/components/BetMazePromo";
import SpinzwinPromo from "@/components/SpinzwinPromo";
import MonsterCasinoPromo from "@/components/MonsterCasinoPromo";
import Bet247Promo from "@/components/Bet247Promo";
import BetwayPromo from "@/components/BetwayPromo";
import Bet10Promo from "@/components/Bet10Promo";
import GrosvenorPromo from "@/components/GrosvenorPromo";
import CopyBetPromo from "@/components/CopyBetPromo";
import { getAffiliateList, isLive } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Bet & Betting Offers — EdgeAnalysts",
  description: "Compare UK free bet and sign-up offers from trusted betting partners, ranked market leaders first and updated alongside our EdgeIQ predictions.",
};

// Each partner has its own bespoke promo card (real logo, live offer copy,
// operator-specific T&Cs) — there's no generic template that fits all of
// them, so we keep one component per id and just decide which ones render
// and in what order from the affiliate list's `priority` field.
const PROMO_BY_ID: Record<string, ComponentType> = {
  betano: BetanoPromo,
  livescorebet: LivescorebetPromo,
  mogobet: MogobetPromo,
  "fruity-king": FruityKingPromo,
  betrino: BetrinoPromo,
  betsuna: BetsunaPromo,
  betmaze: BetMazePromo,
  spinzwin: SpinzwinPromo,
  "monster-sports": MonsterCasinoPromo,
  "247bet": Bet247Promo,
  betway: BetwayPromo,
  "10bet": Bet10Promo,
  grosvenor: GrosvenorPromo,
  copybet: CopyBetPromo,
};

export default async function OffersPage() {
  // getAffiliateList() already returns affiliates sorted by `priority`
  // (market leaders first) — editable live in Atlas, no redeploy needed.
  const affiliates = (await getAffiliateList()).filter(isLive);

  return (
    <div className="space-y-8">
      <BetanoPromo />

      <section>
        <h1 className="font-display text-4xl tracking-wide">Partner Offers</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink">
          Free bet offers from our trusted partners, updated alongside our EdgeIQ football
          predictions across the UK and Europe.
        </p>
      </section>

      <div className="space-y-4">
        {affiliates.map((a) => {
          const Promo = PROMO_BY_ID[a.id];
          return Promo ? <Promo key={a.id} /> : null;
        })}
      </div>

      <BetwayPromo />
    </div>
  );
}
