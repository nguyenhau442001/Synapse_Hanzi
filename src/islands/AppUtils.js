// src/islands/AppUtils.js
// Small helpers shared by every feature script.

// Written by tools/bump_version.py — used as the cache-buster for data fetches.
export const APP_VERSION = '3.68.5';

// Escape text for safe interpolation into HTML strings (shared by every view).
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Speaker icon for every "listen" button (inline SVG, inherits currentColor).
export function speakerIconSvg(size = 16, className = '') {
  return `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}

// The 12 official HSK 4 mock exams (H41001–H41012) used by the listening and sentence-ordering drills.
export const HSK4_MOCK_EXAMS = Array.from({ length: 12 }, (_, i) => {
  const id = `H410${String(i + 1).padStart(2, '0')}`;
  return { id, name: `Đề ${i + 1} (${id})` };
});

// Show or hide a collapsible card section: its <details> accordion (always
// left collapsed) and the content wrap inside it.
export function setCardSectionVisible(accordion, wrap, visible, wrapDisplay = 'block') {
  if (accordion) {
    accordion.hidden = !visible;
    accordion.style.display = visible ? 'block' : 'none';
    accordion.open = false;
  }
  if (wrap) {
    wrap.hidden = !visible;
    wrap.style.display = visible ? wrapDisplay : 'none';
  }
}

// Pinyin tone-marked vowels → bare letters (ü → v), for tone-insensitive matching.
export const PINYIN_TONE_MARKS = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
};

// Lower-case the text and drop pinyin tone marks: "Hēibǎn" → "heiban".
export function stripPinyinTones(text) {
  return String(text || '').toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, ch => PINYIN_TONE_MARKS[ch]);
}

// Strip tones, normalize quotes/apostrophes, and collapse whitespace.
export function stripTonePinyin(text) {
  let s = stripPinyinTones(text);
  s = s.replace(/[\u2018\u2019\u02bb\u02bc`´]/g, "'");
  return s.replace(/\s+/g, ' ').trim();
}

// Strip tones, punctuation, spacing, and optionally handle v/u and Telex 'r'.
export function cleanPinyin(text, { allowUForV = false, recoverTelexR = false } = {}) {
  if (!text) return '';
  let s = stripPinyinTones(text);

  if (recoverTelexR) {
    s = s.normalize('NFD').replace(/\u0309/g, 'r');
  }

  s = s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  s = s.replace(/['\u2018\u2019\u02bb\u02bc`´\-\s0-9\.,!?_]/g, '');

  if (allowUForV) {
    s = s.replace(/v/g, 'u');
  }
  return s;
}

// Match user input pinyin against target with loose tone, spacing, Telex, and v/u rules.
export function pinyinLooseMatch(input, target) {
  if (!input || !target) return false;

  if (typeof target === 'string' && (target.includes('/') || target.includes(';'))) {
    const targets = target.split(/[\/;]/).map(t => t.trim()).filter(Boolean);
    if (targets.some(t => pinyinLooseMatch(input, t))) return true;
  }

  const strippedIn = stripTonePinyin(input);
  const strippedTar = stripTonePinyin(target);
  if (strippedIn && strippedIn === strippedTar) return true;

  const cleanIn = cleanPinyin(input);
  const cleanTar = cleanPinyin(target);
  if (cleanIn && cleanIn === cleanTar) return true;

  const telexIn = cleanPinyin(input, { recoverTelexR: true });
  if (telexIn && telexIn === cleanTar) return true;

  const cleanInU = cleanPinyin(input, { allowUForV: true });
  const cleanTarU = cleanPinyin(target, { allowUForV: true });
  if (cleanInU && cleanInU === cleanTarU) return true;

  const telexInU = cleanPinyin(input, { allowUForV: true, recoverTelexR: true });
  if (telexInU && telexInU === cleanTarU) return true;

  return false;
}

// Fisher–Yates shuffle of arr in place; returns arr.
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shuffled copy of arr (arr itself is left untouched).
export function shuffledCopy(arr) {
  return shuffleInPlace(arr.slice());
}

// Open/close (or force) a hidden-attribute panel and sync its toggle button.
export function toggleDisclosurePanel(panelId, buttonId, forceOpen) {
  const panel = document.getElementById(panelId);
  const button = document.getElementById(buttonId);
  if (!panel) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !willOpen;
  if (button) {
    button.setAttribute('aria-expanded', String(willOpen));
    button.classList.toggle('on', willOpen);
  }
}

// Web Audio API synthesized sound effects (100% offline, zero latency, no asset dependencies)
let quizAudioCtx = null;
function getQuizAudioContext() {
  try {
    if (!quizAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) quizAudioCtx = new AudioCtx();
    }
    if (quizAudioCtx && quizAudioCtx.state === 'suspended') {
      quizAudioCtx.resume().catch(() => {});
    }
  } catch (_) {}
  return quizAudioCtx;
}

export function playQuizSuccessSound() {
  try {
    const ctx = getQuizAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Upbeat 2-tone melodic chime: G5 (784Hz) -> C6 (1046.5Hz) with harmonic overtone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    osc1.frequency.setValueAtTime(1046.50, now + 0.08);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gain1.gain.setValueAtTime(0.18, now + 0.08);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.42);

    // Warm triangle shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1567.98, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.095);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (_) {}
}

export function playQuizFailSound() {
  try {
    const ctx = getQuizAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Gentle descending buzzer: ~261Hz down to ~174Hz (soft triangle)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.exponentialRampToValueAtTime(174.61, now + 0.25);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
}

// Format level label for study/flashcard views: HSK 3.0 is implicitly understood,
// so "HSK 3.0 – 2" is simplified to "HSK 2".
export function formatStudyLevelLabel(rawLabel) {
  if (!rawLabel) return '';
  return String(rawLabel)
    .replace(/^HSK\s*3\.0\s*[–—-]\s*/i, 'HSK ')
    .replace(/^HSK\s*3\.0\s*/i, 'HSK ')
    .trim();
}

export function mountAppUtils() {
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      APP_VERSION,
      escapeHtml,
      speakerIconSvg,
      HSK4_MOCK_EXAMS,
      setCardSectionVisible,
      PINYIN_TONE_MARKS,
      stripPinyinTones,
      stripTonePinyin,
      cleanPinyin,
      pinyinLooseMatch,
      shuffleInPlace,
      shuffledCopy,
      toggleDisclosurePanel,
      playQuizSuccessSound,
      playQuizFailSound,
      formatStudyLevelLabel,
    });
  }
}

if (typeof window !== 'undefined') {
  mountAppUtils();
}
