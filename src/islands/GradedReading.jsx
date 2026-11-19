// Graded Reading (HSK reading stories): hub with filters, interactive reader with click-to-inspect
// tokens, SRS integration, spotlight vocabulary and a comprehension quiz.
// Preact port of the former assets/js/graded-reading.js. Renders the same markup inside
// #screenGradedReading and keeps window.GradedReading for the tab router and SpaRouter.
import { render } from 'preact';
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
const levelFilter = signal('all');
const categoryFilter = signal('all');
const sortOrder = signal('default');
const searchQuery = signal('');
const hubLimit = signal(PAGE_SIZE);
const quizState = signal({});          // qId -> { selectedIdx, isCorrect }
const playingId = signal(null);        // sentence id, 'full-story' or null

const PREFS_KEY = 'synapse_graded_prefs_v1';
const prefs = signal((() => {
  const base = { showPinyin: true, showTranslation: true, showSrsHighlights: true };
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return Object.assign(base, JSON.parse(saved));
  } catch (e) { /* corrupt prefs */ }
  return base;
})());

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

function saveReadStories(next) {
  readStories.value = next;
  try { localStorage.setItem(READ_STORIES_STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
}

// ---- Audio -------------------------------------------------------------------------------------
function clearPlaying() {
  playingId.value = null;
}

function speakSentence(text, sentId) {
  if (!text) return;
  const isPlaying = playingId.value === sentId;
  if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
  if (isPlaying) {
    clearPlaying();
    return;
  }
  playingId.value = sentId;
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
  if (typeof window.speakChinese === 'function') {
    window.speakChinese(text, { rate, onEnd: clearPlaying, onError: clearPlaying });
  }
}

function speakFullStory() {
  const story = activeStory.value;
  if (!story || !story.sentences) return;
  speakSentence(story.sentences.map((s) => s.zh || s.text || '').filter(Boolean).join(' '), 'full-story');
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
    const res = await fetch('database/readings/manga/doraemon/manifest.json?v=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải danh sách truyện tranh.');
    mangaManifestData = await res.json();
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
  const file = item ? item.file : `database/readings/manga/doraemon/${mangaId}.json`;
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

function getFilteredManifest() {
  const lvl = levelFilter.value;
  const cat = categoryFilter.value;
  const sort = sortOrder.value;
  const q = searchQuery.value.toLowerCase().trim();
  return manifest.filter((m) => {
    if (lvl === 'wanwu') {
      const isWanwu = m.series === 'wanwu' || (m.topic_vi && m.topic_vi.includes('Vạn vật'));
      if (!isWanwu) return false;
    } else if (lvl === 'textbook') {
      const isTextbook = m.series === 'textbook' || m.id.startsWith('hsk');
      if (!isTextbook) return false;
    } else if (lvl === 'read') {
      if (!isStoryRead(m.id)) return false;
    } else if (lvl !== 'all' && m.level.toLowerCase() !== lvl.toLowerCase()) {
      return false;
    }
    if (cat !== 'all' && storyCategory(m) !== cat) return false;
    if (q) {
      const fields = [m.title && m.title.zh, m.title && m.title.vi, m.description_vi, m.topic_vi].map((s) => (s || '').toLowerCase());
      if (!fields.some((f) => f.includes(q))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'time_asc') return (a.estimatedMinutes || 3) - (b.estimatedMinutes || 3);
    if (sort === 'time_desc') return (b.estimatedMinutes || 3) - (a.estimatedMinutes || 3);
    if (sort === 'title') return (a.title.vi || '').localeCompare(b.title.vi || '');
    return 0;
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
  document.body.classList.remove('graded-story-active', 'graded-pinyin-hidden', 'graded-translation-hidden');
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
    if (updateUrl && typeof SpaRouter !== 'undefined') {
      SpaRouter.pushView({ view: 'tab', tab: 'gradedReading', story: storyId }, `${window.location.pathname}?tab=gradedReading&story=${storyId}`);
    }
    document.body.classList.add('graded-story-active');
    document.body.classList.toggle('graded-pinyin-hidden', !prefs.value.showPinyin);
    document.body.classList.toggle('graded-translation-hidden', !prefs.value.showTranslation);
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

function resetFilters() {
  searchQuery.value = '';
  categoryFilter.value = 'all';
  levelFilter.value = 'all';
  sortOrder.value = 'default';
  renderHub();
}

function togglePinyin() {
  const next = { ...prefs.value, showPinyin: !prefs.value.showPinyin };
  savePrefs(next);
  document.body.classList.toggle('graded-pinyin-hidden', !next.showPinyin);
}

function toggleTranslation() {
  const next = { ...prefs.value, showTranslation: !prefs.value.showTranslation };
  savePrefs(next);
  document.body.classList.toggle('graded-translation-hidden', !next.showTranslation);
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
  let statusLabel = srsStatus === 'mastered' ? '✓ Đã thuộc' : (srsStatus === 'learning' ? '⚡ Đang ôn (SRS)' : (isAboveLevel ? '⭐ Vượt cấp' : '✨ Từ mới'));
  if (added) {
    displayStatus = 'learning';
    statusLabel = '⚡ Đang ôn (SRS)';
  }
  const hanviet = token.hanviet || (typeof window.getWordHanViet === 'function' ? window.getWordHanViet(token.text) : '');
  const meaning = token.meaning_vi || (hanviet ? `Âm Hán-Việt: ${hanviet}` : 'Chữ Hán trong bài đọc');
  const btnDone = added || isAlreadyInSrs;

  return (
    <>
      <div class="popover-header">
        <div class="popover-hanzi-group">
          <div class="popover-hanzi">{token.text}</div>{' '}
          <div class="popover-pinyin">{token.pinyin || ''}</div>
        </div>{' '}
        <button type="button" class="popover-close-btn" onClick={closePopover} aria-label="Đóng">✕</button>
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
        {added ? '✓ Đã thêm vào SRS' : (isAlreadyInSrs ? '✓ Đã có trong SRS' : '+ Thêm vào hàng đợi SRS')}
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
const CHECK_SVG_PATH = <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></>;

function StoryCard({ story }) {
  const isRead = isStoryRead(story.id);
  const lvl = (story.level || 'hsk1').toLowerCase();
  const sentCount = story.sentence_count ?? story.sentences_count ?? 5;
  const wordCount = story.spotlight_count ?? story.words_count ?? 15;
  const zhTitle = story.title && story.title.zh ? story.title.zh : '';
  const viTitle = story.title && story.title.vi ? story.title.vi : '';
  const descVi = story.description_vi || '';
  const topicVi = story.topic_vi || '';
  const isWanwu = story.series === 'wanwu' || (story.topic_vi && story.topic_vi.includes('Vạn vật'));
  const isTextbook = story.series === 'textbook' || story.id.startsWith('hsk');
  const readLabel = isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc';

  return (
    <article class={`graded-story-card ${isRead ? 'is-read' : ''}`} onClick={() => openStory(story.id)} tabindex="0" role="button" aria-label={`Đọc bài ${viTitle}`}>
      <div class="graded-card-main">
        {/* 1. Level, Collection & Topic Metadata */}
        <header class="graded-card-header">
          <div class="graded-card-header-left">
            <span class={`graded-card-level-badge lvl-${lvl}`}>{story.level}</span>{' '}
            {isWanwu ? (
              <span class="graded-book-badge" title="Tủ sách Vạn vật thú vị">
                {`📚 万物有意思${story.page_display ? ` · ${story.page_display}` : ''}`}
              </span>
            ) : isTextbook ? (
              <span class="graded-textbook-badge" title="Bài đọc Giáo trình HSK Chuẩn">
                📖 Giáo trình HSK
              </span>
            ) : null}
            {(!isWanwu || !topicVi.includes('Vạn vật')) && topicVi ? (
              <span class="graded-card-topic" title={topicVi}>{topicVi}</span>
            ) : null}
          </div>{' '}
          <div class="graded-card-header-right">
            <button type="button" class={`graded-card-mark-toggle ${isRead ? 'read' : ''}`} onClick={(e) => toggleStoryRead(story.id, e)} title={readLabel} aria-label={readLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isRead ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">{CHECK_SVG_PATH}</svg>
            </button>
          </div>
        </header>{' '}

        {/* 2. Reading Titles (Full horizontal space) */}
        <div class="graded-card-titles">
          <h2 class="graded-card-zh-title" title={zhTitle}>
            <span>{zhTitle}</span>
          </h2>
          <div class="graded-card-vi-title" title={viTitle}>{viTitle}</div>
        </div>{' '}

        {/* 3. Supporting Info & Illustration */}
        <div class="graded-card-body">
          {story.cover_image ? (
            <div class="graded-card-thumb-wrap">
              <img src={story.cover_image} alt={viTitle} loading="lazy" />
            </div>
          ) : null}
          <p class="graded-card-desc" title={descVi}>{descVi}</p>
        </div>
      </div>{' '}

      {/* 4. Secondary Learning Metadata Footer */}
      <footer class="graded-card-footer">
        <div class="graded-card-meta">
          <span>{`${sentCount} câu`}</span>{' '}
          <span class="graded-meta-divider">·</span>{' '}
          <span>{`${wordCount} từ`}</span>{' '}
          <span class="graded-meta-divider">·</span>{' '}
          <span>{`⏱️ ${story.estimatedMinutes || 3}m`}</span>
        </div>{' '}
        <div class="graded-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </footer>
    </article>
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
      <button type="button" class="graded-filter-pill" onClick={loadMoreStories} style="padding: 10px 24px; font-weight: 700; font-size: 0.95rem;">
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
  const readCount = manifest.filter((m) => isStoryRead(m.id)).length;
  const progressPercent = manifest.length ? Math.round((readCount / manifest.length) * 100) : 0;
  const categories = Array.from(new Set(manifest.map(storyCategory).filter(Boolean))).sort();
  const filtered = filteredManifest.value;
  const shown = filtered.slice(0, hubLimit.value);
  const lvlFilter = levelFilter.value;
  const wanwuCount = manifest.filter((m) => m.series === 'wanwu' || (m.topic_vi && m.topic_vi.includes('Vạn vật'))).length;
  const textbookCount = manifest.filter((m) => m.series === 'textbook' || m.id.startsWith('hsk')).length;
  const hasActiveFilters = Boolean(searchQuery.value || categoryFilter.value !== 'all' || levelFilter.value !== 'all' || sortOrder.value !== 'default');

  return (
    <div class="graded-reading-container">
      <ModeSwitcher />
      {/* 1. Compact Page Header & Progress */}
      <header class="graded-hub-header">
        <div class="graded-hub-header-left">
          <button type="button" class="graded-back-btn" onClick={() => window.setPrimaryTab('vocab')} title="Quay lại Hub Từ vựng">
            ← Hub Từ vựng
          </button>
          <div class="graded-hub-title-group">
            <h1 class="graded-hub-title">
              <span>汉字思维 · Graded Reading</span>
              <span class="graded-hub-badge">Đọc hiểu HSK</span>
            </h1>
            <p class="graded-hub-subtitle">
              Luyện đọc phân cấp theo ngữ cảnh · Vòng lặp học từ khép kín với SRS cá nhân
            </p>
          </div>
        </div>

        <div class="graded-hub-progress-card" title={`Đã đọc ${readCount} trên tổng số ${manifest.length} bài`}>
          <div class="graded-hub-progress-info">
            <span class="graded-hub-progress-label">Tiến độ đọc</span>
            <span class="graded-hub-progress-stat"><strong>{readCount}</strong>/{manifest.length} ({progressPercent}%)</span>
          </div>
          <div class="graded-hub-progress-bar">
            <div class="graded-hub-progress-fill" style={`width: ${progressPercent}%;`}></div>
          </div>
        </div>
      </header>{' '}

      {/* 2. Dual Featured Collections Strip */}
      <div class="graded-collections-strip">
        <div
          class={`graded-col-card textbook ${lvlFilter === 'textbook' ? 'active' : ''}`}
          onClick={() => setFilter(levelFilter, lvlFilter === 'textbook' ? 'all' : 'textbook')}
          role="button"
          tabindex="0"
          title="Lọc bài đọc Giáo trình HSK Chuẩn"
        >
          <div class="graded-col-left">
            <span class="graded-col-icon">📖</span>
            <div class="graded-col-text">
              <div class="graded-col-title">Giáo trình HSK (H1 - H9)</div>
              <div class="graded-col-desc">Sách giáo khoa phân cấp · {textbookCount} bài</div>
            </div>
          </div>
          <span class="graded-col-action">
            {lvlFilter === 'textbook' ? '✓ Đang xem' : 'Xem giáo trình →'}
          </span>
        </div>

        <div
          class={`graded-col-card wanwu ${lvlFilter === 'wanwu' ? 'active' : ''}`}
          onClick={() => setFilter(levelFilter, lvlFilter === 'wanwu' ? 'all' : 'wanwu')}
          role="button"
          tabindex="0"
          title="Lọc tủ sách Vạn vật thú vị"
        >
          <div class="graded-col-left">
            <span class="graded-col-icon">📚</span>
            <div class="graded-col-text">
              <div class="graded-col-title">Tuyển tập 《万物有意思》</div>
              <div class="graded-col-desc">Bách khoa đời sống minh họa · {wanwuCount} bài</div>
            </div>
          </div>
          <span class="graded-col-action">
            {lvlFilter === 'wanwu' ? '✓ Đang xem' : 'Xem tủ sách →'}
          </span>
        </div>
      </div>{' '}

      {/* 3. Unified Search and Filtering Toolbar */}
      <div class="graded-toolbar">
        <div class="graded-toolbar-top">
          <div class="graded-search-box">
            <span class="graded-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              id="gradedSearchInput"
              class="graded-search-input"
              placeholder="Tìm bài đọc theo tiêu đề, chủ đề..."
              value={searchQuery.value}
              onInput={(e) => setFilter(searchQuery, e.currentTarget.value || '')}
              aria-label="Tìm kiếm bài đọc"
            />
            {searchQuery.value ? (
              <button
                type="button"
                class="graded-search-clear-btn"
                onClick={() => setFilter(searchQuery, '')}
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div class="graded-select-group">
            <select
              id="gradedCategorySelect"
              class="graded-select"
              value={categoryFilter.value}
              onChange={(e) => setFilter(categoryFilter, e.currentTarget.value || 'all')}
              aria-label="Lọc theo chủ đề"
            >
              <option value="all">Mọi chủ đề</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              id="gradedSortSelect"
              class="graded-select"
              value={sortOrder.value}
              onChange={(e) => setFilter(sortOrder, e.currentTarget.value || 'default')}
              aria-label="Sắp xếp bài đọc"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="time_asc">Thời lượng: Ngắn nhất</option>
              <option value="time_desc">Thời lượng: Dài nhất</option>
              <option value="title">Tên bài (A-Z)</option>
            </select>
          </div>
        </div>

        <nav class="graded-toolbar-filters" aria-label="Bộ lọc bài đọc">
          <div class="graded-filter-group" role="group" aria-label="Trạng thái & Tuyển tập">
            <button
              type="button"
              class={`graded-filter-pill ${lvlFilter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter(levelFilter, 'all')}
            >
              {`Tất cả (${manifest.length})`}
            </button>
            <button
              type="button"
              class={`graded-filter-pill graded-pill-textbook ${lvlFilter === 'textbook' ? 'active' : ''}`}
              onClick={() => setFilter(levelFilter, 'textbook')}
              title="Sách giáo khoa / Giáo trình HSK (H1-H9)"
            >
              {`📖 Giáo trình (${textbookCount})`}
            </button>
            <button
              type="button"
              class={`graded-filter-pill graded-pill-book ${lvlFilter === 'wanwu' ? 'active' : ''}`}
              onClick={() => setFilter(levelFilter, 'wanwu')}
              title="Tuyển tập Vạn vật thú vị"
            >
              {`📚 Vạn vật (${wanwuCount})`}
            </button>
            <button
              type="button"
              class={`graded-filter-pill ${lvlFilter === 'read' ? 'active' : ''} ${readCount === 0 ? 'disabled' : ''}`}
              onClick={() => setFilter(levelFilter, 'read')}
              title="Xem bài đã đọc"
            >
              {`✓ Đã đọc (${readCount})`}
            </button>
          </div>

          <div class="graded-filter-divider" aria-hidden="true"></div>

          <div class="graded-filter-group graded-filter-levels" role="group" aria-label="Cấp độ HSK">
            {LEVELS.map((lvl) => {
              const count = manifest.filter((m) => m.level.toUpperCase() === lvl).length;
              const lvlDisplay = lvl.replace('HSK', 'HSK ');
              if (!count) {
                return (
                  <button key={lvl} type="button" class="graded-filter-pill disabled" title="Đang cập nhật thêm bài đọc">
                    {`${lvlDisplay}`}
                  </button>
                );
              }
              const lvlReadCount = manifest.filter((m) => m.level.toUpperCase() === lvl && isStoryRead(m.id)).length;
              const readTag = lvlReadCount > 0 ? ` · ${lvlReadCount}✓` : '';
              return (
                <button
                  key={lvl}
                  type="button"
                  class={`graded-filter-pill ${lvlFilter === lvl ? 'active' : ''}`}
                  onClick={() => setFilter(levelFilter, lvl)}
                >
                  {`${lvlDisplay} (${count}${readTag})`}
                </button>
              );
            })}
          </div>
        </nav>
      </div>{' '}

      {/* 4. Reading Results Summary Bar */}
      <div class="graded-results-bar">
        <span class="graded-results-count">
          Hiển thị <strong>{filtered.length}</strong> bài đọc phù hợp
        </span>
        {hasActiveFilters ? (
          <button type="button" class="graded-reset-filters-btn" onClick={resetFilters}>
            Đặt lại bộ lọc ✕
          </button>
        ) : null}
      </div>{' '}

      {/* 5. Reading Cards Grid */}
      <div class="graded-stories-grid" id="gradedStoriesGrid">
        {filtered.length === 0 ? (
          <div class="graded-empty-state">
            <span style="font-size: 2.2rem;">📖</span>{' '}
            <div style="font-weight: 700; font-size: 1.05rem; margin-top: 10px; color: var(--graded-text-primary);">
              {lvlFilter === 'read' ? 'Bạn chưa đánh dấu bài đọc nào' : 'Không có bài đọc nào phù hợp'}
            </div>{' '}
            <p style="color: var(--graded-text-secondary); font-size: 0.88rem; max-width: 480px; margin: 6px auto 16px;">
              {lvlFilter === 'read' ? 'Hãy mở một bài đọc và bấm "Đánh dấu đã đọc" sau khi đọc xong, hoặc bấm nút tích trên thẻ bài đọc.' : 'Vui lòng chọn cấp độ hoặc từ khóa khác.'}
            </p>{' '}
            <button type="button" class="graded-filter-pill active" onClick={resetFilters}>Xem tất cả bài đọc</button>
          </div>
        ) : shown.map((story) => <StoryCard key={story.id} story={story} />)}
      </div>{' '}

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

// Word tokens keep the legacy newline whitespace around them (it affects CJK line breaking).
function Token({ token, sidx, tidx, lvlNum }) {
  if (PUNCT_RE.test(token.text)) return <span class="graded-punctuation">{token.text}</span>;
  const status = getTokenSrsStatus(token);
  const tokenLvl = token.hsk || 1;
  const isOverLevel = Boolean(token.word_id && tokenLvl > lvlNum);
  return [
    '\n      ',
    <span class={`graded-token token-${status !== 'none' ? status : 'new'} ${isOverLevel ? 'token-overlevel' : ''}`}
      data-sidx={sidx} data-tidx={tidx} data-word-id={token.word_id || ''}
      onClick={(e) => handleTokenClick(e, sidx, tidx)} title="Bấm để xem nghĩa & thêm vào SRS">
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

function SentenceAudioButton({ sentence, sidx }) {
  const playing = playingId.value === sentence.id;
  const cleanZh = (sentence.zh || sentence.tokens.map((t) => t.text).join('')).replace(/^[，。？！、\s]+/, '');
  return (
    <button type="button" class={playing ? 'sentence-audio-btn speech-btn playing' : 'sentence-audio-btn speech-btn'} data-sentence-id={sentence.id}
      onClick={() => speakSentence(cleanZh, sentence.id)} title="Nghe câu này" aria-label={`Nghe câu ${sidx + 1}`}
      style="flex-shrink: 0; margin-top: 6px; padding: 4px 8px; font-size: 0.76rem; border-radius: 6px; border: 1px solid var(--graded-border); background: var(--graded-chip-bg); color: var(--graded-text-secondary); cursor: pointer;">
      {playing ? '⏹ Dừng' : '🔊 Nghe'}
    </button>
  );
}

function SentenceStream({ story }) {
  const lvlNum = storyLevelNum(story);
  return (
    <div class="graded-sentence-stream">
      {story.sentences.map((sentence, sidx) => (
        <div class="graded-sentence-block" id={`sent-${sentence.id}`} key={sentence.id}>
          <div class="graded-sentence-top-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <div class="graded-sentence-zh">
              {'\n                    '}<SentenceTokens sentence={sentence} sidx={sidx} lvlNum={lvlNum} />{'\n                  '}
            </div>{' '}
            <SentenceAudioButton sentence={sentence} sidx={sidx} />
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
    return [' ', (
      <div key={wid} class="graded-spotlight-item" onClick={(e) => inspectByWordId(wid, e)}>
        <div class="spotlight-top">
          <span class="spotlight-hz">{tok.text}</span>{' '}
          <span class="spotlight-py">{tok.pinyin}</span>
        </div>{' '}
        <div class="spotlight-vi">{tok.meaning_vi}</div>{' '}
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

function ReaderNav({ story }) {
  const isRead = isStoryRead(story.id);
  const p = prefs.value;
  const playingAll = playingId.value === 'full-story';
  const lvl = (story.level || 'hsk1').toLowerCase();

  return (
    <header class="graded-reader-nav">
      {/* Row 1: Back button on left, HSK Badge + Duration in middle, Mark-Read toggle on right */}
      <div class="graded-reader-top-bar">
        <button type="button" class="graded-back-btn" onClick={goBackToHub} title="Trở về danh sách bài đọc (Esc)">
          ← Hub bài đọc
        </button>
        <div class="graded-reader-top-meta">
          <span class={`graded-card-level-badge lvl-${lvl}`}>{story.level}</span>
          {story.page_display ? (
            <span class="graded-reader-page-badge" title="Trang trong sách">
              {`📖 ${story.page_display}`}
            </span>
          ) : story.series === 'textbook' || story.id.startsWith('hsk') ? (
            <span class="graded-reader-textbook-badge" title="Bài đọc Giáo trình HSK Chuẩn">
              📖 Giáo trình HSK
            </span>
          ) : null}
          <span class="graded-reader-duration" title="Thời lượng đọc ước tính">
            {`⏱️ ${story.estimatedMinutes || 3}m`}
          </span>
        </div>
        <button
          type="button"
          id="toggleReadStoryBtn"
          class={`graded-toggle-btn graded-reader-mark-btn ${isRead ? 'active read-active' : ''}`}
          onClick={toggleCurrentStoryRead}
          title={isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc bài này'}
        >
          <span>{isRead ? '✓ Đã đọc' : '○ Đã đọc'}</span>
        </button>
      </div>

      {/* Row 2: Chinese Title (100% full width, never squished or prematurely broken) + Vietnamese subtitle */}
      <div class="graded-reader-title-block">
        <h1 class="graded-reader-zh-title">
          <span>{story.title.zh}</span>
        </h1>
        <div class="graded-reader-vi-title">
          {story.title.vi}
        </div>
      </div>

      {/* Row 3: Reading Action buttons (Audio, Pinyin, Translation) spaced in a 1fr 1fr 1fr grid */}
      <div class="graded-reader-actions-bar">
        <button
          type="button"
          id="playFullStoryBtn"
          class={`graded-toggle-btn ${playingAll ? 'active' : ''}`}
          onClick={speakFullStory}
          title="Nghe đọc toàn bộ bài đọc"
        >
          <span>{playingAll ? '⏹ Dừng' : '🔊 Nghe bài'}</span>
        </button>
        <button
          type="button"
          id="togglePinyinBtn"
          class={`graded-toggle-btn ${p.showPinyin ? 'active' : ''}`}
          onClick={togglePinyin}
          title="Bật/Tắt phiên âm Pinyin"
        >
          拼 Pinyin
        </button>
        <button
          type="button"
          id="toggleTransBtn"
          class={`graded-toggle-btn ${p.showTranslation ? 'active' : ''}`}
          onClick={toggleTranslation}
          title="Bật/Tắt bản dịch tiếng Việt"
        >
          🇻🇳 Bản dịch
        </button>
      </div>
    </header>
  );
}

function CompletionCard({ story }) {
  const isRead = isStoryRead(story.id);
  return (
    <section class={`graded-completion-card ${isRead ? 'completed' : ''}`} id="storyCompletionCard">
      <div class="completion-icon-box">{isRead ? '🎉' : '📖'}</div>{' '}
      <div class="completion-content">
        <h3 class="completion-heading">{isRead ? 'Đã hoàn thành bài đọc!' : 'Hoàn thành bài đọc này?'}</h3>{' '}
        <p class="completion-sub">{isRead ? 'Bài viết đã được lưu vào danh sách Đã đọc của bạn.' : 'Đánh dấu đã đọc để lưu tiến trình và theo dõi lộ trình học tập.'}</p>
      </div>{' '}
      <button type="button" class={`graded-completion-btn ${isRead ? 'active' : ''}`} onClick={toggleCurrentStoryRead}>
        {isRead ? '✓ Đã hoàn thành (Bấm để hủy)' : '✓ Đã đọc (Lưu tiến trình)'}
      </button>
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
  return (
    <div class="graded-reading-container graded-reader-shell">
      <ReaderNav story={story} />{' '}
      <div class="graded-srs-legend-bar" aria-label="Chú giải trạng thái từ vựng">
        <span class="graded-legend-title">Vốn từ:</span>
        <div class="graded-legend-items">
          {[['mastered', 'Đã thuộc'], ['learning', 'Đang học (SRS)'], ['new', 'Từ mới'], ['overlevel', 'Vượt cấp (+1)']].map(([cls, label]) => (
            <div class="graded-legend-item" key={cls}>
              <span class={`legend-swatch ${cls}`}></span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>{' '}
      <main class="graded-passage-card">
        {story.cover_image ? (
          <div class={`graded-story-illustration-wrap ${isExpanded ? 'is-expanded' : ''}`}>
            <div
              class="graded-illustration-frame"
              onClick={() => { imageExpanded.value = !imageExpanded.value; }}
              title={isExpanded ? 'Bấm để thu nhỏ ảnh' : 'Chạm để xem ảnh phóng to'}
              role="button"
              tabindex="0"
            >
              <img src={story.cover_image} alt={story.title ? story.title.vi : ''} loading="lazy" />
              <span class="graded-illustration-zoom-tag" aria-hidden="true">
                {isExpanded ? '✕ Thu gọn' : '🔍 Phóng to'}
              </span>
            </div>
            <div class="graded-illustration-caption">
              {`📖 Minh họa từ sách: 《万物有意思》${story.page_display ? ` (${story.page_display})` : ''}`}
            </div>
          </div>
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

function MangaHub() {
  const readCount = mangaManifestData.filter((m) => isStoryRead(m.id)).length;
  return (
    <div class="graded-reading-container manga-hub">
      <div class="manga-hub-topbar">
        <button type="button" class="graded-back-btn" onClick={() => window.setPrimaryTab('vocab')} title="Quay lại Hub Từ vựng">
          ← Hub Từ vựng
        </button>
      </div>

      <ModeSwitcher />

      <section class="manga-hub-hero">
        <div class="manga-hub-hero-copy">
          <span class="manga-hub-kicker">TRUYỆN TRANH · ĐỌC GIẢI TRÍ</span>
          <h1 class="manga-hub-title">
            <span class="manga-hub-title-zh" lang="zh-Hans">哆啦A梦</span>
            <span class="manga-hub-title-vi">Doraemon</span>
          </h1>
          <p class="manga-hub-desc">
            Đọc bản tiếng Trung phồn thể gốc. Bấm vào một bóng thoại để xem pinyin, nghĩa từng từ và câu dịch.
          </p>
        </div>
        <div class="manga-hub-stats">
          <div class="manga-hub-stat">
            <span>Đã đọc</span>
            <strong>{`${readCount} / ${mangaManifestData.length}`}</strong>
          </div>
        </div>
      </section>

      <div class="manga-cards-grid">
        {mangaManifestData.map((m) => (
          <button key={m.id} type="button" class="manga-story-card" onClick={() => openMangaStory(m.id)}>
            <div class="manga-card-thumb">
              <img src={m.cover_image} alt={`Bìa truyện ${m.title.vi}`} loading="lazy" />
            </div>
            <div class="manga-card-body">
              <div class="manga-card-tags">
                {m.difficulty ? <span class="manga-card-level">{String(m.difficulty).split('(')[0].trim()}</span> : null}
                <span class="manga-card-chapter">{`Tập ${m.chapter_no || 1}`}</span>
                {isStoryRead(m.id) ? <span class="manga-card-read">✓ Đã đọc</span> : null}
              </div>
              <h2 class="manga-card-zh" lang="zh-Hant">{m.title.zh_trad || m.title.zh}</h2>
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
        ))}
      </div>

      <p class="manga-hub-credit">
        Nguồn: 《哆啦A梦》 của Fujiko F. Fujio (Shogakukan; bản tiếng Trung 香港文化传信). Ảnh scan chỉ dùng cho mục đích học tập phi thương mại.
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

const mangaTokenIdx = signal(0);
const mangaSeen = signal({}); // dialogue id -> true once it has been the active bubble

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

const SPEAKER_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
  </svg>
);

function selectMangaDialogue(d) {
  selectedMangaDialogue.value = d;
  mangaTokenIdx.value = 0;
}

function addMangaTokenToSrs(token) {
  const n = parseInt(String(token.hsk || ''), 10);
  const copy = { ...token, hsk: n ? Math.min(n, 6) : 1 };
  if (addTokenToSrs(copy)) {
    mangaAddedWords.value = { ...mangaAddedWords.value, [token.text]: true };
  }
}

function MangaWordPanel({ dialogues, current, order }) {
  const tokens = (current && current.tokens) || [];
  let tIdx = Math.min(mangaTokenIdx.value, Math.max(0, tokens.length - 1));
  if (tokens[tIdx] && tokens[tIdx].punct) tIdx = Math.max(0, tokens.findIndex((t) => !t.punct));
  const word = tokens[tIdx] && !tokens[tIdx].punct ? tokens[tIdx] : null;
  const pos = current ? dialogues.findIndex((x) => x.d.id === current.id) : -1;
  const step = (delta) => {
    if (!dialogues.length) return;
    const next = (pos + delta + dialogues.length) % dialogues.length;
    selectMangaDialogue(dialogues[next].d);
  };
  const added = word && mangaAddedWords.value[word.text];

  return (
    <aside class="manga-panel" aria-label="Bảng từ" onClick={(e) => e.stopPropagation()}>
      {current ? (
        <div class="manga-panel-sentence">
          <div class="manga-panel-row">
            <span class="manga-panel-kicker">{`BÓNG THOẠI ${order.index[current.id]} / ${order.total}`}</span>
            <div class="manga-panel-steppers">
              <button type="button" class="manga-icon-btn sm" onClick={() => step(-1)} aria-label="Bóng thoại trước" title="Bóng thoại trước (↑)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
              </button>
              <button type="button" class="manga-icon-btn sm" onClick={() => step(1)} aria-label="Bóng thoại sau" title="Bóng thoại sau (↓)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
              </button>
            </div>
          </div>
          <div class="manga-panel-row">
            {current.character ? <span class="manga-speaker">{current.character}</span> : <span></span>}
            <button type="button" class="manga-ghost-btn" onClick={() => speakSentence(current.zh, `dlg-${current.id}`)}>
              {SPEAKER_ICON}
              <span>Nghe câu</span>
            </button>
          </div>
          <div class="manga-sentence-tokens" lang="zh-Hant">
            {tokens.map((t, i) => (t.punct ? <span key={`${current.id}-${i}`} class="manga-sent-punct">{t.text_trad || t.text}</span> : (
              <button
                key={`${current.id}-${i}`}
                type="button"
                class={`manga-sent-token band-${mangaHskBand(t.hsk)} ${i === tIdx ? 'is-active' : ''}`}
                onClick={() => { mangaTokenIdx.value = i; }}
              >
                <span class="manga-sent-py">{t.pinyin}</span>
                <span class="manga-sent-hz">{t.text_trad || t.text}</span>
              </button>
            )))}
          </div>
          <p class="manga-sentence-vi">{current.vi}</p>
          <div class="manga-band-legend" aria-hidden="true">
            <span class="band-basic">HSK 1–2</span>
            <span class="band-mid">HSK 3–4</span>
            <span class="band-adv">HSK 5+</span>
            <span class="band-none">Ngoài HSK</span>
          </div>
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
            <span class="manga-word-hz" lang="zh-Hant">{word.text_trad || word.text}</span>
            <div class="manga-word-meta">
              <div class="manga-word-line">
                <span class="manga-word-py">{word.pinyin}</span>
                <span class="manga-word-hsk">{mangaHskLabel(word.hsk)}</span>
              </div>
              <span class="manga-word-sub">
                {word.hanviet ? <>Hán-Việt: <strong>{word.hanviet}</strong></> : null}
                {word.text_trad && word.text_trad !== word.text ? <> · Giản thể: <span lang="zh-Hans">{word.text}</span></> : null}
              </span>
            </div>
            <button type="button" class="manga-round-btn" onClick={() => speakSentence(word.text, `word-${current.id}-${tIdx}`)} aria-label="Nghe từ" title="Nghe từ">
              {SPEAKER_ICON}
            </button>
          </div>
          <div class="manga-word-meaning">{word.meaning_vi}</div>
          <button type="button" class="manga-primary-btn" disabled={added} onClick={() => addMangaTokenToSrs(word)}>
            {added ? '✓ Đã thêm vào flashcard' : '+ Thêm vào flashcard'}
          </button>
        </div>
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
      <label class="manga-setting-row manga-setting-check">
        <span class="manga-setting-label">Số bóng thoại trên trang</span>
        <input type="checkbox" checked={showMangaOutlines.value} onChange={(e) => { showMangaOutlines.value = e.target.checked; }} />
      </label>
      <div class="manga-settings-keys">
        <div class="manga-setting-label">Phím tắt</div>
        <div class="manga-shortcut-row"><span>Trang trước / sau</span><span><kbd>←</kbd> <kbd>→</kbd></span></div>
        <div class="manga-shortcut-row"><span>Bóng thoại trước / sau</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
        <div class="manga-shortcut-row"><span>1 trang / 2 trang</span><span><kbd>D</kbd></span></div>
        <div class="manga-shortcut-row"><span>Phóng to / toàn trang</span><span><kbd>Z</kbd></span></div>
        <div class="manga-shortcut-row"><span>Số bóng thoại</span><span><kbd>O</kbd></span></div>
        <div class="manga-shortcut-row"><span>Toàn màn hình</span><span><kbd>F</kbd></span></div>
        <div class="manga-shortcut-row"><span>Đóng / về tủ truyện</span><span><kbd>Esc</kbd></span></div>
      </div>
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
    mangaTokenIdx.value = 0;
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
    if (!dialogues.length) return;
    const pos = current ? dialogues.findIndex((x) => x.d.id === current.id) : -1;
    selectMangaDialogue(dialogues[(pos + delta + dialogues.length) % dialogues.length].d);
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

  useEffect(() => {
    const onFsChange = () => { mangaIsFullscreen.value = Boolean(document.fullscreenElement); };
    document.addEventListener('fullscreenchange', onFsChange);
    const onResize = () => { mangaWideViewport.value = window.innerWidth >= 1000; };
    window.addEventListener('resize', onResize);

    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        stepDialogue(1);
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        stepDialogue(-1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setMangaSpread(!mangaSpreadPref.value);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setMangaZoom(!mangaZoomOn.value);
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        showMangaOutlines.value = !showMangaOutlines.value;
      } else if (e.key === '?') {
        e.preventDefault();
        showMangaShortcutsModal.value = !showMangaShortcutsModal.value;
      } else if (e.key === 'Escape') {
        if (showMangaShortcutsModal.value) showMangaShortcutsModal.value = false;
        else goBackToMangaHub();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pageIdx, totalPages, step, lastVisibleIdx, current && current.id, dialogues.length]);

  const zoomed = mangaZoomOn.value && Boolean(selectedMangaDialogue.value) && current;
  const layout = mangaStageLayout(stageBox, visible, zoomed ? current : null);

  const renderSheet = (pg, idx, i) => {
    const pos = `left: ${layout.sheetX(i).toFixed(1)}px; top: ${layout.top0.toFixed(1)}px; width: ${layout.sheetW.toFixed(1)}px; height: ${layout.sheetH.toFixed(1)}px;`;
    return (
      <div class={`manga-paper-sheet ${visible.length === 2 ? (i === 0 ? 'is-right' : 'is-left') : ''}`} key={pg.page_num || idx} style={pos}>
        <img src={pg.image} alt={`Trang ${idx + 1} - ${story.title.vi}`} class="manga-page-img" loading="eager" />
        {(pg.dialogues || []).map((d) => {
          const isActive = current && current.id === d.id;
          const isHover = hoveredMangaDialogue.value && hoveredMangaDialogue.value.id === d.id;
          return (
            <button
              key={d.id}
              type="button"
              class={`manga-bubble ${showMangaOutlines.value ? 'show-outline' : ''} ${isActive ? 'is-active' : ''} ${isHover ? 'is-hover' : ''}`}
              style={bubbleStyle(d.bbox)}
              data-dlg={d.id}
              aria-label={`Bóng thoại ${order.index[d.id]}: ${d.zh_trad || d.zh}`}
              title={d.vi}
              onMouseEnter={() => { hoveredMangaDialogue.value = d; }}
              onMouseLeave={() => { hoveredMangaDialogue.value = null; }}
              onClick={(e) => { e.stopPropagation(); selectMangaDialogue(d); }}
            >
              {showMangaOutlines.value ? <span class="manga-bubble-num" aria-hidden="true">{order.index[d.id]}</span> : null}
            </button>
          );
        })}
      </div>
    );
  };

  if (!page) return null;
  const progressPct = Math.round(((lastVisibleIdx + 1) / totalPages) * 100);

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
          <span class="manga-title-zh" lang="zh-Hant">{story.title.zh_trad || story.title.zh}</span>
          {story.difficulty ? <span class="manga-title-level">{String(story.difficulty).split('(')[0].trim()}</span> : null}
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
            <button type="button" class="manga-strip-btn" disabled={pageIdx === 0} onClick={goToPrev} title="Trang trước">
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
                    title={`${n} · ${d.zh_trad || d.zh}`}
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
              <button type="button" class="manga-strip-btn" onClick={goToNext} title="Trang sau">
                <span>Trang sau</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
              </button>
            )}
          </nav>
        </main>

        <MangaWordPanel dialogues={dialogues} current={current} order={order} />
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
  setLevelFilter: (lvl) => setFilter(levelFilter, lvl),
  setCategoryFilter: (cat) => setFilter(categoryFilter, cat || 'all'),
  setSort: (s) => setFilter(sortOrder, s || 'default'),
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
