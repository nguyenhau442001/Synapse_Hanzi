// The only league entry point for learning features: they report what happened and
// LeagueService (if mounted and the user takes part) turns it into XP. No Firebase, no state.

import { LEAGUE_ACTIVITY, LEAGUE_ACTIVITY_EVENT } from './LeagueConstants.js';

export { LEAGUE_ACTIVITY };

/**
 * @param {string} kind  One of LEAGUE_ACTIVITY.
 * @param {Object} [context]  e.g. { key } for a lesson, { id } for an exam.
 */
export function reportLearningActivity(kind, context = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(LEAGUE_ACTIVITY_EVENT, { detail: { ...context, kind } }));
}
