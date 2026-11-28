/** Fires a GA4 share event (article share buttons). No-op if gtag hasn't loaded. */
export function trackShare(params: { method: string; slug: string }) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "share", { method: params.method, content_type: "article", item_id: params.slug });
}

/** Match page sticky jump link clicked (replaces the old tab bar, 22 Nov 2026). */
export function trackSectionJump(params: { section: string; matchId: string }) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "section_jump", { section: params.section, match_id: params.matchId, page: window.location.pathname });
}

/** Match page section at least half visible; fired once per section per page view. */
export function trackSectionView(params: { section: string; matchId: string }) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "section_view", { section: params.section, match_id: params.matchId, page: window.location.pathname });
}

/** Fires a GA4 affiliate_click event. No-op if gtag hasn't loaded (e.g. consent declined). */
export function trackAffiliateClick(params: {
  bookmaker: string;
  matchId?: string | null;
  league?: string | null;
  odds?: number | null;
  /** 1-based row position in a Best Odds list (spec v3 section 8). */
  position?: number | null;
}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "affiliate_click", {
    bookmaker: params.bookmaker,
    page: window.location.pathname,
    ...(params.matchId != null ? { match_id: params.matchId } : {}),
    ...(params.league != null ? { league: params.league } : {}),
    ...(params.odds != null ? { odds: params.odds } : {}),
    ...(params.position != null ? { position: params.position } : {}),
  });
}
