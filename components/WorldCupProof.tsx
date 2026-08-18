import AccuracyDonut from "@/components/AccuracyDonut";
import { WC_STATS, WC_TOTAL } from "@/lib/worldcup";

export default function WorldCupProof({ intro }: { intro?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4">
        <p className="max-w-2xl text-sm leading-relaxed text-ink">
          {intro ?? (
            <>
              We launched our EdgeIQ prediction model at the World Cup 2026.{" "}
              <span className="text-accent">These are the results.</span>
            </>
          )}
        </p>
      </div>

      {/* headline number */}
      <div className="mb-4 flex flex-wrap items-center gap-6 rounded-[14px] border border-accent/30 bg-panel px-6 py-6 shadow-[var(--shadow)]">
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <AccuracyDonut pct={(WC_TOTAL.correct / WC_TOTAL.total) * 100} size={140} stroke={14} emphasize />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl leading-none text-accent">
              {((WC_TOTAL.correct / WC_TOTAL.total) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <p className="font-display text-3xl leading-none text-ink">
            {WC_TOTAL.correct}/{WC_TOTAL.total}
          </p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-widest text-ink">
            Overall accuracy · all matches predicted pre-kick-off
          </p>
          <p className="mt-3 max-w-md font-body text-sm text-ink">
            Called <span className="text-accent">Spain</span> to lift the trophy from day one.
            Backed by ELO ratings, recent form and head-to-head history. No hindsight required.
          </p>
        </div>
      </div>

      {/* per-stage breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {WC_STATS.map((s) => {
          const pct = Math.round((s.correct / s.total) * 100);
          const perfect = s.correct === s.total;
          return (
            <div key={s.stage}
              className={`flex flex-col items-center rounded-[14px] border p-3 text-center shadow-[var(--shadow)] ${perfect ? "border-accent/60 bg-accent/5" : "border-line bg-panel"}`}>
              <div className="relative" style={{ width: 88, height: 88 }}>
                <AccuracyDonut pct={pct} size={88} stroke={8} emphasize={perfect} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-display text-xl leading-none ${perfect ? "text-accent" : "text-ink"}`}>
                    {pct}%
                  </span>
                </div>
              </div>
              <p className="mt-2 font-data text-[9px] uppercase tracking-widest text-ink">{s.stage}</p>
              <p className="mt-1 font-data text-[10px] text-ink">
                {s.correct}/{s.total} correct
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink">
        Quarter-final and Final: 100%. Every match called correctly at the tournament&apos;s
        business end. Predictions frozen before kick-off and still visible.
      </p>
    </section>
  );
}
