"use client";
import { useState } from "react";
import Link from "next/link";
import PickCard from "@/components/game/PickCard";
import type { GamePickCard } from "@/lib/game";

interface Me { userId: string; displayName: string; weeklyPts: number; seasonPts: number; streak: number }
interface LeaderboardData {
  rows: { userId: string; displayName: string; picks: number; correct: number; accuracy: number; points: number; streak: number }[];
  viewerRank: number | null;
}

export default function GameClient({
  initialUser, initialCards, initialLeaderboard,
}: {
  initialUser: Me | null;
  initialCards: GamePickCard[];
  initialLeaderboard: LeaderboardData;
}) {
  const [user, setUser] = useState<Me | null>(initialUser);
  const [cards, setCards] = useState<GamePickCard[]>(initialCards);
  const [leaderboard] = useState<LeaderboardData>(initialLeaderboard);
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");
  const [form, setForm] = useState({ displayName: "", email: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  // "Upcoming" = still pickable (kickoff hasn't happened). Once a match locks
  // — live or finished — it moves to Results; it's no longer something you
  // can pick, so it shouldn't linger in the Upcoming list.
  const upcoming = cards.filter((c) => !c.locked);
  // cards arrives soonest-first (right for Upcoming) — Results reads more
  // naturally newest-first, so reverse just that slice.
  const results = cards.filter((c) => c.locked).reverse();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setRegistering(true);
    try {
      const res = await fetch("/api/game/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Something went wrong."); return; }
      setUser({ userId: data.userId, displayName: data.displayName, weeklyPts: 0, seasonPts: 0, streak: 0 });
      // Refresh picks now that we have a session, so this-week's cards join correctly.
      fetch("/api/game/picks").then((r) => r.json()).then((c: GamePickCard[]) => setCards(c)).catch(() => {});
    } finally {
      setRegistering(false);
    }
  }

  async function handlePick(matchId: string, pick: "home" | "draw" | "away") {
    const res = await fetch("/api/game/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, pick }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Couldn't submit your pick."); return; }
    setCards((prev) => prev.map((c) => (c.matchId === matchId ? { ...c, userPick: pick, crowd: data.crowdDistribution } : c)));
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <section className="max-w-2xl">
          <h1 className="font-display text-[clamp(1.9rem,5vw,2.4rem)] font-extrabold leading-[1.07] tracking-[-0.03em]">
            EdgeIQ Challenge — Can you beat the model?
          </h1>
          <p className="mt-3 font-body text-base text-muted">
            Pick the result for every match. See how you compare to EdgeIQ and the crowd.
          </p>
        </section>

        <form onSubmit={handleRegister} className="max-w-sm space-y-3 rounded-[14px] border border-line bg-panel p-5 shadow-[var(--shadow)]">
          <div>
            <label className="mb-1 block font-data text-[10px] uppercase tracking-wider text-muted" htmlFor="displayName">Display name</label>
            <input
              id="displayName" required maxLength={30} value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full rounded-[10px] border border-line bg-panel2 px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-accent"
              placeholder="FootballNerd"
            />
          </div>
          <div>
            <label className="mb-1 block font-data text-[10px] uppercase tracking-wider text-muted" htmlFor="email">Email</label>
            <input
              id="email" type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-[10px] border border-line bg-panel2 px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>
          {formError && <p className="font-data text-xs text-loss">{formError}</p>}
          <button
            type="submit" disabled={registering}
            className="min-h-[44px] w-full rounded-[10px] bg-accent font-body text-sm font-bold text-accent-fg transition-[filter] hover:brightness-105 disabled:opacity-60"
          >
            {registering ? "Joining…" : "Play now"}
          </button>
        </form>

        {cards.length > 0 && (
          <section className="relative">
            <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">This week&apos;s fixtures</h2>
            <div className="pointer-events-none grid select-none gap-4 opacity-40 blur-[2px] sm:grid-cols-2">
              {cards.slice(0, 4).map((c) => <PickCard key={c.matchId} card={c} onPick={async () => {}} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  const list = tab === "upcoming" ? upcoming : results;

  return (
    <div className="space-y-6">
      {/* stats bar */}
      <div className="flex flex-wrap gap-2.5">
        <span className="rounded-[10px] border border-line bg-panel px-3.5 py-2 font-data text-xs text-ink">
          Weekly: <b className="text-accent">{user.weeklyPts}pts</b>
        </span>
        <span className="rounded-[10px] border border-line bg-panel px-3.5 py-2 font-data text-xs text-ink">
          Season: <b className="text-accent">{user.seasonPts}pts</b>{leaderboard.viewerRank != null && ` · #${leaderboard.viewerRank}`}
        </span>
        {user.streak > 0 && (
          <span className="rounded-[10px] border border-line bg-panel px-3.5 py-2 font-data text-xs text-ink">
            Streak: <b className="text-accent">{user.streak}</b>{user.streak >= 3 && " 🔥"}
          </span>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("upcoming")}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${tab === "upcoming" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"}`}>
          Upcoming
        </button>
        <button type="button" onClick={() => setTab("results")}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${tab === "results" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"}`}>
          Results
        </button>
      </div>

      {list.length === 0 ? (
        <p className="font-data text-sm text-muted">
          {tab === "upcoming" ? "No upcoming fixtures this week — check back soon." : "No results settled yet this week."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => <PickCard key={c.matchId} card={c} onPick={handlePick} />)}
        </div>
      )}

      {/* leaderboard preview */}
      <section>
        <h2 className="mb-3.5 flex items-center font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
          Leaderboard — this week
          <Link href="/game/leaderboard" className="ml-auto font-body text-xs font-semibold normal-case tracking-normal text-accent-ink hover:underline">See full leaderboard →</Link>
        </h2>
        <div className="overflow-hidden rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]">
          {leaderboard.rows.map((r, i) => (
            <div key={r.userId} className={`flex items-center gap-3 px-4 py-2.5 font-data text-sm ${r.userId === user.userId ? "bg-accent/10" : ""} ${i > 0 ? "border-t border-line/60" : ""}`}>
              <span className="w-5 shrink-0 text-muted">{i + 1}</span>
              <Link href={`/game/profile/${r.userId}`} className="min-w-0 flex-1 truncate text-ink hover:text-accent">{r.displayName}</Link>
              <span className="shrink-0 font-semibold text-accent">{r.points}pts</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
