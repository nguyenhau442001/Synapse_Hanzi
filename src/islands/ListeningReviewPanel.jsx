// src/islands/ListeningReviewPanel.jsx
// Shared post-answer / post-exam listening review panel:
// displays evidence highlight, sentence-by-sentence audio replay, Pinyin/Translation toggles,
// key expressions, and prioritized vocabulary matches.

import { h } from 'preact';
import { Play, Pause, MessageSquare, Check, CircleCheck, CircleX } from 'lucide-preact';

export const LISTENING_REVIEW_LABELS = {
  TRANSCRIPT_TITLE: 'Lời thoại',
  PINYIN_TOGGLE: 'Pinyin',
  PINYIN_TITLE: 'Bật / tắt Pinyin',
  TRANSLATION_TOGGLE: 'Bản dịch',
  TRANSLATION_TITLE: 'Bật / tắt Bản dịch',
  PLAY_SENTENCE: 'Nghe câu này',
  PAUSE_SENTENCE: 'Tạm dừng câu này',
  NO_TIMESTAMP: 'Chưa có mốc thời gian',
  KEY_EXPRESSIONS_TITLE: 'Cụm cần hiểu & Điểm ngữ pháp',
  VOCAB_TITLE: 'Từ vựng trong bài',
};

const ULTRA_BASIC_WORDS = new Set(['没有', '我们', '我', '你', '他', '她', '这', '那', '的', '了']);
const HSK_LEVEL_ORDER = { HSK4: 4, HSK3: 3, HSK2: 2, HSK1: 1 };
const MIN_NON_BASIC_VOCAB = 4;

/**
 * Prioritize higher-HSK and longer vocabulary items for display.
 * @param {Array} vocabs
 * @returns {Array}
 */
export function getPrioritizedVocabularies(vocabs) {
  if (!Array.isArray(vocabs)) return [];
  const nonBasic = vocabs.filter((v) => !ULTRA_BASIC_WORDS.has(v.word));
  const filtered = nonBasic.length >= MIN_NON_BASIC_VOCAB ? nonBasic : vocabs;
  return [...filtered].sort((a, b) => {
    const aBasic = ULTRA_BASIC_WORDS.has(a.word) ? 1 : 0;
    const bBasic = ULTRA_BASIC_WORDS.has(b.word) ? 1 : 0;
    if (aBasic !== bBasic) return aBasic - bBasic;
    const aLvl = HSK_LEVEL_ORDER[a.level] || 0;
    const bLvl = HSK_LEVEL_ORDER[b.level] || 0;
    if (aLvl !== bLvl) return bLvl - aLvl;
    return (b.word || '').length - (a.word || '').length;
  });
}

/**
 * Highlight the evidence phrase inside a Chinese sentence.
 */
export function EvidenceHighlight({ sentZh, evidenceZh }) {
  if (!sentZh) return null;
  const cleanEv = evidenceZh ? String(evidenceZh).replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim() : '';
  if (!cleanEv || !sentZh.includes(cleanEv)) return sentZh;
  return sentZh.split(cleanEv).flatMap((part, i) => (
    i === 0
      ? [part]
      : [<mark key={i} class="listening-evidence-highlight listening-evidence-inline-mark">{cleanEv}</mark>, part]
  ));
}

