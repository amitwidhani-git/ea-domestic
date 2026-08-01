"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const TABS = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/insights", label: "Insights" },
  { href: "/track-record", label: "Track Record" },
  { href: "/teams", label: "Teams" },
];
export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-4 sm:gap-6">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={`border-b-2 pb-1 font-display text-lg tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
