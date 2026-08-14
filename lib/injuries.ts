/**
 * The injuries feed never actually computes `severity` (always "unknown" in
 * Mongo) or a real `injuryType` (always "Unknown") — the one field that
 * carries real signal is `position`, which the source pipeline mislabels:
 * it holds API-Football's status text ("Missing Fixture", "Questionable", …)
 * rather than a playing position. Derive a real severity from that text so
 * the UI badge isn't permanently "?".
 */
export type InjurySeverity = "suspension" | "high" | "medium" | "low" | "international" | "unknown";

const KNOWN: readonly InjurySeverity[] = ["suspension", "high", "medium", "low", "international", "unknown"];

export function deriveInjurySeverity(raw: { severity?: string | null; position?: string | null }): InjurySeverity {
  const s = raw.severity;
  if (s && (KNOWN as readonly string[]).includes(s) && s !== "unknown") return s as InjurySeverity;
  const p = String(raw.position ?? "").toLowerCase();
  if (p.includes("suspend")) return "suspension";
  if (p.includes("miss")) return "high";
  if (p.includes("question") || p.includes("doubt")) return "medium";
  if (p.includes("international") || p.includes("intl")) return "international";
  return "unknown";
}
