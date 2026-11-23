// tools/test_pwa_install_prompt.mjs
// Unit test for PWA install prompt detection and dismissal state.

import assert from 'node:assert/strict';

// Mock browser globals for testing
globalThis.window = {
  matchMedia: (query) => ({
    matches: query.includes('standalone') ? false : false
  }),
  navigator: {
    standalone: false
  }
};
globalThis.document = {
  referrer: ''
};
Object.defineProperty(globalThis, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    platform: 'iPhone',
    maxTouchPoints: 5,
    standalone: false
  },
  configurable: true,
  writable: true
});

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

const { isAppStandalone, isIosDevice, isInstallDismissed, dismissInstallPrompt } = await import('../src/islands/PwaInstallPrompt.js');

console.log('Testing PwaInstallPrompt logic...');

// Test 1: iOS device detection
assert.strictEqual(isIosDevice(), true, 'iPhone user agent should be detected as iOS');

// Test 2: Standalone detection
assert.strictEqual(isAppStandalone(), false, 'App should initially not be standalone');

globalThis.window.navigator.standalone = true;
assert.strictEqual(isAppStandalone(), true, 'App should report standalone when navigator.standalone is true');

globalThis.window.navigator.standalone = false;
globalThis.window.matchMedia = (query) => ({
  matches: query.includes('standalone')
});
assert.strictEqual(isAppStandalone(), true, 'App should report standalone when display-mode: standalone matches');

// Test 3: Dismissal state
globalThis.window.matchMedia = () => ({ matches: false });
assert.strictEqual(isInstallDismissed(), false, 'Install should not be dismissed initially');

dismissInstallPrompt();
assert.strictEqual(isInstallDismissed(), true, 'Install should be dismissed after calling dismissInstallPrompt()');

console.log('✅ All PwaInstallPrompt unit tests passed successfully!');
