"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Contextual "back" — returns to wherever the visitor actually clicked in
 * from, via the `from=` query param every match-centre link sets to its own
 * page (see lib/useBackFrom.ts). That's the only reliable signal:
 * document.referrer doesn't update across client-side navigations, so it
 * can't tell this page where a same-site Link click came from. Falls back to
 * `fallbackHref` for direct/deep-linked visits (shared link, new tab) where
 * there's no `from` to trust.
 */
export default function BackLink({ fallbackHref, label = "Back" }: { fallbackHref: string; label?: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  // Only ever trust a same-site relative path — never an absolute/external URL.
  const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : null;

  return (
    <Link href={safeFrom ?? fallbackHref} className="font-data text-xs text-muted hover:text-ink">
      ← {label}
    </Link>
  );
}
