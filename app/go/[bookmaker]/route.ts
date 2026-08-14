import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAffiliateForBookmaker } from "@/lib/affiliates";
import { recordClick } from "@/lib/clicks";
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookmaker: string }> }) {
  const { bookmaker } = await params;
  // Callers (odds/value-signal cards) pass the raw odds-feed key (e.g. "betano_uk"),
  // not necessarily our affiliate id ("betano") — resolve with the same fuzzy
  // id/name/alias matching used for EV card CTAs (includes an exact-id match too).
  const target = await getAffiliateForBookmaker(bookmaker);
  if (!target) return NextResponse.redirect(new URL("/", req.url));
  after(() => recordClick({ event: "affiliate_click", bookmaker: target.id, referer: req.headers.get("referer"), ua: req.headers.get("user-agent"), ts: new Date() }));
  return NextResponse.redirect(target.href, 302);
}
