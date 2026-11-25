// src/islands/CbtSimulatorShell.jsx
// Phase 3 Exam Module: 100vh Single-Screen CBT Mock Simulator (105 min strict mode).
// Supports fixed top-bar, keyboard-first navigation, auto-section-advance, and AI writing export.

import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Lock, Flag, Send, Download, ArrowLeft, Volume2 } from 'lucide-preact';
import {
  CBT_SHORTCUTS,
  EXAM_UI_LABELS,
} from './ExamConstants.js';
import {
  examData,
  sessionStatus,
  strictMode,
  activeSection,
  sectionTimeLeft,
  currentQuestionIdx,
  answers,
  flagged,
  activeSectionObj,
  activeQuestions,
  activeQuestion,
  startExamSession,
  setQuestionAnswer,
  toggleQuestionFlag,
  goToNextQuestion,
  goToPrevQuestion,
  tickSectionTimer,
  submitExamSession,
} from './ExamState.js';
import {
  normalizeExamPayload,
  gradeQuestion,
  buildWritingExport,
} from './ExamSchemaAdapter.js';
import { recordExamMistakesToSrs } from './ExamSrsBridge.js';

function formatClock(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function CbtSimulatorShell({ rawExam, onBack }) {
  const [summary, setSummary] = useState(null);
  const [exportText, setExportText] = useState('');

  // Initialize session on mount or when rawExam changes
  useEffect(() => {
    if (!rawExam) return;
    const normalized = normalizeExamPayload(rawExam);
    startExamSession(normalized, true);
    setSummary(null);
    setExportText('');
  }, [rawExam]);

  // 1-second timer loop with automatic section advancement
  useEffect(() => {
    if (sessionStatus.value !== 'active') return undefined;
    const id = setInterval(() => {
      tickSectionTimer();
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStatus.value]);

  // Compute summary & tag exam mistakes into SRS when submitted
  useEffect(() => {
    if (sessionStatus.value !== 'submitted' || !examData.value || summary) return;
    const data = examData.value;
    const ansMap = answers.value;
    let listeningOk = 0;
    let listeningTotal = 0;
    let readingOk = 0;
    let readingTotal = 0;
    const missedWords = [];

    for (const q of data.sections.listening.questions) {
      listeningTotal += 1;
      if (gradeQuestion(q, ansMap[q.id])) listeningOk += 1;
      else missedWords.push(...q.targetWords);
    }

    for (const q of data.sections.reading.questions) {
      readingTotal += 1;
      if (gradeQuestion(q, ansMap[q.id])) readingOk += 1;
      else missedWords.push(...q.targetWords);
    }

    setSummary({ listeningOk, listeningTotal, readingOk, readingTotal });
    if (missedWords.length > 0) {
      recordExamMistakesToSrs({ wordIds: missedWords });
    }
  }, [sessionStatus.value]);

  // Keyboard-first CBT shortcuts (1-4 / A-D, Enter / ArrowRight, ArrowLeft, F)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (sessionStatus.value !== 'active') return;
      const tag = e.target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      const q = activeQuestion.value;
      if (!q) return;

      if (CBT_SHORTCUTS.FLAG.includes(e.key)) {
        e.preventDefault();
        toggleQuestionFlag(q.id);
        return;
      }

      if (CBT_SHORTCUTS.NEXT.includes(e.key)) {
        e.preventDefault();
        goToNextQuestion();
        return;
      }

      if (CBT_SHORTCUTS.PREV.includes(e.key)) {
        e.preventDefault();
        goToPrevQuestion();
        return;
      }

      const numIdx = CBT_SHORTCUTS.CHOICE_NUMS.indexOf(e.key);
      const letterIdx = CBT_SHORTCUTS.CHOICE_LETTERS.indexOf(e.key.toLowerCase());
      const choiceIdx = numIdx >= 0 ? numIdx : letterIdx;

      if (choiceIdx >= 0 && Array.isArray(q.options) && choiceIdx < q.options.length) {
        e.preventDefault();
        setQuestionAnswer(q.id, choiceIdx);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (sessionStatus.value === 'submitted' && summary) {
    const exported = buildWritingExport(examData.value, answers.value);
    return (
      <div class="cbt-shell-100vh">
        <div class="cbt-topbar">
          <button
            type="button"
            class="exam-back-btn"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            <span>Thoát phòng thi</span>
          </button>
          <span class="cbt-section-title">Kết quả mô phỏng CBT — {examData.value?.examId}</span>
        </div>

        <div class="cbt-result-body">
          <div class="cbt-result-cards">
            <div class="cbt-result-card">
              <strong>Nghe hiểu</strong>
              <span>{summary.listeningOk} / {summary.listeningTotal}</span>
            </div>
            <div class="cbt-result-card">
              <strong>Đọc hiểu</strong>
              <span>{summary.readingOk} / {summary.readingTotal}</span>
            </div>
          </div>

          <div class="cbt-export-actions">
            <button
              type="button"
              class="exam-primary-btn"
              onClick={() => setExportText(JSON.stringify(exported.jsonPayload, null, 2))}
            >
              <Download size={15} />
              <span>{EXAM_UI_LABELS.cbt.exportWritingJson}</span>
            </button>
            <button
              type="button"
              class="exam-secondary-btn"
              onClick={() => setExportText(exported.markdown)}
            >
              <Download size={15} />
              <span>{EXAM_UI_LABELS.cbt.exportWritingMd}</span>
            </button>
          </div>

          {exportText ? (
            <textarea
              class="cbt-export-preview"
              readOnly
              value={exportText}
            />
          ) : null}
        </div>
      </div>
    );
  }

  const q = activeQuestion.value;
  const list = activeQuestions.value;
  const qAns = q ? answers.value[q.id] : null;
  const isFlagged = q ? Boolean(flagged.value[q.id]) : false;

  const handleChunkToggle = (chunkIdx) => {
    if (!q) return;
    const prev = Array.isArray(qAns) ? qAns : [];
    const next = prev.includes(chunkIdx)
      ? prev.filter((i) => i !== chunkIdx)
      : [...prev, chunkIdx];
    setQuestionAnswer(q.id, next);
  };

  return (
    <div class="cbt-shell-100vh">
      <header class="cbt-topbar">
        <div class="cbt-topbar-left">
          <button
            type="button"
            class="exam-back-btn"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
          </button>
          <span class="cbt-section-title">
            {activeSectionObj.value?.label || activeSection.value}
          </span>
          {strictMode.value ? (
            <span class="cbt-strict-badge">
              <Lock size={13} />
              <span>{EXAM_UI_LABELS.cbt.strictLockBadge}</span>
            </span>
          ) : null}
        </div>

        <div class="cbt-palette-strip">
          {list.map((item, idx) => {
            const isCurr = idx === currentQuestionIdx.value;
            const isDone = answers.value[item.id] !== undefined && answers.value[item.id] !== '';
            const isItemFlag = Boolean(flagged.value[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                class={`cbt-palette-dot ${isCurr ? 'active' : ''} ${isDone ? 'answered' : ''} ${isItemFlag ? 'flagged' : ''}`}
                onClick={() => { currentQuestionIdx.value = idx; }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div class="cbt-topbar-right">
          <span class="cbt-red-clock">{formatClock(sectionTimeLeft.value)}</span>
          <button
            type="button"
            class="cbt-submit-btn"
            onClick={submitExamSession}
          >
            <Send size={14} />
            <span>{EXAM_UI_LABELS.cbt.submitBtn}</span>
          </button>
        </div>
      </header>

      <main class="cbt-workspace">
        {q ? (
          q.passage ? (
            <div class="exam-split-view cbt-split-full">
              <div class="exam-split-left">
                <p class="exam-passage-text">{q.passage}</p>
              </div>
              <div class="exam-split-right">
                <QuestionBody
                  question={q}
                  answer={qAns}
                  onAnswer={(val) => setQuestionAnswer(q.id, val)}
                  onChunkToggle={handleChunkToggle}
                />
              </div>
            </div>
          ) : (
            <div class="cbt-single-pane">
              <QuestionBody
                question={q}
                answer={qAns}
                onAnswer={(val) => setQuestionAnswer(q.id, val)}
                onChunkToggle={handleChunkToggle}
              />
            </div>
          )
        ) : null}
      </main>

      <footer class="cbt-bottom-bar">
        <button
          type="button"
          class={`cbt-flag-btn ${isFlagged ? 'flagged' : ''}`}
          onClick={() => q && toggleQuestionFlag(q.id)}
        >
          <Flag size={14} />
          <span>{isFlagged ? EXAM_UI_LABELS.cbt.flaggedBtn : EXAM_UI_LABELS.cbt.flagBtn}</span>
        </button>

        <div class="cbt-nav-group">
          <button
            type="button"
            class="exam-secondary-btn"
            onClick={goToPrevQuestion}
          >
            {EXAM_UI_LABELS.cbt.prevBtn}
          </button>
          <button
            type="button"
            class="exam-primary-btn"
            onClick={goToNextQuestion}
          >
            {EXAM_UI_LABELS.cbt.nextBtn}
          </button>
        </div>
      </footer>
    </div>
  );
}

function QuestionBody({ question, answer, onAnswer, onChunkToggle }) {
  const playClip = () => {
    if (!question.audioUrl) return;
    const audio = new Audio(question.audioUrl);
    audio.play().catch(() => {});
  };

  return (
    <div class="cbt-question-body">
      <div class="cbt-q-meta">Câu {question.number} · Part {question.part}</div>

      {question.audioUrl ? (
        <button
          type="button"
          class="exam-secondary-btn"
          onClick={playClip}
        >
          <Volume2 size={16} />
          <span>Nghe Audio</span>
        </button>
      ) : null}

      <p class="exam-question-stem">{question.prompt}</p>

      {question.type === 'sentence_ordering' ? (
        <div>
          <div class="exam-sentence-preview">
            {Array.isArray(answer) && answer.length > 0
              ? answer.map((i) => question.chunks[i]).join(' ')
              : 'Chọn các cụm từ theo thứ tự đúng...'}
          </div>
          <div class="exam-chunks-pool">
            {question.chunks.map((chunk, idx) => {
              const pos = Array.isArray(answer) ? answer.indexOf(idx) : -1;
              return (
                <button
                  key={chunk}
                  type="button"
                  class={`exam-chunk-btn ${pos >= 0 ? 'used' : ''}`}
                  onClick={() => onChunkToggle(idx)}
                >
                  {pos >= 0 ? <span class="exam-chunk-num">{pos + 1}</span> : null}
                  <span>{chunk}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : question.type === 'hanzi_essay' ? (
        <div class="cbt-essay-box">
          {question.keywords.length > 0 ? (
            <div class="cbt-keywords-row">
              {question.keywords.map((kw) => (
                <span
                  key={kw}
                  class="cbt-keyword-chip"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            class="cbt-essay-textarea"
            placeholder={`Viết tối thiểu ${question.minChars} chữ Hán...`}
            value={typeof answer === 'string' ? answer : ''}
            onInput={(e) => onAnswer(e.target.value)}
          />
          <div class="cbt-char-counter">
            Số chữ: {Array.from(String(answer || '').trim()).length} / {question.minChars}
          </div>
        </div>
      ) : (
        <div class="exam-options-list">
          {question.options.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              class={`exam-option-btn ${answer === idx ? 'selected' : ''}`}
              onClick={() => onAnswer(idx)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
