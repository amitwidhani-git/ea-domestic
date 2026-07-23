import { promises as fs } from "fs";
import path from "path";
export interface AffiliateBanner { src: string; w: number; h: number }
export interface Affiliate {
  id: string; name: string; tagline?: string; badge?: string;
  logoInitials: string; href: string; termsHref?: string; termsLabel?: string;
  brandColor?: string; banners?: Record<string, AffiliateBanner>;
  aliases?: string[]; active?: boolean;
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function isLive(a: Affiliate): boolean { return a.active !== false && /^https?:\/\//.test(a.href); }
export async function getAffiliateList(): Promise<Affiliate[]> {
  try { const raw = await fs.readFile(path.join(process.cwd(), "data", "affiliates.json"), "utf-8"); return JSON.parse(raw); }
  catch (err) { console.error("affiliates.json failed to load:", err); return []; }
}
export async function getAffiliateById(id: string): Promise<Affiliate | null> {
  const list = await getAffiliateList(); return list.find((a) => a.id === id && isLive(a)) ?? null;
}
export async function getAffiliateForBookmaker(bookmaker: string): Promise<Affiliate | null> {
  const key = norm(bookmaker); const list = await getAffiliateList();
  return list.find((a) => isLive(a) && (norm(a.id) === key || norm(a.name) === key || (a.aliases ?? []).some((al) => norm(al) === key))) ?? null;
}
