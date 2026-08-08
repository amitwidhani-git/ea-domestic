/**
 * GET /api/odds/[matchId] — every bookmaker's h2h snapshot for one fixture,
 * sorted by bookmaker, with a friendly display name attached. Returns [] when
 * there are no snapshots (or Mongo is unavailable) so the client degrades quietly.
 */
import { NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
}

async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!global._eaMongoClient) {
    global._eaMongoClient = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 }).connect();
    global._eaMongoClient.catch(() => { global._eaMongoClient = undefined; });
  }
  const client = await global._eaMongoClient;
  return client.db(process.env.MONGODB_DB ?? "edgeanalysts");
}

const DISPLAY_NAMES: Record<string, string> = {
  betfair_ex_uk: "Betfair Exchange",
  betfair_sb_uk: "Betfair Sportsbook",
  bet365: "Bet365",
  williamhill: "William Hill",
  skybet: "Sky Bet",
  coral: "Coral",
  ladbrokes: "Ladbrokes",
  paddypower: "Paddy Power",
  betway: "Betway",
  boylesports: "BoyleSports",
  unibet_uk: "Unibet",
  grosvenor: "Grosvenor Sport",
  livescorebet: "LiveScore Bet",
  matchbook: "Matchbook",
  casumo: "Casumo",
  betano_uk: "Betano",
};

function displayName(key: string): string {
  return DISPLAY_NAMES[key] ?? key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  try {
    const db = await getDb();
    if (!db) return NextResponse.json([]);

    const snaps = await db
      .collection("odds_snapshots")
      .find({ matchId })
      .sort({ bookmaker: 1 })
      .toArray();

    const rows = snaps.map((s) => ({
      bookmaker: String(s.bookmaker),
      displayName: displayName(String(s.bookmaker)),
      prices: s.prices ?? { home: null, draw: null, away: null },
      impliedProbs: s.impliedProbs ?? { home: null, draw: null, away: null },
      overround: s.overround ?? null,
      fetchedAt: s.fetchedAt instanceof Date ? s.fetchedAt.toISOString() : String(s.fetchedAt ?? ""),
    }));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Odds API error:", err);
    return NextResponse.json([]);
  }
}
