// "Chữ liên quan" on the flashcard: loads all HSK words + hanzi decompositions, then shows the
// related words grouped by relation (other reading / same character / same phonetic component /
// same radical). Index and query live in RelatedWordsQuery.js.
import { render } from 'preact';
import { ArrowLeft } from 'lucide-preact';
import { onDomReady } from './domReady';
import { APP_TIMEOUTS } from './AppTimeouts';
import { createRelatedIndex, queryRelated, RELATION_ORDER } from './RelatedWordsQuery';

/* global currentLevel, progress, activeStudyWord -- classic-script globals */

// Bảng ánh xạ xếp hạng level để so sánh cấp độ học
const LEVEL_RANK = {
  hsk1: 1,
  hsk2: 2,
  hsk3: 3,
  hsk4: 4,
  hsk5: 5,
  hsk6: 6,
  hsk30_1: 1,
  hsk30_2: 2,
  hsk30_3: 3,
  hsk30_4: 4,
  hsk30_5: 5,
  hsk30_6: 6,
  hsk30_7: 7,
  hsk30_8: 8,
  hsk30_9: 9,
};

function getLevelRank(lvlKey) {
  if (!lvlKey) return 1;
  if (LEVEL_RANK[lvlKey]) return LEVEL_RANK[lvlKey];
  const m = String(lvlKey).match(/\d+/);
  return m ? parseInt(m[0], 10) : 99;
}

// Singleton Inverted Index
let relatedIndex = null;
let indexPromise = null;

// Lịch sử duyệt qua chip "Chữ liên quan" để quay lại thẻ trước
const relatedNavHistory = [];

/** Builds the related-words index once from all vocab levels and the hanzi decompositions. */
export async function buildRelatedIndex() {
  if (relatedIndex) return relatedIndex;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    try {
      // Tải đồng thời chiết tự và danh sách từ vựng HSK 1-6
      const decompPromise = typeof ensureHanziDecompLoaded === 'function'
        ? ensureHanziDecompLoaded()
        : fetch('database/radicals/hanzi_decompositions.json').then(r => r.json()).catch(() => ({}));

      const levelKeys = typeof hskLevelKeys === 'function'
        ? hskLevelKeys()
        : ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];

      const vocabPromises = levelKeys.map(async key => {
        try {
          const words = await window.fetchLevelWords(key);
          return words.map(w => ({
            id: w.id,
            hanzi: w.hanzi,
            pinyin: w.pinyin,
            meaning: w.meaning,
            hanviet: w.hanviet || '',
            levelKey: key,
            levelRank: getLevelRank(key)
          }));
        } catch (e) {
          return [];
        }
      });

      const [decompData, ...vocabLists] = await Promise.all([decompPromise, ...vocabPromises]);
      const allWords = vocabLists.flat();

      relatedIndex = createRelatedIndex(decompData || {}, allWords);

      return relatedIndex;
    } catch (err) {
      console.warn('Lỗi khởi tạo relatedIndex:', err);
      relatedIndex = createRelatedIndex({}, []);
      return relatedIndex;
    } finally {
      indexPromise = null;
    }
  })();

  return indexPromise;
}

