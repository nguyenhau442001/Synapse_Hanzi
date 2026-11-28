// Reactive state for the app header island (single source of truth).
// Producers (Levels, QuickAccessDrawer, SpaRouter, NavSections, ThemeManager, PwaInstallPrompt)
// call the setters below instead of writing to header DOM nodes; AppHeader.jsx re-renders from these signals.
import { signal } from '@preact/signals';
import { HEADER_DEFAULT_SECTION, PROFILE_NAME_STORAGE_KEY, DEFAULT_PROFILE_NAME } from './HeaderConstants.js';

/**
 * @typedef {Object} HeaderStats
 * @property {number} streakDays   Consecutive study days (written by Levels.js)
 * @property {number} urgentCount  Due review cards, same number as the dashboard's today-review button (written by renderLearningDashboard)
 * @property {number} savedCount   Words in the saved notebook (written by QuickAccessDrawer)
 */

/**
 * @typedef {Object} HeaderUiState
 * @property {import('./HeaderConstants').NavSectionId|null} activeSection  Highlighted primary tab (NavSections)
 * @property {boolean} showBackButton   Show the "Trở về" button (SpaRouter)
 * @property {boolean} canInstall       Show the "Cài đặt ứng dụng" menu item (PwaInstallPrompt)
 * @property {import('./HeaderConstants').ThemeName} theme  Current theme (ThemeManager)
 * @property {import('./HeaderConstants').DrawerBadgeTab} activeDrawerTab  Open quick-access drawer tab (QuickAccessDrawer)
 * @property {string} profileName      Display name in the account menu; its first letter is the avatar monogram
 */

function readProfileName() {
  try {
    return (localStorage.getItem(PROFILE_NAME_STORAGE_KEY) || '').trim() || DEFAULT_PROFILE_NAME;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

/** @param {string} name */
export function avatarInitialOf(name) {
  return Array.from(name)[0].toUpperCase();
}

function readInitialTheme() {
  return typeof document !== 'undefined' && document.documentElement?.dataset?.theme === 'dark' ? 'dark' : 'light';
}

/** @type {import('@preact/signals').Signal<HeaderStats>} */
export const headerStats = signal({ streakDays: 0, urgentCount: 0, savedCount: 0 });

/** @type {import('@preact/signals').Signal<HeaderUiState>} */
export const headerUi = signal({
  activeSection: HEADER_DEFAULT_SECTION,
  showBackButton: false,
  canInstall: true,
  theme: readInitialTheme(),
  activeDrawerTab: null,
  profileName: readProfileName(),
});

/** @param {Partial<HeaderStats>} patch */
export function setHeaderStats(patch) {
  headerStats.value = { ...headerStats.value, ...patch };
}

/** @param {Partial<HeaderUiState>} patch */
export function setHeaderUi(patch) {
  headerUi.value = { ...headerUi.value, ...patch };
}
