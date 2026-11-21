// Graded Reading (HSK reading stories): hub with filters, interactive reader with click-to-inspect
// tokens, SRS integration, spotlight vocabulary and a comprehension quiz.
// Preact port of the former assets/js/graded-reading.js. Renders the same markup inside
// #screenGradedReading and keeps window.GradedReading for the tab router and SpaRouter.
import { Fragment, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal, computed } from '@preact/signals';
import { toggleTheme } from './ThemeManager.js';

/* global exampleSpeechSpeed, SRS, currentLevel, srsCards, SpaRouter -- classic-script globals */

const PAGE_SIZE = 30;
const LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7', 'HSK8', 'HSK9'];
const PUNCT_RE = /^[，。？！、：；“”‘’（）《》〈〉【】[\]()…—\s]+$/;
const LEADING_PUNCT = new Set(['“', '‘', '（', '《', '〈', '【', '[', '"', '(']);
const TRAILING_PUNCT = new Set(['，', '。', '！', '？', '、', '：', '；', '”', '’', '）', '》', '〉', '】', ']', '"', ')', '…', '—']);

let manifest = [];
let manifestLoaded = false;
const storyCache = {};

const SPEAKER_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
  </svg>
);

// ---- Manga Leisure Reading state ---------------------------------------------------------------
const readingMode = signal('articles'); // 'articles' | 'manga'
const activeMangaStory = signal(null);
const activeMangaPage = signal(0);
const showMangaOutlines = signal(true);
const hoveredMangaDialogue = signal(null);
const selectedMangaDialogue = signal(null);
const mangaCanvasTheme = signal('light'); // 'light' | 'sepia' | 'theater'
const mangaIsFullscreen = signal(false);
// Two-page spread (book layout) is opt-in; single page + word panel is the default.
const MANGA_SPREAD_KEY = 'manga.spreadMode';
const mangaSpreadPref = signal((() => {
  try {
    const v = localStorage.getItem(MANGA_SPREAD_KEY);
    if (v === '1' || v === '0') return v === '1';
  } catch (e) { /* storage unavailable */ }
  return false;
})());
const mangaWideViewport = signal(typeof window !== 'undefined' ? window.innerWidth >= 1000 : true);
function setMangaSpread(on) {
  mangaSpreadPref.value = on;
  try { localStorage.setItem(MANGA_SPREAD_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}
const showMangaShortcutsModal = signal(false); // settings (⚙) popover, which also lists the shortcuts
const mangaAppTheme = signal(typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const MANGA_CANVAS_KEY = 'manga.canvas';
try { if (localStorage.getItem(MANGA_CANVAS_KEY) === 'sepia') mangaCanvasTheme.value = 'sepia'; } catch (e) { /* storage unavailable */ }

// One look control for the reader: light / paper (light + sepia stage) / dark (app theme).
function getMangaLook() {
  if (mangaAppTheme.value === 'dark') return 'dark';
  return mangaCanvasTheme.value === 'sepia' ? 'sepia' : 'light';
}
function setMangaLook(look) {
  const wantDark = look === 'dark';
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (wantDark !== isDark) toggleTheme();
  mangaAppTheme.value = wantDark ? 'dark' : 'light';
  mangaCanvasTheme.value = look === 'sepia' ? 'sepia' : 'light';
  try { localStorage.setItem(MANGA_CANVAS_KEY, mangaCanvasTheme.value); } catch (e) { /* storage unavailable */ }
}
let mangaManifestData = [];
let mangaManifestLoaded = false;
const mangaStoryCache = {};

// ---- UI state ----------------------------------------------------------------------------------
const view = signal('idle');           // 'idle' | 'hub' | 'loading' | 'error' | 'story' | 'manga'
const errorMessage = signal('');
const activeStory = signal(null);
const levelFilter = signal('all');    // 'all' | 'HSK1' ... 'HSK9'
const sourceFilter = signal('all');   // 'all' | 'textbook' | 'wanwu'
const hideRead = signal(false);
const categoryFilter = signal('all');
const sortOrder = signal('suggested'); // 'suggested' | 'level_asc' | 'time_asc' | 'time_desc' | 'title'
const filterPanelOpen = signal(false);
const searchQuery = signal('');
const hubLimit = signal(PAGE_SIZE);
const quizState = signal({});          // qId -> { selectedIdx, isCorrect }
const playingId = signal(null);        // sentence id, 'full-story' or null

const PREFS_KEY = 'synapse_graded_prefs_v1';
const prefs = signal((() => {
  // pinyinMode: 'all' | 'new' (only new and over-level words) | 'off'; fontSize: px or null (CSS default)
  const base = { showPinyin: true, pinyinMode: 'all', showTranslation: true, showSrsHighlights: true, fontSize: null, paper: 'cream' };
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) || {};
      const merged = Object.assign(base, parsed);
      if (!parsed.pinyinMode) merged.pinyinMode = parsed.showPinyin === false ? 'off' : 'all';
      return merged;
    }
  } catch (e) { /* corrupt prefs */ }
  return base;
})());

const READER_FONT_MIN = 18;
const READER_FONT_MAX = 38;
const READER_BODY_CLASSES = ['graded-pinyin-hidden', 'graded-pinyin-new', 'graded-translation-hidden', 'graded-srs-plain', 'graded-paper-sepia'];

// Mirrors the reader preferences onto <body> so CSS can switch pinyin, translation, highlights and paper.
function applyReaderBodyClasses() {
  const p = prefs.value;
  const cl = document.body.classList;
  cl.toggle('graded-pinyin-hidden', p.pinyinMode === 'off');
  cl.toggle('graded-pinyin-new', p.pinyinMode === 'new');
  cl.toggle('graded-translation-hidden', !p.showTranslation);
  cl.toggle('graded-srs-plain', p.showSrsHighlights === false);
  cl.toggle('graded-paper-sepia', p.paper === 'sepia');
}

function clearReaderBodyClasses() {
  document.body.classList.remove(...READER_BODY_CLASSES);
}

const READ_STORIES_STORAGE_KEY = 'synapse_graded_read_stories_v1';
const readStories = signal((() => {
  try {
    return JSON.parse(localStorage.getItem(READ_STORIES_STORAGE_KEY) || '{}') || {};
  } catch (e) { return {}; }
})());

function savePrefs(next) {
  prefs.value = next;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
}

// The story opened most recently, offered as "Đọc tiếp" on the hub until it is marked read.
const LAST_STORY_KEY = 'synapse_graded_last_story_v1';
const lastStoryId = signal((() => {
  try { return localStorage.getItem(LAST_STORY_KEY) || null; } catch (e) { return null; }
})());

function saveLastStory(storyId) {
  lastStoryId.value = storyId;
  try { localStorage.setItem(LAST_STORY_KEY, storyId); } catch (e) { /* quota */ }
}

