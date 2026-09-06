"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Row { userId: string; displayName: string; picks: number; correct: number; accuracy: number; points: number; streak: number }
interface LeaderboardData { rows: Row[]; total: number; viewerRank: number | null; edgeIQ: { correct: number; settled: number; accuracy: number } }

const LIMIT = 20;

export default function LeaderboardClient({
  initialType, initialData, viewerUserId,
}: {
  initialType: "weekly" | "season";
  initialData: LeaderboardData;
  viewerUserId: string | null;
}) {
  const [type, setType] = useState<"weekly" | "season">(initialType);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === initialType && page === 1) { setData(initialData); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/game/leaderboard?type=${type}&page=${page}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((d: LeaderboardData) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => { setType("weekly"); setPage(1); }}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${type === "weekly" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"}`}>
          This Week
        </button>
        <button type="button" onClick={() => { setType("season"); setPage(1); }}
          className={`rounded-[10px] border px-4 py-2 font-data text-xs uppercase tracking-widest transition-colors ${type === "season" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink hover:border-muted"}`}>
          All Season
        </button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]">
        <table className="w-full min-w-[560px] border-collapse font-data text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-ink">
              <th className="py-2.5 pl-4 pr-2">Rank</th>
              <th className="px-2 py-2.5">Player</th>
              <th className="px-2 py-2.5 text-right">Picks</th>
              <th className="px-2 py-2.5 text-right">Correct</th>
              <th className="px-2 py-2.5 text-right">Accuracy</th>
              <th className="px-2 py-2.5 text-right">Points</th>
              <th className="py-2.5 pl-2 pr-4 text-right">Streak</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line/60 bg-panel2">
              <td className="py-2.5 pl-4 pr-2 text-muted">—</td>
              <td className="px-2 py-2.5 font-semibold text-ink">EdgeIQ 🤖</td>
              <td className="px-2 py-2.5 text-right text-ink">{data.edgeIQ.settled}</td>
              <td className="px-2 py-2.5 text-right text-ink">{data.edgeIQ.correct}</td>
              <td className="px-2 py-2.5 text-right text-ink">{Math.round(data.edgeIQ.accuracy * 100)}%</td>
              <td className="px-2 py-2.5 text-right text-muted">—</td>
              <td className="py-2.5 pl-2 pr-4 text-right text-muted">—</td>
            </tr>
            {data.rows.map((r, i) => {
              const rank = (page - 1) * LIMIT + i + 1;
              const isViewer = viewerUserId === r.userId;
              return (
                <tr key={r.userId} className={`border-b border-line/60 ${isViewer ? "bg-accent/10" : ""}`}>
                  <td className="py-2.5 pl-4 pr-2 text-ink">{rank}</td>
                  <td className="px-2 py-2.5">
                    <Link href={`/game/profile/${r.userId}`} className="text-ink hover:text-accent">{r.displayName}</Link>
                  </td>
                  <td className="px-2 py-2.5 text-right text-ink">{r.picks}</td>
                  <td className="px-2 py-2.5 text-right text-ink">{r.correct}</td>
                  <td className="px-2 py-2.5 text-right text-ink">{r.picks ? `${Math.round(r.accuracy * 100)}%` : "—"}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-accent">{r.points}</td>
                  <td className="py-2.5 pl-2 pr-4 text-right text-ink">{r.streak > 0 ? `${r.streak}${r.streak >= 3 ? " 🔥" : ""}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewerUserId && data.viewerRank != null && (data.viewerRank > page * LIMIT || data.viewerRank <= (page - 1) * LIMIT) && (
        <p className="mt-3 font-data text-xs text-muted">Your rank: #{data.viewerRank}</p>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 font-data text-xs">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}
            className="rounded-[8px] border border-line px-3 py-1.5 text-ink disabled:opacity-40">Prev</button>
          <span className="text-muted">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}
            className="rounded-[8px] border border-line px-3 py-1.5 text-ink disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
