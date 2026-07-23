import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAffiliateById } from "@/lib/affiliates";
import { recordClick } from "@/lib/clicks";
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookmaker: string }> }) {
  const { bookmaker } = await params;
  const target = await getAffiliateById(bookmaker);
  if (!target) return NextResponse.redirect(new URL("/", req.url));
  after(() => recordClick({ event: "affiliate_click", bookmaker: target.id, referer: req.headers.get("referer"), ua: req.headers.get("user-agent"), ts: new Date() }));
  return NextResponse.redirect(target.href, 302);
}
