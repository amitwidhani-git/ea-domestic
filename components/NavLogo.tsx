import Link from "next/link";

export default function NavLogo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5 no-underline">
      <svg width="20" height="18" viewBox="1 -1 62 58" fill="none" aria-hidden="true">
        <path d="M4 22 L32 2 L60 22" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
        <path d="M4 38 L32 18 L60 38" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
        <path d="M4 54 L32 34 L60 54" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="miter" fill="none" />
      </svg>
      <span className="font-display text-[15px] font-extrabold uppercase leading-none tracking-[0.08em] text-ink">
        Edge Analysts
      </span>
    </Link>
  );
}
