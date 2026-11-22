// Test in-memory level words caching and instant retrieval
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Mock browser environment for AppState
const mockFetch = async (url) => {
  try {
    const content = readFileSync(url, 'utf8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(content),
    };
  } catch (err) {
    return {
      ok: false,
      status: 404,
      json: async () => { throw new Error('Not found'); },
    };
  }
};

globalThis.fetch = mockFetch;
globalThis.window = globalThis;
globalThis.document = {
  documentElement: { classList: { toggle: () => {} } },
  body: { classList: { toggle: () => {} } },
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

const appState = await import('../src/islands/AppState.js');
const { fetchLevelWords, isLevelWordsCached, getCachedLevelWords, prefetchLevelWords } = appState;

console.log('Testing AppState level words cache...');

// 1. Initial state: not cached
assert.equal(isLevelWordsCached('hsk1'), false, 'hsk1 should initially not be cached');
assert.equal(getCachedLevelWords('hsk1'), null, 'getCachedLevelWords should return null before fetch');

// 2. Fetch level words
const words1 = await fetchLevelWords('hsk1');
assert.ok(Array.isArray(words1) && words1.length > 0, 'fetchLevelWords should return an array of words');
assert.equal(isLevelWordsCached('hsk1'), true, 'hsk1 should now be cached');
assert.equal(getCachedLevelWords('hsk1'), words1, 'getCachedLevelWords should return the exact cached array');

// 3. Second call should return the identical reference instantly without refetching
const words2 = await fetchLevelWords('hsk1');
assert.equal(words1, words2, 'Subsequent fetchLevelWords call must return the cached instance');

// 4. Test prefetchLevelWords
assert.equal(isLevelWordsCached('hsk2'), false, 'hsk2 should initially not be cached');
await prefetchLevelWords('hsk2');
assert.equal(isLevelWordsCached('hsk2'), true, 'hsk2 should be cached after prefetch');
const wordsHsk2 = getCachedLevelWords('hsk2');
assert.ok(Array.isArray(wordsHsk2) && wordsHsk2.length > 0, 'prefetchLevelWords populated cache');

console.log('✅ All AppState vocab cache tests passed successfully!');
