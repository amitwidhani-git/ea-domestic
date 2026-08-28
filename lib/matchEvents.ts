/**
 * Match-event mapping/formatting — pure functions, no server-only imports, so
 * this is safe to use from both the server (lib/matchDetail.ts, initial load)
 * and the client (MatchLiveUpdater.tsx, merging the 60s live-poll response).
 * Both call sites must map through the same function or the two can drift.
 */

export type Side = "home" | "away";

export interface MatchEvent {
  minute: number | null;
  /** Stoppage-time minute within the half, e.g. 4 for a "45+4" event. */
  extra: number | null;
  side: Side | null;
  type: string | null;    // goal | own_goal | penalty | yellow_card | red_card | substitution | var
  detail: string | null;  // "Normal Goal" | "Yellow Card" | "Red Card" | "Penalty" | "Own Goal" ...
  player: string | null;
  assist: string | null;
}

/**
 * Raw shape as written by the background pipeline into match_stats.events —
 * field names deliberately differ from MatchEvent (elapsed/kind/playerName/…)
 * so this mapping is required, not optional; a bare `as MatchEvent` cast
 * silently leaves minute/type/player/assist/side all `undefined`.
 */
export interface RawMatchEvent {
  elapsed?: number | null;
  extra?: number | null;
  kind?: string | null;
  detail?: string | null;
  teamId?: number | null;
  playerName?: string | null;
  assistName?: string | null;
}

export function mapMatchEvent(e: RawMatchEvent, homeApiFootballId: number | null): MatchEvent {
  return {
    minute: e.elapsed ?? null,
    extra: e.extra ?? null,
    side: homeApiFootballId != null && e.teamId != null ? (e.teamId === homeApiFootballId ? "home" : "away") : null,
    type: e.kind ?? null,
    detail: e.detail ?? null,
    player: e.playerName ?? null,
    assist: e.assistName ?? null,
  };
}

/** "45'" normally, "45+4'" in stoppage time. Empty string when minute is unknown. */
export function formatMinute(minute: number | null | undefined, extra?: number | null): string {
  if (minute == null) return "";
  return extra ? `${minute}+${extra}'` : `${minute}'`;
}
