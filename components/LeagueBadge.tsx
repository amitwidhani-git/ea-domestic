import type { League } from "@/lib/types";
import { LEAGUE_NAMES } from "@/lib/types";
const COLOURS: Record<League, string> = {
  PL: "border-purple-500/60 text-purple-400",
  CH: "border-sky-500/60 text-sky-400",
  L1: "border-emerald-500/60 text-emerald-400",
  L2: "border-amber-500/60 text-amber-400",
  FAC: "border-red-500/60 text-red-400",
  LC: "border-orange-500/60 text-orange-400",
  CS: "border-yellow-500/60 text-yellow-400",
};
export default function LeagueBadge({ league }: { league: League }) {
  return (
    <span title={LEAGUE_NAMES[league]} className={`inline-block border px-1.5 py-0.5 font-data text-[10px] tracking-widest ${COLOURS[league]}`}>
      {league}
    </span>
  );
}
