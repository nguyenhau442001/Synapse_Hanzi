// CSP-safe replacement for inline event handlers in HTML built from template strings.
// Markup declares   data-ui-click="action"   (also data-ui-keydown / data-ui-change) plus
// optional data-ui-arg / data-ui-arg2, data-ui-stop (stopPropagation), data-ui-prevent.
// A MutationObserver binds a listener directly on each such element as soon as it is inserted,
// so stopPropagation behaves exactly like the old inline handlers. Only actions listed in
// UI_ACTIONS can run: unlike onclick="…", markup can never execute arbitrary code.

/** Call a legacy window-exposed module API if it exists. */
const callGlobal = (name, ...args) => {
  if (typeof window[name] === 'function') return window[name](...args);
  return undefined;
};

const argOf = (el) => el.dataset.uiArg;
const numberArg = (el, key = 'uiArg') => Number(el.dataset[key]);
const isActivationKey = (event) => event.key === 'Enter' || event.key === ' ';

/**
 * Allowlisted actions: (element, event) => void.
 * @type {Readonly<Record<string, (el: HTMLElement, event: Event) => void>>}
 */
export const UI_ACTIONS = Object.freeze({
  // Level pickers
  selectLevel: (el) => callGlobal('selectLevel', argOf(el)),

  // Flashcard study
  flip: () => callGlobal('flip'),
  prevCard: () => callGlobal('prevCard'),
  nextCard: () => callGlobal('nextCard'),
  speakWord: () => callGlobal('speakWord'),
  speakExample: () => callGlobal('speakExample'),
  setExampleSpeechSpeed: (el) => callGlobal('setExampleSpeechSpeed', el.dataset.speed),
  setWordSpeechSpeed: (el) => callGlobal('setWordSpeechSpeed', el.dataset.speed),
  openStudyWriting: () => callGlobal('toggleStudyWritingPanel', true),
  toggleUnknownWords: () => callGlobal('toggleUnknownWords'),
  resetProgress: () => callGlobal('resetProgress'),
  setStudyMode: (el) => callGlobal('setStudyMode', argOf(el)),
  setFilter: (el) => callGlobal('setFilter', argOf(el)),
  setFilterAndCloseSheet: (el) => {
    callGlobal('setFilter', argOf(el));
    callGlobal('closeStudyFilterSheet');
  },
  showAllShuffled: () => {
    callGlobal('setFilter', 'all');
    callGlobal('shuffleDeck');
  },
  setStudyDirection: (el) => callGlobal('setStudyDirection', el.value),
  rateCurrentCard: (el) => callGlobal('rateCurrentCard', argOf(el)),
  closeAllStudyDrawers: () => callGlobal('closeAllStudyDrawers'),
  studyMoreNewCards: () => callGlobal('studyMoreNewCards'),

  // Fast review
  exitReviewSession: () => callGlobal('exitReviewSession'),
  submitReviewTypeAnswer: () => callGlobal('submitReviewTypeAnswer'),
  submitReviewTypeAnswerOnEnter: (el, event) => {
    if (event.key === 'Enter') callGlobal('submitReviewTypeAnswer');
  },
  submitReviewChoice: (el) => callGlobal('submitReviewChoice', numberArg(el)),
  openReviewMistakesModal: () => callGlobal('openReviewMistakesModal'),
  closeReviewMistakesModal: () => callGlobal('closeReviewMistakesModal'),
  practiceReviewMistakes: () => callGlobal('practiceReviewMistakes'),
  startReviewSession: () => callGlobal('startReviewSession'),
  showReviewSetup: () => callGlobal('showReviewSetup'),
  openWordFromReviewSheet: (el) => {
    callGlobal('openWordInLevel', argOf(el), el.dataset.uiArg2, true);
    callGlobal('closeReviewBottomSheet');
  },
  removeWeakWordFromSheet: (el) => callGlobal('removeWeakWordFromSheet', argOf(el)),

  // Study history
  jumpToMonth: (el) => callGlobal('jumpToMonth', numberArg(el), numberArg(el, 'uiArg2')),
  jumpToMonthOnKey: (el, event) => {
    if (!isActivationKey(event)) return;
    event.preventDefault();
    callGlobal('jumpToMonth', numberArg(el), numberArg(el, 'uiArg2'));
  },
  changeHistoryCursor: (el) => callGlobal('changeHistoryCursor', numberArg(el)),
  setHistoryView: (el) => callGlobal('setHistoryView', argOf(el)),
  closeHistoryModal: () => callGlobal('closeHistoryModal'),
  openDetailedHistoryFromStatsSheet: () => callGlobal('openDetailedHistoryFromStatsSheet'),
});

const BOUND_EVENTS = Object.freeze(['click', 'keydown', 'change']);
const SELECTOR = '[data-ui-click],[data-ui-keydown],[data-ui-change],[data-ui-stop]';
const boundElements = new WeakSet();

/** @param {Element} el */
function bindElement(el) {
  if (boundElements.has(el) || !(el instanceof HTMLElement)) return;
  boundElements.add(el);
  const stop = el.hasAttribute('data-ui-stop');
  const prevent = el.hasAttribute('data-ui-prevent');
  let hasClickAction = false;
  for (const type of BOUND_EVENTS) {
    const name = el.getAttribute(`data-ui-${type}`);
    if (!name) continue;
    if (type === 'click') hasClickAction = true;
    const action = UI_ACTIONS[name];
    if (!action) {
      console.warn('[ActionBinder] unknown action:', name);
      continue;
    }
    el.addEventListener(type, (event) => {
      if (stop && type === 'click') event.stopPropagation();
      if (prevent && type === 'click') event.preventDefault();
      action(el, event);
    });
  }
  // data-ui-stop alone: keep clicks inside (e.g. controls on a flippable card) from bubbling.
  if (stop && !hasClickAction) el.addEventListener('click', (event) => event.stopPropagation());
}

/** @param {ParentNode & Node} root */
function bindTree(root) {
  if (root instanceof Element && root.matches(SELECTOR)) bindElement(root);
  if (typeof root.querySelectorAll === 'function') root.querySelectorAll(SELECTOR).forEach(bindElement);
}

/** Bind the current document and every element inserted later. */
export function mountActionBinder() {
  bindTree(document);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) bindTree(/** @type {Element} */ (node));
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