function saveReadStories(next) {
  readStories.value = next;
  try { localStorage.setItem(READ_STORIES_STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
}

// ---- Audio -------------------------------------------------------------------------------------
// Full-story playback reads sentence by sentence so the current sentence can be highlighted.
const fullStoryPlaying = signal(false);
let fullStoryRun = 0;

function clearPlaying() {
  playingId.value = null;
}

function stopFullStory() {
  fullStoryRun++;
  fullStoryPlaying.value = false;
}

const sentencePlainText = (s) => (s.zh || (s.tokens || []).map((t) => t.text).join('') || s.text || '').replace(/^[，。？！、\s]+/, '');

function speakSentence(text, sentId) {
  if (!text) return;
  const isPlaying = playingId.value === sentId;
  const wasFullStory = fullStoryPlaying.value;
  stopFullStory();
  if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
  if (isPlaying && !wasFullStory) {
    clearPlaying();
    return;
  }
  playingId.value = sentId;
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
  if (typeof window.speakChinese === 'function') {
    window.speakChinese(text, { rate, onEnd: clearPlaying, onError: clearPlaying });
  }
}

function playStoryFrom(index, run) {
  const story = activeStory.value;
  if (run !== fullStoryRun || !story) return;
  const sentence = story.sentences[index];
  if (!sentence) {
    stopFullStory();
    clearPlaying();
    return;
  }
  const text = sentencePlainText(sentence);
  if (!text) { playStoryFrom(index + 1, run); return; }
  playingId.value = sentence.id;
  const el = document.getElementById(`sent-${sentence.id}`);
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
  const stop = () => { if (run === fullStoryRun) { stopFullStory(); clearPlaying(); } };
  if (typeof window.speakChinese !== 'function' || window.speakChinese(text, { rate, onEnd: () => playStoryFrom(index + 1, run), onError: stop }) === false) stop();
}

function speakFullStory() {
  const story = activeStory.value;
  if (!story || !story.sentences) return;
  if (fullStoryPlaying.value) {
    stopFullStory();
    if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
    clearPlaying();
    return;
  }
  stopFullStory();
  const run = fullStoryRun;
  fullStoryPlaying.value = true;
  playStoryFrom(0, run);
}

// ---- Read tracking -----------------------------------------------------------------------------
const isStoryRead = (storyId) => Boolean(readStories.value[storyId]);

function markStoryAsRead(storyId) {
  if (!storyId) return;
  saveReadStories({ ...readStories.value, [storyId]: { readAt: new Date().toISOString() } });
}

function unmarkStoryAsRead(storyId) {
  if (!storyId) return;
  const next = { ...readStories.value };
  delete next[storyId];
  saveReadStories(next);
}

function toggleStoryRead(storyId, event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  if (!storyId) return;
  if (isStoryRead(storyId)) unmarkStoryAsRead(storyId);
  else markStoryAsRead(storyId);
}

function toggleCurrentStoryRead() {
  if (activeStory.value) toggleStoryRead(activeStory.value.id);
}

// ---- SRS ---------------------------------------------------------------------------------------
// 'mastered' | 'learning' | 'new' | 'none' (token without a vocabulary id)
function getTokenSrsStatus(token) {
  if (!token || !token.word_id) return 'none';
  const match = token.word_id.match(/^hsk(\d+)_(\d+)$/i);
  if (!match) return 'none';
  try {
    if (typeof window.readSrsRecord === 'function') {
      const record = window.readSrsRecord(match[1]);
      const card = record && record.cards && record.cards[String(match[2])];
      if (card) {
        if (card.state === 2 || card.status === 'known' || (card.reps && card.reps >= 2)) return 'mastered';
        if (card.state === 1 || card.state === 3 || (card.reps && card.reps > 0)) return 'learning';
      }
    }
  } catch (e) {
    console.warn('SRS lookup error:', e);
  }
  return 'new';
}

const storyLevelNum = (story) => (story ? parseInt(story.level.replace(/\D/g, '') || '1', 10) : 1);

// Put a token's word straight into today's FSRS queue.
function addTokenToSrs(token) {
  if (!token) return false;
  if (!token.word_id) {
    const lvl = token.hsk || storyLevelNum(activeStory.value);
    token.word_id = `hsk${lvl}_${token.text.charCodeAt(0) + 10000}`;
  }
  const match = token.word_id.match(/^hsk(\d+)_([a-z0-9]+)$/i) || token.word_id.match(/^char_([a-z0-9]+)$/i);
  if (!match) return false;
  const level = match[1].length <= 2 ? match[1] : String(token.hsk || 1);
  const rawId = match[2] || match[1];
  try {
    if (typeof window.readSrsRecord === 'function' && typeof window.saveSrsRecord === 'function') {
      const record = window.readSrsRecord(level) || { schemaVersion: 3, cards: {} };
      if (!record.cards) record.cards = {};
      let card = record.cards[String(rawId)];
      if (!card) card = (typeof SRS !== 'undefined' && SRS.createNewCard) ? SRS.createNewCard() : { state: 0, reps: 0 };
      card.state = 1; // Learning
      card.status = 'unknown';
      card.due = new Date().toISOString();
      card.last_rating = 'again';
      record.cards[String(rawId)] = card;
      window.saveSrsRecord(level, record.cards, false);

      // Keep the in-memory cards of the level being studied in sync
      if (typeof currentLevel !== 'undefined' && String(currentLevel) === String(level) && typeof srsCards !== 'undefined' && srsCards) {
        srsCards[String(rawId)] = card;
      }
      // Live-update every occurrence of the word in the passage
      document.querySelectorAll(`[data-word-id="${token.word_id}"]`).forEach((el) => {
        el.classList.remove('token-new');
        el.classList.add('token-learning');
      });
      return true;
    }
  } catch (e) {
    console.error('Failed to add token to SRS:', e);
  }
  return false;
}

// ---- Data --------------------------------------------------------------------------------------
async function ensureManifestLoaded() {
  if (manifestLoaded && manifest.length) return manifest;
  try {
    const res = await fetch('database/readings/manifest.json?v=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải danh sách bài đọc.');
    manifest = await res.json();
    manifestLoaded = true;
    return manifest;
  } catch (e) {
    console.error('GradedReading manifest error:', e);
    return [];
  }
}

async function loadStory(storyId) {
  if (storyCache[storyId]) return storyCache[storyId];
  const item = manifest.find((m) => m.id === storyId);
  if (!item) throw new Error('Không tìm thấy bài đọc: ' + storyId);
  const storyUrl = item.file || item.path || `database/readings/${(item.level || '').toLowerCase()}/${item.id}.json`;
  const res = await fetch(storyUrl);
  if (!res.ok) throw new Error('Không thể tải nội dung bài: ' + storyUrl);
  const data = await res.json();
  storyCache[storyId] = data;
  return data;
}

async function ensureMangaManifestLoaded() {
  if (mangaManifestLoaded && mangaManifestData.length) return mangaManifestData;
  try {
    const [resOffice, resClassic, resPc] = await Promise.allSettled([
      fetch('database/readings/manga/office/manifest.json?v=' + Date.now()),
      fetch('database/readings/manga/classic/manifest.json?v=' + Date.now()),
      fetch('database/readings/manga/peppercarrot/manifest.json?v=' + Date.now())
    ]);
    const officeList = resOffice.status === 'fulfilled' && resOffice.value.ok ? await resOffice.value.json() : [];
    const classicList = resClassic.status === 'fulfilled' && resClassic.value.ok ? await resClassic.value.json() : [];
    const pcList = resPc.status === 'fulfilled' && resPc.value.ok ? await resPc.value.json() : [];
    mangaManifestData = [...officeList, ...classicList, ...pcList];
    mangaManifestLoaded = true;
    return mangaManifestData;
  } catch (e) {
    console.error('Manga manifest load error:', e);
    return [];
  }
}

async function loadMangaStory(mangaId) {
  if (mangaStoryCache[mangaId]) return mangaStoryCache[mangaId];
  const list = await ensureMangaManifestLoaded();
  const item = list.find((m) => m.id === mangaId);
  const file = item ? item.file : (
    mangaId.startsWith('office') ? `database/readings/manga/office/${mangaId}.json` :
    mangaId.startsWith('xiyouji') ? `database/readings/manga/classic/${mangaId}.json` :
    `database/readings/manga/peppercarrot/${mangaId}.json`
  );
  const res = await fetch(file + '?v=' + Date.now());
  if (!res.ok) throw new Error('Không thể tải truyện tranh: ' + mangaId);
  const data = await res.json();
  mangaStoryCache[mangaId] = data;
  return data;
}

async function openMangaStory(mangaId, updateUrl = true) {
  if (!document.getElementById('screenGradedReading')) return;
  view.value = 'loading';
  try {
    const story = await loadMangaStory(mangaId);
    activeMangaStory.value = story;
    activeMangaPage.value = 0;
    hoveredMangaDialogue.value = null;
    selectedMangaDialogue.value = null;
    if (updateUrl && typeof SpaRouter !== 'undefined') {
      SpaRouter.pushView({ view: 'tab', tab: 'gradedReading', manga: mangaId }, `${window.location.pathname}?tab=gradedReading&manga=${mangaId}`);
    }
    document.body.classList.add('graded-story-active');
    view.value = 'manga';
  } catch (e) {
    errorMessage.value = e.message;
    view.value = 'error';
  }
}

function goBackToMangaHub() {
  activeMangaStory.value = null;
  hoveredMangaDialogue.value = null;
  selectedMangaDialogue.value = null;
  closePopover();
  document.body.classList.remove('graded-story-active');
  if (typeof SpaRouter !== 'undefined') {
    SpaRouter.pushView({ view: 'tab', tab: 'gradedReading' }, `${window.location.pathname}?tab=gradedReading`);
  } else {
    window.history.pushState({}, '', `${window.location.pathname}?tab=gradedReading`);
  }
  readingMode.value = 'manga';
  renderHub();
}

// A story's category is the first part of its topic ("Gia đình & Bạn bè" -> "Gia đình").
const storyCategory = (m) => (m.topic_vi || '').split('&')[0].trim();

const isWanwuStory = (m) => m.series === 'wanwu' || Boolean(m.topic_vi && m.topic_vi.includes('Vạn vật'));
const isTextbookStory = (m) => m.series === 'textbook' || m.id.startsWith('hsk');
const levelNumOf = (m) => parseInt(String(m.level || '').replace(/\D/g, '') || '0', 10);

function matchesSource(m, src) {
  if (src === 'wanwu') return isWanwuStory(m);
  if (src === 'textbook') return isTextbookStory(m);
  return true;
}

function getFilteredManifest() {
  const lvl = levelFilter.value;
  const src = sourceFilter.value;
  const cat = categoryFilter.value;
  const sort = sortOrder.value;
  const q = searchQuery.value.toLowerCase().trim();
  const list = manifest.filter((m) => {
    if (!matchesSource(m, src)) return false;
    if (lvl !== 'all' && m.level.toUpperCase() !== lvl) return false;
    if (hideRead.value && isStoryRead(m.id)) return false;
    if (cat !== 'all' && storyCategory(m) !== cat) return false;
    if (q) {
      const fields = [m.title && m.title.zh, m.title && m.title.vi, m.description_vi, m.topic_vi].map((v) => (v || '').toLowerCase());
      if (!fields.some((f) => f.includes(q))) return false;
    }
    return true;
  });
  // Array.prototype.sort is stable, so ties keep the manifest order.
  return list.sort((a, b) => {
    if (sort === 'time_asc') return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
    if (sort === 'time_desc') return (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
    if (sort === 'title') return (a.title.vi || '').localeCompare(b.title.vi || '');
    if (sort === 'level_asc') return levelNumOf(a) - levelNumOf(b);
    // 'suggested': unread first, then easier levels first
    const readDiff = Number(isStoryRead(a.id)) - Number(isStoryRead(b.id));
    return readDiff || levelNumOf(a) - levelNumOf(b);
  });
}

// ---- Navigation --------------------------------------------------------------------------------
let escapeListenerBound = false;

async function init() {
  if (!document.getElementById('screenGradedReading')) return;
  document.body.classList.add('graded-reading-active');
  if (!escapeListenerBound) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (popover.value) closePopover();
      else if (filterPanelOpen.value) filterPanelOpen.value = false;
      else if (activeMangaStory.value) goBackToMangaHub();
      else if (activeStory.value) goBackToHub();
    });
    escapeListenerBound = true;
  }
  const params = new URLSearchParams(window.location.search);
  const storyParam = params.get('story');
  const mangaParam = params.get('manga');
  await Promise.all([ensureManifestLoaded(), ensureMangaManifestLoaded()]);
  if (mangaParam) await openMangaStory(mangaParam, false);
  else if (storyParam) await openStory(storyParam, false);
  else renderHub();
}

function renderHub() {
  activeStory.value = null;
  activeMangaStory.value = null;
  hoveredMangaDialogue.value = null;
  selectedMangaDialogue.value = null;
  closePopover();
  document.body.classList.remove('graded-story-active');
  clearReaderBodyClasses();
  readerPanelOpen.value = false;
  if (fullStoryPlaying.value || playingId.value) {
    stopFullStory();
    if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
    clearPlaying();
  }
  hubLimit.value = PAGE_SIZE;
  view.value = 'hub';
}

function goBackToHub() {
  activeStory.value = null;
  activeMangaStory.value = null;
  hoveredMangaDialogue.value = null;
  selectedMangaDialogue.value = null;
  closePopover();
  document.body.classList.remove('graded-story-active');
  if (typeof SpaRouter !== 'undefined') {
    SpaRouter.pushView({ view: 'tab', tab: 'gradedReading' }, `${window.location.pathname}?tab=gradedReading`);
  } else {
    window.history.pushState({}, '', `${window.location.pathname}?tab=gradedReading`);
  }
  renderHub();
}

async function openStory(storyId, updateUrl = true) {
  if (!document.getElementById('screenGradedReading')) return;
  view.value = 'loading';
  try {
    const story = await loadStory(storyId);
    quizState.value = {};
    activeStory.value = story;
    saveLastStory(storyId);
    if (updateUrl && typeof SpaRouter !== 'undefined') {
      SpaRouter.pushView({ view: 'tab', tab: 'gradedReading', story: storyId }, `${window.location.pathname}?tab=gradedReading&story=${storyId}`);
    }
    document.body.classList.add('graded-story-active');
    readerPanelOpen.value = false;
    applyReaderBodyClasses();
    view.value = 'story';
  } catch (e) {
    errorMessage.value = e.message;
    view.value = 'error';
  }
}

const loadMoreStories = () => { hubLimit.value += PAGE_SIZE; };

function setFilter(sig, value) {
  sig.value = value;
  renderHub();
}

// Legacy callers passed the source ('wanwu' / 'textbook') through the level filter.
function setLevelOrSource(value) {
  if (value === 'wanwu' || value === 'textbook') setFilter(sourceFilter, value);
  else if (value === 'read') setFilter(hideRead, false);
  else setFilter(levelFilter, value && value !== 'all' ? String(value).toUpperCase() : 'all');
}

function resetFilters() {
  searchQuery.value = '';
  categoryFilter.value = 'all';
  levelFilter.value = 'all';
  sourceFilter.value = 'all';
  hideRead.value = false;
  sortOrder.value = 'suggested';
  renderHub();
}

function updateReaderPrefs(patch) {
  savePrefs({ ...prefs.value, ...patch });
  applyReaderBodyClasses();
}

function setPinyinMode(mode) {
  updateReaderPrefs({ pinyinMode: mode, showPinyin: mode !== 'off' });
}

// Legacy toggle kept for window.GradedReading callers: all <-> off.
function togglePinyin() {
  setPinyinMode(prefs.value.pinyinMode === 'off' ? 'all' : 'off');
}

function toggleTranslation() {
  updateReaderPrefs({ showTranslation: !prefs.value.showTranslation });
}

function stepReaderFont(delta) {
  const base = window.innerWidth < 768 ? 22 : 26;
  const current = prefs.value.fontSize || base;
  updateReaderPrefs({ fontSize: Math.max(READER_FONT_MIN, Math.min(READER_FONT_MAX, current + delta)) });
}

function answerQuiz(qId, selectedIdx) {
  const story = activeStory.value;
  if (!story) return;
  const q = story.quiz.find((item) => item.id === qId);
  if (!q) return;
  const next = { ...quizState.value, [qId]: { selectedIdx, isCorrect: selectedIdx === q.answer } };
  quizState.value = next;
  // Answering every question marks the story as read
  if (story.quiz.every((item) => next[item.id] !== undefined) && !isStoryRead(story.id)) markStoryAsRead(story.id);
}

// ---- Token popover (appended to <body>, like before) -------------------------------------------
const popover = signal(null); // { token, added }
let popoverEl = null;

function onDocClick(e) {
  if (popoverEl && !popoverEl.contains(e.target)) closePopover();
}

function closePopover() {
  if (popoverEl) {
    render(null, popoverEl);
    popoverEl.remove();
    popoverEl = null;
  }
  popover.value = null;
  document.removeEventListener('click', onDocClick);
}

function triggerAddSrs() {
  const p = popover.value;
  if (!p || p.added) return;
  if (addTokenToSrs(p.token)) {
    popover.value = { ...p, added: true };
    renderPopover();
  }
}

function TokenPopover({ token, added }) {
  const story = activeStory.value;
  const srsStatus = getTokenSrsStatus(token);
  const lvlNum = storyLevelNum(story);
  const isAboveLevel = Boolean(token.hsk && token.hsk > lvlNum);
  const isAlreadyInSrs = srsStatus === 'mastered' || srsStatus === 'learning';
  let displayStatus = srsStatus !== 'none' ? srsStatus : 'new';
  let statusLabel = srsStatus === 'mastered' ? '✓ Đã thuộc' : (srsStatus === 'learning' ? '⚡ Đang ôn' : (isAboveLevel ? '⭐ Vượt cấp' : '✨ Từ mới'));
  if (added) {
    displayStatus = 'learning';
    statusLabel = '⚡ Đang ôn';
  }
  const hanviet = token.hanviet || (typeof window.getWordHanViet === 'function' ? window.getWordHanViet(token.text) : '');
  const meaning = token.meaning_vi || (hanviet ? `Âm Hán-Việt: ${hanviet}` : token.text);
  const btnDone = added || isAlreadyInSrs;
  const audioId = `popover-${token.text}`;
  const speaking = playingId.value === audioId;

  return (
    <>
      <div class="popover-header">
        <div class="popover-hanzi-group">
          <div class="popover-hanzi">{token.text}</div>{' '}
          <div class="popover-pinyin">{token.pinyin || ''}</div>
        </div>{' '}
        <div class="popover-header-actions">
          <button type="button" class={speaking ? 'popover-speak-btn playing' : 'popover-speak-btn'}
            onClick={(e) => { e.stopPropagation(); speakSentence(token.text, audioId); }}
            aria-label="Nghe phát âm" title="Nghe phát âm">
            {SPEAKER_ICON}
          </button>{' '}
          <button type="button" class="popover-close-btn" onClick={closePopover} aria-label="Đóng">✕</button>
        </div>
      </div>{' '}
      <div class="popover-meta">
        {token.hsk ? <span class="popover-hsk-badge">{`HSK ${token.hsk}`}</span> : null}{' '}
        {isAboveLevel ? <span class="token-overlevel-badge" style="font-size: 0.72rem; padding: 2px 6px;">{`+${token.hsk - lvlNum} Cấp`}</span> : null}{' '}
        <span class={`popover-srs-status ${displayStatus}`} id="popoverSrsBadge">{statusLabel}</span>
      </div>{' '}
      <div class="popover-body">
        <div class="popover-row">
          <div class="popover-row-label">Nghĩa tiếng Việt</div>{' '}
          <div class="popover-meaning">{meaning}</div>
        </div>{' '}
        {hanviet ? (
          <div class="popover-row">
            <div class="popover-row-label">Hán - Việt</div>{' '}
            <div class="popover-hanviet">{hanviet}</div>
          </div>
        ) : null}
      </div>{' '}
      <button type="button" class={btnDone ? 'popover-action-btn added' : 'popover-action-btn '} id="popoverAddSrsBtn" onClick={triggerAddSrs} disabled={btnDone}>
        {added ? '✓ Đã thêm vào lịch ôn' : (isAlreadyInSrs ? '✓ Đã có trong lịch ôn' : '+ Thêm vào lịch ôn')}
      </button>
    </>
  );
}

