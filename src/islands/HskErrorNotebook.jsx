// src/islands/HskErrorNotebook.jsx
// HSK Error Notebook & Diagnostic Focus Drill (错题本)
// Collects and manages failed questions across CBT Mock Exams for targeted re-drilling.

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

export const HSK30_ERROR_NOTEBOOK_KEY = 'hsk30_error_notebook_v1';

const UI_LABELS = {
  title: 'Sổ tay câu sai (错题本)',
  badge: 'CBT Diagnostic & Re-drill',
  subtitle: 'Tự động lưu trữ các câu trả lời sai từ các đợt thi thử CBT để bạn ôn luyện lại có trọng tâm cho đến khi nắm vững 100%.',
  backToHub: '← Quay lại Trung tâm Luyện thi',
  filterAll: 'Tất cả cấp độ',
  filterResolved: 'Đã nắm vững',
  filterUnresolved: 'Cần ôn lại',
  retryBtn: '🔄 Làm lại câu này',
  markResolved: '✓ Đánh dấu đã thuộc',
  deleteItem: '🗑️ Xóa khỏi sổ',
  emptyTitle: 'Chưa có câu sai nào trong sổ tay!',
  emptyDesc: 'Khi làm bài thi thử CBT, bất kỳ câu nào bạn trả lời sai sẽ tự động được lưu vào đây để bạn luyện lại.',
  clearResolvedBtn: 'Dọn sạch câu đã thuộc',
  audioPlay: '🔊 Nghe lại đoạn thoại',
  checkAnswer: 'Kiểm tra đáp án',
  congratsCorrect: '🎉 Xuất sắc! Bạn đã làm đúng câu này!'
};

