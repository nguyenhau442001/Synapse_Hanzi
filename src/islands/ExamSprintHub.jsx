// src/islands/ExamSprintHub.jsx
// Exam Sprint ("Sinh tử chiến / Khô máu") Hub:
// 1. Exam Date Countdown & Daily Quota Calculator
// 2. HSK level filter (choose which HSK 3.0 levels feed the sprint pool)
// 3. 4 Daily Rounds (Morning Due+Mistakes, Noon Batch 1, Evening Batch 2, Night Skim + Pinyin)
//    with 3s auto-flip, mandatory prebuilt Auto-Audio, Hán Việt & Word Family clustering
// 4. Reverse SRS 12-question mini-quiz that tags mistakes for next morning's priority queue

import { h } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import {
  Flame,
  Calendar,
  Volume2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Target,
  Sparkles,
} from 'lucide-preact';
import { db, HanziMindDB } from './db.js';
import { recordExamMistakesToSrs } from './ExamSrsBridge.js';
import {
  SPRINT_SLOTS,
  SPRINT_UI_LABELS,
  SPRINT_SLOT_EMPTY_REASONS,
  SPRINT_LEVEL_OPTIONS,
  SPRINT_AUTO_FLIP_LIMIT_MS,
  TIMER_TICK_MS,
  MIN_DAILY_NEW_QUOTA,
  MAX_DAILY_NEW_QUOTA,
} from './SprintConstants.js';
import {
  sprintConfig,
  sprintDailyLog,
  sprintStats,
  sprintLoading,
  examCountdown,
  loadSprintPreferences,
  updateSprintConfig,
  updateSprintDailyLog,
  extractHanViet,
  findWordFamily,
  toggleSprintLevel,
  buildSlotQueue,
  buildReverseSrsQuiz,
} from './SprintState.js';

const DEFAULT_DIRECTION = 'zh2vi';

function playPrebuiltAudio(hanzi, pinyin = null, buttonEl = null) {
  if (typeof window === 'undefined') return;
  if (buttonEl && typeof window.speakText === 'function') {
    window.speakText(hanzi, buttonEl, undefined, null, pinyin);
    return;
  }
  if (typeof window.speakChinese === 'function') {
    window.speakChinese(hanzi, { pinyin });
  }
}

/**
 * Opens the native calendar popup on click instead of only via the small icon.
 * @param {MouseEvent} event
 */
