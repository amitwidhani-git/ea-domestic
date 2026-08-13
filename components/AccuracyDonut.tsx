/** Radial accuracy meter — single-hue fill against a recessive track, no legend needed (one value). */
export default function AccuracyDonut({ pct, size, stroke, emphasize }: { pct: number; size: number; stroke: number; emphasize?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#232323" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--accent)"
        strokeOpacity={emphasize ? 1 : 0.75}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
