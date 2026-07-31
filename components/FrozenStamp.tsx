export default function FrozenStamp({ frozenAt, hash }: { frozenAt: string; hash: string }) {
  const stamp = frozenAt.slice(0, 16).replace("T", " ");
  return (
    <span className="inline-flex items-center gap-1.5 py-0.5 font-data text-[10px] uppercase tracking-widest text-accent">
      <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" className="fill-accent">
        <rect x="0" y="4.5" width="9" height="6.5" rx="1" />
        <path d="M2 5V3.2a2.5 2.5 0 0 1 5 0V5H5.7V3.2a1.2 1.2 0 0 0-2.4 0V5Z" />
      </svg>
      Frozen {stamp}Z · {hash.slice(0, 8)}
    </span>
  );
}
