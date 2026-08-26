"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { href: "/insights", label: "Odds" },
  { href: "/track-record", label: "Track record" },
];
const DIVISIONS: [string, string][] = [
  ["PL", "Premier League"],
  ["CH", "Championship"],
  ["L1", "League One"],
  ["L2", "League Two"],
  ["SPL", "Scottish Premiership"],
];

export default function NavTabs() {
  const pathname = usePathname();
  const [teamsOpen, setTeamsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTeamsOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);
  useEffect(() => { setTeamsOpen(false); }, [pathname]);

  const linkCls = (active: boolean) =>
    `border-b-2 pb-0.5 pt-0.5 font-body text-sm font-medium leading-none transition-colors ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`;

  return (
    <nav aria-label="Primary" className="flex items-center gap-5">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={linkCls(pathname.startsWith(t.href))}>{t.label}</Link>
      ))}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setTeamsOpen((o) => !o)}
          aria-expanded={teamsOpen}
          className={`inline-flex -translate-y-[2px] items-center gap-1 border-b-2 border-transparent pb-0.5 pt-0.5 font-body text-sm font-medium leading-none transition-colors ${pathname.startsWith("/teams") ? "text-ink" : "text-muted hover:text-ink"}`}
        >
          Teams
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            style={{ transform: teamsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {teamsOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-line bg-panel p-2 shadow-[var(--shadow)]">
            <span className="block px-3 pb-1 pt-1.5 font-body text-[10px] uppercase tracking-wider text-muted">Browse by division</span>
            {DIVISIONS.map(([lg, name]) => (
              <Link key={lg} href={`/insights?lg=${lg}`} className="block rounded-lg px-3 py-2 font-body text-[13.5px] text-ink hover:bg-chip">{name}</Link>
            ))}
            <Link href="/teams" className="block rounded-lg px-3 py-2 font-body text-[13.5px] text-accent-ink hover:bg-chip">All teams →</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
