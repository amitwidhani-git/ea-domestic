import { NextResponse } from "next/server";
import { SNAPSHOT_ID_RE, getSnapshot } from "@/lib/trackRecord";

/** GET /api/track-record/{all-time | 2026-W40 | 2026-10}: one track_record_snapshots doc as JSON. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SNAPSHOT_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id. Use all-time, YYYY-Www or YYYY-MM" }, { status: 400 });
  }
  const snap = await getSnapshot(id);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
