// src/islands/SpeedPinyinDrill.jsx
// Phase 1 Exam Module: 1.5s Speed Recognition & Pinyin Drill + Homophone Trap.

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Zap, ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-preact';
import { FLASH_DURATION_MS, SPEED_DRILL_DEFAULT_COUNT } from './ExamConstants.js';
import { recordExamMistakesToSrs } from './ExamSrsBridge.js';

const DEFAULT_HOMOPHONE_TRAPS = [
  {
    tonelessPinyin: 'shi',
    sentenceWithBlank: '明天我有一个重要的考____。',
    targetHanzi: '试',
    choices: ['是', '事', '试', '市'],
    meaningVi: 'Ngày mai tôi có một kỳ thi quan trọng.',
  },
  {
    tonelessPinyin: 'shi',
    sentenceWithBlank: '你今天有什么____情要办吗？',
    targetHanzi: '事',
    choices: ['是', '事', '试', '市'],
    meaningVi: 'Hôm nay bạn có việc gì cần làm không?',
  },
  {
    tonelessPinyin: 'zai',
    sentenceWithBlank: '他现____正在图书馆学习。',
    targetHanzi: '在',
    choices: ['在', '再', '载', '灾'],
    meaningVi: 'Hiện tại anh ấy đang học ở thư viện.',
  },
  {
    tonelessPinyin: 'ji',
    sentenceWithBlank: '请把重要信息____在笔记本上。',
    targetHanzi: '记',
    choices: ['记', '寄', '既', '季'],
    meaningVi: 'Hãy ghi thông tin quan trọng vào sổ tay.',
  },
];

const FALLBACK_FLASH_ITEMS = [
  { wordId: '不仅', hanzi: '不仅', pinyin: 'bùjǐn', tonelessPinyin: 'bujin', hanViet: 'Bất cận', meaningVi: 'Không những' },
  { wordId: '坚持', hanzi: '坚持', pinyin: 'jiānchí', tonelessPinyin: 'jianchi', hanViet: 'Kiên trì', meaningVi: 'Kiên trì' },
  { wordId: '保护', hanzi: '保护', pinyin: 'bǎohù', tonelessPinyin: 'baohu', hanViet: 'Bảo hộ', meaningVi: 'Bảo vệ' },
  { wordId: '环境', hanzi: '环境', pinyin: 'huánjìng', tonelessPinyin: 'huanjing', hanViet: 'Hoàn cảnh', meaningVi: 'Môi trường' },
  { wordId: '责任', hanzi: '责任', pinyin: 'zérèn', tonelessPinyin: 'zeren', hanViet: 'Trách nhiệm', meaningVi: 'Trách nhiệm' },
  { wordId: '经验', hanzi: '经验', pinyin: 'jīngyàn', tonelessPinyin: 'jingyan', hanViet: 'Kinh nghiệm', meaningVi: 'Kinh nghiệm' },
];

