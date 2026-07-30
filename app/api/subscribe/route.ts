/**
 * POST /api/subscribe — email capture for the "subscriber" tier.
 * Upserts into the "users" collection and best-effort syncs new
 * subscribers to Mailchimp (never fails the request if Mailchimp is down).
 */
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, MongoServerError, type Db } from "mongodb";
import type { SiteUser } from "@/lib/userTypes";

declare global {
  // Persist the client promise across Next.js hot reloads in dev
  // eslint-disable-next-line no-var
  var _eaMongoClient: Promise<MongoClient> | undefined;
  // Ensures the unique email index exists — created once per warm instance
  // eslint-disable-next-line no-var
  var _eaUsersIndexEnsured: Promise<void> | undefined;
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

// Guarantees at most one "users" doc per email even under concurrent
// requests — findOne-then-insert alone has a TOCTOU race, the unique
// index is what actually prevents duplicates.
function ensureUsersIndex(): Promise<void> {
  if (!global._eaUsersIndexEnsured) {
    global._eaUsersIndexEnsured = db()
      .then((database) => database.collection<SiteUser>("users").createIndex({ email: 1 }, { unique: true }))
      .then(() => undefined);
    global._eaUsersIndexEnsured.catch(() => {
      global._eaUsersIndexEnsured = undefined; // retry next request on failure
    });
  }
  return global._eaUsersIndexEnsured;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function syncToMailchimp(email: string, name: string | undefined, role: string): Promise<string | null> {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !listId || !serverPrefix) return null;

  try {
    const res = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: { FNAME: name ?? "" },
        tags: [role],
      }),
    });
    if (!res.ok) {
      console.error("Mailchimp sync failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return typeof data.id === "string" ? data.id : null;
  } catch (err) {
    console.error("Mailchimp sync error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; name?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
  const source = typeof body.source === "string" && body.source ? body.source : "unknown";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const users = (await db()).collection<SiteUser>("users");
    await ensureUsersIndex();

    const existing = await users.findOne({ email });
    if (existing) {
      if (existing.role === "member") {
        return NextResponse.json({ status: "already_member" });
      }
      return NextResponse.json({ status: "already_subscribed" });
    }

    const newUser: SiteUser = {
      email,
      role: "subscriber",
      source,
      mailchimpSynced: false,
      createdAt: new Date(),
      ...(name ? { name } : {}),
    };

    let insertedId;
    try {
      insertedId = (await users.insertOne(newUser)).insertedId;
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        // Lost the race to a concurrent request for the same email — they're subscribed either way.
        return NextResponse.json({ status: "already_subscribed" });
      }
      throw err;
    }

    const mailchimpId = await syncToMailchimp(email, name, newUser.role);
    if (mailchimpId) {
      await users.updateOne(
        { _id: insertedId },
        { $set: { mailchimpId, mailchimpSynced: true } }
      );
    }

    return NextResponse.json({ status: "subscribed" });
  } catch (err) {
    console.error("Subscribe API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
