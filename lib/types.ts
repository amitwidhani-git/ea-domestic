import type { CtaAffiliate } from "@/lib/affiliates";
import { LEAGUES, LEAGUE_CODES, type League } from "@/lib/leagues";

// League identity/metadata (name, country, cup flag, badge color, crest id) lives
// in lib/leagues.ts — this is a thin re-export so the many existing `@/lib/types`
// imports across the app don't all need to change.
export type { League } from "@/lib/leagues";
export const LEAGUE_NAMES: Record<League, string> = Object.fromEntries(LEAGUE_CODES.map((c) => [c, LEAGUES[c].name])) as Record<League, string>;
export const LEAGUE_FULL: Record<League, string> = Object.fromEntries(LEAGUE_CODES.map((c) => [c, LEAGUES[c].fullName])) as Record<League, string>;
export const IS_CUP: Record<League, boolean> = Object.fromEntries(LEAGUE_CODES.map((c) => [c, LEAGUES[c].isCup])) as Record<League, boolean>;
export interface Fixture {
  match_id: string; league: League; season: string; kickoff_utc: string;
  home_team: string; away_team: string;
  home_team_id: string; away_team_id: string;
  // Optional — only populated where the producer already has the teams join
  // handy (e.g. getUpcomingWithSignals); ClubCrest treats a missing id the
  // same as null (initials fallback), so other Fixture producers are unaffected.
  home_api_football_id?: number | null; away_api_football_id?: number | null;
}
export interface Prediction {
  match_id: string; model_version: string;
  probs: { home: number; draw: number; away: number };
  pick: "home" | "draw" | "away";
  frozen_at: string; hash: string; model_correct: boolean | null;
}
export interface Result {
  match_id: string; fthg: number; ftag: number; ftr: "H" | "D" | "A";
  penalty_score: { home: number; away: number } | null;
  status: string;
}
export interface EvOutcome {
  selection: "home" | "draw" | "away";
  model_prob: number; market_prob: number;
  ev: number; best_price: number; best_bookmaker: string;
  /** Resolved Back-CTA destination (falls back to Betano/LiveScoreBet when
   *  best_bookmaker has no direct affiliate deal); null if neither exists. */
  cta: CtaAffiliate | null;
}
export interface EvSignal {
  match_id: string; league: League;
  created_at: string; home_team: string; away_team: string; kickoff_utc: string;
  home_team_id: string; away_team_id: string;
  home_api_football_id: number | null; away_api_football_id: number | null;
  /** The model's own single top pick — always present, whether or not it clears the value bar. */
  model: EvOutcome;
  /** Whichever of the 3 selections has the highest EV — guaranteed to clear the value bar. */
  bestValue: EvOutcome;
  /** true when model.selection === bestValue.selection, i.e. there's only one thing to recommend. */
  sameAsModel: boolean;
}
export interface SettledEvSignal {
  match_id: string; league: League; selection: "home" | "draw" | "away";
  best_price: number; best_bookmaker: string; ev: number; created_at: string;
  settled_result: "WIN" | "LOSE" | "VOID";
  home_team: string; away_team: string;
  home_team_id: string; away_team_id: string;
}
export interface Article { slug: string; title: string; published_at: string; summary: string; }
export interface ArticleSection { heading?: string; paragraphs: string[]; }
export interface ArticleDetail extends Article {
  dek?: string;
  updated_at?: string;
  author?: string;
  sections: ArticleSection[];
  disclaimer?: string;
}
export interface UpcomingFixtureWithSignal {
  fixture: Fixture;
  prediction: Prediction | null;
  bestSignal: { selection: "home" | "draw" | "away"; ev: number; best_price: number; best_bookmaker: string } | null;
}
export interface TrackRecordRow { fixture: Fixture; prediction: Prediction; result: Result; }
export interface LeagueStats { league: League | "ALL"; settled: number; correct: number; accuracy: number; }
