"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/insights", label: "Insights" },
  { href: "/track-record", label: "Track Record" },
  { href: "/teams", label: "Teams" },
];

// Bottom-bar quick links (icons). Kept to four so each has room on small screens.
const BOTTOM = [
  { href: "/schedule", label: "Schedule", icon: (
    <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>
  ) },
  { href: "/results", label: "Results", icon: (
    <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
  ) },
  { href: "/insights", label: "Insights", icon: (
    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 14 2 9.4h7.6z" />
  ) },
  { href: "/track-record", label: "Track", icon: (
    <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>
  ) },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [pathname]);
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger — header, mobile only */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-chip text-muted transition-colors hover:text-ink sm:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 sm:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[82%] max-w-[320px] flex-col border-r border-line bg-panel p-5 transition-transform duration-300 sm:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between">
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
        </nav>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <span className="font-body text-sm text-muted">Appearance</span>
          <ThemeToggle />
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
      </nav>
    </>
  );
}
