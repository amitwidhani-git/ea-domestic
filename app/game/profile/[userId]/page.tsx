import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BetanoPromo from "@/components/BetanoPromo";
import { getGameProfile } from "@/lib/game";
import { decodeParam } from "@/lib/decodeParam";

export const dynamic = "force-dynamic";

const PICK_LABEL: Record<"home" | "draw" | "away", string> = { home: "Home", draw: "Draw", away: "Away" };

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getGameProfile(decodeParam(userId));
  if (!profile) return {};
  return { title: `${profile.user.displayName} — EdgeIQ Challenge — Edge Analysts` };
}

export default async function GameProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: rawUserId } = await params;
  const profile = await getGameProfile(decodeParam(rawUserId));
  if (!profile) notFound();

  return (
    <div className="space-y-8">
      <BetanoPromo />
      <div>
        <h1 className="font-display text-4xl tracking-wide">{profile.user.displayName}</h1>
        <p className="mt-1 font-data text-xs text-muted">Joined {profile.user.joinedAt.slice(0, 10)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[14px] border border-line bg-panel p-4 text-center shadow-[var(--shadow)]">
          <b className="block font-data text-2xl text-accent">{profile.picks}</b>
          <em className="mt-1 block font-data text-[10px] not-italic uppercase tracking-wider text-muted">Picks</em>
        </div>
        <div className="rounded-[14px] border border-line bg-panel p-4 text-center shadow-[var(--shadow)]">
          <b className="block font-data text-2xl text-accent">{profile.picks ? `${Math.round(profile.accuracy * 100)}%` : "—"}</b>
          <em className="mt-1 block font-data text-[10px] not-italic uppercase tracking-wider text-muted">Accuracy</em>
        </div>
        <div className="rounded-[14px] border border-line bg-panel p-4 text-center shadow-[var(--shadow)]">
          <b className="block font-data text-2xl text-accent">{profile.user.seasonPts}</b>
          <em className="mt-1 block font-data text-[10px] not-italic uppercase tracking-wider text-muted">Season pts</em>
        </div>
        <div className="rounded-[14px] border border-line bg-panel p-4 text-center shadow-[var(--shadow)]">
          <b className="block font-data text-2xl text-accent">{profile.user.streak}{profile.user.streak >= 3 ? " 🔥" : ""}</b>
          <em className="mt-1 block font-data text-[10px] not-italic uppercase tracking-wider text-muted">Streak</em>
        </div>
      </div>

      {profile.agreedWithEdgeIQPct != null && (
        <p className="font-data text-sm text-ink">
          vs EdgeIQ: Agreed {Math.round(profile.agreedWithEdgeIQPct * 100)}% of the time
          {profile.beatenEdgeIQ > 0 && ` · Beat EdgeIQ ${profile.beatenEdgeIQ} times`}
        </p>
      )}

      <section>
        <h2 className="mb-3.5 font-body text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Pick history</h2>
        {profile.history.length === 0 ? (
          <p className="font-data text-sm text-muted">No picks yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]">
            <table className="w-full min-w-[560px] border-collapse font-data text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-ink">
                  <th className="py-2.5 pl-4 pr-2">Date</th>
                  <th className="px-2 py-2.5">Match</th>
                  <th className="px-2 py-2.5">Pick</th>
                  <th className="px-2 py-2.5">EdgeIQ</th>
                  <th className="py-2.5 pl-2 pr-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {profile.history.map((h) => (
                  <tr key={h.matchId} className="border-b border-line/60">
                    <td className="py-2.5 pl-4 pr-2 text-ink">{h.kickoffUtc.slice(0, 10)}</td>
                    <td className="px-2 py-2.5 text-ink">{h.homeTeam} v {h.awayTeam}</td>
                    <td className="px-2 py-2.5 uppercase text-ink">{PICK_LABEL[h.pick]}</td>
                    <td className="px-2 py-2.5 uppercase text-muted">{h.edgeIQPick ? PICK_LABEL[h.edgeIQPick] : "—"}</td>
                    <td className={`py-2.5 pl-2 pr-4 text-right font-bold ${h.correct == null ? "text-muted" : h.correct ? "text-accent" : "text-loss"}`}>
                      {h.correct == null ? "Pending" : h.correct ? `✓ +${h.points}pts` : "✗ 0pts"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
