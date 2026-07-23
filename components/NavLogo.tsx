import Link from "next/link";

export default function NavLogo() {
  return (
    <Link href="/" className="nav-logo group flex items-center gap-2.5 no-underline">
      <svg width="30" height="28" viewBox="1 -1 62 58" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="ea-iri" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#C8FF00">
              <animate attributeName="stopColor" values="#C8FF00;#4A7FD4;#1853B4;#C8FF00" dur="4s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor="#4A7FD4">
              <animate attributeName="stopColor" values="#4A7FD4;#1853B4;#C8FF00;#4A7FD4" dur="4s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor="#1853B4">
              <animate attributeName="stopColor" values="#1853B4;#C8FF00;#4A7FD4;#1853B4" dur="4s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>
        </defs>
        <path d="M4 22 L32 2 L60 22" stroke="url(#ea-iri)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
        <path d="M4 38 L32 18 L60 38" stroke="url(#ea-iri)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
        <path d="M4 54 L32 34 L60 54" stroke="url(#ea-iri)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
      </svg>
      <div className="flex flex-col gap-0">
        <span className="font-display text-xl leading-none tracking-wider text-ink">
          Edge Analysts
        </span>
        <span className="font-data text-[9px] leading-none tracking-[0.12em] text-muted">
          We have the data so you can have the edge
        </span>
      </div>
    </Link>
  );
}
