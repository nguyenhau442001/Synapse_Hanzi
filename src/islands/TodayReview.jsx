// Cross-level review session screen (#screenTodayReviews): "Ôn hôm nay" and the home widgets'
// quick review of forgotten words. (The due/new-card counters stay in storage.js: the dashboard
// needs them while the classic scripts are still loading.)
// Preact port of the former assets/js/due-review.js with the same markup.
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { AudioIcon, ArrowLeftIcon, ArrowRightIcon, RotateIcon } from './Icons.jsx';
import { initCardSwipe } from './CardInteractions.jsx';

/* global LEVELS, SRS, RATING_KEYS, SPEECH_RATE, SpaRouter -- classic-script globals */

const title = signal('Ôn nhanh từ hay quên');
const phase = signal('idle');           // 'idle' | 'loading' | 'error' | 'card' | 'done'
const queue = signal([]);               // [{ level, word, card, due }]
const index = signal(0);
const revealed = signal(false);
// Header progress keeps its last values while the next session loads, as before.
const progress = signal({ counter: '1 / 25', text: 'Đang tải...', pct: 0 });
let doneMessage = 'Không còn thẻ đến hạn hôm nay.';

const availableLevels = () => Object.keys(LEVELS).filter((level) => (
  typeof window.isReviewableLevel === 'function' ? window.isReviewableLevel(LEVELS[level], level) : LEVELS[level].available
));

async function loadTodayReviewQueue() {
  const now = new Date();
  const levels = availableLevels();
  const datasets = await Promise.all(levels.map(window.fetchLevelWords));
  const items = [];
  levels.forEach((level, levelIndex) => {
    const words = datasets[levelIndex];
    const cards = window.loadSrsForLevel(level, words, window.readSavedLevelProgressLegacy(level));
    words.forEach((word) => {
      const card = cards[word.id];
      if (SRS.isDue(card, now)) items.push({ level, word, card, due: new Date(card.due).getTime() });
    });
  });
  items.sort((a, b) => a.due - b.due);
  return items;
}

// Moves to the card at `index` (or the celebration once the queue is exhausted).
function showCurrentCard() {
  revealed.value = false;
  const total = queue.value.length;
  if (index.value >= total) {
    progress.value = { counter: `${total} / ${total}`, text: `Đã hoàn thành ${total} / ${total} thẻ`, pct: 100 };
    phase.value = 'done';
    window.renderLearningDashboard();
    return;
  }
  const currentNum = index.value + 1;
  progress.value = {
    counter: `${currentNum} / ${total}`,
    text: `${currentNum} / ${total} thẻ`,
    pct: total > 0 ? Math.round((index.value / total) * 100) : 0
  };
  phase.value = 'card';
}

export function revealTodayReview() {
  if (revealed.value || phase.value !== 'card') return;
  revealed.value = true;
}

function handleTodayCardClick(event) {
  if (revealed.value) return;
  if (event.target && event.target.closest('button, a, input, select, textarea')) return;
  revealTodayReview();
}

export function speakTodayWord() {
  const item = queue.value[index.value];
  if (!item || !item.word) return;
  const speakBtn = document.getElementById('todaySpeakBtn');
  if (speakBtn && typeof window.speakText === 'function') window.speakText(item.word.hanzi, speakBtn, SPEECH_RATE);
}

// Example sentences may underline the word with <u>…</u>; everything else is escaped.
function formatTodayExample(text) {
  if (!text) return '';
  return window.escapeHtml(text).replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
}

export function rateTodayReview(rating) {
  const item = queue.value[index.value];
  if (!item || phase.value !== 'card') return;
  const record = window.readSrsRecord(item.level);
  const result = window.reviewSrsCard(item.level, item.word.id, rating, record ? record.cards : {});
  window.recordDailyStudy(item.word.id, item.level);
  // Cards still in (re)learning come back later in the same session.
  if (SRS.isDue(result.card, Date.now() + 30 * 60 * 1000)) {
    queue.value = [...queue.value, { ...item, card: result.card, due: new Date(result.card.due).getTime() }];
  }
  index.value++;
  showCurrentCard();
}

