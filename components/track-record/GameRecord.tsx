import Link from "next/link";
import LeagueBadge from "@/components/LeagueBadge";
import type { GamePage, GameQuery } from "@/lib/trackRecord";
import { LEAGUE_NAMES } from "@/lib/types";

/** URL for this tab with the current filters, overriding `page`. */
export function gamesHref(q: GameQuery, page: number): string {
  const p = new URLSearchParams({ tab: "games" });
  if (q.league) p.set("league", q.league);
  if (q.outcome !== "all") p.set("result", q.outcome);
  if (q.team) p.set("team", q.team);
  if (page > 1) p.set("page", String(page));
  return `/track-record?${p.toString()}`;
}

export default function GameRecord({
  games, query, leagues,
}: {
  games: GamePage;
  query: GameQuery;
  leagues: { code: string; name: string }[];
}) {
  const filtered = !!(query.league || query.outcome !== "all" || query.team);
  const from = encodeURIComponent(gamesHref(query, games.page));
  const first = games.total ? (games.page - 1) * games.perPage + 1 : 0;
  const last = Math.min(games.page * games.perPage, games.total);

  return (
    <div className="sec">
      <h2>Game record</h2>
      <div className="sub">Every settled game EdgeIQ made a pick on, newest first. Each pick was logged before kick-off at the time shown</div>

      {/* Plain GET form: filters work without JavaScript and every view has its own URL */}
      <form method="get" action="/track-record" className="gfilters">
        <input type="hidden" name="tab" value="games" />
        <label>
          Competition
          <select name="league" defaultValue={query.league ?? ""}>
            <option value="">All competitions</option>
            {leagues.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
        <label>
          Result
          <select name="result" defaultValue={query.outcome}>
            <option value="all">Correct and wrong</option>
            <option value="correct">Correct only</option>
            <option value="wrong">Wrong only</option>
          </select>
        </label>
        <label>
          Team
          <input type="search" name="team" defaultValue={query.team} placeholder="Search a team" maxLength={60} />
        </label>
        <button type="submit" className="btn">Apply</button>
        {filtered && <Link href="/track-record?tab=games" className="btn ghost" scroll={false}>Clear</Link>}
      </form>

      {games.rows.length === 0 ? (
        <div className="panel" style={{ textAlign: "center" }}>
          {games.total > 0 ? (
            <p style={{ margin: "0 auto" }}>
              There are only {games.pages} {games.pages === 1 ? "page" : "pages"} of games.{" "}
              <Link href={gamesHref(query, 1)} className="link" scroll={false}>Back to page 1</Link>
            </p>
          ) : (
            <p style={{ margin: "0 auto" }}>{filtered ? "No settled games match these filters." : "No settled games yet."}</p>
          )}
        </div>
      ) : (
        <>
          <table className="gr">
            <thead>
              <tr>
                <th>Date</th>
                <th>Competition</th>
                <th>Match</th>
                <th>EdgeIQ pick</th>
                <th>EdgeIQ probability</th>
                <th>Result</th>
                <th>Correct</th>
                <th>Logged at</th>
              </tr>
            </thead>
            <tbody>
              {games.rows.map((r) => (
                <tr key={r.matchId}>
                  <td data-label="Date">{r.date}</td>
                  <td data-label="Competition">
                    <span className="lg"><LeagueBadge league={r.league} />{LEAGUE_NAMES[r.league] ?? r.league}</span>
                  </td>
                  <td data-label="Match">
                    <span>
                      <Link href={`/teams/${r.home.id}`}>{r.home.name}</Link> v <Link href={`/teams/${r.away.id}`}>{r.away.name}</Link>
                    </span>
                  </td>
                  <td data-label="EdgeIQ pick">{r.pickLabel}</td>
                  <td data-label="EdgeIQ probability">{r.prob}%</td>
                  <td data-label="Result">
                    <Link href={`/matches/${r.matchId}?from=${from}`} title="Open match centre">{r.score}</Link>
                  </td>
                  <td data-label="Correct" className={r.correct ? "ok" : "no"}>{r.correct ? "Yes" : "No"}</td>
                  <td data-label="Logged at" className="mut">{r.loggedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pager" aria-label="Game record pages">
            <Link href={gamesHref(query, games.page - 1)} className={`btn ghost${games.page <= 1 ? " off" : ""}`} aria-disabled={games.page <= 1} scroll={false}>
              ← Newer
            </Link>
            <span>
              {first} to {last} of {games.total} · Page {games.page} of {Math.max(games.pages, 1)}
            </span>
            <Link href={gamesHref(query, games.page + 1)} className={`btn ghost${games.page >= games.pages ? " off" : ""}`} aria-disabled={games.page >= games.pages} scroll={false}>
              Older →
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