function openDatePicker(event) {
  const input = event.currentTarget;
  if (typeof input?.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch (_) {
    // showPicker throws NotAllowedError without user activation or in cross-origin iframes.
  }
}

function normalizeTonelessPinyin(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function ExamSprintHub({ onBack }) {
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'sprint' | 'reverse_srs'
  const [activeSlot, setActiveSlot] = useState(null);
  const [vocabPool, setVocabPool] = useState([]);
  const [cardMap, setCardMap] = useState(new Map());
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pinyinInput, setPinyinInput] = useState('');
  const [pinyinStatus, setPinyinStatus] = useState(null); // null | 'correct' | 'wrong'
  const [quizResult, setQuizResult] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const wrongQuizItemsRef = useRef([]);

  // Load preferences, HSK 3.0 (1-4) vocabularies, and Dexie cards
  async function refreshSprintData() {
    sprintLoading.value = true;
    try {
      await loadSprintPreferences(db);
      const levels = sprintConfig.value.targetLevels;
      const loadedPools = await Promise.all(
        levels.map(async (lvl) => {
          const words = typeof window !== 'undefined' && typeof window.fetchLevelWords === 'function'
            ? await window.fetchLevelWords(lvl)
            : [];
          return words.map((w) => ({ ...w, level: lvl }));
        })
      );
      const flatPool = loadedPools.flat();
      setVocabPool(flatPool);

      const allCards = db ? await db.cards.where('level').anyOf(levels).toArray() : [];
      const nextMap = new Map();
      for (const c of allCards) {
        if (c.direction === DEFAULT_DIRECTION) {
          nextMap.set(c.id, c);
        }
      }
      setCardMap(nextMap);

      const nowIso = new Date().toISOString();
      let suspendedCount = 0;
      let learnedCount = 0;
      let dueCount = 0;
      let mistakeDueCount = 0;

      for (const item of flatPool) {
        const key = HanziMindDB.getCardKey(item.level, DEFAULT_DIRECTION, item.id);
        const card = nextMap.get(key);
        if (!card) continue;
        if (card.suspended) {
          suspendedCount += 1;
          continue;
        }
        if ((card.reps || 0) > 0) learnedCount += 1;
        if (card.due && card.due <= nowIso) {
          dueCount += 1;
          if (Array.isArray(card.tags) && card.tags.includes('exam_mistake')) {
            mistakeDueCount += 1;
          }
        }
      }

      sprintStats.value = {
        totalPool: flatPool.length,
        suspendedCount,
        activeRemaining: Math.max(0, flatPool.length - suspendedCount - learnedCount),
        learnedCount,
        dueCount,
        mistakeDueCount,
      };
    } catch (err) {
      console.error('Failed to initialize ExamSprintHub:', err);
    } finally {
      sprintLoading.value = false;
    }
  }

  useEffect(() => {
    refreshSprintData();
  }, []);

  // 3s Auto-Flip timer
  useEffect(() => {
    if (viewMode !== 'sprint') return undefined;
    if (isFlipped || currentIndex >= queue.length) return undefined;

    const limitMs = SPRINT_AUTO_FLIP_LIMIT_MS;
    setElapsedMs(0);

    const intervalId = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + TIMER_TICK_MS;
        if (next >= limitMs) {
          setIsFlipped(true);
          const card = queue[currentIndex];
          if (card && sprintConfig.value.autoAudio) {
            playPrebuiltAudio(card.hanzi, card.pinyin);
          }
          clearInterval(intervalId);
        }
        return Math.min(next, limitMs);
      });
    }, TIMER_TICK_MS);

    return () => clearInterval(intervalId);
  }, [viewMode, currentIndex, isFlipped, queue]);

  async function handleToggleLevel(levelId) {
    const nextLevels = toggleSprintLevel(sprintConfig.value.targetLevels, levelId);
    await updateSprintConfig({ targetLevels: nextLevels }, db);
    await refreshSprintData();
  }

  function startSprintSlot(slotId) {
    const slotItems = buildSlotQueue(
      slotId,
      vocabPool,
      cardMap,
      sprintDailyLog.value,
      sprintConfig.value
    );
    setActiveSlot(slotId);
    setQueue(slotItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setPinyinInput('');
    setPinyinStatus(null);
    setViewMode('sprint');
  }

  function startReverseSrs() {
    const items = buildReverseSrsQuiz(vocabPool, cardMap);
    wrongQuizItemsRef.current = [];
    setQueue(items);
    setCurrentIndex(0);
    setSelectedChoice(null);
    setQuizResult(null);
    setViewMode('reverse_srs');
  }

  function handleFlipSprintCard() {
    if (isFlipped) return;
    setIsFlipped(true);
    const item = queue[currentIndex];
    if (item && sprintConfig.value.autoAudio) {
      playPrebuiltAudio(item.hanzi, item.pinyin);
    }
  }

  function handleCheckPinyin(e) {
    e.preventDefault();
    const item = queue[currentIndex];
    if (!item) return;
    const isCorrect = normalizeTonelessPinyin(pinyinInput) === normalizeTonelessPinyin(item.pinyin);
    setPinyinStatus(isCorrect ? 'correct' : 'wrong');
  }

  async function handleRateSprintCard(ratingName) {
    const item = queue[currentIndex];
    if (!item) return;

    if (db && typeof window !== 'undefined' && window.SRS) {
      const baseCard = item.card || window.SRS.createNewCard(new Date());
      const reviewed = window.SRS.review(baseCard, ratingName, new Date());
      const nextTags = Array.isArray(reviewed.card.tags)
        ? reviewed.card.tags.filter((t) => t !== 'exam_mistake')
        : [];
      await db.saveCard(item.level, DEFAULT_DIRECTION, item.id, {
        ...reviewed.card,
        tags: nextTags,
        suspended: false,
      });
    }

    const log = sprintDailyLog.value;
    if (activeSlot === 'morning') {
      await updateSprintDailyLog({ morningReviewDone: (log.morningReviewDone || 0) + 1 }, db);
    } else if (activeSlot === 'noon') {
      const nextKeys = Array.from(new Set([...(log.noonNewCardKeys || []), item.cardKey]));
      await updateSprintDailyLog({ noonNewCardKeys: nextKeys }, db);
    } else if (activeSlot === 'evening') {
      const nextKeys = Array.from(new Set([...(log.eveningNewCardKeys || []), item.cardKey]));
      await updateSprintDailyLog({ eveningNewCardKeys: nextKeys }, db);
    }

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setPinyinInput('');
      setPinyinStatus(null);
    } else {
      if (activeSlot === 'night') {
        await updateSprintDailyLog({ nightSkimDone: true }, db);
      }
      await refreshSprintData();
      setViewMode('dashboard');
    }
  }

  async function handleReverseQuizChoice(choice) {
    if (selectedChoice !== null) return;
    const item = queue[currentIndex];
    setSelectedChoice(choice);
    const isCorrect = choice === item.correctMeaning;
    if (!isCorrect) {
      wrongQuizItemsRef.current.push(item);
    }

    setTimeout(async () => {
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex(currentIndex + 1);
        setSelectedChoice(null);
      } else {
        const mistakes = wrongQuizItemsRef.current;
        const groupedByLevel = mistakes.reduce((acc, m) => {
          acc[m.level] = acc[m.level] || [];
          acc[m.level].push(m.wordId);
          return acc;
        }, {});
        for (const [lvl, wordIds] of Object.entries(groupedByLevel)) {
          await recordExamMistakesToSrs({ wordIds, level: lvl, direction: DEFAULT_DIRECTION });
        }
        await updateSprintDailyLog({ reverseSrsDone: true }, db);
        await refreshSprintData();
        setQuizResult({ total: queue.length, wrongCount: mistakes.length });
      }
    }, 650);
  }

  const countdown = examCountdown.value;
  const stats = sprintStats.value;
  const daily = sprintDailyLog.value;
  const isLoading = sprintLoading.value;

  const slotCounts = useMemo(() => {
    const counts = {};
    for (const slot of SPRINT_SLOTS) {
      counts[slot.id] = buildSlotQueue(slot.id, vocabPool, cardMap, daily, sprintConfig.value).length;
    }
    return counts;
  }, [vocabPool, cardMap, daily, sprintConfig.value]);

  if (viewMode === 'sprint') {
    const item = queue[currentIndex];
    const pct = Math.min(100, Math.round((elapsedMs / SPRINT_AUTO_FLIP_LIMIT_MS) * 100));
    const hanViet = item ? extractHanViet(item.hanzi) : '';
    const wordFamily = item ? findWordFamily(item.hanzi, vocabPool) : [];

    return (
      <div class="exam-sprint-panel">
        <button
          type="button"
          class="exam-pill-btn"
          onClick={() => setViewMode('dashboard')}
        >
          <ArrowLeft size={16} />
          {SPRINT_UI_LABELS.backToHub}
        </button>

        {!item ? (
          <div class="exam-sprint-empty">
            <CheckCircle2 size={40} />
            <h3>{queue.length > 0 ? SPRINT_UI_LABELS.slotDone : SPRINT_SLOT_EMPTY_REASONS[activeSlot]}</h3>
          </div>
        ) : (
          <div class="exam-sprint-card">
            <div class="exam-sprint-meta">
              <span>
                {SPRINT_UI_LABELS.autoFlipBadge} · {currentIndex + 1}/{queue.length}
              </span>
              <span class="exam-sprint-audio-badge">
                <Volume2 size={14} />
                {SPRINT_UI_LABELS.autoAudioBadge}
              </span>
            </div>

            {!isFlipped && (
              <div class="exam-sprint-progress-track">
                <div
                  class="exam-sprint-progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {item.isMistakePriority && (
              <div class="exam-sprint-mistake-tag">Ưu tiên số 1 · Sai trong đề hôm qua</div>
            )}

            <div class="exam-sprint-hanzi">{item.hanzi}</div>

            {!isFlipped ? (
              <button
                type="button"
                class="exam-sprint-btn-keep"
                onClick={handleFlipSprintCard}
              >
                Lật thẻ ngay & Nghe phát âm
              </button>
            ) : (
              <div class="exam-sprint-back">
                <div class="exam-sprint-pinyin-row">
                  <span class="exam-sprint-pinyin">{item.pinyin}</span>
                  <button
                    type="button"
                    class="exam-pill-btn"
                    onClick={(e) => playPrebuiltAudio(item.hanzi, item.pinyin, e.currentTarget)}
                  >
                    <Volume2 size={16} />
                    Nghe lại
                  </button>
                </div>

                <div class="exam-sprint-meaning">{item.meaning}</div>

                {hanViet && (
                  <div class="exam-sprint-hanviet">
                    <Sparkles size={15} />
                    <strong>{SPRINT_UI_LABELS.hanVietPrefix}</strong> {hanViet}
                  </div>
                )}

                {wordFamily.length > 0 && (
                  <div class="exam-sprint-family">
                    <strong>{SPRINT_UI_LABELS.wordFamilyPrefix}</strong>
                    <div class="exam-sprint-family-chips">
                      {wordFamily.map((wf) => (
                        <span
                          key={wf.hanzi}
                          class="exam-sprint-family-chip"
                        >
                          {wf.hanzi} ({wf.pinyin}) — {wf.meaning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeSlot === 'night' && item.requiresPinyinCheck && (
                  <form
                    class="exam-sprint-pinyin-check"
                    onSubmit={handleCheckPinyin}
                  >
                    <label>{SPRINT_UI_LABELS.pinyinPrompt}</label>
                    <div class="exam-sprint-pinyin-input-row">
                      <input
                        type="text"
                        value={pinyinInput}
                        onInput={(e) => setPinyinInput(e.target.value)}
                        placeholder="Ví dụ: zeren"
                      />
                      <button
                        type="submit"
                        class="exam-pill-btn"
                      >
                        Kiểm tra
                      </button>
                    </div>
                    {pinyinStatus === 'correct' && (
                      <span class="exam-sprint-ok">Chính xác! Phản xạ gõ chuẩn.</span>
                    )}
                    {pinyinStatus === 'wrong' && (
                      <span class="exam-sprint-err">Chưa khớp — đáp án: {item.pinyin}</span>
                    )}
                  </form>
                )}

                <div class="exam-sprint-actions">
                  <button
                    type="button"
                    class="exam-sprint-btn-suspend"
                    onClick={() => handleRateSprintCard('again')}
                  >
                    Quên (Ôn lại sớm)
                  </button>
                  <button
                    type="button"
                    class="exam-sprint-btn-keep"
                    onClick={() => handleRateSprintCard('good')}
                  >
                    Đã nhớ (Đọc nhẩm xong)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'reverse_srs') {
    const q = queue[currentIndex];
    return (
      <div class="exam-sprint-panel">
        <button
          type="button"
          class="exam-pill-btn"
          onClick={() => setViewMode('dashboard')}
        >
          <ArrowLeft size={16} />
          {SPRINT_UI_LABELS.backToHub}
        </button>

        {quizResult ? (
          <div class="exam-sprint-card">
            <CheckCircle2 size={40} />
            <h3>Hoàn thành Reverse SRS ({quizResult.total} câu)</h3>
            <p>
              Số từ quên khi gặp trong đề: <strong>{quizResult.wrongCount}</strong> từ.
              {quizResult.wrongCount > 0 && ' Đã gắn nhãn lỗi sai (exam_mistake) để sáng mai ôn đầu tiên!'}
            </p>
            <button
              type="button"
              class="exam-sprint-btn-keep"
              onClick={() => setViewMode('dashboard')}
            >
              Về bảng điều khiển
            </button>
          </div>
        ) : !q ? (
          <div class="exam-sprint-empty">Chưa đủ dữ liệu từ vựng để tạo bài kiểm tra.</div>
        ) : (
          <div class="exam-sprint-card">
            <div class="exam-sprint-meta">
              <span>Reverse SRS · Câu {currentIndex + 1}/{queue.length}</span>
            </div>
            <div class="exam-sprint-hanzi">{q.hanzi}</div>
            <div class="exam-sprint-choices">
              {q.choices.map((choice) => {
                const isSelected = selectedChoice === choice;
                const isRight = choice === q.correctMeaning;
                const statusClass = selectedChoice === null
                  ? ''
                  : isRight
                    ? 'is-correct'
                    : isSelected
                      ? 'is-wrong'
                      : '';
                return (
                  <button
                    key={choice}
                    type="button"
                    class={`exam-sprint-choice-btn ${statusClass}`}
                    onClick={() => handleReverseQuizChoice(choice)}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div class="exam-sprint-panel">
      <div class="exam-sprint-header-row">
        <button
          type="button"
          class="exam-pill-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Quay lại Hub Luyện thi
        </button>
      </div>

      <div class="exam-sprint-hero">
        <div class="exam-sprint-hero-left">
          <h2>
            <Flame size={22} />
            {SPRINT_UI_LABELS.title}
          </h2>
          <p>{SPRINT_UI_LABELS.subtitle}</p>
        </div>

        <div class="exam-sprint-countdown-box">
          <div class="exam-sprint-countdown-value">
            <Clock size={18} />
            {countdown.status === 'unset' && SPRINT_UI_LABELS.countdownEmpty}
            {countdown.status === 'today' && SPRINT_UI_LABELS.countdownToday}
            {countdown.status === 'passed' && SPRINT_UI_LABELS.countdownPassed}
            {countdown.status === 'upcoming' && `Còn ${countdown.daysLeft} ngày (${countdown.hoursLeft} giờ)`}
          </div>
          {countdown.status === 'upcoming' && (
            <div class="exam-sprint-countdown-sub">
              Đề xuất tốc độ: <strong>{countdown.recommendedQuota} từ/ngày</strong>
            </div>
          )}
        </div>
      </div>

      <div class="exam-sprint-config-row">
        <label class="exam-sprint-field">
          <span>
            <Calendar size={15} />
            {SPRINT_UI_LABELS.setExamDateLabel}
          </span>
          <input
            type="date"
            value={sprintConfig.value.examDate}
            title={SPRINT_UI_LABELS.examDatePickerTitle}
            onClick={openDatePicker}
            onChange={(e) => updateSprintConfig({ examDate: e.target.value }, db)}
          />
        </label>

        <label class="exam-sprint-field">
          <span>
            <Target size={15} />
            {SPRINT_UI_LABELS.dailyQuotaLabel}
          </span>
          <input
            type="number"
            min={MIN_DAILY_NEW_QUOTA}
            max={MAX_DAILY_NEW_QUOTA}
            value={sprintConfig.value.dailyNewQuota}
            onChange={(e) => updateSprintConfig({ dailyNewQuota: Number(e.target.value) }, db)}
          />
        </label>
      </div>

      <div class="exam-sprint-field exam-sprint-level-filter">
        <span>{SPRINT_UI_LABELS.levelFilterLabel}</span>
        <div
          class="exam-sprint-level-chips"
          role="group"
          aria-label={SPRINT_UI_LABELS.levelFilterLabel}
        >
          {SPRINT_LEVEL_OPTIONS.map((opt) => {
            const isActive = sprintConfig.value.targetLevels.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                class={`exam-pill-btn ${isActive ? 'active' : ''}`}
                aria-pressed={isActive}
                disabled={sprintLoading.value}
                onClick={() => handleToggleLevel(opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <small>{SPRINT_UI_LABELS.levelFilterHint}</small>
      </div>

      <div class="exam-sprint-stats-grid">
        <div class="exam-sprint-stat">
          <span>{SPRINT_UI_LABELS.poolStatLabel}</span>
          <strong>{sprintLoading.value ? '...' : stats.totalPool}</strong>
        </div>
        <div class="exam-sprint-stat">
          <span>{SPRINT_UI_LABELS.suspendedStatLabel}</span>
          <strong>{stats.suspendedCount}</strong>
        </div>
        <div class="exam-sprint-stat">
          <span>Cần cày còn lại</span>
          <strong>{stats.activeRemaining}</strong>
        </div>
        <div class="exam-sprint-stat">
          <span>Đến hạn ({stats.mistakeDueCount} lỗi sai)</span>
          <strong>{stats.dueCount}</strong>
        </div>
      </div>

      <div class="exam-sprint-quick-actions">
        <button
          type="button"
          class="exam-sprint-btn-keep"
          onClick={startReverseSrs}
        >
          <XCircle size={18} />
          {SPRINT_UI_LABELS.reverseSrsBtn}
        </button>
      </div>

      <div class="exam-sprint-slots-grid">
        {SPRINT_SLOTS.map((slot) => {
          const isDone =
            (slot.id === 'morning' && daily.morningReviewDone > 0) ||
            (slot.id === 'noon' && (daily.noonNewCardKeys?.length || 0) > 0) ||
            (slot.id === 'evening' && (daily.eveningNewCardKeys?.length || 0) > 0) ||
            (slot.id === 'night' && daily.nightSkimDone);

          return (
            <div
              key={slot.id}
              class={`exam-sprint-slot-card ${isDone ? 'is-done' : ''}`}
            >
              <div class="exam-sprint-slot-header">
                <span class="exam-sprint-slot-time">{slot.timeLabel} · {slot.durationMinutes} phút</span>
                {isDone && <CheckCircle2 size={16} />}
              </div>
              <h4>{slot.title}</h4>
              <p>{slot.description}</p>
              {!isLoading && slotCounts[slot.id] === 0 ? (
                <p class="exam-sprint-slot-empty">{SPRINT_SLOT_EMPTY_REASONS[slot.id]}</p>
              ) : (
                <button
                  type="button"
                  class="exam-pill-btn"
                  disabled={isLoading}
                  onClick={() => startSprintSlot(slot.id)}
                >
                  {isLoading
                    ? SPRINT_UI_LABELS.slotLoading
                    : `${SPRINT_UI_LABELS.slotStart} (${slotCounts[slot.id]} ${SPRINT_UI_LABELS.slotCardsSuffix})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