const SCREEN_IDS_HIDDEN_DURING_REVIEW = ['screenVocabHub', 'screenCards', 'screenRadicalCards', 'screenRadicalHub'];
const HOME_CHROME_IDS = ['primaryTabs', 'pickerControls', 'learningDashboard'];
const setDisplay = (id, value) => { const el = document.getElementById(id); if (el) el.style.display = value; };

// Shared by "Ôn hôm nay" and the home widgets' quick review; loadQueue resolves to [{ level, word, card, due }].
export async function openReviewQueue(screenTitle, loadQueue, message) {
  window.setActiveStudyWord(null);
  document.body.classList.add('today-reviews-focus-mode');
  title.value = screenTitle;
  doneMessage = message;
  SCREEN_IDS_HIDDEN_DURING_REVIEW.forEach((id) => setDisplay(id, 'none'));
  setDisplay('screenTodayReviews', '');
  HOME_CHROME_IDS.forEach((id) => setDisplay(id, 'none'));
  phase.value = 'loading';
  window.syncHomeScreen();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) SpaRouter.pushView({ view: 'todayReviews' });
  try {
    queue.value = await loadQueue();
    index.value = 0;
    showCurrentCard();
  } catch (error) {
    console.error('Today review queue failed:', error);
    phase.value = 'error';
  }
}

export function openTodayReviews() {
  return openReviewQueue('📅 Ôn hôm nay', loadTodayReviewQueue, 'Không còn thẻ đến hạn hôm nay.');
}

export function closeTodayReviews() {
  document.body.classList.remove('today-reviews-focus-mode');
  ['screenTodayReviews', 'screenCards', 'screenRadicalCards'].forEach((id) => setDisplay(id, 'none'));
  setDisplay('screenVocabHub', '');
  HOME_CHROME_IDS.forEach((id) => setDisplay(id, ''));
  window.renderLearningDashboard();
  window.syncHomeScreen();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) SpaRouter.pushView({ view: 'vocab' });
}

const goBack = () => SpaRouter.navigateBack();
const stop = (fn) => (e) => { fn(); e.stopPropagation(); };

