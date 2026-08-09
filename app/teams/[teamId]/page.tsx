import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MongoClient, type Db } from "mongodb";
import ClubCrest from "@/components/ClubCrest";
import LeagueBadge from "@/components/LeagueBadge";
import ProbBar from "@/components/ProbBar";
import FrozenStamp from "@/components/FrozenStamp";
import type { League } from "@/lib/types";

export const dynamic = "force-dynamic";

declare global {
  // Persist the client promise across Next.js hot reloads in dev
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).connect();
    global._eaMongoClient.catch(() => {
      global._eaMongoClient = undefined; // retry next request on failure
    });
  }
  return global._eaMongoClient;
}

async function db(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

interface TeamDoc {
  _id: string;
  league: League;
  name: string;
  aliases?: { apiFootball?: number | null };
  elo?: number | null;
  coach?: string | null;
  venue?: string | null;
  city?: string | null;
}

interface MatchDoc {
  _id: string;
  league: League;
  season: string;
  kickoffUtc: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
}

// Raw "predictions" doc shape — matches the field names already relied on
// by lib/data.ts and app/api/schedule/route.ts.
interface PredictionDoc {
  matchId: string;
  probs: { home: number; draw: number; away: number };
  pick: "home" | "draw" | "away";
  frozenAt: string;
  hash: string;
  modelCorrect: boolean | null;
}

interface ClubNewsDoc {
  _id: string;
  teamId: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
}

interface ModelRunDoc {
  att?: Record<string, number>;
  deff?: Record<string, number>;
  createdAt: string;
}

interface UpcomingFixture {
  match: MatchDoc;
  prediction: PredictionDoc | null;
  homeName: string;
  awayName: string;
}

type InjurySeverity = "suspension" | "high" | "medium" | "low" | "international" | "unknown";

interface InjuryDoc {
  teamId: string;
  playerId: number;
  playerName: string;
  position: "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";
  injuryType: string;
  severity: InjurySeverity;
  reason: string;
  updatedAt: string;
}

const SEVERITY_ORDER: Record<InjurySeverity, number> = {
  suspension: 0, high: 1, medium: 2, low: 3, international: 4, unknown: 5,
};

const SEVERITY_BADGE: Record<InjurySeverity, { label: string; className: string }> = {
  suspension: { label: "SUSP", className: "border-loss text-loss" },
  high: { label: "OUT", className: "border-orange-500/60 text-orange-400" },
  medium: { label: "DOUBT", className: "border-yellow-500/60 text-yellow-400" },
  low: { label: "50/50", className: "border-muted text-muted" },
  international: { label: "INTL", className: "border-blue-500/60 text-blue-400" },
  unknown: { label: "?", className: "border-muted text-muted" },
};

async function getTeam(teamId: string): Promise<TeamDoc | null> {
  return (await db()).collection<TeamDoc>("teams").findOne({ _id: teamId });
}

async function getClubNews(teamId: string): Promise<ClubNewsDoc[]> {
  return (await db())
    .collection<ClubNewsDoc>("club_news")
    .find({ teamId })
    .sort({ publishedAt: -1 })
    .limit(5)
    .toArray();
}

async function getUpcomingFixtures(teamId: string): Promise<UpcomingFixture[]> {
  const d = await db();
  const matches = await d
    .collection<MatchDoc>("matches")
    .find({
      $or: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: "SCHEDULED",
      kickoffUtc: { $gte: new Date().toISOString() },
    })
    .sort({ kickoffUtc: 1 })
    .limit(5)
    .toArray();

  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m._id);
  const preds = await d
    .collection<PredictionDoc>("predictions")
    .find({ matchId: { $in: matchIds } })
    .toArray();
  const predictionByMatch = new Map(preds.map((p) => [p.matchId, p]));

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teams = await d.collection<TeamDoc>("teams").find({ _id: { $in: teamIds } }).toArray();
  const nameById = new Map(teams.map((t) => [t._id, t.name]));

  return matches.map((match) => ({
    match,
    prediction: predictionByMatch.get(match._id) ?? null,
    homeName: nameById.get(match.homeTeamId) ?? match.homeTeamId,
    awayName: nameById.get(match.awayTeamId) ?? match.awayTeamId,
  }));
}