function ReviewTogglePill({ active, onClick, title, label }) {
  return (
    <button
      type="button"
      class={`listening-toggle-pill ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={String(active)}
      title={title}
    >
      <span class="listening-toggle-indicator">
        {active ? <Check size={10} strokeWidth={3} /> : <span class="indicator-off" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Compute natural acoustic end_ms for a sentence inside a passage.
 */
export function resolveSentenceEndMs(sentences, index, passageSegment = null) {
  const sentence = sentences[index];
  if (!sentence || sentence.end_ms == null) return null;
  let endMs = sentence.end_ms;
  if (passageSegment && passageSegment.end_ms != null && index === sentences.length - 1) {
    endMs = Math.max(endMs, passageSegment.end_ms);
  } else if (index < sentences.length - 1) {
    const nextSent = sentences[index + 1];
    if (nextSent && nextSent.start_ms != null && nextSent.start_ms > endMs) {
      endMs += Math.min(100, Math.max(0, nextSent.start_ms - endMs - 40));
    }
  }
  return endMs;
}

/**
 * Shared ListeningReviewPanel component.
 */
export function ListeningReviewPanel({
  transcript,
  evidence = null,
  explanation = '',
  keyExpressions = [],
  vocabularyMatches = [],
  showPinyin = true,
  showTranslation = true,
  onTogglePinyin,
  onToggleTranslation,
  activeSegmentId = null,
  onPlaySentence = null,
  passageSegment = null,
  feedbackHeader = null,
}) {
  const sentences = (transcript && Array.isArray(transcript.sentences)) ? transcript.sentences : [];
  const sortedVocabs = getPrioritizedVocabularies(vocabularyMatches);
  const evidenceZh = evidence ? evidence.zh : '';

  return (
    <div class="listening-review-wrapper">
      {feedbackHeader && (
        <div class={`listening-feedback-card ${feedbackHeader.isCorrect ? 'is-correct' : 'is-incorrect'}`}>
          <div class="listening-feedback-status">
            <span class={`listening-feedback-badge ${feedbackHeader.isCorrect ? 'badge-correct' : 'badge-incorrect'}`}>
              {feedbackHeader.isCorrect ? <CircleCheck size={16} /> : <CircleX size={16} />}
              <span>{feedbackHeader.statusText}</span>
            </span>
          </div>
          {explanation && (
            <div class="listening-feedback-body">
              <div class="listening-feedback-explanation">{explanation}</div>
            </div>
          )}
        </div>
      )}

      {!feedbackHeader && explanation && (
        <div class="listening-feedback-explanation" style="margin-bottom:0.75rem;">
          {explanation}
        </div>
      )}

      {sentences.length > 0 && (
        <div class="listening-transcript-container">
          <div class="listening-transcript-header">
            <div class="listening-transcript-title">
              <MessageSquare size={17} />
              <span>{LISTENING_REVIEW_LABELS.TRANSCRIPT_TITLE}</span>
            </div>
            <div class="listening-transcript-toggles">
              {onTogglePinyin && (
                <ReviewTogglePill
                  active={showPinyin}
                  onClick={onTogglePinyin}
                  title={LISTENING_REVIEW_LABELS.PINYIN_TITLE}
                  label={LISTENING_REVIEW_LABELS.PINYIN_TOGGLE}
                />
              )}
              {onToggleTranslation && (
                <ReviewTogglePill
                  active={showTranslation}
                  onClick={onToggleTranslation}
                  title={LISTENING_REVIEW_LABELS.TRANSLATION_TITLE}
                  label={LISTENING_REVIEW_LABELS.TRANSLATION_TOGGLE}
                />
              )}
            </div>
          </div>

          <div class="listening-transcript-rows">
            {sentences.map((s, idx) => {
              const isPlayingThis = Boolean(activeSegmentId && activeSegmentId === s.id);
              const hasValidTime = s.start_ms != null && s.end_ms != null;
              const label = isPlayingThis
                ? LISTENING_REVIEW_LABELS.PAUSE_SENTENCE
                : LISTENING_REVIEW_LABELS.PLAY_SENTENCE;
              const resolvedEnd = hasValidTime
                ? resolveSentenceEndMs(sentences, idx, passageSegment)
                : null;

              return (
                <div key={s.id || idx} class={`listening-transcript-row ${isPlayingThis ? 'is-playing-row' : ''}`}>
                  {onPlaySentence && (
                    <button
                      type="button"
                      class={`listening-row-play-btn ${isPlayingThis ? 'is-playing' : ''}`}
                      disabled={!hasValidTime}
                      title={hasValidTime ? `${label} (${((resolvedEnd - s.start_ms) / 1000).toFixed(1)}s)` : LISTENING_REVIEW_LABELS.NO_TIMESTAMP}
                      aria-label={label}
                      onClick={() => onPlaySentence(s, s.start_ms, resolvedEnd)}
                    >
                      {isPlayingThis ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                  )}
                  <div class="listening-row-content">
                    <div class="listening-row-zh" lang="zh-CN">
                      <EvidenceHighlight sentZh={s.zh} evidenceZh={evidenceZh} />
                    </div>
                    {showPinyin && s.pinyin && (
                      <div class="listening-row-pinyin">{s.pinyin}</div>
                    )}
                    {showTranslation && s.vi && (
                      <div class="listening-row-vi">{s.vi}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {Array.isArray(keyExpressions) && keyExpressions.length > 0 && (
            <div class="listening-key-section">
              <div class="listening-section-title">{LISTENING_REVIEW_LABELS.KEY_EXPRESSIONS_TITLE}</div>
              <div class="listening-key-grid">
                {keyExpressions.map((item, i) => (
                  <div key={i} class="listening-key-card">
                    <div class="listening-key-top">
                      <span class="listening-key-phrase" lang="zh-CN">{item.phrase}</span>
                      {item.pinyin && <span class="listening-key-pinyin">{item.pinyin}</span>}
                    </div>
                    <div class="listening-key-meaning">{item.meaning_vi}</div>
                    {item.note && <div class="listening-key-note">{item.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedVocabs.length > 0 && (
            <div class="listening-vocab-section">
              <div class="listening-section-title">{LISTENING_REVIEW_LABELS.VOCAB_TITLE}</div>
              <div class="listening-vocab-grid">
                {sortedVocabs.map((v, i) => (
                  <div key={i} class="listening-vocab-card">
                    <div class="listening-vocab-top">
                      <span class="listening-vocab-word" lang="zh-CN">{v.word}</span>
                      {v.level && <span class="listening-vocab-badge">{v.level}</span>}
                    </div>
                    <div class="listening-vocab-meta">
                      <span class="listening-vocab-pinyin">{v.pinyin}</span>
                      <span class="listening-vocab-vi">{v.meaning_vi}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
