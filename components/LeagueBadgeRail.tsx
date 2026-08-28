"use client";
import { useState } from "react";
import type { League } from "@/lib/types";
import { LEAGUE_CODES, LEAGUES as LEAGUE_REGISTRY, leagueLogoUrl } from "@/lib/leagues";

// Carabao Cup is the current sponsor name for the League Cup — deliberately
// overridden here rather than reusing the registry's generic name, which
// other UI (filters, badges) still shows as "League Cup".
const LABEL_OVERRIDES: Partial<Record<League, string>> = { LC: "Carabao Cup" };
const RAIL_LEAGUES: { code: League; label: string }[] = LEAGUE_CODES.map((code) => ({
  code, label: LABEL_OVERRIDES[code] ?? LEAGUE_REGISTRY[code].name,
}));

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
        style={active ? { boxShadow: "0 0 0 2px var(--accent), 0 0 14px 2px rgba(18,184,134,0.45)" } : undefined}
      >
        {children}
      </span>
      <span
        className={`w-full text-center text-[10px] leading-tight transition-colors ${active ? "text-accent" : "text-[#F7F5F0]/75"}`}
        style={{ fontFamily: "var(--font-body)" }}
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
      src={leagueLogoUrl(code)}
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
        {RAIL_LEAGUES.map((l) => (
          <Badge key={l.code} active={value === l.code} onClick={() => onChange(l.code)} label={l.label}>
            <LeagueCrest code={l.code} />
          </Badge>
        ))}
      </div>
    </div>
  );
}
