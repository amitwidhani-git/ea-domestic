export const VISIBLE_LEAGUES = ['PL', 'CH', 'L1', 'L2', 'FAC', 'LC', 'CS']

// Scottish leagues — data collected but not yet shown on site
// Activate when Scottish section launches on new site
// export const SCOTTISH_LEAGUES = ['SPL', 'SCH', 'SL1', 'SL2']

export const ALL_LEAGUES = [...VISIBLE_LEAGUES]

/**
 * MongoDB filter for visible leagues only.
 * Use this in all API routes to exclude Scottish fixtures.
 */
export const VISIBLE_LEAGUE_FILTER = { league: { $in: VISIBLE_LEAGUES } }