function stripToneMarks(pinyin) {
  return String(pinyin || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function SpeedPinyinDrill({ onBack }) {
  const [drillMode, setDrillMode] = useState('flash_pinyin'); // 'flash_pinyin' | 'homophone_trap'
  const [items, setItems] = useState(FALLBACK_FLASH_ITEMS);
  const [idx, setIdx] = useState(0);
  const [hanziVisible, setHanziVisible] = useState(true);
  const [pinyinInput, setPinyinInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { ok: boolean, message: string }
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const inputRef = useRef(null);
  const flashTimerRef = useRef(null);

  // Load vocabulary items from global sidebar search index when available
  useEffect(() => {
    const index = typeof window !== 'undefined' ? window.sidebarSearchIndex : null;
    if (Array.isArray(index) && index.length > 0) {
      const mapped = index
        .filter((w) => w.hanzi && w.pinyin)
        .slice(0, SPEED_DRILL_DEFAULT_COUNT)
        .map((w) => ({
          wordId: w.hanzi,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          tonelessPinyin: stripToneMarks(w.pinyin),
          hanViet: w.hanViet || '',
          meaningVi: w.meaning || '',
        }));
      if (mapped.length > 0) setItems(mapped);
    }
  }, []);

  // Trigger 1.5s flash countdown whenever index or mode changes in flash_pinyin mode
  useEffect(() => {
    if (drillMode !== 'flash_pinyin') return undefined;
    setHanziVisible(true);
    setPinyinInput('');
    setFeedback(null);

    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setHanziVisible(false);
      if (inputRef.current) inputRef.current.focus();
    }, FLASH_DURATION_MS);

    return () => clearTimeout(flashTimerRef.current);
  }, [idx, drillMode, items]);

  const currentFlash = items[idx % items.length] || FALLBACK_FLASH_ITEMS[0];
  const currentTrap = DEFAULT_HOMOPHONE_TRAPS[idx % DEFAULT_HOMOPHONE_TRAPS.length];

  const handleFlashSubmit = async (e) => {
    e.preventDefault();
    if (feedback) {
      setIdx((prev) => prev + 1);
      return;
    }
    const normalizedInput = stripToneMarks(pinyinInput);
    const isCorrect = normalizedInput === currentFlash.tonelessPinyin;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (!isCorrect) {
      await recordExamMistakesToSrs({ wordIds: [currentFlash.wordId] });
    }

    setFeedback({
      ok: isCorrect,
      message: isCorrect
        ? `Chính xác: ${currentFlash.hanzi} (${currentFlash.pinyin}) — ${currentFlash.meaningVi}`
        : `Sai rồi! Đáp án: ${currentFlash.hanzi} (${currentFlash.tonelessPinyin} / ${currentFlash.pinyin}) — ${currentFlash.meaningVi}`,
    });
  };

  const handleTrapChoice = async (choice) => {
    if (feedback) return;
    const isCorrect = choice === currentTrap.targetHanzi;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (!isCorrect) {
      await recordExamMistakesToSrs({ wordIds: [currentTrap.targetHanzi] });
    }

    setFeedback({
      ok: isCorrect,
      message: isCorrect
        ? `Chuẩn xác! ${currentTrap.meaningVi}`
        : `Nhầm bẫy đồng âm! Đáp án đúng là "${currentTrap.targetHanzi}". (${currentTrap.meaningVi})`,
    });
  };

  return (
    <div class="exam-module-shell">
      <div class="exam-module-header">
        <button
          type="button"
          class="exam-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </button>

        <div class="exam-mode-pills">
          <button
            type="button"
            class={`exam-pill-btn ${drillMode === 'flash_pinyin' ? 'active' : ''}`}
            onClick={() => { setDrillMode('flash_pinyin'); setIdx(0); setFeedback(null); }}
          >
            <Zap size={15} />
            <span>Flash 1.5s & Gõ Pinyin</span>
          </button>
          <button
            type="button"
            class={`exam-pill-btn ${drillMode === 'homophone_trap' ? 'active' : ''}`}
            onClick={() => { setDrillMode('homophone_trap'); setIdx(0); setFeedback(null); }}
          >
            <span>Bẫy Đồng Âm (Homophone)</span>
          </button>
        </div>

        <div class="exam-score-badge">
          Đúng: {score.correct}/{score.total}
        </div>
      </div>

      {drillMode === 'flash_pinyin' ? (
        <div class="exam-drill-card">
          <div class="exam-flash-stage">
            {hanziVisible ? (
              <div class="exam-flash-hanzi">{currentFlash.hanzi}</div>
            ) : (
              <div class="exam-flash-hidden">
                <span>Đã ẩn chữ Hán — Gõ Pinyin không dấu</span>
                {currentFlash.hanViet ? <small>Hán-Việt: {currentFlash.hanViet}</small> : null}
              </div>
            )}
          </div>

          <form
            class="exam-pinyin-form"
            onSubmit={handleFlashSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              class="exam-pinyin-input"
              placeholder="Gõ Pinyin không dấu (vd: baohu)..."
              value={pinyinInput}
              onInput={(e) => setPinyinInput(e.target.value)}
            />
            <button
              type="submit"
              class="exam-primary-btn"
            >
              {feedback ? 'Câu tiếp (Enter)' : 'Kiểm tra'}
            </button>
          </form>

          {feedback ? (
            <div class={`exam-feedback-banner ${feedback.ok ? 'ok' : 'err'}`}>
              {feedback.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div class="exam-drill-card">
          <div class="exam-trap-pinyin">
            Pinyin mục tiêu: <strong>{currentTrap.tonelessPinyin}</strong>
          </div>
          <div class="exam-trap-sentence">{currentTrap.sentenceWithBlank}</div>

          <div class="exam-trap-grid">
            {currentTrap.choices.map((ch) => (
              <button
                key={ch}
                type="button"
                class={`exam-trap-choice ${
                  feedback && ch === currentTrap.targetHanzi ? 'correct' : ''
                }`}
                onClick={() => handleTrapChoice(ch)}
              >
                {ch}
              </button>
            ))}
          </div>

          {feedback ? (
            <div class="exam-trap-footer">
              <div class={`exam-feedback-banner ${feedback.ok ? 'ok' : 'err'}`}>
                {feedback.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                class="exam-primary-btn"
                onClick={() => { setIdx((prev) => prev + 1); setFeedback(null); }}
              >
                <RotateCcw size={15} />
                <span>Câu tiếp</span>
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
