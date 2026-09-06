import Link from "next/link";
import { getGameTeaserStats } from "@/lib/game";

export default async function GameTeaser() {
  const { players, topPlayer } = await getGameTeaserStats();

  return (
    <section className="rounded-[14px] border border-accent/40 bg-panel p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl tracking-wide">
          <span aria-hidden="true">🎯</span> EdgeIQ Challenge
        </h2>
        <Link href="/game" className="ml-auto rounded-[9px] bg-accent px-4 py-2 font-body text-[13px] font-bold text-accent-fg transition-[filter] hover:brightness-105">
          Play now
        </Link>
      </div>
      <p className="mt-1.5 font-body text-sm text-ink">Can you outpick our model?</p>
      <p className="mt-1 font-data text-xs text-muted">
        {players > 0 ? `${players.toLocaleString()} player${players === 1 ? "" : "s"}` : "Be the first to play"}
        {topPlayer && <> · This week&apos;s top: <b className="text-ink">{topPlayer}</b></>}
      </p>
      <Link href="/game" className="mt-3 inline-block font-data text-xs text-accent-ink hover:underline">
        Make your picks for this weekend →
      </Link>
    </section>
  );
}