function Celebration() {
  const total = queue.value.length;
  return (
    <div class="today-review-celebration-card">
      <div class="today-celebration-icon" aria-hidden="true">🎉</div>{' '}
      <h3 class="today-celebration-title">Hoàn thành buổi ôn tập!</h3>{' '}
      <p class="today-celebration-desc">{doneMessage}</p>{' '}
      <div class="today-celebration-stat">
        <span class="stat-number">{total}</span>{' '}
        <span class="stat-label">thẻ đã được củng cố</span>
      </div>{' '}
      <div class="today-celebration-actions">
        <button type="button" class="today-btn-primary" onClick={goBack}>
          <span>Trở về trang chủ</span>{' '}
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}

const TODAY_GRADES = [
  { rating: 'again', label: 'Quên', key: '1' },
  { rating: 'hard', label: 'Khó', key: '2' },
  { rating: 'good', label: 'Được', key: '3' },
  { rating: 'easy', label: 'Dễ', key: '4' },
];

// Same four FSRS grades and styling as the level deck, with the next interval on each button.
function RatingButtons({ card }) {
  const previews = card ? SRS.preview(card, new Date(), window.srsRetention) : {};
  return TODAY_GRADES.map(({ rating, label, key }) => {
    const interval = previews[rating] ? previews[rating].intervalText : '';
    return (
      <button type="button" key={rating} class={`rating-btn rating-btn--${rating}`} onClick={stop(() => rateTodayReview(rating))}
        aria-keyshortcuts={key} title={`${label}${interval ? ` (ôn lại sau ${interval})` : ''} • Phím [${key}]`}>
        <span class="rating-label">{label}</span>
      </button>
    );
  });
}

function ReviewCard() {
  const item = queue.value[index.value];
  const isRevealed = revealed.value;
  const levelData = LEVELS[item.level] || { label: (item.level || '').toUpperCase() };
  const levelKey = (item.level || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lapses = (item.card && item.card.lapses) ? item.card.lapses : 0;
  const { word } = item;

  useEffect(() => {
    initCardSwipe({
      cardId: 'todayActiveCard',
      knownBadgeId: 'todaySwipeBadgeKnown',
      unknownBadgeId: 'todaySwipeBadgeUnknown',
      hasCards: () => phase.value === 'card' && index.value < queue.value.length,
      flip: revealTodayReview,
      markKnown: () => {
        if (!revealed.value) revealTodayReview();
        rateTodayReview('good');
      },
      markUnknown: () => {
        if (!revealed.value) revealTodayReview();
        rateTodayReview('again');
      },
    });
  }, []);

  return (
    <article
      class={isRevealed ? 'today-review-card is-revealed' : 'today-review-card'}
      id="todayActiveCard"
      onClick={handleTodayCardClick}
      role="region"
      aria-label="Thẻ từ vựng"
    >
      <div class="swipe-badge swipe-badge--known" id="todaySwipeBadgeKnown">✓ Được</div>{' '}
      <div class="swipe-badge swipe-badge--unknown" id="todaySwipeBadgeUnknown">✗ Quên</div>{' '}
      <div class="today-card-header">
        <span class={`today-level-badge lvl-${levelKey}`}>{levelData.label}</span>{' '}
        {lapses > 0 && <span class="today-lapse-pill" title={`Từ này đã quên hoặc nhầm ${lapses} lần`}>{`⚠️ Hay nhầm ${lapses}×`}</span>}
      </div>{' '}

      <div class="today-card-center">
        <div class="today-card-hanzi hw-cjk">{word.hanzi}</div>{' '}

        <div class="today-card-flip-cue" id="todayFlipCue" hidden={isRevealed}>
          <button type="button" class="today-flip-btn" onClick={stop(revealTodayReview)} aria-label="Lật thẻ xem đáp án">
            <RotateIcon size={18} className="flip-icon" />{' '}
            <span class="flip-label">Chạm thẻ <span class="today-shortcut-inline">hoặc nhấn <kbd>Space</kbd> </span>để lật</span>
          </button>
        </div>{' '}

        <div class="today-card-answer" id="todayReviewAnswer" hidden={!isRevealed}>
          <div class="today-pinyin-wrap">
            <span class="today-card-pinyin">{word.pinyin}</span>{' '}
            <button type="button" class="today-speak-btn" id="todaySpeakBtn" onClick={stop(speakTodayWord)} aria-label="Nghe phát âm" title="Nghe phát âm (phím P)">
              <AudioIcon size={20} />
            </button>
          </div>{' '}
          <div class="today-card-meaning">{word.meaning}</div>{' '}
          {word.example_zh && (
            <div class="today-card-example">
              <p class="today-example-zh hw-cjk" dangerouslySetInnerHTML={{ __html: formatTodayExample(word.example_zh) }} />{' '}
              {word.example_vi && <p class="today-example-vi" dangerouslySetInnerHTML={{ __html: formatTodayExample(word.example_vi) }} />}
            </div>
          )}
        </div>
      </div>{' '}

      <div class="today-card-actions">
        <div id="todayRevealActionWrap" class="today-reveal-wrap" hidden={isRevealed}>
          <button type="button" class="today-btn-reveal" onClick={stop(revealTodayReview)}>
            <span class="today-reveal-label">Xem đáp án</span>{' '}
            <kbd class="today-key-hint">Space</kbd>
          </button>
        </div>{' '}

        <div id="todayRatingRow" class="today-rating-row rating-row" hidden={!isRevealed}>
          <RatingButtons card={item.card} />
        </div>
      </div>
    </article>
  );
}

function CardArea() {
  switch (phase.value) {
    case 'loading':
      return (
        <div class="today-review-loading">
          <div class="today-loading-spinner" aria-hidden="true"></div>{' '}
          <p class="loading-text">Đang tải thẻ ôn tập...</p>
        </div>
      );
    case 'error':
      return (
        <div class="today-review-error">
          <p class="error-text">Không thể tải thẻ ôn tập. Vui lòng thử lại.</p>{' '}
          <button type="button" class="today-btn-primary" onClick={goBack}>Quay lại</button>
        </div>
      );
    case 'card':
      return <ReviewCard key={index.value} />;
    case 'done':
      return <Celebration />;
    default:
      return null;
  }
}

export function TodayReviewScreen() {
  const p = progress.value;
  return (
    <>
      <header class="today-review-topbar">
        <button class="today-review-back-btn" type="button" onClick={goBack} aria-label="Quay lại">
          <ArrowLeftIcon size={18} />{' '}
          <span>Quay lại</span>
        </button>{' '}

        <div class="today-review-title-cluster">
          <h2 id="todayReviewTitle" class="today-review-title">{title.value}</h2>{' '}
          <span class="today-review-zen-tag" title="Chế độ tập trung (Zen Mode)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>{' '}
            <span>Tập trung</span>
          </span>
        </div>{' '}

        <div class="today-review-top-meta">
          <span id="todayReviewCounterPill" class="today-review-counter-pill">{p.counter}</span>
        </div>
      </header>{' '}

      <div class="today-review-progress-section" aria-label="Tiến độ ôn tập">
        <div class="today-review-progress-track">
          <div class="today-review-progress-bar" id="todayReviewProgressBar" style={`width: ${p.pct}%`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={String(p.pct)}></div>
        </div>{' '}
        <div class="today-review-progress-meta">
          <span id="todayReviewProgress" class="today-review-progress-text" role="status">{p.text}</span>{' '}
          <span id="todayReviewProgressPct" class="today-review-progress-pct">{`${p.pct}%`}</span>
        </div>
      </div>{' '}

      <main class="today-review-arena" id="todayReviewCardArea" role="main"><CardArea /></main>{' '}

      <footer class="today-review-footer-bar">
        <div class="today-review-shortcuts">
          <span class="shortcut-item"><kbd>Space</kbd> Lật thẻ</span>{' '}
          <span class="shortcut-item"><kbd>1</kbd>–<kbd>4</kbd> Quên · Khó · Được · Dễ</span>{' '}
          <span class="shortcut-item"><kbd>P</kbd> Phát âm</span>{' '}
          <span class="shortcut-item"><kbd>Esc</kbd> Thoát</span>
        </div>
      </footer>
    </>
  );
}

function onKeydown(event, screen) {
  if (screen.style.display === 'none' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    if (typeof SpaRouter !== 'undefined') SpaRouter.navigateBack();
    else closeTodayReviews();
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault();
    speakTodayWord();
    return;
  }
  if (event.key === ' ') {
    if (document.activeElement && document.activeElement.closest('button, summary, a')) return;
    event.preventDefault();
    if (!revealed.value) revealTodayReview();
    return;
  }
  const rating = RATING_KEYS[event.key];
  if (rating && phase.value === 'card') {
    event.preventDefault();
    rateTodayReview(rating);
    return;
  }
  if (revealed.value && event.key === 'Enter') {
    event.preventDefault();
    rateTodayReview('good');
  }
}

export function mountTodayReview() {
  Object.assign(window, {
    openReviewQueue, openTodayReviews, closeTodayReviews,
    revealTodayReview, rateTodayReview, speakTodayWord
  });
  const screen = document.getElementById('screenTodayReviews');
  if (!screen) return;
  render(<TodayReviewScreen />, screen);
  document.addEventListener('keydown', (e) => onKeydown(e, screen));
}
