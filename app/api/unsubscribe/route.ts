/**
 * /api/unsubscribe
 * GET  — manual unsubscribe link from emails: ?email=...&token=...
 *        Token is HMAC-SHA256(email) keyed on UNSUBSCRIBE_SECRET, so nobody
 *        can unsubscribe an address they don't already have a valid link for.
 * POST — Brevo webhook for unsubscribed / spam / bounce events.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { MongoClient, type Db } from "mongodb";
import type { SiteUser } from "@/lib/userTypes";

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

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} | Edge Analysts</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@200;400;500;600&display=swap" rel="stylesheet" />
<style>
  html, body { background: #080808; margin: 0; padding: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif; color: #ededed;
  }
  .card { max-width: 32rem; padding: 2.5rem 2rem; text-align: center; }
  h1 {
    font-family: 'Bebas Neue', 'Arial Narrow', sans-serif;
    letter-spacing: 0.04em; font-size: 2.25rem; margin: 0 0 1rem;
    color: #ededed;
  }
  p { font-size: 0.95rem; line-height: 1.6; color: #ededed; margin: 0 0 1.5rem; }
  a.home {
    display: inline-block; border: 1px solid #c8ff00; color: #c8ff00;
    padding: 0.6rem 1.4rem; text-decoration: none; font-weight: 500;
    letter-spacing: 0.04em; transition: background-color 0.15s, color 0.15s;
  }
  a.home:hover { background: #c8ff00; color: #080808; }
</style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function errorPage(message: string, status: number): NextResponse {
  return page(
    "Unsubscribe error",
    `<h1>Something went wrong</h1><p>${message}</p><a class="home" href="/">Back to Edge Analysts</a>`,
    status
  );
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.error("UNSUBSCRIBE_SECRET is not set");
    return errorPage("Unsubscribe links aren't working right now. Please try again later.", 500);
  }

  if (!email || !token) {
    return errorPage("This unsubscribe link is missing required information.", 400);
  }

  const expected = crypto.createHmac("sha256", secret).update(email).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const tokenBuf = Buffer.from(token, "hex");
  const validToken =
    expectedBuf.length === tokenBuf.length && crypto.timingSafeEqual(expectedBuf, tokenBuf);

  if (!validToken) {
    return errorPage("This unsubscribe link is invalid or has expired.", 400);
  }

  try {
    const users = (await db()).collection<SiteUser>("users");
    await users.updateOne(
      { email },
      { $set: { role: "unsubscribed", unsubscribedAt: new Date(), unsubscribeSource: "link" } }
    );
  } catch (err) {
    console.error("Unsubscribe API error:", err);
    return errorPage("We couldn't process your request. Please try again later.", 500);
  }

  return page(
    "Unsubscribed",
    `<h1>You're unsubscribed</h1>
     <p>You've been unsubscribed from Edge Analysts. You won't receive any further emails from us.</p>
     <a class="home" href="/">Changed your mind? Back to Edge Analysts</a>`
  );
}

async function verifyBrevoSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret) return true; // optional — skip verification if not configured
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf = Buffer.from(signature, "hex");
  return expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-brevo-signature");

  if (!(await verifyBrevoSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: unknown; email?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = typeof payload.event === "string" ? payload.event : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!event || !email) {
    return NextResponse.json({ error: "Missing event or email" }, { status: 400 });
  }

  if (event === "soft_bounce") {
    // Temporary delivery issue — log only, no state change.
    console.log("Brevo soft_bounce:", email);
    return NextResponse.json({ received: true });
  }

  try {
    const users = (await db()).collection<SiteUser>("users");

    if (event === "unsubscribed") {
      await users.updateOne(
        { email },
        { $set: { role: "unsubscribed", unsubscribedAt: new Date(), unsubscribeSource: "brevo_webhook" } }
      );
    } else if (event === "spam") {
      await users.updateOne(
        { email },
        { $set: { role: "unsubscribed", unsubscribedAt: new Date(), unsubscribeSource: "spam_report" } }
      );
    } else if (event === "hard_bounce") {
      await users.updateOne(
        { email },
        { $set: { role: "invalid", unsubscribeSource: "hard_bounce" } }
      );
    } else {
      // Unhandled event type (delivered, opened, clicked, etc.) — nothing to do.
      console.log("Unhandled Brevo webhook event:", event, email);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Brevo webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
