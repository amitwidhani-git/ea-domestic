import type { CtaAffiliate } from "@/lib/affiliates";

export type League = "PL" | "CH" | "L1" | "L2" | "FAC" | "LC" | "CS" | "SPL";
export const LEAGUE_NAMES: Record<League, string> = {
  PL: "Premier League", CH: "Championship", L1: "League One", L2: "League Two",
  FAC: "FA Cup", LC: "League Cup", CS: "Community Shield", SPL: "Scottish Premiership",
};
export const LEAGUE_FULL: Record<League, string> = {
  PL: "Premier League", CH: "EFL Championship", L1: "EFL League One", L2: "EFL League Two",
  FAC: "FA Cup", LC: "EFL Cup", CS: "FA Community Shield", SPL: "Scottish Premiership",
};
export const IS_CUP: Record<League, boolean> = {
  PL: false, CH: false, L1: false, L2: false,
  FAC: true, LC: true, CS: true, SPL: false,
};
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
export interface EvSignal {
  match_id: string; league: League; selection: "home" | "draw" | "away";
  model_prob: number; market_prob: number; best_price: number;
  best_bookmaker: string; ev: number; kelly_fraction: number; book_count: number;
  created_at: string; home_team: string; away_team: string; kickoff_utc: string;
  home_team_id: string; away_team_id: string;
  home_api_football_id: number | null; away_api_football_id: number | null;
  /** Resolved Back-CTA destination (falls back to Betano/LiveScoreBet when
   *  best_bookmaker has no direct affiliate deal); null if neither exists. */
  cta: CtaAffiliate | null;
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
