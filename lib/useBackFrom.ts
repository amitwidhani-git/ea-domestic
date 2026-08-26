"use client";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Encodes the current page (path + query) as a `from=` value for links into
 * the match centre, so its BackLink can return here precisely. Necessary
 * because document.referrer doesn't update across client-side (SPA)
 * navigations — it can't tell a match-centre page where a same-site Link
 * click actually came from, only where the browser tab's document last
 * hard-loaded from.
 */
export function useBackFrom(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return encodeURIComponent(qs ? `${pathname}?${qs}` : pathname);
}