async function getInjuries(teamId: string): Promise<InjuryDoc[]> {
  const injuries = await (await db())
    .collection<InjuryDoc>("injuries")
    .find({ teamId })
    .toArray();
  return injuries.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

async function getModelRatings(teamId: string): Promise<{ att: number | null; deff: number | null }> {
  const modelRun = await (await db())
    .collection<ModelRunDoc>("model_runs")
    .findOne({}, { sort: { createdAt: -1 } });
  if (!modelRun) return { att: null, deff: null };
  return {
    att: modelRun.att?.[teamId] ?? null,
    deff: modelRun.deff?.[teamId] ?? null,
  };
}

// Formats a UTC ISO string as Europe/London civil time, e.g. "Sat 16 Aug · 15:00 UK".
// Built from Intl.DateTimeFormat parts (not toLocaleString's default output) so the
// separators are deterministic rather than locale/ICU-version dependent.
function kickoffLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${get("hour")}:${get("minute")} UK`;
}

// e.g. "31 Jul 08:00" — day/month/time only, no year/weekday, unlike kickoffLabel.
function formatUpdatedAt(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// "google-news" -> "Google News" — derived from article.source rather than hardcoded.
function formatSourceLabel(source: string): string {
  return source.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const PICK_LABEL = { home: "Home win", draw: "Draw", away: "Away win" } as const;

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return {};
  return { title: `${team.name} — EdgeAnalysts` };
}

function RatingCard({ label, value }: { label: string; value: number | null }) {
  const display = value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  const colour = value == null ? "text-muted" : value > 0 ? "text-accent" : value < 0 ? "text-loss" : "text-ink";
  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-data text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl ${colour}`}>{display}</p>
    </div>
  );
}

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  const [news, fixtures, ratings, injuries] = await Promise.all([
    getClubNews(teamId),
    getUpcomingFixtures(teamId),
    getModelRatings(teamId),
    getInjuries(teamId),
  ]);

  return (
    <div className="space-y-10">
      <Link href="/teams" className="font-data text-xs text-muted hover:text-ink">
        ← All Teams
      </Link>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <ClubCrest apiFootballId={team.aliases?.apiFootball ?? null} clubName={team.name} size={64} />
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">{team.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LeagueBadge league={team.league} />
            <span className="font-data text-xs text-muted">2026-27</span>
            <span className="font-data text-xs text-muted">
              {team.elo != null ? `Elo ${team.elo}` : "New to our model"}
            </span>
            {team.coach && <span className="font-data text-xs text-muted">Coach: {team.coach}</span>}
            {team.venue && <span className="font-data text-xs text-muted">{team.venue}{team.city ? `, ${team.city}` : ""}</span>}
          </div>
        </div>
      </div>

      {/* ── MODEL RATINGS ────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-2xl tracking-wide">Model Intelligence</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RatingCard label="Attack" value={ratings.att} />
          <RatingCard label="Defence" value={ratings.deff} />
          <div className="border border-line bg-panel p-4">
            <p className="font-data text-[10px] uppercase tracking-widest text-muted">Elo</p>
            <p className="mt-1 font-display text-3xl text-ink">
              {team.elo != null ? team.elo : "Pending"}
            </p>
          </div>
        </div>
      </section>

      {/* ── NEXT FIXTURES ────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-2xl tracking-wide">Next Fixtures</h2>
        {fixtures.length === 0 ? (
          <p className="mt-4 font-data text-sm text-muted">No upcoming fixtures scheduled.</p>
        ) : (
          <div className="mt-4 divide-y divide-line/60 border border-line">
            {fixtures.map(({ match, prediction, homeName, awayName }) => (
              <div
                key={match._id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <LeagueBadge league={match.league} />
                  <div>
                    <p className="font-data text-[10px] text-muted">{kickoffLabel(match.kickoffUtc)}</p>
                    <p className="font-display text-lg tracking-wide">
                      {homeName} <span className="text-muted">v</span> {awayName}
                    </p>
                  </div>
                </div>
                {prediction ? (
                  <div className="flex flex-col gap-1 sm:w-40 sm:items-end">
                    <span className="font-data text-xs text-accent">{PICK_LABEL[prediction.pick]}</span>
                    <ProbBar probs={prediction.probs} pick={prediction.pick} />
                    <FrozenStamp frozenAt={prediction.frozenAt} hash={prediction.hash} />
                  </div>
                ) : (
                  <span className="font-data text-xs text-muted">Prediction locks 48h before kick-off</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SQUAD ABSENCES ───────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-2xl tracking-wide">Squad Absences</h2>
        {injuries.length === 0 ? (
          <p className="mt-4 font-data text-sm text-muted">No injury data available for this club.</p>
        ) : (
          <>
            <div className="mt-4 divide-y divide-line/60 border border-line">
              {injuries.map((inj) => (
                <div key={`${inj.playerId}-${inj.severity}`} className="flex items-center gap-3 px-4 py-2">
                  <span
                    className={`inline-block flex-shrink-0 border px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest ${SEVERITY_BADGE[inj.severity].className}`}
                  >
                    {SEVERITY_BADGE[inj.severity].label}
                  </span>
                  <p className="font-data text-sm text-ink">
                    {inj.playerName} <span className="text-muted">·</span> {inj.position}{" "}
                    <span className="text-muted">·</span> {inj.injuryType}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-data text-xs text-muted">
              Last updated: {formatUpdatedAt(
                injuries.reduce((latest, i) => (i.updatedAt > latest ? i.updatedAt : latest), injuries[0].updatedAt)
              )}
            </p>
            <p className="mt-1 font-data text-xs text-muted">
              Injury data from Thursday/Friday press conferences only
            </p>
          </>
        )}
      </section>

      {/* ── LATEST NEWS ──────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-2xl tracking-wide">Latest News</h2>
        {news.length === 0 ? (
          <p className="mt-4 font-data text-sm text-muted">No recent news available for this team.</p>
        ) : (
          <>
            <div className="mt-4 divide-y divide-line/60 border border-line">
              {news.map((article) => (
                <div key={article._id} className="px-4 py-3">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink hover:text-accent"
                  >
                    {article.title}
                  </a>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-block border border-line px-1.5 py-0.5 font-data text-[9px] uppercase tracking-widest text-muted">
                      Via {formatSourceLabel(article.source)}
                    </span>
                    <span className="font-data text-[10px] text-muted">{timeAgo(article.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 font-data text-[10px] leading-relaxed text-muted">
              News sourced via Google News. EdgeAnalysts is not responsible for third-party content.
              Links open external sites.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
