import Link from "next/link";

export default function NavLogo() {
  return (
    <Link href="/" className="nav-logo group flex items-center gap-2.5 no-underline">
      <svg width="20" height="18" viewBox="1 -1 62 58" fill="none" aria-hidden="true">
        <path d="M4 22 L32 2 L60 22" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
        <path d="M4 38 L32 18 L60 38" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
        <path d="M4 54 L32 34 L60 54" stroke="rgba(247,245,240,0.7)" strokeWidth="6" strokeLinejoin="miter" fill="none"/>
      </svg>
      <span className="font-display text-xl leading-none tracking-wider text-[rgba(247,245,240,0.85)]">
        Edge Analysts
      </span>
    </Link>
  );
}
