/** Fires a GA4 affiliate_click event. No-op if gtag hasn't loaded (e.g. consent declined). */
export function trackAffiliateClick(params: {
  bookmaker: string;
  matchId?: string | null;
  league?: string | null;
  odds?: number | null;
}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "affiliate_click", {
    bookmaker: params.bookmaker,
    page: window.location.pathname,
    ...(params.matchId != null ? { match_id: params.matchId } : {}),
    ...(params.league != null ? { league: params.league } : {}),
    ...(params.odds != null ? { odds: params.odds } : {}),
  });
}
