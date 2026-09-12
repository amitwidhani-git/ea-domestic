"use client";
import { useState } from "react";
import LeagueBadge from "@/components/LeagueBadge";
import ClubCrest from "@/components/ClubCrest";
import type { GamePickCard } from "@/lib/game";
import type { League } from "@/lib/types";

const PICK_LABEL: Record<"home" | "draw" | "away", string> = { home: "Home", draw: "Draw", away: "Away" };

function kickoffLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("weekday")} ${g("day")} ${g("month")} · ${g("hour")}:${g("minute")}`;
}

function CrowdBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 font-data text-[10.5px] text-muted">{label}</span>
      <span className="h-[7px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </span>
      <span className="w-9 shrink-0 text-right font-data text-[10.5px] text-ink">{Math.round(pct)}%</span>
    </div>
  );
}

export default function PickCard({
  card, onPick,
}: {
  card: GamePickCard;
  onPick: (matchId: string, pick: "home" | "draw" | "away") => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState<"home" | "draw" | "away" | null>(null);
  // Once locked (kickoff has passed) it's no longer pickable — show the
  // results-style layout even while still live and awaiting a final score.
  const isResult = card.locked;
  const finished = card.status === "FINISHED";

  async function handlePick(pick: "home" | "draw" | "away") {
    if (card.locked || card.userPick || submitting) return;
    setSubmitting(pick);
    try {
      await onPick(card.matchId, pick);
    } finally {
      setSubmitting(null);
    }
  }

  if (isResult) {
    const r = card.result;
    return (
      <article className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
        <div className="mb-2.5 flex items-center gap-2">
          <LeagueBadge league={card.league as League} />
          <span className="font-data text-xs text-muted">{kickoffLabel(card.kickoffUtc)}</span>
        </div>
        <div className="flex items-center gap-2.5 font-display text-lg tracking-wide">
          <ClubCrest apiFootballId={card.homeApiFootballId} clubName={card.homeTeam} size={26} />
          <span className="truncate">{card.homeTeam}</span>
          <span className="shrink-0 px-1 font-data text-base text-ink">
            {finished && card.score ? `${card.score.home}–${card.score.away}` : finished ? "–" : "Live"}
          </span>
          <span className="truncate">{card.awayTeam}</span>
          <ClubCrest apiFootballId={card.awayApiFootballId} clubName={card.awayTeam} size={26} />
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5 border-t border-line pt-3 font-data text-[13px]">
          {!finished ? (
            <p className="text-muted">
              {card.userPick ? <>Your pick: <b className="uppercase text-ink">{PICK_LABEL[card.userPick]}</b> · result pending</> : "Picks are locked — result pending."}
            </p>
          ) : r ? (
            <div className={`flex items-center gap-1.5 ${r.correct ? "text-accent" : "text-loss"}`}>
              <span className="text-muted">Your pick:</span>
              <b className="uppercase">{PICK_LABEL[r.pick]}</b>
              <span>{r.correct ? "✓" : "✗"}</span>
              <span>{r.correct ? `+${r.points} pts` : "0 pts"}</span>
            </div>
          ) : (
            <p className="font-data text-[13px] text-muted">You didn&apos;t pick this one.</p>
          )}
          {card.edgeIQ && (
            <div className="flex items-center gap-1.5 text-muted">
              <span>EdgeIQ:</span>
              <b className="uppercase text-ink">{PICK_LABEL[card.edgeIQ.pick]}</b>
              {finished && <span className={card.edgeIQCorrect ? "text-accent" : "text-loss"}>{card.edgeIQCorrect ? "✓" : "✗"}</span>}
            </div>
          )}
          {finished && card.crowd && card.crowd.total > 0 && (
            <p className="text-muted">Crowd: {Math.round((card.crowd[r?.pick ?? "home"] / card.crowd.total) * 100)}% picked {PICK_LABEL[r?.pick ?? "home"].toLowerCase()}</p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-[14px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
      <div className="mb-2.5 flex items-center gap-2">
        <LeagueBadge league={card.league as League} />
        <span className="font-data text-xs text-muted">{kickoffLabel(card.kickoffUtc)}</span>
        {card.locked && <span className="ml-auto font-data text-[10px] uppercase tracking-wider text-muted">Locked</span>}
      </div>

      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold">
          <ClubCrest apiFootballId={card.homeApiFootballId} clubName={card.homeTeam} size={26} />
          <span className="truncate">{card.homeTeam}</span>
        </div>
        <span className="font-data text-[11px] text-muted">v</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[15px] font-semibold">
          <span className="truncate">{card.awayTeam}</span>
          <ClubCrest apiFootballId={card.awayApiFootballId} clubName={card.awayTeam} size={26} />
        </div>
      </div>

      {card.edgeIQ && (
        <p className="mb-3 font-data text-[11px] text-muted">
          EdgeIQ:{" "}
          <b className={`uppercase ${card.edgeIQ.pick === "home" ? "text-ink" : ""}`}>HOME {Math.round(card.edgeIQ.probs.home * 100)}%</b>
          {"  "}
          <b className={`uppercase ${card.edgeIQ.pick === "draw" ? "text-ink" : ""}`}>DRAW {Math.round(card.edgeIQ.probs.draw * 100)}%</b>
          {"  "}
          <b className={`uppercase ${card.edgeIQ.pick === "away" ? "text-ink" : ""}`}>AWAY {Math.round(card.edgeIQ.probs.away * 100)}%</b>
        </p>
      )}

      <p className="mb-1.5 font-data text-[10px] uppercase tracking-wider text-muted">Your pick</p>
      <div className="grid grid-cols-3 gap-2">
        {(["home", "draw", "away"] as const).map((sel) => {
          const selected = card.userPick === sel;
          const pct = card.edgeIQ ? Math.round(card.edgeIQ.probs[sel] * 100) : null;
          return (
            <button
              key={sel}
              type="button"
              disabled={card.locked || !!card.userPick || submitting !== null}
              onClick={() => handlePick(sel)}
              className={`min-h-[44px] rounded-[10px] border font-body text-[13px] font-bold transition-colors disabled:cursor-not-allowed ${
                selected
                  ? "border-ink bg-ink text-panel"
                  : card.userPick || card.locked
                    ? "border-line text-muted opacity-60"
                    : "border-line text-ink hover:border-accent hover:text-accent"
              }`}
            >
              {submitting === sel ? "…" : (
                <>
                  {PICK_LABEL[sel]}
                  {pct != null && <span className="block font-data text-[10px] font-normal opacity-70">{pct}%</span>}
                </>
              )}
            </button>
          );
        })}
      </div>

      {card.crowd && card.crowd.total > 0 ? (
        <div className="mt-3.5 space-y-1.5 border-t border-line pt-3">
          <CrowdBar label="Home" pct={(card.crowd.home / card.crowd.total) * 100} color="var(--accent)" />
          <CrowdBar label="Draw" pct={(card.crowd.draw / card.crowd.total) * 100} color="var(--muted)" />
          <CrowdBar label="Away" pct={(card.crowd.away / card.crowd.total) * 100} color="#60A5FA" />
          <p className="font-data text-[10px] text-muted">{card.crowd.total.toLocaleString()} pick{card.crowd.total === 1 ? "" : "s"} submitted</p>
        </div>
      ) : (
        <p className="mt-3.5 flex items-center gap-1.5 border-t border-line pt-3 font-data text-[10px] text-muted">
          <span aria-hidden="true">🔒</span> Logged pre-kick-off · never revised
        </p>
      )}
    </article>
  );
}
