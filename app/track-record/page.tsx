import LeagueBadge from "@/components/LeagueBadge";
import { getStats, getTrackRecord } from "@/lib/data";
import { LEAGUE_NAMES } from "@/lib/types";
export const dynamic = "force-dynamic";
const PICK_SHORT = { home: "H", draw: "D", away: "A" } as const;
export default async function TrackRecordPage() {
  const [rows, stats] = await Promise.all([getTrackRecord(), getStats()]);
  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-4xl tracking-wide">Track Record</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every prediction frozen before kick-off with a SHA-256 content hash.
          Nothing is edited, hidden or re-run. The hash lets you verify a prediction
          is exactly what we published — run it yourself at any time.
        </p>
      </section>
      {stats.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.league} className="border border-line bg-panel p-4">
              <p className="font-data text-[10px] uppercase tracking-widest text-muted">
                {s.league === "ALL" ? "All leagues" : LEAGUE_NAMES[s.league]}
              </p>
              <p className="mt-2 font-display text-3xl leading-none text-accent">
                {(s.accuracy * 100).toFixed(1)}%
              </p>
              <p className="mt-1 font-data text-[11px] text-muted">{s.correct}/{s.settled} correct</p>
            </div>
          ))}
        </section>
      )}
      <section className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="border border-line bg-panel px-6 py-10 text-center">
            <p className="font-display text-xl text-muted">No settled predictions yet</p>
            <p className="mt-1 font-data text-xs text-muted">Check back after opening weekend — 14 August</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px] border-collapse font-data text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-muted">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Lg</th>
                <th className="py-2 pr-4">Match</th>
                <th className="py-2 pr-4">Pick</th>
                <th className="py-2 pr-4">FT</th>
                <th className="py-2 pr-4">Frozen</th>
                <th className="py-2 pr-4">Hash</th>
                <th className="py-2">✓</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ fixture, prediction, result }) => (
                <tr key={fixture.match_id} className="border-b border-line/60 hover:bg-panel">
                  <td className="py-2 pr-4 text-muted">{fixture.kickoff_utc.slice(0, 10)}</td>
                  <td className="py-2 pr-4"><LeagueBadge league={fixture.league} /></td>
                  <td className="py-2 pr-4">{fixture.home_team} v {fixture.away_team}</td>
                  <td className="py-2 pr-4">{PICK_SHORT[prediction.pick]} ({(prediction.probs[prediction.pick] * 100).toFixed(0)}%)</td>
                  <td className="py-2 pr-4">{result.fthg}–{result.ftag}</td>
                  <td className="py-2 pr-4 text-muted">{prediction.frozen_at.slice(0, 16).replace("T", " ")}Z</td>
                  <td className="py-2 pr-4 text-muted">{prediction.hash.slice(0, 8)}</td>
                  <td className={`py-2 font-bold ${prediction.model_correct ? "text-accent" : "text-loss"}`}>
                    {prediction.model_correct ? "✓" : "✗"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
