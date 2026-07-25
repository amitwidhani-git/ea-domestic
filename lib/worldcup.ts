// World Cup 2026 final record — verified, never changes
export const WC_STATS = [
  { stage: "Group Stage", correct: 46, total: 72 },
  { stage: "Round of 32", correct: 13, total: 16 },
  { stage: "Round of 16", correct: 7, total: 8 },
  { stage: "Quarter-Final", correct: 4, total: 4 },
  { stage: "Semi-Final & 3rd Place", correct: 1, total: 3 },
  { stage: "Final", correct: 1, total: 1 },
];
export const WC_TOTAL = {
  correct: WC_STATS.reduce((sum, s) => sum + s.correct, 0),
  total: WC_STATS.reduce((sum, s) => sum + s.total, 0),
};
