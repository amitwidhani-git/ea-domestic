"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const TABS = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/insights", label: "Insights" },
  { href: "/track-record", label: "Track Record" },
  { href: "/teams", label: "Teams" },
];
export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="-mx-1 flex items-center gap-5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-2 pb-0.5 pt-0.5 font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
