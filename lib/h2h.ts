/**
 * Head-to-head normalisation + win-count logic, shared by the match-detail
 * loader (lib/matchDetail.ts) and GET /api/head2head.
 *
 * The stored head2head meetings use `homeGoals`/`awayGoals`/`league`; the UI
 * expects `homeScore`/`awayScore`/`competition`, so we normalise here. Win
 * counts are (re)computed from the meetings and attributed to the TWO teams in
 * *this* fixture — regardless of which side was home in any given meeting — so
 * a club's away wins are no longer dropped.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawMeeting = Record<string, any>;

export interface H2HMeetingNorm {
  date: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
}

export interface H2HCounts { homeWins: number; draws: number; awayWins: number }

const goalsHome = (m: RawMeeting): number | null => m.homeGoals ?? m.homeScore ?? null;
const goalsAway = (m: RawMeeting): number | null => m.awayGoals ?? m.awayScore ?? null;

export function normalizeMeeting(m: RawMeeting): H2HMeetingNorm {
  return {
    date: m.date ?? null,
    homeTeam: m.homeTeam ?? null,
    awayTeam: m.awayTeam ?? null,
    homeScore: goalsHome(m),
    awayScore: goalsAway(m),
    competition: m.league ?? m.competition ?? null,
  };
}

// Distinctive club tokens — drops generic suffixes so "Sheffield Utd",
// "Sheffield United" and the slug "sheffield-united" all reduce to {sheffield}.
const STOP = new Set([
  "fc", "afc", "the", "town", "city", "united", "utd", "rovers", "county",
  "athletic", "albion", "wanderers", "hotspur", "argyle", "alexandra",
  "rangers", "and", "end", "north", "south", "east", "west", "park",
]);
function tokens(s: string): Set<string> {
  return new Set(
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)),
  );
}
function overlap(a: string, b: string): number {
  const ta = tokens(a);
  let n = 0;
  for (const w of tokens(b)) if (ta.has(w)) n++;
  return n;
}

/**
 * Count wins for the two fixture teams from the meetings list.
 * `team1`/`team2` are any identifier for this fixture's home/away side
 * (display name or slug); the meeting winner's name is matched to whichever
 * fixture team it most resembles.
 */
export function computeH2H(meetings: RawMeeting[], team1: string, team2: string): H2HCounts {
  let homeWins = 0, awayWins = 0, draws = 0;
  for (const m of meetings) {
    const hg = goalsHome(m), ag = goalsAway(m);
    if (hg == null || ag == null) continue;
    if (hg === ag) { draws++; continue; }
    const winner = String((hg > ag ? m.homeTeam : m.awayTeam) ?? "");
    // Attribute to team1 unless the winner clearly resembles team2 more.
    if (overlap(winner, team2) > overlap(winner, team1)) awayWins++;
    else homeWins++;
  }
  return { homeWins, draws, awayWins };
}
