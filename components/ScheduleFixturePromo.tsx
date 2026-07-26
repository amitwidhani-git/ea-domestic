import type { Affiliate } from "@/lib/affiliates";
import BetanoCompactPromo from "@/components/BetanoCompactPromo";
import BetMazeCompactPromo from "@/components/BetMazeCompactPromo";
import BetrinoCompactPromo from "@/components/BetrinoCompactPromo";
import BetsunaCompactPromo from "@/components/BetsunaCompactPromo";
import MogobetCompactPromo from "@/components/MogobetCompactPromo";
import FruityKingCompactPromo from "@/components/FruityKingCompactPromo";
import SpinzwinCompactPromo from "@/components/SpinzwinCompactPromo";
import MonsterCasinoCompactPromo from "@/components/MonsterCasinoCompactPromo";
import BestOddsBar from "@/components/BestOddsBar";

interface Props {
  matchId: string;
  affiliates: Affiliate[];
}

// Same rotation as BestOddsBar: deterministic hash of match_id so a given
// fixture always shows the same partner (no flicker, consistent on re-render).
function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

const COMPACT_PROMO_BY_ID: Record<string, React.ComponentType> = {
  betano: BetanoCompactPromo,
  betmaze: BetMazeCompactPromo,
  betrino: BetrinoCompactPromo,
  betsuna: BetsunaCompactPromo,
  mogobet: MogobetCompactPromo,
  "fruity-king": FruityKingCompactPromo,
  spinzwin: SpinzwinCompactPromo,
  "monster-sports": MonsterCasinoCompactPromo,
};

export default function ScheduleFixturePromo({ matchId, affiliates }: Props) {
  if (affiliates.length === 0) return null;

  const affiliate = affiliates[hashIndex(matchId, affiliates.length)];
  const Compact = COMPACT_PROMO_BY_ID[affiliate.id];

  // Fall back to the generic bar for any affiliate that doesn't have a
  // compact card built yet (e.g. a newly added partner).
  if (!Compact) return <BestOddsBar matchId={matchId} affiliates={affiliates} />;

  return <Compact />;
}
