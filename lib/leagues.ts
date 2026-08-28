/**
 * Single source of truth for every competition on the site — name, country,
 * cup/league flag, badge color, and API-Football crest id. Every league-aware
 * UI (badges, nav menus, filter chips, teams page, track record) derives from
 * this registry instead of keeping its own hardcoded list, so adding a new
 * competition is a one-file change: add an entry here (and to COUNTRIES if
 * it's a new country), done.
 */

export type Country = "England" | "Scotland" | "Germany" | "Netherlands" | "France" | "Spain" | "Portugal" | "Italy";

export interface LeagueMeta {
  name: string;
  fullName: string;
  /** null for cross-country competitions (Champions League) — no single "teams by country" home. */
  country: Country | null;
  isCup: boolean;
  /**
   * Full Tailwind class string for the badge outline/text, e.g.
   * "border-purple-500/60 text-purple-400". Stored as a complete literal
   * (not built from a color name at render time) because Tailwind's class
   * scanner only picks up classes that appear verbatim in source — a
   * template literal like `border-${color}-500/60` would never generate
   * the CSS for any color not otherwise hardcoded elsewhere.
   */
  badgeColor: string;
  /** API-Football's static league-logo CDN id (media.api-sports.io/football/leagues/{id}.png). */
  apiFootballId: number;
}

// Registry order is display order everywhere (nav, filters, stats, track record).
export const LEAGUES = {
  PL: { name: "Premier League", fullName: "Premier League", country: "England", isCup: false, badgeColor: "border-purple-500/60 text-purple-400", apiFootballId: 39 },
  CH: { name: "Championship", fullName: "EFL Championship", country: "England", isCup: false, badgeColor: "border-sky-500/60 text-sky-400", apiFootballId: 40 },
  L1: { name: "League One", fullName: "EFL League One", country: "England", isCup: false, badgeColor: "border-emerald-500/60 text-emerald-400", apiFootballId: 41 },
  L2: { name: "League Two", fullName: "EFL League Two", country: "England", isCup: false, badgeColor: "border-amber-500/60 text-amber-400", apiFootballId: 42 },
  FAC: { name: "FA Cup", fullName: "FA Cup", country: "England", isCup: true, badgeColor: "border-red-500/60 text-red-400", apiFootballId: 45 },
  LC: { name: "League Cup", fullName: "EFL Cup", country: "England", isCup: true, badgeColor: "border-orange-500/60 text-orange-400", apiFootballId: 48 },
  CS: { name: "Community Shield", fullName: "FA Community Shield", country: "England", isCup: true, badgeColor: "border-yellow-500/60 text-yellow-400", apiFootballId: 528 },
  SPL: { name: "Scottish Premiership", fullName: "Scottish Premiership", country: "Scotland", isCup: false, badgeColor: "border-blue-500/60 text-blue-400", apiFootballId: 179 },
  SCH: { name: "Scottish Championship", fullName: "Scottish Championship", country: "Scotland", isCup: false, badgeColor: "border-indigo-500/60 text-indigo-400", apiFootballId: 180 },
  BL1: { name: "Bundesliga", fullName: "Bundesliga", country: "Germany", isCup: false, badgeColor: "border-rose-500/60 text-rose-400", apiFootballId: 78 },
  SPD: { name: "2. Bundesliga", fullName: "2. Bundesliga", country: "Germany", isCup: false, badgeColor: "border-pink-500/60 text-pink-400", apiFootballId: 79 },
  DED: { name: "Eredivisie", fullName: "Eredivisie", country: "Netherlands", isCup: false, badgeColor: "border-teal-500/60 text-teal-400", apiFootballId: 88 },
  FL1: { name: "Ligue 1", fullName: "Ligue 1", country: "France", isCup: false, badgeColor: "border-cyan-500/60 text-cyan-400", apiFootballId: 61 },
  FL2: { name: "Ligue 2", fullName: "Ligue 2", country: "France", isCup: false, badgeColor: "border-lime-500/60 text-lime-400", apiFootballId: 62 },
  PD: { name: "La Liga", fullName: "La Liga", country: "Spain", isCup: false, badgeColor: "border-fuchsia-500/60 text-fuchsia-400", apiFootballId: 140 },
  PPL: { name: "Primeira Liga", fullName: "Primeira Liga", country: "Portugal", isCup: false, badgeColor: "border-violet-500/60 text-violet-400", apiFootballId: 94 },
  SA: { name: "Serie A", fullName: "Serie A", country: "Italy", isCup: false, badgeColor: "border-green-500/60 text-green-400", apiFootballId: 135 },
  SA2: { name: "Serie B", fullName: "Serie B", country: "Italy", isCup: false, badgeColor: "border-stone-500/60 text-stone-400", apiFootballId: 136 },
  UCL: { name: "Champions League", fullName: "UEFA Champions League", country: null, isCup: true, badgeColor: "border-zinc-400/60 text-zinc-300", apiFootballId: 2 },
} as const satisfies Record<string, LeagueMeta>;

export type League = keyof typeof LEAGUES;

/** All league codes, in registry (display) order. */
export const LEAGUE_CODES = Object.keys(LEAGUES) as League[];

/** Countries in display order — England/Scotland first (the site's original base), then continental Europe alphabetically. */
export const COUNTRIES: Country[] = ["England", "Scotland", "France", "Germany", "Italy", "Netherlands", "Portugal", "Spain"];

/** Leagues grouped by country, in registry order within each group. */
export const COUNTRY_LEAGUES: Record<Country, League[]> = COUNTRIES.reduce((acc, country) => {
  acc[country] = LEAGUE_CODES.filter((code) => LEAGUES[code].country === country);
  return acc;
}, {} as Record<Country, League[]>);

/** Cross-country competitions (Champions League, …) — no single "country" section. */
export const CONTINENTAL_LEAGUES: League[] = LEAGUE_CODES.filter((code) => LEAGUES[code].country === null);

/**
 * API-Football's static league-logo CDN — no API call needed. Lives here
 * (not in the LeagueBadge component) because it's a plain function usable
 * from server components too — LeagueBadge.tsx is "use client", and a
 * client-module export can't be called during server rendering.
 */
export function leagueLogoUrl(league: League): string {
  return `https://media.api-sports.io/football/leagues/${LEAGUES[league].apiFootballId}.png`;
}
