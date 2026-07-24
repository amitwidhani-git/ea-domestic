import { NextResponse } from "next/server";
import { getAffiliateList, isLive } from "@/lib/affiliates";
export async function GET() {
  const list = await getAffiliateList();
  return NextResponse.json(list.filter(isLive));
}
