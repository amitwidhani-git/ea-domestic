/**
 * POST /api/resubscribe — for someone who previously unsubscribed and wants back in.
 * Reactivates their "users" doc and re-adds them to Brevo (never fails the
 * request if Brevo is down). Mongo/Brevo patterns match app/api/subscribe/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";
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

async function sendWelcomeEmail(email: string, name: string | undefined, apiKey: string): Promise<void> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        to: [{ email, name }],
        templateId: parseInt(process.env.BREVO_TEMPLATE_ID ?? "1"),
      }),
    });
    if (!res.ok) {
      console.error("Brevo welcome email failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Brevo welcome email error:", err);
  }
}

async function syncToBrevo(email: string, name: string | undefined): Promise<string | null> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: name ?? "" },
        listIds: [parseInt(process.env.BREVO_LIST_ID ?? "2")],
        updateEnabled: true,
      }),
    });
    if (!res.ok) {
      console.error("Brevo contact sync failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    // 201 + { id } for a new contact, 204 with no body when updateEnabled
    // matched an existing one — both count as a successful sync.
    const data = await res.json().catch(() => null);
    const brevoId = data && typeof data.id === "number" ? String(data.id) : null;

    await sendWelcomeEmail(email, name, apiKey);

    return brevoId ?? "synced";
  } catch (err) {
    console.error("Brevo sync error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const users = (await db()).collection<SiteUser>("users");
    await ensureUsersIndex();

    const existing = await users.findOne({ email });

    if (existing && existing.role !== "unsubscribed") {
      // Already subscriber/member — and for "admin" or "invalid" (hard-bounced)
      // we deliberately don't silently flip them back to subscriber here.
      return NextResponse.json({ status: "already_active" });
    }

    if (existing) {
      await users.updateOne(
        { email },
        {
          $set: { role: "subscriber", resubscribedAt: new Date() },
          $unset: { unsubscribedAt: "" },
        }
      );
    } else {
      // No record at all — treat as a fresh subscribe rather than a dead end.
      const newUser: SiteUser = {
        email,
        role: "subscriber",
        source: "resubscribe",
        brevoSynced: false,
        createdAt: new Date(),
        resubscribedAt: new Date(),
        ...(name ? { name } : {}),
      };
      await users.insertOne(newUser);
    }

    const brevoId = await syncToBrevo(email, name);
    if (brevoId) {
      await users.updateOne({ email }, { $set: { brevoId, brevoSynced: true } });
    }

    return NextResponse.json({ status: "resubscribed" });
  } catch (err) {
    console.error("Resubscribe API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
