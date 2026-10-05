import { timingSafeEqual } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TRACK_RECORD_TAG } from "@/lib/trackRecord";

/**
 * On-demand refresh for /track-record, called by build_track_record.py after
 * its Monday run:
 *   POST /api/revalidate/track-record
 *   Authorization: Bearer <TRACK_RECORD_REVALIDATE_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TRACK_RECORD_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(TRACK_RECORD_TAG);
  revalidatePath("/track-record");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
