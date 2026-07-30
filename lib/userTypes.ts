export type UserRole = "subscriber" | "member" | "admin";

export interface SiteUser {
  _id?: string;
  email: string;
  name?: string;
  username?: string;
  role: UserRole;
  source: string;        // where they signed up: "homepage", "schedule", "modal"
  mailchimpId?: string;
  mailchimpSynced: boolean;
  createdAt: Date;
  upgradedAt?: Date;     // set when subscriber upgrades to member
  emailVerified?: Date;  // set by NextAuth on magic link verification
}
