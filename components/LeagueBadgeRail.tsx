"use client";
import { useState } from "react";
import { LEAGUE_LOGO_URL } from "@/components/LeagueBadge";
import type { League } from "@/lib/types";

// Carabao Cup is the current sponsor name for the League Cup — deliberately
// overridden here rather than reusing LEAGUE_NAMES, which keeps the generic
// competition name for other UI (filters, badges).
const LEAGUES: { code: League; label: string }[] = [
  { code: "PL", label: "Premier League" },
  { code: "CH", label: "Championship" },
  { code: "L1", label: "League One" },
  { code: "L2", label: "League Two" },
  { code: "FAC", label: "FA Cup" },
  { code: "LC", label: "Carabao Cup" },
  { code: "CS", label: "Community Shield" },
];

function Badge({
  active, onClick, label, children,
}: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ scrollSnapAlign: "start" }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F7F5F0] transition-shadow"
        style={active ? { boxShadow: "0 0 0 2px #C8FF00, 0 0 14px 2px rgba(200,255,0,0.55)" } : undefined}
      >
        {children}
      </span>
      <span
        className={`w-full text-center text-[10px] leading-tight transition-colors ${active ? "text-accent" : "text-[#F7F5F0]/75"}`}
        style={{ fontFamily: '"DM Mono", monospace' }}
      >
        {label}
      </span>
    </button>
  );
}

function LeagueCrest({ code }: { code: League }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="font-data text-[10px] font-semibold tracking-tighter text-[#0A0A0A]">{code}</span>;
  }
  return (
    <img
      src={LEAGUE_LOGO_URL[code]}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function LeagueBadgeRail({
  value, onChange,
}: { value: "ALL" | League; onChange: (v: "ALL" | League) => void }) {
  return (
    <div className="w-full overflow-x-auto bg-[#0A0A0A]" style={{ scrollSnapType: "x mandatory" }}>
      <div role="group" aria-label="Filter fixtures by league" className="flex gap-[22px] px-4 py-4 sm:px-6">
        <Badge active={value === "ALL"} onClick={() => onChange("ALL")} label="All">
          <svg width="20" height="18" viewBox="1 -1 62 58" fill="none" aria-hidden="true">
            <path d="M4 22 L32 2 L60 22" stroke="#0A0A0A" strokeWidth="8" strokeLinejoin="miter" fill="none" />
            <path d="M4 38 L32 18 L60 38" stroke="#0A0A0A" strokeWidth="8" strokeLinejoin="miter" fill="none" />
            <path d="M4 54 L32 34 L60 54" stroke="#0A0A0A" strokeWidth="8" strokeLinejoin="miter" fill="none" />
          </svg>
        </Badge>
        {LEAGUES.map((l) => (
          <Badge key={l.code} active={value === l.code} onClick={() => onChange(l.code)} label={l.label}>
            <LeagueCrest code={l.code} />
          </Badge>
        ))}
      </div>
    </div>
  );
}
