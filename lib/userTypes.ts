export type UserRole = "subscriber" | "member" | "admin" | "unsubscribed" | "invalid";

export interface SiteUser {
  _id?: string;
  email: string;
  name?: string;
  username?: string;
  role: UserRole;
  source: string;        // where they signed up: "homepage", "schedule", "modal"
  brevoId?: string;
  brevoSynced: boolean;
  createdAt: Date;
  upgradedAt?: Date;         // set when subscriber upgrades to member
  emailVerified?: Date;      // set by NextAuth on magic link verification
  unsubscribedAt?: Date;
  unsubscribeSource?: string; // "link" | "brevo_webhook" | "spam_report" | "hard_bounce"
  resubscribedAt?: Date;
  unsubscribeToken?: string; // HMAC-SHA256(email) — embed in outbound email unsubscribe links
}