function renderPopover() {
  if (popoverEl && popover.value) render(<TokenPopover {...popover.value} />, popoverEl);
}

function showTokenPopover(token, targetEl) {
  closePopover();
  if (!token.word_id) {
    token.word_id = `hsk${token.hsk || storyLevelNum(activeStory.value)}_${token.text.charCodeAt(0) + 10000}`;
  }
  popoverEl = document.createElement('div');
  popoverEl.id = 'gradedTokenPopover';
  popoverEl.className = 'graded-token-popover';
  popover.value = { token, added: false };
  renderPopover();
  document.body.appendChild(popoverEl);

  // Position next to the clicked word (or centred when opened from the spotlight list)
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const popoverWidth = 290;
    let left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY + 8;
    if (left + popoverWidth > window.innerWidth - 16) left = window.innerWidth - popoverWidth - 16;
    if (left < 16) left = 16;
    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
  } else {
    Object.assign(popoverEl.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  }
  // Close when clicking anywhere else
  setTimeout(() => document.addEventListener('click', onDocClick), 50);
}

function handleTokenClick(event, sidx, tidx) {
  event.stopPropagation();
  const story = activeStory.value;
  if (!story) return;
  const sentence = story.sentences[sidx];
  const token = sentence && sentence.tokens[tidx];
  if (!token || !token.text || PUNCT_RE.test(token.text)) return;
  showTokenPopover(token, event.currentTarget);
}

function inspectByWordId(wid, event) {
  if (event) event.stopPropagation();
  const story = activeStory.value;
  if (!story) return;
  for (const s of story.sentences) {
    const tok = s.tokens.find((t) => t.word_id === wid);
    if (tok) {
      showTokenPopover(tok, event ? event.currentTarget : null);
      return;
    }
  }
}

// ---- Hub -------------------------------------------------------------------------------------
const CHECK_ICON = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 7"></polyline></svg>;
const SEARCH_ICON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>;
const SLIDERS_ICON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg>;
const PLAY_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"></path></svg>;

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'textbook', label: 'Giáo trình' },
  { value: 'wanwu', label: '万物有意思' },
];
const SORT_OPTIONS = [
  { value: 'suggested', label: 'Gợi ý cho bạn' },
  { value: 'level_asc', label: 'Dễ → khó' },
  { value: 'time_asc', label: 'Ngắn nhất trước' },
  { value: 'time_desc', label: 'Dài nhất trước' },
  { value: 'title', label: 'Tên bài A–Z' },
];
// Topics that duplicate the source filter or say nothing are left out of the topic list.
const HIDDEN_TOPICS = new Set(['Chung']);

const CJK_RE = /[㐀-鿿]/;
// Function words would give many textbook covers the same glyph (我的一天, 我的猫…).
const SEAL_SKIP = new Set('我你他她它们的了是在和与及一个这那有不也都很就要会去来上下中之对把被从到'.split(''));
function sealCharOf(story) {
  const chars = ((story.title && story.title.zh) || '').split('').filter((ch) => CJK_RE.test(ch));
  return chars.find((ch) => !SEAL_SKIP.has(ch)) || chars[0] || '文';
}

function storySourceLabel(story) {
  if (isWanwuStory(story)) {
    const chapter = (story.description_vi || '').match(/chương\s+(\d+)/i);
    if (chapter) return `万物有意思 · Ch.${chapter[1]}`;
    return story.page_display ? `万物有意思 · ${story.page_display}` : '万物有意思';
  }
  const topic = storyCategory(story);
  const base = isTextbookStory(story) ? 'Giáo trình HSK' : '';
  if (topic && !HIDDEN_TOPICS.has(topic)) return base ? `${base} · ${topic}` : topic;
  return base;
}

// Only real counts are shown; a missing field is hidden instead of faked.
function storyMetaParts(story, { withWords = true } = {}) {
  const sentCount = story.sentence_count ?? story.sentences_count;
  const wordCount = story.spotlight_count ?? story.words_count;
  return [
    sentCount != null ? `${sentCount} câu` : null,
    story.estimatedMinutes ? `${story.estimatedMinutes} phút` : null,
    withWords && wordCount != null ? `${wordCount} từ trọng tâm` : null,
  ].filter(Boolean);
}

const levelLabelOf = (story) => `HSK ${levelNumOf(story) || ''}`.trim();

// Plain clicks open the story in place; modified clicks keep the real link (new tab, copy link).
function onStoryLinkClick(event, storyId) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openStory(storyId);
}

const storyHref = (storyId) => `?tab=gradedReading&story=${encodeURIComponent(storyId)}`;

function StoryCover({ story, className }) {
  return story.cover_image ? (
    <span class={story.cover_word ? `${className} is-illustration` : className}><img src={story.cover_image} alt="" loading="lazy" style={story.cover_focus ? { objectPosition: story.cover_focus } : undefined} /></span>
  ) : (
    <span class={`${className} is-seal`} aria-hidden="true">{sealCharOf(story)}</span>
  );
}

function StoryCard({ story }) {
  const isRead = isStoryRead(story.id);
  const zhTitle = story.title && story.title.zh ? story.title.zh : '';
  const viTitle = story.title && story.title.vi ? story.title.vi : '';
  const readLabel = isRead ? 'Bỏ đánh dấu đã đọc' : 'Đánh dấu đã đọc';
  const isCurrent = lastStoryId.value === story.id && !isRead;

  return (
    <article class={`graded-card ${isRead ? 'is-read' : ''}`}>
      <a class="graded-card-link" href={storyHref(story.id)} onClick={(e) => onStoryLinkClick(e, story.id)}>
        <StoryCover story={story} className="graded-card-cover" />
        <span class="graded-card-content">
          <span class="graded-card-eyebrow">
            <span class="graded-card-level">{levelLabelOf(story)}</span>
            <span class="graded-card-source">{storySourceLabel(story)}</span>
            {isCurrent ? <span class="graded-card-status">Đang đọc</span> : null}
            {isRead ? <span class="graded-card-status is-done">Đã đọc</span> : null}
          </span>
          <span class="graded-card-zh" lang="zh">{zhTitle}</span>
          <span class="graded-card-vi">{viTitle}</span>
          <span class="graded-card-meta">{storyMetaParts(story).join(' · ')}</span>
        </span>
      </a>
      <button type="button" class={`graded-card-mark ${isRead ? 'is-on' : ''}`} onClick={(e) => toggleStoryRead(story.id, e)} title={readLabel} aria-label={`${readLabel}: ${viTitle || zhTitle}`} aria-pressed={isRead}>
        {CHECK_ICON}
      </button>
    </article>
  );
}

// The most recently opened story that is not finished yet, with the next unread one in its series.
function ContinueReading() {
  const story = manifest.find((m) => m.id === lastStoryId.value);
  if (!story || isStoryRead(story.id)) return null;
  const idx = manifest.indexOf(story);
  const next = manifest.slice(idx + 1).find((m) => m.level === story.level && m.series === story.series && !isStoryRead(m.id));
  return (
    <section class="graded-continue" aria-label="Đọc tiếp">
      <StoryCover story={story} className="graded-continue-cover" />
      <div class="graded-continue-text">
        <span class="graded-continue-eyebrow">Đọc tiếp</span>
        <a class="graded-continue-title" lang="zh" href={storyHref(story.id)} onClick={(e) => onStoryLinkClick(e, story.id)}>{story.title.zh}</a>
        <span class="graded-continue-meta">{[levelLabelOf(story), story.title.vi, ...storyMetaParts(story, { withWords: false })].filter(Boolean).join(' · ')}</span>
      </div>
      <div class="graded-continue-actions">
        <a class="graded-continue-btn" href={storyHref(story.id)} onClick={(e) => onStoryLinkClick(e, story.id)} aria-label={`Đọc tiếp: ${story.title.vi || story.title.zh}`}>
          {PLAY_ICON}<span>Đọc tiếp</span>
        </a>
        {next ? (
          <a class="graded-continue-next" href={storyHref(next.id)} onClick={(e) => onStoryLinkClick(e, next.id)}>
            Bài kế: <span lang="zh">{next.title.zh}</span> →
          </a>
        ) : null}
      </div>
    </section>
  );
}

