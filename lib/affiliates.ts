/**
 * Affiliate data layer.
 *
 * Production: reads from MongoDB `affiliates` collection.
 *   - Update affiliates live in Atlas Data Explorer — no redeployment needed.
 *   - Add MONGODB_URI to Vercel env vars (already there for clicks/data).
 *
 * Local dev fallback: reads data/affiliates.json if Mongo is unavailable.
 *
 * To add/edit an affiliate: update the doc directly in Atlas, or re-run
 *   python scripts/seed_affiliates.py --data-dir data
 * after editing data/affiliates.json.
 */

export interface AffiliateBanner { src: string; w: number; h: number }

export interface Affiliate {
  id: string;
  name: string;
  tagline?: string;
  badge?: string;
  logoInitials: string;
  href: string;
  termsHref?: string;
  termsLabel?: string;
  brandColor?: string;
  banners?: Record<string, AffiliateBanner>;
  aliases?: string[];
  active?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function isLive(a: Affiliate): boolean {
  return a.active !== false && /^https?:\/\//.test(a.href);
}

// ---------------------------------------------------------------- Mongo client (reused)

declare global {
  // eslint-disable-next-line no-var
  var _eaAffClient: Promise<import("mongodb").MongoClient> | undefined;
}

async function getAffiliatesFromMongo(): Promise<Affiliate[]> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return [];
  try {
    if (!global._eaAffClient) {
      const { MongoClient } = await import("mongodb");
      global._eaAffClient = new MongoClient(uri, {
        maxPoolSize: 3,
        serverSelectionTimeoutMS: 3000,
      }).connect();
      global._eaAffClient.catch(() => { global._eaAffClient = undefined; });
    }
    const client = await global._eaAffClient;
    const db = client.db(process.env.MONGODB_DB ?? "edgeanalysts");
    const docs = await db.collection("affiliates").find({}).toArray();
    // Strip Mongo's _id before returning — not part of the Affiliate interface
    return docs.map(({ _id, ...rest }) => rest as Affiliate);
  } catch (err) {
    console.error("affiliates Mongo read failed:", err);
    return [];
  }
}

async function getAffiliatesFromFile(): Promise<Affiliate[]> {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const raw = await fs.readFile(
      path.join(process.cwd(), "data", "affiliates.json"),
      "utf-8"
    );
    return JSON.parse(raw) as Affiliate[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- public API

export async function getAffiliateList(): Promise<Affiliate[]> {
  // Try Mongo first; fall back to local file (useful in dev without MONGODB_URI)
  const fromMongo = await getAffiliatesFromMongo();
  if (fromMongo.length > 0) return fromMongo;
  return getAffiliatesFromFile();
}

export async function getAffiliateById(id: string): Promise<Affiliate | null> {
  const list = await getAffiliateList();
  return list.find((a) => a.id === id && isLive(a)) ?? null;
}

/** Match an odds-feed bookmaker key to an affiliate (for EV card CTAs). */
export async function getAffiliateForBookmaker(bookmaker: string): Promise<Affiliate | null> {
  const key = norm(bookmaker);
  const list = await getAffiliateList();
  return (
    list.find(
      (a) =>
        isLive(a) &&
        (norm(a.id) === key ||
          norm(a.name) === key ||
          (a.aliases ?? []).some((al) => norm(al) === key))
    ) ?? null
  );
}
