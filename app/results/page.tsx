import type { Metadata } from "next";
import ResultsBrowser from "@/components/ResultsBrowser";
import { getResults } from "@/lib/results";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results — EdgeAnalysts",
  description: "Settled football predictions with verified outcomes, scores and EV signal P&L.",
};

export default async function ResultsPage() {
  // Initial view: last 30 days, all outcomes — the client browser refetches on filter change.
  const initial = await getResults({ limit: 50, offset: 0, outcome: "all" });
  return (
    <div className="space-y-6">
      <ResultsBrowser initial={initial} />
    </div>
  );
}
