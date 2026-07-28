/**
 * Cookie consent — minimal PECR/UK-GDPR style gate.
 * Choice is stored client-side (localStorage) and mirrored to a cookie so
 * it's also readable server-side later if needed. Non-essential scripts
 * (analytics, ad pixels, etc.) should call `hasAnalyticsConsent()` before
 * loading — nothing in the codebase does yet, this just gives it a home.
 */

export type ConsentChoice = "accepted" | "declined";

const STORAGE_KEY = "ea_cookie_consent";
const COOKIE_NAME = "ea_cookie_consent";
const COOKIE_MAX_AGE_DAYS = 180;
export const CONSENT_EVENT = "ea:cookie-consent-change";

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

export function setConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, choice);
  document.cookie = `${COOKIE_NAME}=${choice}; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 86400}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "accepted";
}
