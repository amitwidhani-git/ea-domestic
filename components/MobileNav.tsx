"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { openSubscribe, SUBSCRIBE_ENABLED } from "@/components/SubscribeModal";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/insights", label: "Odds & value" },
  { href: "/track-record", label: "Track record" },
];
const DIVISIONS: [string, string][] = [
  ["PL", "Premier League"],
  ["CH", "Championship"],
  ["L1", "League One"],
  ["L2", "League Two"],
];

const BOTTOM = [
  { href: "/", label: "Home", icon: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>) },
  { href: "/insights", label: "Odds", icon: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>) },
  { href: "/track-record", label: "Track", icon: (<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>) },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-chip text-muted transition-colors hover:text-ink sm:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 sm:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden="true"
      />

      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[82%] max-w-[320px] flex-col overflow-y-auto border-r border-line bg-panel p-5 transition-transform duration-300 sm:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.08em] text-ink">Edge Analysts</span>
          <button onClick={() => setOpen(false)} aria-label="Close menu"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-chip text-muted hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              aria-current={isActive(pathname, l.href) ? "page" : undefined}
              className={`rounded-[10px] px-3 py-3 font-body text-base font-semibold transition-colors ${
                isActive(pathname, l.href) ? "bg-chip text-accent-ink" : "text-ink hover:bg-chip"
              }`}>
              {l.label}
            </Link>
          ))}
          <span className="px-3 pb-1 pt-3 font-body text-[11px] uppercase tracking-wider text-muted">Teams by division</span>
          {DIVISIONS.map(([lg, name]) => (
            <Link key={lg} href={`/insights?lg=${lg}`} className="rounded-[10px] px-3 py-2.5 font-body text-[15px] text-ink hover:bg-chip">{name}</Link>
          ))}
          <Link href="/teams" className="rounded-[10px] px-3 py-2.5 font-body text-[15px] text-accent-ink hover:bg-chip">All teams →</Link>
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          {SUBSCRIBE_ENABLED && (
            <button onClick={() => { setOpen(false); openSubscribe(); }}
              className="w-full rounded-[9px] bg-accent px-4 py-2.5 font-body text-sm font-bold text-accent-fg transition-[filter] hover:brightness-105">
              Subscribe — free
            </button>
          )}
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-muted">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Bottom nav — mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-panel px-1.5 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:hidden" aria-label="Quick navigation">
        {BOTTOM.map((b) => {
          const active = isActive(pathname, b.href);
          return (
            <Link key={b.href} href={b.href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 font-body text-[10.5px] font-semibold ${active ? "text-accent-ink" : "text-muted"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {b.icon}
              </svg>
              {b.label}
            </Link>
          );
        })}
        {SUBSCRIBE_ENABLED && (
          <button onClick={() => openSubscribe()}
            className="flex flex-1 flex-col items-center gap-1 py-1 font-body text-[10.5px] font-semibold text-muted">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16v16H4z" /><polyline points="4 6 12 13 20 6" />
            </svg>
            Subscribe
          </button>
        )}
      </nav>
    </>
  );
}
