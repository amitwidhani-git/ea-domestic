/**
 * Next.js's App Router decodes dynamic segment params for Route Handlers but
 * not reliably for page params containing multi-byte UTF-8 percent-encoding
 * (e.g. "%C3%BC" for "ü") — confirmed by testing the identical URL against
 * both: the Route Handler resolves correctly, the page receives the still-
 * encoded string, fails its Mongo `_id` lookup, and 404s. Safe to call
 * unconditionally — a no-op on an already-decoded string, and falls back to
 * the raw value if it's not valid percent-encoding at all.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
