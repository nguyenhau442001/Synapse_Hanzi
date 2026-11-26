// Lazy-loading registry for heavy feature islands.
// Each entry is dynamically imported and mounted once on first tab activation.

const LAZY_ISLANDS = {
  speaking: {
    load: () => import('./SpeakingPractice.jsx'),
    mount: (mod) => mod.mountSpeakingPractice(),
  },
  exam: {
    load: () => import('./Hsk30ExamView.jsx'),
    mount: (mod) => mod.mountHsk30ExamView(),
  },
  gradedReading: {
    load: () => import('./GradedReading.jsx'),
    mount: (mod) => mod.mountGradedReading(),
  },
  reading: {
    load: () => import('./ReadingAnalysis.jsx'),
    mount: (mod) => mod.mountReadingAnalysis(),
  },
  listening: {
    load: () => import('./ListeningPractice.jsx'),
    mount: (mod) => mod.mountListeningPractice(),
  },
  writing: {
    load: () => import('./Writing.jsx'),
    mount: (mod) => mod.mountWriting(),
  },
};

/** @type {Map<string, Promise<void>>} */
const loadedPromises = new Map();

/**
 * Dynamically import and mount a heavy island for the given tab key if registered.
 * Safe to call repeatedly; concurrent or subsequent calls share the same promise.
 * @param {string} tabKey
 * @returns {Promise<void>}
 */
export function ensureIslandMounted(tabKey) {
  const entry = LAZY_ISLANDS[tabKey];
  if (!entry) return Promise.resolve();

  const existing = loadedPromises.get(tabKey);
  if (existing) return existing;

  const promise = entry
    .load()
    .then((mod) => {
      entry.mount(mod);
    })
    .catch((err) => {
      loadedPromises.delete(tabKey);
      console.error(`[IslandLoader] Failed to load island "${tabKey}":`, err);
    });

  loadedPromises.set(tabKey, promise);
  return promise;
}
