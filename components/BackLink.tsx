"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Contextual "back" — returns the visitor to wherever they actually came
 * from (Home, Odds, a team page, …) via browser history when that history
 * is same-site, falling back to `fallbackHref` for direct/deep-linked visits
 * (shared link, new tab, refresh) where there's nothing useful to go back to.
 */
export default function BackLink({ fallbackHref, label = "Back" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    try {
      const sameSiteReferrer = document.referrer && new URL(document.referrer).origin === window.location.origin;
      setCanGoBack(window.history.length > 1 && !!sameSiteReferrer);
    } catch { setCanGoBack(false); }
  }, []);

  return (
    <Link
      href={fallbackHref}
      onClick={(e) => { if (canGoBack) { e.preventDefault(); router.back(); } }}
      className="font-data text-xs text-muted hover:text-ink"
    >
      ← {label}
    </Link>
  );
}
