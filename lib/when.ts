// Matchday timeframes shared by the homepage edges and the Insights value signals.
export type WhenKey = "today" | "weekend" | "week";

export const WHENS: { key: WhenKey; label: string; short?: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekend", label: "This weekend", short: "Weekend" },
  { key: "week", label: "Full week" },
];

// Loose timeframe filter over a fixture's kickoff time (Europe/London aware).
export function inWhen(iso: string, when: WhenKey): boolean {
  if (!iso) return when === "week";
  const now = new Date();
  const t = new Date(iso);
  const diffDays = (t.getTime() - now.getTime()) / 86_400_000;
  if (when === "today") {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
    return f.format(now) === f.format(t);
  }
  if (when === "weekend") {
    const wd = t.getUTCDay(); // Fri 5 · Sat 6 · Sun 0
    return (wd === 5 || wd === 6 || wd === 0) && diffDays >= -1 && diffDays <= 9;
  }
  return diffDays >= -1 && diffDays <= 14; // full week (generous)
}