/** Related words for the target card, grouped by relation (see RelatedWordsQuery.js). */
export function queryRelatedWords(targetWord, targetLevelKey) {
  const levelKey = targetLevelKey || (typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1');
  return queryRelated(relatedIndex, targetWord, levelKey, getLevelRank(levelKey));
}

/**
 * Lấy trạng thái học tập của một từ (Đã nhớ / Cần ôn / Chưa học)
 */
function getWordLearnStatus(levelKey, wordId) {
  try {
    if (typeof currentLevel !== 'undefined' && currentLevel === levelKey && typeof progress !== 'undefined') {
      const s = progress[wordId];
      if (s === 'known' || s === 'unknown') return s;
    }
    if (typeof window.readSrsRecord === 'function' && typeof window.statusFromCard === 'function') {
      const record = window.readSrsRecord(levelKey);
      if (record && record.cards && record.cards[wordId]) {
        const s = window.statusFromCard(record.cards[wordId]);
        if (s) return s;
      }
    }
  } catch (e) {}
  return 'unseen';
}

/**
 * Cắt ngắn nghĩa tiếng Việt để hiển thị vừa vặn trên chip
 */
function formatShortMeaning(meaning) {
  if (!meaning) return '';
  const clean = String(meaning).replace(/[（\(].*?[）\)]/g, '').trim();
  const firstPart = clean.split(/[,;\/，；]/)[0].trim();
  return firstPart.length > RELATED_MEANING_MAX_CHARS ? firstPart.slice(0, RELATED_MEANING_MAX_CHARS - 1) + '…' : firstPart;
}

const statusInfo = {
  known: ['related-chip--known', 'Đã nhớ'],
  unknown: ['related-chip--unknown', 'Cần ôn'],
  unseen: ['related-chip--unseen', 'Chưa học']
};

const RELATED_LABELS = Object.freeze({
  LIST: 'Danh sách chữ liên quan',
  BACK_PREFIX: 'Quay lại',
  BACK_TITLE_PREFIX: 'Quay lại thẻ trước',
  STATUS_PREFIX: 'Trạng thái',
});
const RELATED_MEANING_MAX_CHARS = 14;
const BACK_ICON_SIZE = 12;

// "Cùng bộ 扌 Thủ" / "Cùng thanh phù 矣 Hĩ" / "Đa âm": says *why* the group is related.
function groupHeading(item) {
  if (item.type === 'polyphone') return item.typeLabel;
  return [item.typeLabel, item.shared, item.sharedName].filter(Boolean).join(' ');
}

function groupMatches(relatedList) {
  const groups = new Map();
  RELATION_ORDER.forEach((type) => {
    relatedList.filter((item) => item.type === type).forEach((item) => {
      const key = `${type}:${item.shared}`;
      if (!groups.has(key)) groups.set(key, { key, type, heading: groupHeading(item), items: [] });
      groups.get(key).items.push(item);
    });
  });
  return Array.from(groups.values());
}

function RelatedChip({ item }) {
  const w = item.word;
  const shortMean = formatShortMeaning(w.meaning);
  const [statusClass, statusTitle] = statusInfo[getWordLearnStatus(w.levelKey, w.id)];
  const isWide = (w.hanzi && w.hanzi.length >= 4) || (w.pinyin && w.pinyin.length >= 12);
  return (
    <button
      type="button"
      class={`related-chip ${statusClass}${isWide ? ' related-chip--wide' : ''}`}
      onClick={(e) => { e.stopPropagation(); navigateToRelatedWord(w.levelKey, w.id, w.hanzi); }}
      title={`${w.hanzi} (${w.pinyin} - ${shortMean}) · ${RELATED_LABELS.STATUS_PREFIX}: ${statusTitle}`}
      role="listitem"
    >
      <div class="related-chip-main">
        <span
          class="related-chip-status"
          aria-label={statusTitle}
        />
        <span
          class="related-chip-hanzi"
          lang="zh-CN"
        >
          {w.hanzi}
        </span>
        <span class="related-chip-pinyin">{w.pinyin || ''}</span>
      </div>
      {shortMean ? <span class="related-chip-mean">{shortMean}</span> : null}
    </button>
  );
}

function RelatedChips({ relatedList, lastItem }) {
  const groups = groupMatches(relatedList);
  return (
    <>
      {lastItem && (
        <div class="card-related-header">
          <button
            type="button"
            class="card-related-back-btn"
            onClick={(e) => { e.stopPropagation(); goBackRelatedCard(); }}
            title={`${RELATED_LABELS.BACK_TITLE_PREFIX}: ${lastItem.hanzi}`}
          >
            <ArrowLeft
              size={BACK_ICON_SIZE}
              aria-hidden="true"
            />
            <span>{`${RELATED_LABELS.BACK_PREFIX}: ${lastItem.hanzi}`}</span>
          </button>
        </div>
      )}
      {groups.map((group) => (
        <section
          key={group.key}
          class="related-group"
        >
          <span class={`related-chip-tag related-chip-tag--${group.type} related-group-tag`}>
            {group.heading}
          </span>
          <div
            class="card-related-chips"
            role="list"
            aria-label={`${RELATED_LABELS.LIST}: ${group.heading}`}
          >
            {group.items.map((item) => (
              <RelatedChip
                key={`${item.word.levelKey}_${item.word.id}`}
                item={item}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export async function renderCardRelated(word) {
  const wrap = document.getElementById('cardRelatedWrap');
  const accordion = document.getElementById('cardRelatedAccordion');
  const countBadge = document.getElementById('cardRelatedCountBadge');
  if (!wrap) return;
  const hideRelated = () => {
    render(null, wrap);
    window.setCardSectionVisible(accordion, wrap, false);
  };
  if (!word || !word.hanzi) {
    hideRelated();
    return;
  }
  if (!relatedIndex) {
    // Schedule indexing during browser idle time so it never freezes initial card render
    if (!indexPromise) {
      const schedule = (typeof window !== 'undefined' && 'requestIdleCallback' in window)
        ? window.requestIdleCallback
        : (fn) => setTimeout(fn, 200);
      schedule(() => {
        buildRelatedIndex().then(() => {
          const currentWord = typeof activeStudyWord !== 'undefined' ? activeStudyWord : null;
          if (currentWord && currentWord.hanzi) {
            renderCardRelated(currentWord);
          }
        }).catch(() => {});
      });
    } else {
      indexPromise.then(() => {
        const currentWord = typeof activeStudyWord !== 'undefined' ? activeStudyWord : null;
        if (currentWord && currentWord.hanzi) {
          renderCardRelated(currentWord);
        }
      }).catch(() => {});
    }
    hideRelated();
    return;
  }

  const relatedList = queryRelatedWords(word, typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1');
  // No related words: hide the whole block instead of leaving an empty frame
  if (!relatedList || relatedList.length === 0) {
    hideRelated();
    return;
  }
  window.setCardSectionVisible(accordion, wrap, true, 'flex');
  if (countBadge) {
    countBadge.textContent = `(${relatedList.length})`;
    countBadge.setAttribute('aria-label', `${relatedList.length} chữ liên quan`);
    countBadge.hidden = false;
  }
  const lastItem = relatedNavHistory.length > 0 ? relatedNavHistory[relatedNavHistory.length - 1] : null;
  render(<RelatedChips relatedList={relatedList} lastItem={lastItem} />, wrap);
}

// Study a related word, remembering the current card so "Quay lại" can return to it.
export async function navigateToRelatedWord(targetLevel, wordId) {
  if (typeof activeStudyWord !== 'undefined' && activeStudyWord) {
    relatedNavHistory.push({
      levelKey: typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1',
      wordId: activeStudyWord.id,
      hanzi: activeStudyWord.hanzi
    });
    if (relatedNavHistory.length > 15) relatedNavHistory.shift(); // at most 15 steps back
  }
  if (typeof window.openWordInLevel === 'function') await window.openWordInLevel(targetLevel, wordId, true);
  else if (typeof window.selectLevel === 'function') await window.selectLevel(targetLevel, wordId, true);
}

export async function goBackRelatedCard() {
  const prev = relatedNavHistory.pop();
  if (!prev) return;
  if (typeof window.openWordInLevel === 'function') await window.openWordInLevel(prev.levelKey, prev.wordId, true);
  else if (typeof window.selectLevel === 'function') await window.selectLevel(prev.levelKey, prev.wordId, true);
}

let toastEl = null;
let toastTimer = null;

// After "Chưa nhớ": "Ôn thêm nhóm: 妈, 吗…" to review the whole cluster sharing a component.
export function showRelatedClusterHint(word) {
  if (!word || !relatedIndex) return;
  const relatedList = queryRelatedWords(word, typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1');
  if (!relatedList || relatedList.length === 0) return;
  const cluster = Array.from(new Set([word.hanzi, ...relatedList.map((r) => r.word.hanzi)])).slice(0, 4);

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'relatedClusterToast';
    toastEl.className = 'related-cluster-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  render(
    <>
      <span class="related-cluster-icon">💡</span>{' '}
      <span class="related-cluster-msg">Ôn thêm nhóm: <strong>{`${cluster.join(', ')}…`}</strong></span>
    </>,
    toastEl
  );
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), APP_TIMEOUTS.TOAST_DURATION_MS);
}

export function mountRelatedWords() {
  Object.assign(window, { buildRelatedIndex, queryRelatedWords, renderCardRelated, navigateToRelatedWord, goBackRelatedCard, showRelatedClusterHint });
  // Build the index in the background shortly after the page is ready
  onDomReady(() => setTimeout(buildRelatedIndex, 400));
}
