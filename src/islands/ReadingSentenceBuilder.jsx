// src/islands/ReadingSentenceBuilder.jsx
// Phase 2 Exam Module: Sentence Ordering (click-to-connect) & Split-View Reading Comprehension.

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ArrowLeft, Clock, RotateCcw, CheckCircle2, XCircle } from 'lucide-preact';
import { DEFAULT_SECTION_DURATIONS_SECONDS } from './ExamConstants.js';
import { gradeQuestion } from './ExamSchemaAdapter.js';
import { recordExamMistakesToSrs } from './ExamSrsBridge.js';

const SAMPLE_READING_QUESTIONS = [
  {
    id: 'G2_R1',
    type: 'sentence_ordering',
    chunks: ['对身体健康', '每天坚持运动', '有很大的好处'],
    correctAnswer: [1, 0, 2],
    prompt: 'Sắp xếp các cụm từ sau thành câu hoàn chỉnh:',
    explanation: 'Chủ ngữ "每天坚持运动" + Giới từ "对身体健康" + Vị ngữ "有很大的好处".',
    targetWords: ['坚持', '健康'],
  },
  {
    id: 'G2_R2',
    type: 'reading_passage',
    passage:
      '随着科技的发展，越来越多的人习惯在网上购物。网购不仅节省了去商场的时间，而且商品种类丰富、价格透明。不过，专家也提醒消费者，在网上买东西时要注意查看商家信誉和商品评价，以免买到质量不好的产品。',
    prompt: '根据这段话，专家提醒消费者网购时要注意什么？',
    options: [
      'A. 尽量少在网上买东西',
      'B. 查看商家信誉和评价',
      'C. 只买价格最贵的商品',
      'D. 去商场比较商品价格',
    ],
    correctAnswer: 1,
    explanation: 'Đoạn văn nêu rõ: "要注意查看商家信誉和商品评价".',
    targetWords: ['随着', '节省', '信誉'],
  },
];

export function ReadingSentenceBuilder({ onBack, questions = SAMPLE_READING_QUESTIONS }) {
  const [qIdx, setQIdx] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [checkedResult, setCheckedResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECTION_DURATIONS_SECONDS.reading);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const current = questions[qIdx % questions.length];
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const resetCurrent = () => {
    setSelectedOrder([]);
    setSelectedOption(null);
    setCheckedResult(null);
  };

  const handleChunkClick = (chunkIdx) => {
    if (checkedResult !== null) return;
    if (selectedOrder.includes(chunkIdx)) {
      setSelectedOrder(selectedOrder.filter((i) => i !== chunkIdx));
    } else {
      setSelectedOrder([...selectedOrder, chunkIdx]);
    }
  };

  const handleCheck = async () => {
    const userAns = current.type === 'sentence_ordering' ? selectedOrder : selectedOption;
    const isOk = gradeQuestion(current, userAns);
    setCheckedResult(Boolean(isOk));

    if (!isOk && Array.isArray(current.targetWords) && current.targetWords.length > 0) {
      await recordExamMistakesToSrs({ wordIds: current.targetWords });
    }
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

        <div class="exam-module-title">
          GĐ 2: Đọc hiểu & Sắp xếp câu ({qIdx + 1}/{questions.length})
        </div>

        <div class="exam-timer-badge">
          <Clock size={15} />
          <span>{mins}:{secs}</span>
        </div>
      </div>

      {current.type === 'reading_passage' ? (
        <div class="exam-split-view">
          <div class="exam-split-left">
            <h4>Đoạn văn (阅读短文)</h4>
            <p class="exam-passage-text">{current.passage}</p>
          </div>
          <div class="exam-split-right">
            <p class="exam-question-stem">{current.prompt}</p>
            <div class="exam-options-list">
              {current.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  class={`exam-option-btn ${selectedOption === idx ? 'selected' : ''}`}
                  onClick={() => { if (checkedResult === null) setSelectedOption(idx); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div class="exam-drill-card">
          <p class="exam-question-stem">{current.prompt}</p>
          <div class="exam-sentence-preview">
            {selectedOrder.length > 0
              ? selectedOrder.map((i) => current.chunks[i]).join(' ')
              : 'Nhấn vào các cụm từ bên dưới theo đúng trật tự...'}
          </div>

          <div class="exam-chunks-pool">
            {current.chunks.map((chunk, idx) => {
              const orderPos = selectedOrder.indexOf(idx);
              return (
                <button
                  key={chunk}
                  type="button"
                  class={`exam-chunk-btn ${orderPos >= 0 ? 'used' : ''}`}
                  onClick={() => handleChunkClick(idx)}
                >
                  {orderPos >= 0 ? <span class="exam-chunk-num">{orderPos + 1}</span> : null}
                  <span>{chunk}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div class="exam-builder-actions">
        <button
          type="button"
          class="exam-secondary-btn"
          onClick={resetCurrent}
        >
          <RotateCcw size={15} />
          <span>Làm lại</span>
        </button>

        {checkedResult === null ? (
          <button
            type="button"
            class="exam-primary-btn"
            onClick={handleCheck}
          >
            Kiểm tra đáp án
          </button>
        ) : (
          <button
            type="button"
            class="exam-primary-btn"
            onClick={() => { setQIdx((prev) => (prev + 1) % questions.length); resetCurrent(); }}
          >
            Câu tiếp theo
          </button>
        )}
      </div>

      {checkedResult !== null ? (
        <div class={`exam-feedback-banner ${checkedResult ? 'ok' : 'err'}`}>
          {checkedResult ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{current.explanation}</span>
        </div>
      ) : null}
    </div>
  );
}
