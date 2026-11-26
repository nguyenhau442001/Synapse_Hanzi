// Reactive state for the app header island (single source of truth).
// Producers (Levels, QuickAccessDrawer, SpaRouter, NavSections, ThemeManager, PwaInstallPrompt)
// call the setters below instead of writing to header DOM nodes; AppHeader.jsx re-renders from these signals.
import { signal } from '@preact/signals';
import { HEADER_DEFAULT_SECTION, PROFILE_NAME_STORAGE_KEY, DEFAULT_AVATAR_INITIAL } from './HeaderConstants.js';

/**
 * @typedef {Object} HeaderStats
 * @property {number} streakDays   Consecutive study days (written by Levels.js)
 * @property {number} urgentCount  Words that need urgent review (written by QuickAccessDrawer)
 * @property {number} savedCount   Words in the saved notebook (written by QuickAccessDrawer)
 */

/**
 * @typedef {Object} HeaderUiState
 * @property {import('./HeaderConstants').NavSectionId|null} activeSection  Highlighted primary tab (NavSections)
 * @property {boolean} showBackButton   Show the "Trở về" button (SpaRouter)
 * @property {boolean} canInstall       Show the "Cài đặt ứng dụng" menu item (PwaInstallPrompt)
 * @property {import('./HeaderConstants').ThemeName} theme  Current theme (ThemeManager)
 * @property {import('./HeaderConstants').DrawerBadgeTab} activeDrawerTab  Open quick-access drawer tab (QuickAccessDrawer)
 * @property {string} avatarInitial    Monogram shown on the account button
 */

function readAvatarInitial() {
  try {
    const savedName = (localStorage.getItem(PROFILE_NAME_STORAGE_KEY) || '').trim();
    return savedName ? Array.from(savedName)[0].toUpperCase() : DEFAULT_AVATAR_INITIAL;
  } catch {
    return DEFAULT_AVATAR_INITIAL;
  }
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
  avatarInitial: readAvatarInitial(),
});

/** @param {Partial<HeaderStats>} patch */
export function setHeaderStats(patch) {
  headerStats.value = { ...headerStats.value, ...patch };
}

/** @param {Partial<HeaderUiState>} patch */
export function setHeaderUi(patch) {
  headerUi.value = { ...headerUi.value, ...patch };
}
