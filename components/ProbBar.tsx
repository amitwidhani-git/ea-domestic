export default function ProbBar({ probs, pick }: { probs: { home: number; draw: number; away: number }; pick: "home" | "draw" | "away" }) {
  const segs = [{ key: "home" as const, label: "H", p: probs.home }, { key: "draw" as const, label: "D", p: probs.draw }, { key: "away" as const, label: "A", p: probs.away }];
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden bg-panel2" role="img" aria-label={`H ${(probs.home*100).toFixed(0)}% D ${(probs.draw*100).toFixed(0)}% A ${(probs.away*100).toFixed(0)}%`}>
        {segs.map((s) => <div key={s.key} style={{ width: `${s.p*100}%` }} className={s.key === pick ? "bg-accent" : "bg-line"} />)}
      </div>
      <div className="mt-1 flex justify-between font-data text-[11px] text-muted">
        {segs.map((s) => <span key={s.key} className={s.key === pick ? "text-accent" : undefined}>{s.label} {(s.p*100).toFixed(0)}%</span>)}
      </div>
    </div>
  );
}
