/**
 * Team-slug -> flagcdn.com ISO code, for national-team (Nations League) team
 * cards. flagcdn uses ISO 3166-1 alpha-2 for sovereign nations, plus its own
 * ad-hoc subdivision codes for the UK home nations and Kosovo (no official
 * ISO code). Built against the real `teams` collection slugs (league: "NL"),
 * not guessed — includes both the "turkiye" and "türkiye" docs since Mongo
 * currently carries both for the same nation.
 */
const SLUG_TO_ISO: Record<string, string> = {
  france: "fr", spain: "es", england: "gb-eng", germany: "de", portugal: "pt",
  netherlands: "nl", italy: "it", belgium: "be", croatia: "hr", denmark: "dk",
  greece: "gr", serbia: "rs", wales: "gb-wls", turkiye: "tr", "türkiye": "tr",
  switzerland: "ch", czechia: "cz", norway: "no",
  austria: "at", bosnia: "ba", georgia: "ge", hungary: "hu", israel: "il",
  kosovo: "xk", "north-macedonia": "mk", "northern-ireland": "gb-nir", poland: "pl",
  ireland: "ie", romania: "ro", scotland: "gb-sct", slovenia: "si", sweden: "se",
  ukraine: "ua",
  albania: "al", armenia: "am", belarus: "by", bulgaria: "bg", cyprus: "cy",
  estonia: "ee", "faroe-islands": "fo", finland: "fi", iceland: "is",
  kazakhstan: "kz", latvia: "lv", luxembourg: "lu", moldova: "md",
  montenegro: "me", "san-marino": "sm", slovakia: "sk",
  andorra: "ad", azerbaijan: "az", gibraltar: "gi", liechtenstein: "li",
  lithuania: "lt", malta: "mt",
};

/** flagcdn 32x24 flag URL for a team slug, or null if the slug isn't mapped (card just omits the flag). */
export function flagUrl(teamSlug: string): string | null {
  const iso = SLUG_TO_ISO[teamSlug];
  return iso ? `https://flagcdn.com/32x24/${iso}.png` : null;
}
