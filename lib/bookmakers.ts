/**
 * One display-name map for bookmakers across the site. Keys are both the
 * odds-feed keys (e.g. "betano_uk") and our affiliate ids (e.g. "betano"),
 * so a row, its button and any CTA always name the bookmaker the same way.
 */
const DISPLAY_NAMES: Record<string, string> = {
  betfair_ex_uk: "Betfair Exchange",
  betfair_sb_uk: "Betfair Sportsbook",
  bet365: "Bet365",
  williamhill: "William Hill",
  skybet: "Sky Bet",
  coral: "Coral",
  ladbrokes: "Ladbrokes",
  paddypower: "Paddy Power",
  betway: "Betway",
  boylesports: "BoyleSports",
  unibet_uk: "Unibet",
  grosvenor: "Grosvenor Sport",
  livescorebet: "LiveScore Bet",
  matchbook: "Matchbook",
  casumo: "Casumo",
  betano_uk: "Betano",
  betano: "Betano",
  "10bet": "10Bet",
  copybet: "CopyBet",
};

export function bookmakerName(key: string): string {
  return DISPLAY_NAMES[key] ?? key.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
