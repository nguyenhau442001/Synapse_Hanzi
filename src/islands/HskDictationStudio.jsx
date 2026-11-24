// src/islands/HskDictationStudio.jsx
// HSK Dictation Studio (听写工作坊)
// Interactive sentence-by-sentence listening and transcription practice
// using authentic CTI examination audio from HSK 1 to HSK 4 with character-level diffing.

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { cleanChineseCharacters } from './ToneSandhi.js';

const DICTATION_LEVEL_FILES = {
  hsk1: {
    levelName: 'HSK 1',
    examTitle: 'HSK 1 (3.0) - CTI Specimen H10901',
    dataUrl: 'database/exams/hsk30/level1/hsk30_l1_specimen01.json'
  },
  hsk2: {
    levelName: 'HSK 2',
    examTitle: 'HSK 2 (3.0) - CTI Specimen H20901',
    dataUrl: 'database/exams/hsk30/level2/hsk30_l2_specimen01.json'
  },
  hsk3: {
    levelName: 'HSK 3',
    examTitle: 'HSK 3 (3.0) - CTI Specimen H30901',
    dataUrl: 'database/exams/hsk30/level3/hsk30_l3_specimen01.json'
  },
  hsk4: {
    levelName: 'HSK 4',
    examTitle: 'HSK 4 (3.0) - CTI Specimen H41001',
    dataUrl: 'database/exams/hsk30/level4/hsk30_l4_specimen01.json'
  }
};

const UI_LABELS = {
  title: 'Nghe chép chính tả (听写 Studio)',
  badge: 'HSK 1 - 4 CTI Authentic Audio',
  subtitle: 'Luyện tai nghe phản xạ và trí nhớ cơ tay: Nghe câu thoại chuẩn người bản xứ và gõ lại từng chữ Hán.',
  backToHub: '← Quay lại Trung tâm Luyện thi',
  chooseLevel: 'Chọn cấp độ luyện chép:',
  playAudio: '🔊 Nghe audio',
  pauseAudio: '⏸️ Tạm dừng',
  replayAudio: '🔁 Nghe lại',
  speedLabel: 'Tốc độ:',
  inputPlaceholder: 'Gõ chữ Hán hoặc Pinyin bạn nghe được vào đây (ví dụ: 明天天气很好)...',
  checkBtn: '✓ So khớp kết quả',
  nextBtn: 'Câu tiếp theo →',
  prevBtn: '← Câu trước',
  showPinyinHint: '💡 Gợi ý Pinyin',
  hidePinyinHint: 'Ẩn gợi ý Pinyin',
  showAnswer: '👁️ Xem văn bản gốc',
  hideAnswer: 'Ẩn văn bản gốc',
  accuracyLabel: 'Độ chính xác:',
  perfectScore: '🎉 Xuất sắc! Bạn đã chép chính xác 100%!',
  almostScore: '👍 Khá tốt! Hãy chú ý các chữ màu đỏ/xám chưa đúng.',
  needPractice: '💪 Đừng nản lòng! Hãy nghe lại với tốc độ 0.75x và thử lại.',
  noItemsNotice: 'Đang tải ngân hàng câu hỏi nghe từ đề thi CTI...'
};

/**
 * Remove punctuation and whitespace for character-level matching
 */
function sanitizeChineseText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[，。！？、：；“”‘’（）\(\)\.,!\?:\s]/g, '');
}

/**
 * Diff user input against target characters
 */
function computeCharDiff(targetText, userText) {
  const cleanTarget = sanitizeChineseText(targetText);
  const cleanUser = sanitizeChineseText(userText);
  const targetChars = Array.from(cleanTarget);
  const userChars = Array.from(cleanUser);

  let matchedCount = 0;
  const diffItems = targetChars.map((targetChar, idx) => {
    const userChar = userChars[idx];
    if (!userChar) {
      return { char: targetChar, status: 'missing' };
    }
    if (userChar === targetChar) {
      matchedCount++;
      return { char: targetChar, userChar, status: 'correct' };
    }
    return { char: targetChar, userChar, status: 'incorrect' };
  });

  const accuracy = targetChars.length > 0
    ? Math.round((matchedCount / targetChars.length) * 100)
    : 0;

  return {
    diffItems,
    matchedCount,
    totalCount: targetChars.length,
    accuracy,
    isComplete: matchedCount === targetChars.length
  };
}

