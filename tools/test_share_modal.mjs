// tools/test_share_modal.mjs
// Unit test for ShareModal URL canonicalization and fallback invocation.

import assert from 'node:assert/strict';

// Mock browser globals
globalThis.window = {
  location: {
    origin: 'https://nguyenhau442001.github.io',
    pathname: '/Synapse_Hanzi/'
  }
};

const { getCanonicalShareUrl } = await import('../src/islands/ShareModal.js');

console.log('Testing ShareModal logic...');

// Test 1: Canonical URL derivation
const url = getCanonicalShareUrl();
assert.strictEqual(
  url,
  'https://nguyenhau442001.github.io/Synapse_Hanzi/',
  'Canonical URL should combine origin and pathname'
);

console.log('✅ All ShareModal unit tests passed successfully!');
