"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ClubCrest from "@/components/ClubCrest";
import type { ResultRow } from "@/lib/results";

const POLL_MS = 60_000;
const FETCH_LIMIT = 12; // over-fetch — some finished fixtures have no settled prediction yet
const SHOW = 8;

const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Cross = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Fixed-size chip — every card is identical dimensions regardless of team-name
// length, so the ticker track lines up cleanly (truncate handles the overflow).
function Chip({ r }: { r: ResultRow }) {
  const pick = r.prediction?.pick;
  const correct = r.prediction?.modelCorrect;
  if (!pick || correct == null || !r.score) return null;
  const pickTeam = pick === "draw" ? "Draw" : pick === "home" ? r.homeTeam.name : r.awayTeam.name;

  return (
    <Link
      href={`/matches/${r.matchId}`}
      className={`flex h-[52px] w-[230px] shrink-0 items-center gap-2.5 rounded-[10px] border px-3 transition-colors hover:border-muted ${correct ? "border-accent/30 bg-accent/5" : "border-line"}`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${correct ? "bg-accent text-white" : "bg-loss text-white"}`}>
        {correct ? <Check /> : <Cross />}
      </span>
      <div className="flex shrink-0 -space-x-1.5">
        <ClubCrest apiFootballId={r.homeTeam.apiFootballId} clubName={r.homeTeam.name} size={18} />
        <ClubCrest apiFootballId={r.awayTeam.apiFootballId} clubName={r.awayTeam.name} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-body text-[11.5px] font-semibold">{pickTeam}{pick !== "draw" ? " win" : ""}</div>
        <div className="truncate font-data text-[10px] text-muted">{r.homeTeam.name} {r.score.home}-{r.score.away} {r.awayTeam.name}</div>
      </div>
    </Link>
  );
}

export default function RecentResultsTicker({ initial }: { initial: ResultRow[] }) {
  const [rows, setRows] = useState<ResultRow[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(`/api/results?limit=${FETCH_LIMIT}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { results: ResultRow[] } | null) => {
          if (!cancelled && data && Array.isArray(data.results)) setRows(data.results);
        })
        .catch(() => {});
    };
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const settled = rows.filter((r) => r.prediction?.modelCorrect != null && r.score).slice(0, SHOW);
  if (settled.length === 0) return null;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <em className="mb-2.5 block font-body text-[10px] not-italic uppercase tracking-wider text-muted">Recent settled picks</em>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
        <div className="ea-ticker-track flex w-max gap-2.5">
          {[...settled, ...settled].map((r, i) => <Chip key={`${r.matchId}-${i}`} r={r} />)}
        </div>
      </div>
    </div>
  );
}