export function HskDictationStudio({ onBack }) {
  const [selectedLevel, setSelectedLevel] = useState('hsk1');
  const [dictationItems, setDictationItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef(null);

  // Load listening questions for selected level
  useEffect(() => {
    setIsLoading(true);
    setDiffResult(null);
    setUserInput('');
    setShowPinyin(false);
    setShowTarget(false);

    const levelConfig = DICTATION_LEVEL_FILES[selectedLevel];
    if (!levelConfig) return;

    fetch(levelConfig.dataUrl)
      .then((res) => res.json())
      .then((data) => {
        const extracted = [];
        if (data && Array.isArray(data.sections)) {
          data.sections.forEach((sec) => {
            if (sec.id === 'listening' || (sec.name && sec.name.includes('听力'))) {
              if (Array.isArray(sec.parts)) {
                sec.parts.forEach((p) => {
                  if (Array.isArray(p.questions)) {
                    p.questions.forEach((q) => {
                      const text = q.audio_text || q.prompt_zh || (q.content && q.content.text);
                      if (q.audio_clip && text && text.trim().length > 0) {
                        extracted.push({
                          id: `${data.id}_Q${q.number}`,
                          level: selectedLevel,
                          questionNumber: q.number,
                          audioClip: q.audio_clip,
                          targetZh: text.trim(),
                          pinyin: q.pinyin || q.audio_pinyin || '',
                          meaningVi: q.meaning_vi || q.explanation_vi || q.explanation || ''
                        });
                      }
                    });
                  }
                });
              }
            }
          });
        }
        setDictationItems(extracted);
        setCurrentIndex(0);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dictation items:', err);
        setIsLoading(false);
      });
  }, [selectedLevel]);

  // Handle Audio playback
  const currentItem = dictationItems[currentIndex] || null;

  const playCurrentAudio = (speed = playSpeed) => {
    if (!currentItem || !currentItem.audioClip) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(currentItem.audioClip);
    audio.playbackRate = speed;
    audioRef.current = audio;

    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaySpeed(speed);
    if (isPlaying && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleCheck = () => {
    if (!currentItem) return;
    const result = computeCharDiff(currentItem.targetZh, userInput);
    setDiffResult(result);
  };

  const goToNextItem = () => {
    stopAudio();
    if (currentIndex < dictationItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setDiffResult(null);
      setShowPinyin(false);
      setShowTarget(false);
    }
  };

  const goToPrevItem = () => {
    stopAudio();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setUserInput('');
      setDiffResult(null);
      setShowPinyin(false);
      setShowTarget(false);
    }
  };

  return (
    <div class="exam-container">
      <div class="exam-lobby">
        {/* Header Bar */}
        <div class="exam-hero" style="padding: 1.5rem 2rem;">
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

          {/* Level Switcher */}
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <span style="font-size: 0.85rem; font-weight: 600; opacity: 0.9;">
              {UI_LABELS.chooseLevel}
            </span>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              {Object.keys(DICTATION_LEVEL_FILES).map((lvlKey) => (
                <button
                  key={lvlKey}
                  type="button"
                  onClick={() => setSelectedLevel(lvlKey)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    border: selectedLevel === lvlKey ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                    background: selectedLevel === lvlKey ? '#fff' : 'rgba(255,255,255,0.15)',
                    color: selectedLevel === lvlKey ? '#0284c7' : '#fff',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {DICTATION_LEVEL_FILES[lvlKey].levelName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Studio Workspace */}
        {isLoading ? (
          <div class="cbt-loading-state" style="padding: 3rem; text-align: center;">
            <div class="cbt-spinner" />
            <p>{UI_LABELS.noItemsNotice}</p>
          </div>
        ) : !currentItem ? (
          <div class="cbt-card" style="padding: 2.5rem; text-align: center; color: #64748b;">
            Không tìm thấy câu hỏi nghe phù hợp cho cấp độ này.
          </div>
        ) : (
          <div class="cbt-card" style="padding: 1.75rem; border-radius: 1rem; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
            {/* Top Toolbar */}
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-weight: 700; font-size: 1.1rem; color: #0f172a;">
                  Câu {currentIndex + 1} / {dictationItems.length}
                </span>
                <span style="background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">
                  {DICTATION_LEVEL_FILES[selectedLevel].levelName}
                </span>
              </div>

              {/* Audio Controls */}
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="cbt-audio-play-btn"
                  onClick={() => (isPlaying ? stopAudio() : playCurrentAudio())}
                  style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600; padding: 0.5rem 1rem;"
                >
                  {isPlaying ? UI_LABELS.pauseAudio : UI_LABELS.playAudio}
                </button>

                <div style="display: flex; align-items: center; gap: 0.25rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.2rem 0.4rem; font-size: 0.85rem;">
                  <span style="color: #64748b; font-weight: 600;">{UI_LABELS.speedLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleSpeedChange(0.75)}
                    style={{
                      border: 'none',
                      background: playSpeed === 0.75 ? '#0284c7' : 'transparent',
                      color: playSpeed === 0.75 ? '#fff' : '#475569',
                      borderRadius: '0.25rem',
                      padding: '0.2rem 0.45rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    0.75x
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeedChange(1.0)}
                    style={{
                      border: 'none',
                      background: playSpeed === 1.0 ? '#0284c7' : 'transparent',
                      color: playSpeed === 1.0 ? '#fff' : '#475569',
                      borderRadius: '0.25rem',
                      padding: '0.2rem 0.45rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    1.0x
                  </button>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div style="margin-bottom: 1.5rem;">
              <label
                for="dictationInput"
                style="display: block; font-weight: 600; font-size: 0.95rem; color: #334155; margin-bottom: 0.5rem;"
              >
                Nhập văn bản chữ Hán nghe được:
              </label>
              <textarea
                id="dictationInput"
                value={userInput}
                onInput={(e) => setUserInput(e.target.value)}
                placeholder={UI_LABELS.inputPlaceholder}
                rows={3}
                style="width: 100%; box-sizing: border-box; font-size: 1.25rem; font-family: var(--font-zh, 'Noto Serif SC', SimSun, serif); padding: 0.85rem; border: 2px solid #cbd5e1; border-radius: 0.75rem; outline: none; transition: border-color 0.2s;"
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />

              <div style="display: flex; gap: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap;">
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                  style={{
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.6rem 1.4rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: userInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: userInput.trim() ? 1 : 0.6,
                    boxShadow: '0 2px 6px rgba(5,150,105,0.25)'
                  }}
                >
                  {UI_LABELS.checkBtn}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPinyin((prev) => !prev)}
                  style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.6rem 1rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;"
                >
                  {showPinyin ? UI_LABELS.hidePinyinHint : UI_LABELS.showPinyinHint}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTarget((prev) => !prev)}
                  style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.6rem 1rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;"
                >
                  {showTarget ? UI_LABELS.hideAnswer : UI_LABELS.showAnswer}
                </button>
              </div>
            </div>

            {/* Hint Displays */}
            {showPinyin && currentItem.pinyin && (
              <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 1.05rem; color: #92400e;">
                <strong>Pinyin gợi ý:</strong> {currentItem.pinyin}
              </div>
            )}

            {showTarget && (
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 1.1rem; color: #1e40af;">
                <p style="margin: 0 0 0.35rem 0; font-family: var(--font-zh, 'Noto Serif SC', SimSun, serif); font-size: 1.3rem; font-weight: 600;">
                  {currentItem.targetZh}
                </p>
                {currentItem.pinyin && (
                  <p style="margin: 0 0 0.35rem 0; font-size: 0.95rem; color: #3b82f6;">
                    {currentItem.pinyin}
                  </p>
                )}
                {currentItem.meaningVi && (
                  <p style="margin: 0; font-size: 0.9rem; color: #475569;">
                    <strong>Dịch nghĩa:</strong> {currentItem.meaningVi}
                  </p>
                )}
              </div>
            )}

            {/* Diff Comparison Result */}
            {diffResult && (
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                  <span style="font-weight: 700; font-size: 1rem; color: #1e293b;">
                    Kết quả so khớp từng ký tự:
                  </span>
                  <span style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: diffResult.accuracy >= 90 ? '#059669' : diffResult.accuracy >= 60 ? '#d97706' : '#dc2626'
                  }}>
                    {UI_LABELS.accuracyLabel} {diffResult.accuracy}% ({diffResult.matchedCount}/{diffResult.totalCount} chữ)
                  </span>
                </div>

                {/* Character tokens */}
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem;">
                  {diffResult.diffItems.map((item, idx) => {
                    let bg = '#fee2e2';
                    let border = '#f87171';
                    let color = '#991b1b';
                    if (item.status === 'correct') {
                      bg = '#d1fae5';
                      border = '#34d399';
                      color = '#065f46';
                    } else if (item.status === 'missing') {
                      bg = '#f1f5f9';
                      border = '#cbd5e1';
                      color = '#64748b';
                    }
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '2.5rem',
                          padding: '0.4rem',
                          background: bg,
                          border: `1.5px solid ${border}`,
                          borderRadius: '0.4rem',
                          fontFamily: "var(--font-zh, 'Noto Serif SC', SimSun, serif)"
                        }}
                      >
                        <span style={{ fontSize: '1.3rem', fontWeight: 700, color }}>
                          {item.char}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {item.status === 'correct' ? '✓ Đúng' : item.status === 'missing' ? 'Chưa gõ' : `Bạn: ${item.userChar}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Encouraging Feedback Message */}
                <p style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: diffResult.accuracy === 100 ? '#059669' : diffResult.accuracy >= 60 ? '#b45309' : '#b91c1c'
                }}>
                  {diffResult.accuracy === 100
                    ? UI_LABELS.perfectScore
                    : diffResult.accuracy >= 60
                    ? UI_LABELS.almostScore
                    : UI_LABELS.needPractice}
                </p>
              </div>
            )}

            {/* Bottom Navigation */}
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
              <button
                type="button"
                onClick={goToPrevItem}
                disabled={currentIndex === 0}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentIndex === 0 ? 0.5 : 1
                }}
              >
                {UI_LABELS.prevBtn}
              </button>

              <button
                type="button"
                onClick={goToNextItem}
                disabled={currentIndex === dictationItems.length - 1}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: currentIndex === dictationItems.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentIndex === dictationItems.length - 1 ? 0.5 : 1
                }}
              >
                {UI_LABELS.nextBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
