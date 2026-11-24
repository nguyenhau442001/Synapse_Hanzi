/**
 * Centralized Timeouts & Animation Constants (in milliseconds)
 * Strictly eliminates loose magic numbers across islands.
 */
export const APP_TIMEOUTS = Object.freeze({
  // UI Focus & Next-Tick delays
  FOCUS_DELAY_MS: 50,
  INPUT_FOCUS_DELAY_MS: 80,

  // Animation & Visual Transitions
  CARD_TRANSITION_MS: 150,
  SHAKE_ERROR_MS: 450,
  FEEDBACK_REVEAL_MS: 600,

  // Audio Playback delays
  AUTO_SPEAK_DELAY_MS: 220,
  AUDIO_RETRY_DELAY_MS: 300,

  // Notification & Feedback Banners
  TOAST_DURATION_MS: 3800,
  ERROR_BOX_DISMISS_MS: 4000,
  NOTICE_PERSIST_LONG_MS: 7000,

  // Debouncing & Indexing
  SEARCH_DEBOUNCE_MS: 200,
  INDEX_BUILD_DELAY_MS: 1000,
});