function SourceSegment({ counts }) {
  return (
    <div class="graded-source-seg" role="group" aria-label="Nguồn bài đọc">
      {SOURCE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          class={sourceFilter.value === opt.value ? 'is-on' : ''}
          aria-pressed={sourceFilter.value === opt.value}
          onClick={() => setFilter(sourceFilter, opt.value)}
        >
          {opt.label}
          {opt.value !== 'all' ? <span class="graded-source-count">{counts[opt.value]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function HideReadToggle() {
  return (
    <label class="graded-hide-read">
      <input type="checkbox" checked={hideRead.value} onChange={(e) => setFilter(hideRead, e.currentTarget.checked)} />
      <span>Ẩn bài đã đọc</span>
    </label>
  );
}

// Topic + sort. A dropdown under its button on wide screens, a bottom sheet on phones
// (which also carries the source and hide-read controls the narrow toolbar drops).
function FilterPanel({ categories, counts, resultCount }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.graded-filter-btn')) filterPanelOpen.value = false;
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
  const close = () => { filterPanelOpen.value = false; };
  return (
    <>
      <button type="button" class="graded-filter-backdrop" aria-label="Đóng bộ lọc" onClick={close}></button>
      <div class="graded-filter-panel" id="gradedFilterPanel" ref={ref} role="dialog" aria-label="Chủ đề và sắp xếp">
        <div class="graded-filter-panel-head">
          <span class="graded-filter-panel-title">Lọc bài đọc</span>
          <button type="button" class="graded-filter-panel-close" aria-label="Đóng" onClick={close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>
          </button>
        </div>
        <div class="graded-filter-panel-body">
          <fieldset class="graded-filter-group graded-only-narrow">
            <legend>Nguồn</legend>
            <SourceSegment counts={counts} />
          </fieldset>
          <fieldset class="graded-filter-group">
            <legend>Sắp xếp</legend>
            {SORT_OPTIONS.map((opt) => (
              <label key={opt.value} class="graded-sort-option">
                <input type="radio" name="gradedSort" value={opt.value} checked={sortOrder.value === opt.value} onChange={() => setFilter(sortOrder, opt.value)} />
                <span>{opt.label}</span>
              </label>
            ))}
          </fieldset>
          <div class="graded-filter-group">
            <label class="graded-filter-label" for="gradedTopicSelect">Chủ đề</label>
            <select id="gradedTopicSelect" class="graded-topic-select" value={categoryFilter.value} onChange={(e) => setFilter(categoryFilter, e.currentTarget.value || 'all')}>
              <option value="all">Mọi chủ đề</option>
              {categories.map(([c, n]) => <option key={c} value={c}>{`${c} (${n})`}</option>)}
            </select>
          </div>
          <div class="graded-filter-group graded-only-narrow">
            <HideReadToggle />
          </div>
        </div>
        <div class="graded-filter-panel-foot graded-only-narrow">
          <button type="button" class="graded-btn-ghost" onClick={resetFilters}>Đặt lại</button>
          <button type="button" class="graded-btn-primary" onClick={close}>{`Xem ${resultCount} bài`}</button>
        </div>
      </div>
    </>
  );
}

function LoadMore({ remaining }) {
  return (
    <div id="gradedStoriesLoadMore" style="text-align: center; padding: 24px 0;"
      ref={(el) => {
        if (!el || !('IntersectionObserver' in window) || el.__observed) return;
        el.__observed = true;
        const obs = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            el.__observed = false;
            loadMoreStories();
          }
        }, { rootMargin: '300px' });
        obs.observe(el);
      }}>
      <button type="button" class="graded-btn-ghost" onClick={loadMoreStories}>
        {`Xem thêm bài đọc (${remaining} bài còn lại) ↓`}
      </button>
    </div>
  );
}

const filteredManifest = computed(() => {
  // Recomputed whenever a filter or the read list changes
  void readStories.value;
  return view.value === 'hub' ? getFilteredManifest() : [];
});

function ModeSwitcher() {
  return (
    <div class="manga-mode-switcher" role="tablist" aria-label="Chế độ đọc">
      <button
        type="button"
        role="tab"
        aria-selected={readingMode.value === 'articles'}
        class={`manga-mode-btn ${readingMode.value === 'articles' ? 'active' : ''}`}
        onClick={() => { readingMode.value = 'articles'; }}
      >
        <span>Bài đọc phân cấp</span>
        <span class="manga-mode-count">{manifest.length}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={readingMode.value === 'manga'}
        class={`manga-mode-btn manga-theme ${readingMode.value === 'manga' ? 'active' : ''}`}
        onClick={() => { readingMode.value = 'manga'; }}
      >
        <span>Truyện tranh</span>
        <span class="manga-mode-count">{mangaManifestData.length}</span>
      </button>
    </div>
  );
}

function Hub() {
  const filtered = filteredManifest.value;
  const shown = filtered.slice(0, hubLimit.value);
  const lvl = levelFilter.value;
  const src = sourceFilter.value;
  const inLevel = manifest.filter((m) => lvl === 'all' || m.level.toUpperCase() === lvl);
  const counts = {
    textbook: inLevel.filter(isTextbookStory).length,
    wanwu: inLevel.filter(isWanwuStory).length,
  };
  const inScope = inLevel.filter((m) => matchesSource(m, src));
  // Topics present in the current level + source, with story counts, A–Z.
  const topicCounts = new Map();
  inScope.forEach((m) => {
    const c = storyCategory(m);
    if (c && !HIDDEN_TOPICS.has(c) && !c.includes('Vạn vật')) topicCounts.set(c, (topicCounts.get(c) || 0) + 1);
  });
  if (categoryFilter.value !== 'all' && !topicCounts.has(categoryFilter.value)) topicCounts.set(categoryFilter.value, 0);
  const categories = Array.from(topicCounts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  const readInScope = inScope.filter((m) => isStoryRead(m.id)).length;
  const panelFilters = (categoryFilter.value !== 'all' ? 1 : 0) + (sortOrder.value !== 'suggested' ? 1 : 0);
  const hasActiveFilters = Boolean(searchQuery.value || categoryFilter.value !== 'all' || lvl !== 'all' || src !== 'all' || hideRead.value || sortOrder.value !== 'suggested');
  const sourceName = SOURCE_OPTIONS.find((o) => o.value === src);
  const scopeTitle = [lvl === 'all' ? 'Tất cả cấp' : lvl.replace('HSK', 'HSK '), src !== 'all' ? sourceName.label : null].filter(Boolean).join(' · ');
  const sortName = (SORT_OPTIONS.find((o) => o.value === sortOrder.value) || SORT_OPTIONS[0]).label;

  return (
    <div class={`graded-reading-container graded-hub ${filterPanelOpen.value ? 'is-filter-open' : ''}`}>
      <ModeSwitcher />
      <ContinueReading />

      <section class="graded-filterbar" aria-label="Bộ lọc bài đọc">
        <div class="graded-filterbar-row">
          <label class="graded-search">
            {SEARCH_ICON}
            <span class="graded-sr-only">Tìm bài đọc</span>
            <input
              type="search"
              id="gradedSearchInput"
              placeholder="Tìm theo tiêu đề, chủ đề…"
              value={searchQuery.value}
              onInput={(e) => setFilter(searchQuery, e.currentTarget.value || '')}
            />
          </label>
          <div class="graded-only-wide">
            <SourceSegment counts={counts} />
          </div>
          <div class="graded-filter-anchor">
            <button
              type="button"
              class={`graded-filter-btn ${panelFilters ? 'has-filters' : ''}`}
              aria-expanded={filterPanelOpen.value}
              aria-controls="gradedFilterPanel"
              onClick={() => { filterPanelOpen.value = !filterPanelOpen.value; }}
            >
              {SLIDERS_ICON}
              <span class="graded-only-wide">Chủ đề &amp; sắp xếp</span>
              <span class="graded-only-narrow">Lọc</span>
              {panelFilters ? <span class="graded-filter-count">{panelFilters}</span> : null}
            </button>
            {filterPanelOpen.value ? <FilterPanel categories={categories} counts={counts} resultCount={filtered.length} /> : null}
          </div>
        </div>
        <div class="graded-filterbar-row graded-levels-row">
          <span class="graded-levels-label graded-only-wide">Cấp HSK</span>
          <div class="graded-level-chips" role="group" aria-label="Cấp HSK">
            {['all', ...LEVELS].map((code) => {
              const isOn = lvl === code;
              let label = code === 'all' ? 'Tất cả' : code.replace('HSK', 'HSK ');
              if (isOn && code !== 'all') label += ` · ${readInScope}/${inScope.length}`;
              return (
                <button key={code} type="button" class={`graded-chip ${isOn ? 'is-on' : ''}`} aria-pressed={isOn} onClick={() => setFilter(levelFilter, code)}>
                  {label}
                </button>
              );
            })}
          </div>
          <div class="graded-only-wide">
            <HideReadToggle />
          </div>
        </div>
      </section>

      <div class="graded-results-head">
        <h2 class="graded-results-title">
          {scopeTitle}
          <span>{` · ${filtered.length} bài${readInScope ? ` · đã đọc ${readInScope}` : ''}`}</span>
        </h2>
        <div class="graded-results-actions">
          {hasActiveFilters ? <button type="button" class="graded-link-btn" onClick={resetFilters}>Đặt lại bộ lọc</button> : null}
          <button type="button" class="graded-link-btn graded-only-wide" onClick={() => { filterPanelOpen.value = true; }}>
            Sắp xếp: <strong>{sortName}</strong>
          </button>
        </div>
      </div>

      <div class="graded-story-grid" id="gradedStoriesGrid">
        {filtered.length === 0 ? (
          <div class="graded-empty-state">
            <div class="graded-empty-title">Không có bài đọc nào phù hợp</div>
            <p>{hideRead.value ? 'Bạn đã đọc hết các bài trong bộ lọc này, hoặc hãy thử cấp độ / từ khóa khác.' : 'Hãy thử cấp độ, nguồn hoặc từ khóa khác.'}</p>
            <button type="button" class="graded-btn-primary" onClick={resetFilters}>Xem tất cả bài đọc</button>
          </div>
        ) : shown.map((story) => <StoryCard key={story.id} story={story} />)}
      </div>

      {filtered.length > shown.length && <LoadMore key={shown.length} remaining={filtered.length - shown.length} />}
    </div>
  );
}

// ---- Reader ------------------------------------------------------------------------------------
// Groups a sentence's tokens with their punctuation so a mark never wraps onto a line alone.
function tokenUnits(tokens) {
  const units = [];
  let current = [];
  const flush = () => { if (current.length) units.push(current); current = []; };
  tokens.forEach((tok, tidx) => {
    const text = (tok.text || '').trim();
    const isLeading = LEADING_PUNCT.has(text);
    const isTrailing = TRAILING_PUNCT.has(text);
    const isPunct = isLeading || isTrailing || PUNCT_RE.test(text);
    if (isLeading) {
      if (current.some((item) => !item.isLeading)) flush();
      current.push({ tok, tidx, isLeading: true });
    } else if (isTrailing || isPunct) {
      current.push({ tok, tidx });
      flush();
    } else {
      if (current.some((item) => !item.isLeading)) flush();
      current.push({ tok, tidx });
    }
  });
  flush();
  return units;
}

// Full-width CJK marks: the glyph fills only half of its box, so CSS trims the empty half.
const PUNCT_OPEN = '“‘（《〈【';
const PUNCT_CLOSE = '，。？！、：；”’）》〉】';

function punctClass(ch) {
  if (PUNCT_OPEN.includes(ch)) return 'punct-open';
  if (PUNCT_CLOSE.includes(ch)) return 'punct-close';
  return undefined;
}

// Word tokens keep the legacy newline whitespace around them (it affects CJK line breaking).
function Token({ token, sidx, tidx, lvlNum }) {
  if (PUNCT_RE.test(token.text)) {
    return (
      <span class="graded-punctuation">
        {[...token.text].map((ch) => <span class={punctClass(ch)}>{ch}</span>)}
      </span>
    );
  }
  const status = getTokenSrsStatus(token);
  const tokenLvl = token.hsk || 1;
  const isOverLevel = Boolean(token.word_id && tokenLvl > lvlNum);
  return [
    '\n      ',
    <span class={`graded-token token-${status !== 'none' ? status : 'new'} ${isOverLevel ? 'token-overlevel' : ''}`}
      data-sidx={sidx} data-tidx={tidx} data-word-id={token.word_id || ''}
      onClick={(e) => handleTokenClick(e, sidx, tidx)} title="Bấm để xem nghĩa & thêm vào lịch ôn">
      {'\n        '}
      <ruby>
        {'\n          '}<rt class="token-pinyin">{token.pinyin || ''}</rt>{'\n          '}<rb>{token.text}</rb>{'\n        '}
      </ruby>
      {isOverLevel ? <span class="token-overlevel-badge">{`+${tokenLvl - lvlNum}`}</span> : null}
      {'\n      '}
    </span>,
    '\n    '
  ];
}

// Static per story: rendered once when the story opens (SRS colours are then patched in place).
function SentenceTokens({ sentence, sidx, lvlNum }) {
  return tokenUnits(sentence.tokens || []).map((unit, u) => (
    <span class="graded-token-unit" key={u}>
      {unit.map((item) => <Token key={item.tidx} token={item.tok} sidx={sidx} tidx={item.tidx} lvlNum={lvlNum} />)}
    </span>
  ));
}

const ICON_SPEAKER = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" />
  </svg>
);
const ICON_STOP = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
);
const ICON_PLAY = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

function SentenceAudioButton({ sentence, sidx }) {
  const playing = playingId.value === sentence.id;
  return (
    <button type="button" class={playing ? 'sentence-audio-btn speech-btn playing' : 'sentence-audio-btn speech-btn'} data-sentence-id={sentence.id}
      onClick={() => speakSentence(sentencePlainText(sentence), sentence.id)} title={playing ? 'Dừng' : 'Nghe câu này'}
      aria-label={playing ? `Dừng câu ${sidx + 1}` : `Nghe câu ${sidx + 1}`} aria-pressed={playing ? 'true' : 'false'}>
      {playing ? ICON_STOP : ICON_SPEAKER}
    </button>
  );
}

function SentenceStream({ story }) {
  const lvlNum = storyLevelNum(story);
  const current = playingId.value;
  return (
    <div class="graded-sentence-stream">
      {story.sentences.map((sentence, sidx) => (
        <div class={current === sentence.id ? 'graded-sentence-block is-playing' : 'graded-sentence-block'} id={`sent-${sentence.id}`} key={sentence.id}>
          <div class="graded-sentence-top-row">
            <SentenceAudioButton sentence={sentence} sidx={sidx} />{' '}
            <div class="graded-sentence-zh">
              {'\n                    '}<SentenceTokens sentence={sentence} sidx={sidx} lvlNum={lvlNum} />{'\n                  '}
            </div>
          </div>{' '}
          <div class="graded-sentence-vi">{sentence.vi}</div>
        </div>
      ))}
    </div>
  );
}

function Spotlight({ story }) {
  const wordsById = {};
  story.sentences.forEach((s) => s.tokens.forEach((tok) => {
    if (tok.word_id && !wordsById[tok.word_id]) wordsById[tok.word_id] = tok;
  }));
  return story.vocabulary_spotlight.map((wid) => {
    const tok = wordsById[wid];
    if (!tok) return null;
    const status = getTokenSrsStatus(tok);
    const label = status === 'mastered' ? 'Đã nhớ' : (status === 'learning' ? 'Đang ôn' : 'Từ mới');
    const hanviet = tok.hanviet || (typeof window.getWordHanViet === 'function' ? window.getWordHanViet(tok.text) : '');
    const meaning = tok.meaning_vi || (hanviet ? `Âm Hán-Việt: ${hanviet}` : '—');
    const audioId = `spotlight-${tok.text}`;
    const speaking = playingId.value === audioId;
    return [' ', (
      <div key={wid} class="graded-spotlight-item" onClick={(e) => inspectByWordId(wid, e)}>
        <div class="spotlight-top">
          <div class="spotlight-word-group">
            <span class="spotlight-hz">{tok.text}</span>{' '}
            <span class="spotlight-py">{tok.pinyin}</span>
          </div>{' '}
          <button type="button" class={speaking ? 'spotlight-speak-btn playing' : 'spotlight-speak-btn'}
            onClick={(e) => { e.stopPropagation(); speakSentence(tok.text, audioId); }}
            aria-label={`Nghe phát âm ${tok.text}`} title="Nghe từ này">
            {SPEAKER_ICON}
          </button>
        </div>{' '}
        <div class="spotlight-vi">{meaning}</div>{' '}
        <div style="margin-top: 4px;">
          <span class={`popover-srs-status ${status}`}>{label}</span>
        </div>
      </div>
    )];
  });
}

function Quiz({ story }) {
  const answers = quizState.value;
  return (
    <div class="graded-quiz-container">
      {story.quiz.map((q, qidx) => {
        const a = answers[q.id];
        return (
          <div class="graded-quiz-item" id={`quiz-${q.id}`} key={q.id}>
            <div class="graded-quiz-question">{`Câu ${qidx + 1}: ${q.question_vi}`}</div>{' '}
            <div class="graded-quiz-options">
              {q.options_vi.map((opt, oidx) => {
                let cls = 'graded-quiz-opt-btn';
                if (a && oidx === q.answer) cls += ' correct';
                else if (a && oidx === a.selectedIdx && !a.isCorrect) cls += ' wrong';
                return [' ', (
                  <button key={oidx} type="button" class={cls} disabled={Boolean(a)} onClick={() => answerQuiz(q.id, oidx)}>
                    <span style="font-weight: 700; color: var(--text-secondary);">{`${String.fromCharCode(65 + oidx)}.`}</span>{' '}
                    <span>{opt}</span>
                  </button>
                )];
              })}
            </div>{' '}
            <div class="graded-quiz-explanation" id={`quiz-exp-${q.id}`} style={a ? 'display: block;' : 'display:none;'}>
              {a && (
                <>
                  <div style="font-weight: 700; margin-bottom: 2px;">{a.isCorrect ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}</div>{' '}
                  <div>{q.explanation_vi}</div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const imageExpanded = signal(false);
const readerPanelOpen = signal(false);
const srsTick = signal(0); // bumped after bulk SRS adds so word counts re-render

const PINYIN_MODES = [['all', 'Pinyin', 'Hiện pinyin cho mọi từ'], ['new', 'Từ mới', 'Chỉ hiện pinyin cho từ mới và từ vượt cấp'], ['off', 'Tắt', 'Ẩn pinyin']];
const LEGEND_ITEMS = [['new', '新', 'Từ mới'], ['learning', '学', 'Đang học'], ['overlevel', '难', 'Vượt cấp'], ['mastered', '会', 'Đã thuộc']];

// Unique vocabulary words of a story, split by SRS status and level.
function storyWordStats(story) {
  void srsTick.value;
  const lvlNum = storyLevelNum(story);
  const seen = new Set();
  const fresh = [];
  let overLevel = 0;
  story.sentences.forEach((s) => (s.tokens || []).forEach((tok) => {
    if (!tok.word_id || seen.has(tok.word_id)) return;
    seen.add(tok.word_id);
    if ((tok.hsk || 1) > lvlNum) overLevel++;
    if (getTokenSrsStatus(tok) === 'new') fresh.push(tok);
  }));
  // Bulk SRS adds are limited to the story's spotlight words so a long chapter does not flood the queue.
  const spotlight = new Set(story.vocabulary_spotlight || []);
  const freshKey = fresh.filter((tok) => spotlight.has(tok.word_id));
  return { fresh, freshKey, overLevel };
}

function addStoryKeyWordsToSrs(story) {
  const { freshKey } = storyWordStats(story);
  let added = 0;
  freshKey.forEach((tok) => { if (addTokenToSrs(tok)) added++; });
  srsTick.value++;
  return added;
}

// Next story in the hub's current order, falling back to the manifest order.
function nextStoryId(storyId) {
  const filtered = getFilteredManifest();
  let idx = filtered.findIndex((m) => m.id === storyId);
  if (idx >= 0 && filtered[idx + 1]) return filtered[idx + 1].id;
  idx = manifest.findIndex((m) => m.id === storyId);
  if (idx >= 0 && manifest[idx + 1]) return manifest[idx + 1].id;
  return null;
}

// Thin bar under the reader toolbar showing how far the page has been scrolled.
function ReaderProgress() {
  const fillRef = useRef(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${pct})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <div class="graded-reader-progress" aria-hidden="true"><div class="graded-reader-progress-fill" ref={fillRef}></div></div>;
}

function ReaderSettingsPanel() {
  const p = prefs.value;
  const size = p.fontSize || (window.innerWidth < 768 ? 22 : 26);
  return (
    <div class="graded-reader-panel" id="gradedReaderPanel" role="dialog" aria-label="Tùy chỉnh hiển thị">
      <div class="graded-panel-group">
        <span class="graded-panel-label">Cỡ chữ Hán</span>
        <div class="graded-panel-stepper">
          <button type="button" class="graded-panel-btn" onClick={() => stepReaderFont(-2)} disabled={size <= READER_FONT_MIN} aria-label="Giảm cỡ chữ">
            <span style="font-size: 14px;">字</span>
          </button>
          <span class="graded-panel-value">{`${size} px`}</span>
          <button type="button" class="graded-panel-btn" onClick={() => stepReaderFont(2)} disabled={size >= READER_FONT_MAX} aria-label="Tăng cỡ chữ">
            <span style="font-size: 22px;">字</span>
          </button>
        </div>
      </div>
      <div class="graded-panel-group">
        <span class="graded-panel-label">Nền trang</span>
        <div class="graded-panel-papers">
          {[['cream', 'Kem'], ['sepia', 'Sepia']].map(([id, label]) => (
            <button key={id} type="button" class={`graded-paper-btn paper-${id} ${p.paper === id ? 'active' : ''}`}
              aria-pressed={p.paper === id ? 'true' : 'false'} onClick={() => updateReaderPrefs({ paper: id })}>
              {label}
            </button>
          ))}
        </div>
        <span class="graded-panel-hint">Chế độ tối dùng nút mặt trăng trên thanh đầu trang.</span>
      </div>
      <label class="graded-panel-switch">
        <span>Tô màu từ vựng</span>
        <input type="checkbox" checked={p.showSrsHighlights !== false}
          onChange={(e) => updateReaderPrefs({ showSrsHighlights: e.currentTarget.checked })} />
      </label>
      <div class="graded-panel-legend" aria-label="Chú giải trạng thái từ vựng">
        {LEGEND_ITEMS.map(([cls, glyph, label]) => (
          <span class="graded-legend-item" key={cls}>
            <span class={`legend-glyph legend-${cls}`}>{glyph}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReaderNav({ story }) {
  const p = prefs.value;
  const playingAll = fullStoryPlaying.value;
  const lvl = (story.level || 'hsk1').toLowerCase();
  const panelOpen = readerPanelOpen.value;

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onDown = (e) => {
      if (e.target.closest && (e.target.closest('#gradedReaderPanel') || e.target.closest('#gradedReaderAaBtn'))) return;
      readerPanelOpen.value = false;
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); readerPanelOpen.value = false; } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [panelOpen]);

  return (
    <header class="graded-reader-nav">
      <div class="graded-reader-top-bar">
        <button type="button" class="graded-back-btn" onClick={goBackToHub} title="Trở về danh sách bài đọc (Esc)" aria-label="Về danh sách bài đọc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          <span class="graded-back-label">Danh sách</span>
        </button>
        <div class="graded-reader-bar-title">
          <span class="graded-reader-bar-zh">{story.title.zh}</span>
          <span class={`graded-card-level-badge lvl-${lvl}`}>{story.level}</span>
        </div>
        <div class="graded-reader-controls">
          <button type="button" id="playFullStoryBtn" class={`graded-icon-btn graded-play-btn ${playingAll ? 'active' : ''}`}
            onClick={speakFullStory} title={playingAll ? 'Dừng nghe' : 'Nghe cả bài'} aria-label={playingAll ? 'Dừng nghe' : 'Nghe cả bài'} aria-pressed={playingAll ? 'true' : 'false'}>
            {playingAll ? ICON_STOP : ICON_PLAY}
          </button>
          <div class="graded-pinyin-seg" role="group" aria-label="Chế độ pinyin" id="togglePinyinBtn">
            {PINYIN_MODES.map(([id, label, hint]) => (
              <button key={id} type="button" class={p.pinyinMode === id ? 'seg-btn active' : 'seg-btn'} title={hint}
                aria-pressed={p.pinyinMode === id ? 'true' : 'false'} onClick={() => setPinyinMode(id)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" id="toggleTransBtn" class={`graded-toggle-btn ${p.showTranslation ? 'active' : ''}`}
            onClick={toggleTranslation} title="Bật/Tắt bản dịch tiếng Việt" aria-pressed={p.showTranslation ? 'true' : 'false'}>
            Dịch
          </button>
        </div>
        <button type="button" id="gradedReaderAaBtn" class={`graded-icon-btn graded-aa-btn ${panelOpen ? 'active' : ''}`}
          onClick={() => { readerPanelOpen.value = !panelOpen; }} title="Tùy chỉnh hiển thị" aria-label="Tùy chỉnh hiển thị"
          aria-expanded={panelOpen ? 'true' : 'false'} aria-controls="gradedReaderPanel">
          Aa
        </button>
      </div>
      <ReaderProgress />
      {panelOpen ? <ReaderSettingsPanel /> : null}
    </header>
  );
}

function ReaderTitle({ story }) {
  const source = storySourceLabel(story);
  const page = story.page_display && !(source || '').includes(story.page_display) ? story.page_display : null;
  const meta = [source, page, `${story.estimatedMinutes || 3} phút`].filter(Boolean);
  return (
    <div class="graded-reader-title-block">
      <p class="graded-reader-meta">{meta.join(' · ')}</p>
      <h1 class="graded-reader-zh-title">{story.title.zh}</h1>
      <p class="graded-reader-vi-title">{story.title.vi}</p>
    </div>
  );
}

function CompletionCard({ story }) {
  const isRead = isStoryRead(story.id);
  const { fresh, freshKey, overLevel } = storyWordStats(story);
  const [addedCount, setAddedCount] = useState(null);
  const nextId = nextStoryId(story.id);
  const finishAndNext = () => {
    if (!isRead) markStoryAsRead(story.id);
    if (nextId) {
      openStory(nextId);
      window.scrollTo({ top: 0 });
    }
  };
  return (
    <section class={`graded-completion-card ${isRead ? 'completed' : ''}`} id="storyCompletionCard">
      <h3 class="completion-heading">{isRead ? '读完了！' : '读完了吗？'}</h3>
      <p class="completion-sub">
        {isRead ? 'Bài đọc đã được lưu vào danh sách Đã đọc.' : 'Đánh dấu đã đọc để lưu tiến trình.'}
        {` Bài có ${fresh.length} từ mới`}{overLevel ? ` · ${overLevel} từ vượt cấp` : ''}.
      </p>
      <div class="completion-actions">
        {freshKey.length > 0 || addedCount !== null ? (
          <button type="button" class="graded-completion-btn secondary" disabled={addedCount !== null}
            onClick={() => setAddedCount(addStoryKeyWordsToSrs(story))}>
            {addedCount !== null ? `✓ Đã thêm ${addedCount} từ vào lịch ôn` : `Thêm ${freshKey.length} từ trọng tâm vào lịch ôn`}
          </button>
        ) : null}
        <button type="button" class={`graded-completion-btn ${isRead ? 'active' : ''}`} onClick={toggleCurrentStoryRead}>
          {isRead ? '✓ Đã đọc (bấm để hủy)' : 'Đánh dấu đã đọc'}
        </button>
        {nextId ? (
          <button type="button" class="graded-completion-btn primary" onClick={finishAndNext}>
            {isRead ? 'Bài tiếp →' : 'Đã đọc · Bài tiếp →'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SectionTitle({ icon, text }) {
  return (
    <h2 class="graded-section-title">
      <span>{icon}</span>{' '}
      <span>{text}</span>
    </h2>
  );
}

function StoryReader({ story }) {
  const isExpanded = imageExpanded.value;
  const fontSize = prefs.value.fontSize;
  return (
    <div class="graded-reading-container graded-reader-shell" style={fontSize ? `--graded-reader-fs: ${fontSize}px;` : undefined}>
      <ReaderNav story={story} />{' '}
      <main class="graded-passage-card">
        <ReaderTitle story={story} />
        {story.cover_image ? (
          <figure class={`graded-story-illustration-wrap ${isExpanded ? 'is-expanded' : ''}`}>
            <button
              type="button"
              class="graded-illustration-frame"
              onClick={() => { imageExpanded.value = !imageExpanded.value; }}
              aria-label={isExpanded ? 'Thu nhỏ ảnh minh họa' : 'Phóng to ảnh minh họa'}
              aria-expanded={isExpanded ? 'true' : 'false'}
            >
              <img src={story.cover_image} alt={story.title ? story.title.vi : ''} loading="lazy" />
            </button>
            <figcaption class="graded-illustration-caption">
              {`Minh họa từ sách 《万物有意思》${story.page_display ? ` · ${story.page_display}` : ''} · ${isExpanded ? 'chạm để thu nhỏ' : 'chạm để phóng to'}`}
            </figcaption>
          </figure>
        ) : null}
        <SentenceStream story={story} />
      </main>{' '}
      <section class="graded-section-card">
        <SectionTitle icon="⭐" text={`Từ vựng trọng tâm trong bài (${story.vocabulary_spotlight.length} từ)`} />{' '}
        <div class="graded-spotlight-grid"><Spotlight story={story} /></div>
      </section>{' '}
      <section class="graded-section-card">
        <SectionTitle icon="📝" text={`Kiểm tra đọc hiểu (${story.quiz.length} câu)`} />{' '}
        <Quiz story={story} />
      </section>{' '}
      <CompletionCard story={story} />
    </div>
  );
}

// Series shelves, in reading order. Entries without `collection` land on the first shelf.
const MANGA_COLLECTIONS = [
  { key: 'office', zh: '打工人日记', vi: 'Hài Công Sở (Diary of Dagongren)', range: 'Tập 1: 你在吗？ · Sitcom Hài HSK 1-3' },
  { key: 'classic', zh: '中国古典四大名著', vi: 'Kinh Điển Cổ Phong (Tây Du Ký)', range: 'Hồi 1 · Mỹ Hầu Vương Xuất Thế' },
  { key: 'peppercarrot', zh: '胡椒和胡萝卜', vi: 'Pepper&Carrot', range: 'Tập 1 → 39 · CC BY 4.0' },
];

function mangaChapterLabel(m) {
  return `Tập ${m.volume || m.chapter_no || 1}`;
}

function MangaCard({ m }) {
  return (
    <button type="button" class="manga-story-card" onClick={() => openMangaStory(m.id)}>
      <div class="manga-card-thumb">
        <img src={m.cover_image} alt={`Bìa truyện ${m.title.vi}`} loading="lazy" />
      </div>
      <div class="manga-card-body">
        <div class="manga-card-tags">
          {m.difficulty ? <span class="manga-card-level">{String(m.difficulty).split('(')[0].trim()}</span> : null}
          <span class="manga-card-chapter">{mangaChapterLabel(m)}</span>
          {isStoryRead(m.id) ? <span class="manga-card-read">✓ Đã đọc</span> : null}
        </div>
        <h2 class="manga-card-zh" lang="zh-Hans">{m.title.zh || m.title.zh_trad}</h2>
        {m.title.pinyin ? <span class="manga-card-py">{m.title.pinyin}</span> : null}
        <span class="manga-card-vi">{m.title.vi}</span>
        <p class="manga-card-desc">{m.description_vi}</p>
        <div class="manga-card-footer">
          <span>{`${m.page_count} trang`}</span>
          <span aria-hidden="true">·</span>
          <span>{`~${m.estimatedMinutes || 8} phút`}</span>
          <span class="manga-card-cta">Đọc →</span>
        </div>
      </div>
    </button>
  );
}

function MangaHub() {
  const readCount = mangaManifestData.filter((m) => isStoryRead(m.id)).length;
  return (
    <div class="graded-reading-container manga-hub">
      <div class="manga-hub-topbar">
        <button type="button" class="graded-back-btn" onClick={() => window.setPrimaryTab('vocab')} title="Quay lại Từ vựng">
          ← Về Từ vựng
        </button>
      </div>

      <ModeSwitcher />

      <section class="manga-hub-hero">
        <div class="manga-hub-hero-copy">
          <span class="manga-hub-kicker">TRUYỆN TRANH · ĐỌC GIẢI TRÍ & HỌC TỪ VỰNG</span>
          <h1 class="manga-hub-title">
            <span class="manga-hub-title-zh" lang="zh-Hans">漫画阅读 · 西游记 & 胡椒和胡萝卜</span>
            <span class="manga-hub-title-vi">Truyện Tranh Song Ngữ · Tây Du Ký &amp; Pepper&amp;Carrot</span>
          </h1>
          <p class="manga-hub-desc">
            Đọc truyện tranh tiếng Trung có hỗ trợ tra từ vựng, pinyin, Hán-Việt và dịch nghĩa theo từng câu và bóng thoại trực tiếp.
          </p>
        </div>
        <div class="manga-hub-stats">
          <div class="manga-hub-stat">
            <span>Đã đọc</span>
            <strong>{`${readCount} / ${mangaManifestData.length}`}</strong>
          </div>
        </div>
      </section>

      {MANGA_COLLECTIONS.map((c) => {
        const items = mangaManifestData.filter((m) => (m.collection || MANGA_COLLECTIONS[0].key) === c.key);
        if (!items.length) return null;
        return (
          <section key={c.key} class="manga-collection" aria-label={c.vi}>
            <header class="manga-collection-head">
              <h2 class="manga-collection-title">
                <span lang="zh-Hans">{c.zh}</span>
                <span>{c.vi}</span>
              </h2>
              <span class="manga-collection-meta">{`${items.filter((m) => isStoryRead(m.id)).length} / ${items.length} đã đọc · ${c.range}`}</span>
            </header>
            <div class="manga-cards-grid">
              {items.map((m) => <MangaCard key={m.id} m={m} />)}
            </div>
          </section>
        );
      })}

      <p class="manga-hub-credit">
        Nguồn: 《打工人日记》 (Synapse Hanzi Studio Original); 《西游记》 (Ngô Thừa Ân · Public Domain); <a href="https://www.peppercarrot.com" target="_blank" rel="noopener">Pepper&amp;Carrot</a> của David Revoy, giấy phép{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Bản dịch tiếng Trung và tiếng Việt do cộng đồng thực hiện; Lớp tra từ (pinyin, Hán-Việt, nghĩa) do Synapse Hanzi biên soạn.
      </p>
    </div>
  );
}

// Map an HSK value (1..6, '7-9', null) to the underline colour band used in the word panel.
function mangaHskBand(hsk) {
  const n = parseInt(String(hsk || ''), 10);
  if (!n) return 'none';
  if (n <= 2) return 'basic';
  if (n <= 4) return 'mid';
  return 'adv';
}

function mangaHskLabel(hsk) {
  const n = parseInt(String(hsk || ''), 10);
  if (!n) return 'Ngoài HSK';
  return n >= 7 ? 'HSK 7–9' : `HSK ${n}`;
}

// Pad the bubble's text box a little so the hit area covers the whole balloon.
const BUBBLE_PAD = 1.2;
function bubbleStyle(b) {
  const x = Math.max(0, b.x - BUBBLE_PAD);
  const y = Math.max(0, b.y - BUBBLE_PAD);
  const w = Math.min(100 - x, b.width + BUBBLE_PAD * 2);
  const h = Math.min(100 - y, b.height + BUBBLE_PAD * 2);
  return `left: ${x}%; top: ${y}%; width: ${w}%; height: ${h}%;`;
}

const mangaTokenIdx = signal(-1); // -1 = no word card until a word is tapped
const mangaShowVi = signal(false);
const mangaSheetOpen = signal(false); // mobile bottom sheet: peek (false) / expanded (true) // translation hidden until asked for (active recall)
const mangaSeen = signal({});

// Display script: Simplified by default (matches the Pepper&Carrot pages). Lookup stays keyed to Simplified (`text`).
const MANGA_SCRIPT_KEY = 'manga.script.v2';
const MANGA_PINYIN_KEY = 'manga.pinyin';
const readPref = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } };
const writePref = (key, val) => { try { localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ } };
const mangaScript = signal(readPref(MANGA_SCRIPT_KEY, 'simp') === 'trad' ? 'trad' : 'simp');
const mangaPinyinOn = signal(readPref(MANGA_PINYIN_KEY, '1') !== '0');
function setMangaScript(v) { mangaScript.value = v; writePref(MANGA_SCRIPT_KEY, v); }
function setMangaPinyin(on) { mangaPinyinOn.value = on; writePref(MANGA_PINYIN_KEY, on ? '1' : '0'); }
const mangaLang = () => (mangaScript.value === 'simp' ? 'zh-Hans' : 'zh-Hant');
// Token / title objects carry {text, text_trad} or {zh, zh_trad}.
function mangaText(o) {
  if (!o) return '';
  if (mangaScript.value === 'simp') return o.text || o.zh || o.text_trad || o.zh_trad || '';
  return o.text_trad || o.zh_trad || o.text || o.zh || '';
}

// Story badge: lowest HSK level whose words cover >= 90% of the running words.
// Denominator = every word token except punctuation and proper names; non-HSK words count as not covered.
const MANGA_COVERAGE_TARGET = 0.9;
const mangaCoverageCache = new WeakMap();
function mangaHskCoverage(story, properNames) {
  if (mangaCoverageCache.has(story)) return mangaCoverageCache.get(story);
  const names = new Set([...(properNames || []), ...((story && story.proper_names) || [])]);
  const levels = [];
  (story.pages || []).forEach((pg) => (pg.dialogues || []).forEach((d) => (d.tokens || []).forEach((t) => {
    if (t.punct || names.has(t.text_trad) || names.has(t.text)) return;
    const n = parseInt(String(t.hsk || ''), 10);
    levels.push(n ? Math.min(n, 7) : 99);
  })));
  let result = null;
  if (levels.length) {
    for (let lvl = 1; lvl <= 7; lvl += 1) {
      const pct = levels.filter((n) => n <= lvl).length / levels.length;
      if (pct >= MANGA_COVERAGE_TARGET || lvl === 7) {
        const label = lvl === 7 ? 'HSK 7–9' : `HSK ${lvl}`;
        result = { level: lvl, pct: Math.floor(pct * 100), label: pct >= MANGA_COVERAGE_TARGET ? label : `> ${label}` };
        break;
      }
    }
  }
  mangaCoverageCache.set(story, result);
  return result;
} // dialogue id -> true once it has been the active bubble

// Chapter-wide reading order: bubble number n (1-based) is stable across pages and spreads.
const mangaOrderCache = new WeakMap();
function mangaChapterOrder(story) {
  let order = mangaOrderCache.get(story);
  if (!order) {
    const index = {};
    let n = 0;
    (story.pages || []).forEach((pg) => (pg.dialogues || []).forEach((d) => { n += 1; index[d.id] = n; }));
    order = { index, total: n };
    mangaOrderCache.set(story, order);
  }
  return order;
}
const mangaAddedWords = signal({});

function selectMangaDialogue(d) {
  selectedMangaDialogue.value = d;
  mangaTokenIdx.value = -1;
  mangaShowVi.value = false;
}

function addMangaTokenToSrs(token) {
  const n = parseInt(String(token.hsk || ''), 10);
  const copy = { ...token, hsk: n ? Math.min(n, 6) : 1 };
  if (addTokenToSrs(copy)) {
    mangaAddedWords.value = { ...mangaAddedWords.value, [token.text]: true };
  }
}

const STAR_ICON = (filled) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"></path>
  </svg>
);

const EYE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>
  </svg>
);

function MangaWordPanel({ current, order, onStep }) {
  const tokens = (current && current.tokens) || [];
  // No word is selected until the learner taps one: read first, look up second.
  const tIdx = mangaTokenIdx.value;
  const word = tIdx >= 0 && tokens[tIdx] && !tokens[tIdx].punct ? tokens[tIdx] : null;
  const step = onStep;
  const added = word && mangaAddedWords.value[word.text];
  const speaker = current && current.character ? current.character.split('(')[0].trim() : '';

  return (
    <aside class={`manga-panel ${mangaSheetOpen.value ? 'is-open' : ''}`} aria-label="Bảng từ" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        class="manga-sheet-handle"
        aria-expanded={mangaSheetOpen.value}
        aria-label={mangaSheetOpen.value ? 'Thu gọn bảng từ' : 'Mở rộng bảng từ'}
        onClick={() => { mangaSheetOpen.value = !mangaSheetOpen.value; }}
      >
        <span aria-hidden="true"></span>
      </button>
      {current ? (
        <div class="manga-panel-sentence">
          <div class="manga-panel-row">
            <span class="manga-panel-kicker">
              {`BÓNG THOẠI ${order.index[current.id]} / ${order.total}`}
              {speaker ? <span class="manga-speaker" lang="zh-Hant">{speaker}</span> : null}
            </span>
            <div class="manga-panel-steppers">
              <button type="button" class="manga-icon-btn sm" onClick={() => step(-1)} aria-label="Bóng thoại trước" title="Bóng thoại trước (←)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
              </button>
              <button type="button" class="manga-icon-btn sm" onClick={() => step(1)} aria-label="Bóng thoại sau" title="Bóng thoại sau (→)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
              </button>
            </div>
          </div>
          <div class={`manga-sentence-tokens ${mangaPinyinOn.value ? '' : 'no-pinyin'}`} lang={mangaLang()}>
            {tokens.map((t, i) => (t.punct ? <span key={`${current.id}-${i}`} class="manga-sent-punct">{mangaText(t)}</span> : (
              <button
                key={`${current.id}-${i}`}
                type="button"
                class={`manga-sent-token band-${mangaHskBand(t.hsk)} ${i === tIdx ? 'is-active' : ''}`}
                aria-pressed={i === tIdx}
                title={mangaHskLabel(t.hsk)}
                onClick={() => {
                  mangaTokenIdx.value = i === tIdx ? -1 : i;
                  // On phones the word card sits below the peek: open the sheet to show it.
                  if (i !== tIdx && window.matchMedia('(max-width: 767px)').matches) mangaSheetOpen.value = true;
                }}
              >
                {mangaPinyinOn.value ? <span class="manga-sent-py">{t.pinyin}</span> : null}
                <span class="manga-sent-hz">{mangaText(t)}</span>
              </button>
            )))}
          </div>
          <div class="manga-panel-actions">
            <button type="button" class={`manga-ghost-btn ${mangaShowVi.value ? 'active' : ''}`} aria-pressed={mangaShowVi.value} onClick={() => { mangaShowVi.value = !mangaShowVi.value; }} title="Hiện / ẩn nghĩa (T)">
              {EYE_ICON}
              <span>{mangaShowVi.value ? 'Ẩn nghĩa' : 'Hiện nghĩa'}</span>
            </button>
            <button type="button" class="manga-ghost-btn" onClick={() => speakSentence(current.zh, `dlg-${current.id}`)} title="Nghe câu">
              {SPEAKER_ICON}
              <span>Nghe câu</span>
            </button>
          </div>
          {mangaShowVi.value ? <p class="manga-sentence-vi">{current.vi}</p> : null}
        </div>
      ) : (
        <div class="manga-panel-sentence">
          <span class="manga-panel-kicker">BẢNG TỪ</span>
          <p class="manga-panel-empty">Trang này không có lời thoại.</p>
        </div>
      )}

      {word ? (
        <div class="manga-word-card">
          <div class="manga-word-head">
            <span class="manga-word-hz" lang={mangaLang()}>{mangaText(word)}</span>
            <div class="manga-word-meta">
              <div class="manga-word-line">
                <span class="manga-word-py">{word.pinyin}</span>
                <span class={`manga-word-hsk band-${mangaHskBand(word.hsk)}`}>{mangaHskLabel(word.hsk)}</span>
              </div>
              <span class="manga-word-sub">
                {word.hanviet ? <>Hán-Việt: <strong>{word.hanviet}</strong></> : null}
                {word.text_trad && word.text_trad !== word.text
                  ? (mangaScript.value === 'simp'
                    ? <> · Phồn thể: <span lang="zh-Hant">{word.text_trad}</span></>
                    : <> · Giản thể: <span lang="zh-Hans">{word.text}</span></>)
                  : null}
              </span>
            </div>
            <div class="manga-word-tools">
              <button type="button" class="manga-round-btn" onClick={() => speakSentence(word.text, `word-${current.id}-${tIdx}`)} aria-label="Nghe từ" title="Nghe từ">
                {SPEAKER_ICON}
              </button>
              <button
                type="button"
                class={`manga-round-btn manga-star-btn ${added ? 'is-on' : ''}`}
                disabled={added}
                onClick={() => addMangaTokenToSrs(word)}
                aria-label={added ? 'Đã thêm vào flashcard' : 'Thêm vào flashcard'}
                title={added ? 'Đã thêm vào flashcard' : 'Thêm vào flashcard'}
              >
                {STAR_ICON(added)}
              </button>
            </div>
          </div>
          <div class="manga-word-meaning">{word.meaning_vi || (word.hanviet ? `Âm Hán-Việt: ${word.hanviet}` : (typeof window.getWordHanViet === 'function' && window.getWordHanViet(word.text) ? `Âm Hán-Việt: ${window.getWordHanViet(word.text)}` : '—'))}</div>
        </div>
      ) : current ? (
        <p class="manga-panel-hint">Chạm vào một từ để xem nghĩa.</p>
      ) : null}
    </aside>
  );
}

// Bubble zoom never upsamples the scan: at most 1 image pixel per CSS pixel, and at most 1.4x.
const MANGA_MAX_ZOOM = 1.4;
const MANGA_STAGE_PAD = 16;
const MANGA_ZOOM_KEY = 'manga.zoom';
const mangaZoomOn = signal((() => { try { return localStorage.getItem(MANGA_ZOOM_KEY) !== '0'; } catch (e) { return true; } })());
function setMangaZoom(on) {
  mangaZoomOn.value = on;
  try { localStorage.setItem(MANGA_ZOOM_KEY, on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
}

// Fit the visible sheets into the stage box and compute the transform that centres the active bubble.
function mangaStageLayout(box, visible, active) {
  const n = visible.length;
  const ars = visible.map(({ pg }) => {
    const px = pg.ocr && pg.ocr.image_px;
    return px && px[0] && px[1] ? px[0] / px[1] : 0.647;
  });
  const ar = ars[0];
  const innerW = Math.max(0, box.w - MANGA_STAGE_PAD * 2);
  const innerH = Math.max(0, box.h - MANGA_STAGE_PAD * 2);
  const sheetH = Math.max(0, Math.min(innerH, innerW / (n * ar)));
  const sheetW = sheetH * ar;
  const left0 = (box.w - n * sheetW) / 2;
  const top0 = (box.h - sheetH) / 2;
  // Spread reads right-to-left: the earlier page (visible[0]) sits on the right.
  const sheetX = (i) => left0 + (n === 2 ? (i === 0 ? sheetW : 0) : 0);

  let transform = 'none';
  let scale = 1;
  if (active && sheetW > 0) {
    const i = visible.findIndex(({ pg }) => (pg.dialogues || []).some((d) => d.id === active.id));
    const pg = i >= 0 ? visible[i].pg : null;
    const naturalW = pg && pg.ocr && pg.ocr.image_px ? pg.ocr.image_px[0] : 0;
    const cap = naturalW ? Math.min(MANGA_MAX_ZOOM, naturalW / sheetW) : 1;
    if (pg && cap >= 1.05) {
      scale = cap;
      const b = active.bbox;
      const cx = sheetX(i) + ((b.x + b.width / 2) / 100) * sheetW;
      const cy = top0 + ((b.y + b.height / 2) / 100) * sheetH;
      const clampAxis = (view, start, size, c) => {
        const scaled = size * scale;
        if (scaled <= view) return (view - scaled) / 2 - start * scale;
        return Math.min(-start * scale, Math.max(view - (start + size) * scale, view / 2 - c * scale));
      };
      const tx = clampAxis(box.w, left0, n * sheetW, cx);
      const ty = clampAxis(box.h, top0, sheetH, cy);
      transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    }
  }
  return { sheetW, sheetH, sheetX, top0, transform, scale };
}

function MangaSegmented({ label, options, value, onPick }) {
  return (
    <div class="manga-setting-row">
      <span class="manga-setting-label">{label}</span>
      <div class="manga-segmented" role="group" aria-label={label}>
        {options.map(([val, text]) => (
          <button key={val} type="button" class={value === val ? 'active' : ''} aria-pressed={value === val} onClick={() => onPick(val)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function MangaSettings({ canSpread, spread }) {
  return (
    <div class="manga-settings" role="dialog" aria-label="Cài đặt đọc" onClick={(e) => e.stopPropagation()}>
      {canSpread ? (
        <MangaSegmented label="Bố cục" value={spread ? 'two' : 'one'} options={[['one', '1 trang'], ['two', '2 trang']]} onPick={(v) => setMangaSpread(v === 'two')} />
      ) : null}
      <MangaSegmented label="Giao diện" value={getMangaLook()} options={[['light', 'Sáng'], ['sepia', 'Giấy'], ['dark', 'Tối']]} onPick={setMangaLook} />
      <MangaSegmented label="Chữ" value={mangaScript.value} options={[['trad', 'Phồn thể'], ['simp', 'Giản thể']]} onPick={setMangaScript} />
      <label class="manga-setting-row manga-setting-check">
        <span class="manga-setting-label">Pinyin trên chữ</span>
        <input type="checkbox" checked={mangaPinyinOn.value} onChange={(e) => setMangaPinyin(e.target.checked)} />
      </label>
      <label class="manga-setting-row manga-setting-check">
        <span class="manga-setting-label">Số bóng thoại trên trang</span>
        <input type="checkbox" checked={showMangaOutlines.value} onChange={(e) => { showMangaOutlines.value = e.target.checked; }} />
      </label>
      <div class="manga-setting-row manga-setting-legend">
        <span class="manga-setting-label">Màu cấp HSK</span>
        <div class="manga-band-legend">
          <span class="band-basic">1–2</span>
          <span class="band-mid">3–4</span>
          <span class="band-adv">5+</span>
          <span class="band-none">Ngoài HSK</span>
        </div>
      </div>
      <div class="manga-settings-keys">
        <div class="manga-setting-label">Phím tắt</div>
        <div class="manga-shortcut-row"><span>Bóng thoại trước / sau</span><span><kbd>←</kbd> <kbd>→</kbd></span></div>
        <div class="manga-shortcut-row"><span>Trang sau / trước</span><span><kbd>Space</kbd> <kbd>⇧ Space</kbd></span></div>
        <div class="manga-shortcut-row"><span>1 trang / 2 trang</span><span><kbd>D</kbd></span></div>
        <div class="manga-shortcut-row"><span>Hiện / ẩn nghĩa</span><span><kbd>T</kbd></span></div>
        <div class="manga-shortcut-row"><span>Phóng to / toàn trang</span><span><kbd>Z</kbd></span></div>
        <div class="manga-shortcut-row"><span>Số bóng thoại</span><span><kbd>O</kbd></span></div>
        <div class="manga-shortcut-row"><span>Toàn màn hình</span><span><kbd>F</kbd></span></div>
        <div class="manga-shortcut-row"><span>Thoát toàn màn hình / về tủ truyện</span><span><kbd>Esc</kbd></span></div>
      </div>
      <MangaCredits story={activeMangaStory.value} />
    </div>
  );
}

// CC BY attribution for the open comic currently open (author, licence, translators, source link).
function MangaCredits({ story }) {
  if (!story || !story.source_credits) return null;
  return (
    <div class="manga-settings-credits">
      <div class="manga-setting-label">Nguồn</div>
      <p>{story.source_credits}</p>
      {story.source_url ? <a href={story.source_url} target="_blank" rel="noopener">Xem bản gốc ↗</a> : null}
    </div>
  );
}

function MangaViewer({ story }) {
  const totalPages = (story && story.pages) ? story.pages.length : 1;
  const spread = mangaSpreadPref.value && mangaWideViewport.value && totalPages > 1;
  const step = spread ? 2 : 1;
  // In spread mode the current index is always the first (right-hand) page of a pair.
  const rawIdx = Math.min(Math.max(activeMangaPage.value, 0), totalPages - 1);
  const pageIdx = spread ? rawIdx - (rawIdx % 2) : rawIdx;
  const page = (story && story.pages && story.pages[pageIdx]) || (story && story.pages && story.pages[0]);
  const visible = [{ pg: page, idx: pageIdx }];
  if (spread && story.pages[pageIdx + 1]) visible.push({ pg: story.pages[pageIdx + 1], idx: pageIdx + 1 });
  const lastVisibleIdx = visible[visible.length - 1].idx;

  // Bubbles of every visible page in reading order, numbered chapter-wide.
  const order = mangaChapterOrder(story);
  const dialogues = visible.flatMap(({ pg, idx }) => (pg.dialogues || []).map((d) => ({ d, n: order.index[d.id], pageNo: idx + 1 })));
  const selected = selectedMangaDialogue.value;
  const current = (selected && dialogues.some((x) => x.d.id === selected.id)) ? selected : (dialogues[0] && dialogues[0].d) || null;

  useEffect(() => {
    if (current && !mangaSeen.value[current.id]) mangaSeen.value = { ...mangaSeen.value, [current.id]: true };
  }, [current && current.id]);

  const clearMangaSelection = () => {
    hoveredMangaDialogue.value = null;
    selectedMangaDialogue.value = null;
    mangaTokenIdx.value = -1;
    mangaShowVi.value = false;
  };

  const goToPrev = () => {
    if (pageIdx > 0) {
      activeMangaPage.value = Math.max(0, pageIdx - step);
      clearMangaSelection();
    }
  };

  const goToNext = () => {
    if (lastVisibleIdx < totalPages - 1) {
      activeMangaPage.value = pageIdx + step;
      clearMangaSelection();
    }
  };

  const stepDialogue = (delta) => {
    // Chapter-wide: stepping past the last bubble of a page turns the page.
    const all = [];
    (story.pages || []).forEach((pg, pi) => (pg.dialogues || []).forEach((d) => all.push({ d, pi })));
    if (!all.length) return;
    const pos = current ? all.findIndex((x) => x.d.id === current.id) : -1;
    const target = all[pos + delta];
    if (!target) return;
    if (target.pi < pageIdx || target.pi > lastVisibleIdx) activeMangaPage.value = target.pi;
    selectMangaDialogue(target.d);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById('mangaViewerShell') || document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => { mangaIsFullscreen.value = true; }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => { mangaIsFullscreen.value = false; }).catch(() => {});
    }
  };

  const stageRef = useRef(null);
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Immersive reading: the reader covers the app chrome and owns the viewport.
  useEffect(() => {
    document.body.classList.add('manga-reading');
    mangaAppTheme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    return () => document.body.classList.remove('manga-reading');
  }, []);

  // The key listener is registered once and always calls the latest handlers, so held or
  // rapid key presses never run against a stale page / bubble.
  const keyActions = useRef({});
  keyActions.current = { stepDialogue, goToNext, goToPrev, toggleFullscreen };

  useEffect(() => {
    const onFsChange = () => { mangaIsFullscreen.value = Boolean(document.fullscreenElement); };
    document.addEventListener('fullscreenchange', onFsChange);
    const onResize = () => { mangaWideViewport.value = window.innerWidth >= 1000; };
    window.addEventListener('resize', onResize);

    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      const act = keyActions.current;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault();
        act.stepDialogue(1);
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        act.stepDialogue(-1);
      } else if (key === ' ' || key === 'PageDown' || key === 'PageUp') {
        e.preventDefault();
        // A focused button would otherwise be "clicked" by the Space keyup.
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        if ((key === ' ' && e.shiftKey) || key === 'PageUp') act.goToPrev();
        else act.goToNext();
      } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        act.toggleFullscreen();
      } else if (key === 'd' || key === 'D') {
        e.preventDefault();
        setMangaSpread(!mangaSpreadPref.value);
      } else if (key === 't' || key === 'T') {
        e.preventDefault();
        mangaShowVi.value = !mangaShowVi.value;
      } else if (key === 'z' || key === 'Z') {
        e.preventDefault();
        setMangaZoom(!mangaZoomOn.value);
      } else if (key === 'o' || key === 'O') {
        e.preventDefault();
        showMangaOutlines.value = !showMangaOutlines.value;
      } else if (key === '?') {
        e.preventDefault();
        showMangaShortcutsModal.value = !showMangaShortcutsModal.value;
      } else if (key === 'Escape') {
        // Order: close settings, then leave fullscreen, then back to the shelf.
        if (showMangaShortcutsModal.value) showMangaShortcutsModal.value = false;
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else goBackToMangaHub();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const zoomed = mangaZoomOn.value && Boolean(selectedMangaDialogue.value) && current;
  const layout = mangaStageLayout(stageBox, visible, zoomed ? current : null);

  const renderSheet = (pg, idx, i) => {
    const pos = `left: ${layout.sheetX(i).toFixed(1)}px; top: ${layout.top0.toFixed(1)}px; width: ${layout.sheetW.toFixed(1)}px; height: ${layout.sheetH.toFixed(1)}px;`;
    const hasVisibleOverlay = Boolean(story.overlay_bubbles);
    return (
      <div class={`manga-paper-sheet ${visible.length === 2 ? (i === 0 ? 'is-right' : 'is-left') : ''}`} key={pg.page_num || idx} style={pos}>
        <img src={pg.image} alt={`Trang ${idx + 1} - ${story.title.vi}`} class="manga-page-img" loading="eager" />
        {(pg.dialogues || []).map((d) => {
          const isActive = current && current.id === d.id;
          const isHover = hoveredMangaDialogue.value && hoveredMangaDialogue.value.id === d.id;
          const isNarration = d.character && d.character.includes('旁白');
          return (
            <button
              key={d.id}
              type="button"
              class={`manga-bubble ${hasVisibleOverlay ? 'is-comic-balloon' : ''} ${isNarration ? 'is-narration' : ''} ${showMangaOutlines.value ? 'show-outline' : ''} ${isActive ? 'is-active' : ''} ${isHover ? 'is-hover' : ''}`}
              style={bubbleStyle(d.bbox)}
              data-dlg={d.id}
              aria-label={`Bóng thoại ${order.index[d.id]}: ${mangaText(d)}`}
              title={d.vi}
              onMouseEnter={() => { hoveredMangaDialogue.value = d; }}
              onMouseLeave={() => { hoveredMangaDialogue.value = null; }}
              onClick={(e) => { e.stopPropagation(); selectMangaDialogue(d); }}
            >
              {showMangaOutlines.value ? <span class="manga-bubble-num" aria-hidden="true">{order.index[d.id]}</span> : null}
              {hasVisibleOverlay ? (
                <div class="manga-balloon-content">
                  {d.character ? (
                    <span class="manga-balloon-speaker">
                      {d.character.split(' ')[0]}
                    </span>
                  ) : null}
                  {mangaPinyinOn.value && d.pinyin ? (
                    <span class="manga-balloon-pinyin">{d.pinyin}</span>
                  ) : null}
                  <span class="manga-balloon-text" lang="zh-Hans">
                    {mangaText(d)}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  if (!page) return null;
  const progressPct = Math.round(((lastVisibleIdx + 1) / totalPages) * 100);
  const manifestItem = mangaManifestData.find((m) => m.id === story.id);
  const coverage = mangaHskCoverage(story, manifestItem && manifestItem.proper_names);

  return (
    <div
      id="mangaViewerShell"
      class={`manga-viewer-root theme-${mangaCanvasTheme.value} ${spread ? 'is-spread' : ''}`}
      onClick={() => { if (showMangaShortcutsModal.value) showMangaShortcutsModal.value = false; }}
    >
      <header class="manga-topbar" onClick={(e) => e.stopPropagation()}>
        <button type="button" class="manga-icon-btn" onClick={goBackToMangaHub} aria-label="Về tủ truyện" title="Về tủ truyện (Esc)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
        </button>
        <span class="manga-brand" aria-hidden="true">
          <img src="assets/images/logo.svg" alt="" width="22" height="22" />
          <span class="manga-brand-name" lang="zh-Hans">汉字思维</span>
        </span>
        <span class="manga-topbar-sep" aria-hidden="true"></span>
        <div class="manga-title-group" title={story.title.vi}>
          <span class="manga-title-zh" lang={mangaLang()}>{mangaText(story.title)}</span>
          {coverage ? (
            <span class="manga-title-level" title={`${coverage.pct}% số từ (trừ tên riêng, dấu câu) thuộc ${coverage.label.replace('> ', '')} trở xuống`}>
              {coverage.label}<span class="manga-badge-pct">{` · ${coverage.pct}%`}</span>
            </span>
          ) : null}
        </div>
        <div class="manga-topbar-progress" aria-label={`Trang ${lastVisibleIdx + 1} trên ${totalPages}`}>
          <span class="manga-topbar-track"><i style={`width: ${progressPct}%;`}></i></span>
          <span class="manga-topbar-count">{`${lastVisibleIdx + 1}/${totalPages}`}</span>
        </div>
        <button
          type="button"
          class={`manga-icon-btn ${showMangaShortcutsModal.value ? 'active' : ''}`}
          aria-label="Cài đặt đọc"
          aria-expanded={showMangaShortcutsModal.value}
          title="Cài đặt đọc (?)"
          onClick={() => { showMangaShortcutsModal.value = !showMangaShortcutsModal.value; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>
        </button>
        <button type="button" class="manga-icon-btn" onClick={toggleFullscreen} aria-label="Toàn màn hình" title={mangaIsFullscreen.value ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {mangaIsFullscreen.value
              ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>}
          </svg>
        </button>
        {showMangaShortcutsModal.value ? <MangaSettings canSpread={mangaWideViewport.value && totalPages > 1} spread={spread} /> : null}
      </header>

      <div class="manga-reader-body">
        <main class="manga-stage-col" id="mangaCanvas">
          <div class="manga-stage-viewport" ref={stageRef} onClick={() => { if (selectedMangaDialogue.value && mangaZoomOn.value) selectedMangaDialogue.value = null; }}>
            <div class={`manga-stage ${layout.scale > 1 ? 'is-zoomed' : ''}`} style={`transform: ${layout.transform};`}>
              {/* Spread mode: like a printed manga, the earlier page sits on the right */}
              {stageBox.w ? visible.map(({ pg, idx }, i) => renderSheet(pg, idx, i)) : null}
            </div>
            <button
              type="button"
              class={`manga-zoom-btn ${mangaZoomOn.value ? 'active' : ''}`}
              aria-pressed={mangaZoomOn.value}
              onClick={(e) => { e.stopPropagation(); setMangaZoom(!mangaZoomOn.value); }}
              title={mangaZoomOn.value ? 'Đang phóng to bóng thoại — bấm để xem toàn trang (Z)' : 'Phóng to bóng thoại đang đọc (Z)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path>{mangaZoomOn.value ? <path d="M8 11h6"></path> : <path d="M8 11h6M11 8v6"></path>}</svg>
              <span>{mangaZoomOn.value ? 'Toàn trang' : 'Phóng to'}</span>
            </button>
          </div>

          <nav class="manga-strip" aria-label="Bóng thoại trên trang" onClick={(e) => e.stopPropagation()}>
            <button type="button" class="manga-strip-btn" disabled={pageIdx === 0} onClick={goToPrev} title="Trang trước (⇧ Space)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
              <span>Trang trước</span>
            </button>
            <div class="manga-dots">
              {dialogues.map(({ d, n }) => {
                const isCurrent = current && current.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    class={`manga-dot ${isCurrent ? 'is-current' : ''} ${mangaSeen.value[d.id] ? 'is-seen' : ''}`}
                    aria-label={`Bóng thoại ${n}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    title={`${n} · ${mangaText(d)}`}
                    onClick={() => selectMangaDialogue(d)}
                    onMouseEnter={() => { hoveredMangaDialogue.value = d; }}
                    onMouseLeave={() => { hoveredMangaDialogue.value = null; }}
                  ></button>
                );
              })}
            </div>
            {lastVisibleIdx === totalPages - 1 ? (
              <button type="button" class="manga-strip-btn is-finish" onClick={() => { markStoryAsRead(story.id); goBackToMangaHub(); }} title="Đánh dấu đã đọc và về tủ truyện">
                <span>✓ Đọc xong</span>
              </button>
            ) : (
              <button type="button" class="manga-strip-btn" onClick={goToNext} title="Trang sau (Space)">
                <span>Trang sau</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
              </button>
            )}
          </nav>
        </main>

        <MangaWordPanel current={current} order={order} onStep={stepDialogue} />
      </div>
    </div>
  );
}

export function GradedReadingScreen() {
  switch (view.value) {
    case 'hub':
      return readingMode.value === 'manga' ? <MangaHub /> : <Hub />;
    case 'loading':
      return (
        <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
          <div style="font-size: 1.5rem; margin-bottom: 12px;">📖</div>{' '}
          <div style="color: var(--text-secondary);">Đang tải dữ liệu...</div>
        </div>
      );
    case 'error':
      return (
        <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
          <div style="color: #ef4444; font-weight: 700; margin-bottom: 12px;">Đã xảy ra lỗi</div>{' '}
          <p style="color: var(--text-secondary);">{errorMessage.value}</p>{' '}
          <button type="button" class="graded-back-btn" style="margin: 16px auto;" onClick={goBackToHub}>← Trở về danh sách</button>
        </div>
      );
    case 'story':
      return activeStory.value ? <StoryReader key={activeStory.value.id} story={activeStory.value} /> : null;
    case 'manga':
      return activeMangaStory.value ? <MangaViewer key={activeMangaStory.value.id} story={activeMangaStory.value} /> : null;
    default:
      return null;
  }
}

export const GradedReading = {
  init,
  renderHub,
  openStory,
  openMangaStory,
  goBackToHub,
  goBackToMangaHub,
  setReadingMode: (mode) => { readingMode.value = mode; renderHub(); },
  togglePinyin,
  toggleTranslation,
  setLevelFilter: setLevelOrSource,
  setSourceFilter: (src) => setFilter(sourceFilter, src || 'all'),
  setHideRead: (on) => setFilter(hideRead, Boolean(on)),
  setCategoryFilter: (cat) => setFilter(categoryFilter, cat || 'all'),
  setSort: (s) => setFilter(sortOrder, !s || s === 'default' ? 'suggested' : s),
  handleSearchInput: (val) => setFilter(searchQuery, val || ''),
  resetFilters,
  loadMoreStories,
  speakSentence,
  speakFullStory,
  handleTokenClick,
  inspectByWordId,
  triggerAddSrs,
  closePopover,
  answerQuiz,
  isStoryRead,
  markStoryAsRead,
  unmarkStoryAsRead,
  toggleStoryRead,
  toggleCurrentStoryRead
};

export function mountGradedReading() {
  window.GradedReading = GradedReading;
  const screen = document.getElementById('screenGradedReading');
  if (screen) render(<GradedReadingScreen />, screen);
}