export function HskErrorNotebook({ onBack, onStartExam }) {
  const [errorList, setErrorList] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [activeRetryId, setActiveRetryId] = useState(null);
  const [retryAnswer, setRetryAnswer] = useState(null);
  const [retryResult, setRetryResult] = useState(null);

  const audioRef = useRef(null);

  // Load errors from localStorage
  const loadErrorNotebook = () => {
    try {
      const raw = localStorage.getItem(HSK30_ERROR_NOTEBOOK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setErrorList(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse error notebook:', e);
    }
    setErrorList([]);
  };

  useEffect(() => {
    loadErrorNotebook();
  }, []);

  const saveErrorNotebook = (newList) => {
    setErrorList(newList);
    try {
      localStorage.setItem(HSK30_ERROR_NOTEBOOK_KEY, JSON.stringify(newList));
    } catch (e) {
      console.error('Failed to save error notebook:', e);
    }
  };

  // Play audio
  const playAudio = (url) => {
    if (!url) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  // Mark as resolved
  const toggleResolved = (id) => {
    const updated = errorList.map((item) => {
      if (item.id === id) {
        return { ...item, resolved: !item.resolved };
      }
      return item;
    });
    saveErrorNotebook(updated);
  };

  // Delete single item
  const deleteItem = (id) => {
    const updated = errorList.filter((item) => item.id !== id);
    saveErrorNotebook(updated);
  };

  // Clear all resolved items
  const clearResolved = () => {
    const updated = errorList.filter((item) => !item.resolved);
    saveErrorNotebook(updated);
  };

  // Start retry mode for an item
  const startRetry = (item) => {
    setActiveRetryId(item.id);
    setRetryAnswer(null);
    setRetryResult(null);
  };

  // Submit retry answer
  const submitRetry = (item) => {
    const q = item.questionData;
    let isCorrect = false;

    if (q.type === 'word_reorder') {
      const assembled = Array.isArray(retryAnswer) ? retryAnswer.join('') : (retryAnswer || '');
      const cleanA = String(assembled).replace(/[。\.，,！!\?？\s]/g, '');
      const cleanB = String(q.correct_answer).replace(/[。\.，,！!\?？\s]/g, '');
      isCorrect = cleanA === cleanB;
    } else if (q.type === 'hanzi_fill') {
      isCorrect = String(retryAnswer || '').trim() === String(q.correct_answer || '').trim();
    } else {
      isCorrect = String(retryAnswer) === String(q.correct_answer);
    }

    setRetryResult({ isCorrect });

    if (isCorrect) {
      // Auto mark resolved in storage
      const updated = errorList.map((err) => {
        if (err.id === item.id) {
          return { ...err, resolved: true, resolvedAt: Date.now() };
        }
        return err;
      });
      saveErrorNotebook(updated);
    }
  };

  // Filtered items
  const filteredItems = errorList.filter((item) => {
    if (levelFilter !== 'all' && item.level !== levelFilter) return false;
    if (statusFilter === 'unresolved' && item.resolved) return false;
    if (statusFilter === 'resolved' && !item.resolved) return false;
    return true;
  });

  return (
    <div class="exam-container">
      <div class="exam-lobby">
        {/* Hero Header */}
        <div class="exam-hero" style="padding: 1.5rem 2rem; background: linear-gradient(135deg, #7c2d12 0%, #c2410c 100%);">
          <div>
            <button
              type="button"
              onClick={onBack}
              style="background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 0.5rem; padding: 0.4rem 0.85rem; font-size: 0.85rem; cursor: pointer; margin-bottom: 0.75rem; font-weight: 600;"
            >
              {UI_LABELS.backToHub}
            </button>
            <h1 class="exam-hero-title" style="font-size: 1.6rem; margin: 0 0 0.35rem 0;">
              {UI_LABELS.title}
              <span class="exam-badge" style="background: rgba(255,255,255,0.25);">
                {UI_LABELS.badge}
              </span>
            </h1>
            <p class="exam-hero-desc" style="font-size: 0.92rem; max-width: 700px;">
              {UI_LABELS.subtitle}
            </p>
          </div>

          {/* Quick Stats & Action */}
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <div style="background: rgba(255,255,255,0.18); border-radius: 0.75rem; padding: 0.6rem 1.1rem; text-align: center;">
              <div style="font-size: 1.35rem; font-weight: 800;">{errorList.filter((i) => !i.resolved).length}</div>
              <div style="font-size: 0.78rem; opacity: 0.9;">Cần ôn luyện</div>
            </div>
            {errorList.some((i) => i.resolved) && (
              <button
                type="button"
                onClick={clearResolved}
                style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 0.5rem; color: #fff; padding: 0.5rem 0.85rem; font-size: 0.85rem; cursor: pointer; font-weight: 600;"
              >
                {UI_LABELS.clearResolvedBtn}
              </button>
            )}
          </div>
        </div>

        {/* Filters Toolbar */}
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.75rem 1rem; flex-wrap: wrap; gap: 0.75rem;">
          {/* Level Filter */}
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #64748b; margin-right: 0.25rem;">Cấp độ:</span>
            {['all', 'hsk30_1', 'hsk30_2', 'hsk30_3', 'hsk30_4'].map((lvl) => {
              const label = lvl === 'all' ? 'Tất cả' : lvl.replace('hsk30_', 'HSK ');
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: levelFilter === lvl ? 700 : 500,
                    border: '1px solid',
                    borderColor: levelFilter === lvl ? '#c2410c' : '#cbd5e1',
                    background: levelFilter === lvl ? '#fff7ed' : '#ffffff',
                    color: levelFilter === lvl ? '#c2410c' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div style="display: flex; gap: 0.4rem;">
            <button
              type="button"
              onClick={() => setStatusFilter('unresolved')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: statusFilter === 'unresolved' ? 700 : 500,
                border: '1px solid',
                borderColor: statusFilter === 'unresolved' ? '#c2410c' : '#cbd5e1',
                background: statusFilter === 'unresolved' ? '#fff7ed' : '#ffffff',
                color: statusFilter === 'unresolved' ? '#c2410c' : '#475569',
                cursor: 'pointer'
              }}
            >
              Chưa làm lại ({errorList.filter((i) => !i.resolved).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: statusFilter === 'resolved' ? 700 : 500,
                border: '1px solid',
                borderColor: statusFilter === 'resolved' ? '#059669' : '#cbd5e1',
                background: statusFilter === 'resolved' ? '#ecfdf5' : '#ffffff',
                color: statusFilter === 'resolved' ? '#059669' : '#475569',
                cursor: 'pointer'
              }}
            >
              Đã khắc phục ({errorList.filter((i) => i.resolved).length})
            </button>
          </div>
        </div>

        {/* Error Items List */}
        {filteredItems.length === 0 ? (
          <div class="cbt-card" style="padding: 3.5rem 1.5rem; text-align: center; border-radius: 1rem; background: #fff; border: 1px solid #e2e8f0;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🎉</div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 0.4rem 0;">
              {UI_LABELS.emptyTitle}
            </h3>
            <p style="font-size: 0.95rem; color: #64748b; max-width: 500px; margin: 0 auto 1.5rem auto;">
              {UI_LABELS.emptyDesc}
            </p>
            {onStartExam && (
              <button
                type="button"
                onClick={onStartExam}
                style="background: #c2410c; color: #fff; border: none; border-radius: 0.6rem; padding: 0.65rem 1.35rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(194,65,12,0.25);"
              >
                📝 Vào thi thử CBT ngay
              </button>
            )}
          </div>
        ) : (
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            {filteredItems.map((item) => {
              const q = item.questionData;
              const isRetrying = activeRetryId === item.id;

              return (
                <div
                  key={item.id}
                  class="review-card"
                  style={{
                    borderColor: item.resolved ? '#34d399' : '#f87171',
                    borderLeftWidth: '6px',
                    borderLeftColor: item.resolved ? '#10b981' : '#ef4444',
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Item Header */}
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <span style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">
                        {item.examTitle || 'Đề thi CBT'} · Câu {item.questionNumber}
                      </span>
                      <span style="margin-left: 0.5rem; background: #fee2e2; color: #991b1b; padding: 0.15rem 0.5rem; border-radius: 0.3rem; font-size: 0.78rem; font-weight: 600;">
                        {item.partType === 'listening' ? 'Phần Nghe' : item.partType === 'writing' ? 'Phần Viết' : 'Phần Đọc'}
                      </span>
                    </div>

                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                      <button
                        type="button"
                        onClick={() => toggleResolved(item.id)}
                        style={{
                          background: item.resolved ? '#ecfdf5' : '#f8fafc',
                          color: item.resolved ? '#059669' : '#475569',
                          border: '1px solid',
                          borderColor: item.resolved ? '#a7f3d0' : '#cbd5e1',
                          borderRadius: '0.4rem',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {item.resolved ? '✓ Đã nắm vững' : 'Đánh dấu đã thuộc'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        style="background: #fff; color: #94a3b8; border: 1px solid #e2e8f0; border-radius: 0.4rem; padding: 0.3rem 0.55rem; font-size: 0.8rem; cursor: pointer;"
                        title={UI_LABELS.deleteItem}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Audio if any */}
                  {q.audio_clip && (
                    <div style="margin-bottom: 0.75rem;">
                      <button
                        type="button"
                        class="cbt-audio-play-btn"
                        onClick={() => playAudio(q.audio_clip)}
                        style="display: inline-flex; font-size: 0.85rem; padding: 0.35rem 0.75rem;"
                      >
                        {UI_LABELS.audioPlay}
                      </button>
                      {q.audio_text && (
                        <p style="font-size: 0.9rem; color: #0369a1; margin: 0.35rem 0 0 0;">
                          <strong>Audio script:</strong> {q.audio_text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Prompt Text / Image */}
                  {q.prompt_zh && (
                    <p style="font-family: var(--font-zh, 'Noto Serif SC', SimSun, serif); font-size: 1.15rem; font-weight: 600; margin: 0.4rem 0;">
                      {q.prompt_zh}
                    </p>
                  )}
                  {q.image && (
                    <div style="margin: 0.5rem 0;">
                      <img src={q.image} alt="Question context" style="max-height: 140px; border-radius: 0.5rem; border: 1px solid #cbd5e1;" />
                    </div>
                  )}

                  {/* Re-drill Section */}
                  {isRetrying ? (
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 0.5rem; padding: 1rem; margin: 0.75rem 0;">
                      <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: #9a3412;">
                        🔄 Thử làm lại câu hỏi này:
                      </h4>

                      {/* True / False question */}
                      {q.type === 'true_false' && (
                        <div style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem;">
                          <button
                            type="button"
                            onClick={() => setRetryAnswer(true)}
                            style={{
                              padding: '0.5rem 1.25rem',
                              borderRadius: '0.5rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: retryAnswer === true ? '2px solid #059669' : '1px solid #cbd5e1',
                              background: retryAnswer === true ? '#ecfdf5' : '#fff'
                            }}
                          >
                            ✓ Đúng (对)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRetryAnswer(false)}
                            style={{
                              padding: '0.5rem 1.25rem',
                              borderRadius: '0.5rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: retryAnswer === false ? '2px solid #dc2626' : '1px solid #cbd5e1',
                              background: retryAnswer === false ? '#fef2f2' : '#fff'
                            }}
                          >
                            ✗ Sai (错)
                          </button>
                        </div>
                      )}

                      {/* Multiple choice question */}
                      {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                        <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem;">
                          {q.options.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setRetryAnswer(opt.key)}
                              style={{
                                textAlign: 'left',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '0.4rem',
                                border: retryAnswer === opt.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                background: retryAnswer === opt.key ? '#eff6ff' : '#fff',
                                fontWeight: retryAnswer === opt.key ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              <strong>{opt.key}.</strong> {opt.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Fill Hanzi */}
                      {q.type === 'hanzi_fill' && (
                        <div style="margin-bottom: 0.75rem;">
                          <input
                            type="text"
                            value={retryAnswer || ''}
                            onInput={(e) => setRetryAnswer(e.target.value)}
                            placeholder="Nhập chữ Hán tương ứng..."
                            style="font-size: 1.2rem; font-family: var(--font-zh, 'Noto Serif SC', SimSun, serif); padding: 0.4rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; width: 100%; max-width: 250px;"
                          />
                        </div>
                      )}

                      {/* Action buttons in Retry */}
                      <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button
                          type="button"
                          onClick={() => submitRetry(item)}
                          disabled={retryAnswer === null}
                          style={{
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.4rem',
                            padding: '0.45rem 1rem',
                            fontWeight: 700,
                            cursor: retryAnswer === null ? 'not-allowed' : 'pointer',
                            opacity: retryAnswer === null ? 0.6 : 1
                          }}
                        >
                          {UI_LABELS.checkAnswer}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRetryId(null)}
                          style="background: transparent; border: 1px solid #cbd5e1; border-radius: 0.4rem; padding: 0.45rem 0.85rem; color: #64748b; cursor: pointer;"
                        >
                          Đóng lại
                        </button>
                      </div>

                      {/* Result feedback */}
                      {retryResult && (
                        <div style={{
                          marginTop: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: retryResult.isCorrect ? '#059669' : '#dc2626'
                        }}>
                          {retryResult.isCorrect
                            ? UI_LABELS.congratsCorrect
                            : `❌ Vẫn chưa đúng. Đáp án chuẩn là: ${String(q.correct_answer)}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Previous Wrong Answer vs Correct Answer */}
                      <div style="display: flex; gap: 1.5rem; margin: 0.5rem 0; font-size: 0.92rem; flex-wrap: wrap;">
                        <span>
                          Đáp án sai trước đó: <strong style="color: #dc2626;">{String(item.userWrongAnswer ?? 'Chưa làm')}</strong>
                        </span>
                        <span>
                          Đáp án chính xác: <strong style="color: #059669;">{String(q.correct_answer)}</strong>
                        </span>
                      </div>

                      <div style="margin-top: 0.5rem;">
                        <button
                          type="button"
                          onClick={() => startRetry(item)}
                          style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 0.45rem; padding: 0.45rem 0.95rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;"
                        >
                          {UI_LABELS.retryBtn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detailed explanation */}
                  <div class="review-explanation" style="margin-top: 0.75rem;">
                    <strong>💡 Lời giải chi tiết:</strong> {q.explanation || q.explanation_vi || 'Đáp án theo tiêu chuẩn CTI.'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
