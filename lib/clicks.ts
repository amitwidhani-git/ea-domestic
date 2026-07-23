import type { MongoClient as MongoClientType } from "mongodb";
export interface ClickEvent { event: "affiliate_click"; bookmaker: string; referer: string | null; ua: string | null; ts: Date; }
const globalCache = globalThis as unknown as { _eaMongo?: Promise<MongoClientType> };
async function getClient(uri: string): Promise<MongoClientType> {
  if (!globalCache._eaMongo) {
    globalCache._eaMongo = import("mongodb").then(({ MongoClient }) => new MongoClient(uri, { serverSelectionTimeoutMS: 3000, maxPoolSize: 5 }).connect());
    globalCache._eaMongo.catch(() => { globalCache._eaMongo = undefined; });
  }
  return globalCache._eaMongo;
}
export async function recordClick(click: ClickEvent): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.log(JSON.stringify({ ...click, ts: click.ts.toISOString(), sink: "console" })); return; }
  try {
    const client = await getClient(uri);
    await client.db(process.env.MONGODB_DB ?? "edgeanalysts").collection(process.env.MONGODB_CLICKS_COLLECTION ?? "clicks").insertOne({ ...click });
  } catch (err) { console.error(JSON.stringify({ ...click, ts: click.ts.toISOString(), sink: "console-fallback", mongoError: err instanceof Error ? err.message : String(err) })); }
}
