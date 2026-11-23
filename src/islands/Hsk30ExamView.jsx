// src/islands/Hsk30ExamView.jsx
// HSK 3.0 Computer-Based Test (CBT) Mock Exam Runner & Diagnostic Review
// Recreates the authentic CTI computer examination environment with real-time countdown,
// question palette navigation, section time tracking, and post-exam SRS remediation.

import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { onDomReady } from './domReady';

export const HSK30_EXAM_STORAGE_KEY = 'hsk30_exam_history_v1';
export const DEFAULT_EXAM_URL = 'database/exams/hsk30/level1/hsk30_l1_specimen01.json';

// Official CTI examination part guidelines and examples
export const HSK1_PART_INSTRUCTIONS = {
  'listening_1': {
    titleZh: '第一部分：听录音，判断对错',
    titleVi: 'Phần 1: Nghe ghi âm và phán đoán Đúng (✓) / Sai (✗) theo tranh',
    guideZh: '一共 5 个题，每题听两次。',
    guideVi: 'Gồm 5 câu (Câu 1 - 5), mỗi câu được xướng số thứ tự và nghe 2 lần.',
    example: {
      textZh: '例如：很高兴 (✓) ｜ 看电影 (✗)',
      textVi: 'Ví dụ mẫu: Đoạn ghi âm nói "很高兴" (rất vui) đối chiếu tranh bắt tay chào hỏi -> Đúng [✓]; nói "看电影" (xem phim) đối chiếu tranh đang đọc sách -> Sai [✗].'
    }
  },
  'listening_2': {
    titleZh: '第二部分：听句子，选择正确答案',
    titleVi: 'Phần 2: Nghe câu ngắn và chọn đáp án đúng A/B/C',
    guideZh: '一共 5 个题，每题听两次。',
    guideVi: 'Gồm 5 câu (Câu 6 - 10), mỗi câu được nghe 2 lần.',
    example: {
      textZh: '例如：他在学校学习汉语。问：他在哪儿学习？',
      textVi: 'Ví dụ mẫu: Nghe câu trần thuật và chọn địa điểm/đối tượng/hành động tương ứng.'
    }
  },
  'listening_3': {
    titleZh: '第三部分：听短对话，选择对应情境',
    titleVi: 'Phần 3: Nghe hội thoại ngắn và chọn bối cảnh phù hợp',
    guideZh: '一共 5 个题，每题听两次。',
    guideVi: 'Gồm 5 câu (Câu 11 - 15), mỗi câu được nghe 2 lần.',
    example: {
      textZh: '例如：女：你好！ 男：你好，很高兴认识你！',
      textVi: 'Ví dụ mẫu: Nghe 2 câu đối thoại giữa nam và nữ, chọn ngữ cảnh hoặc thông tin được nhắc tới.'
    }
  },
  'listening_4': {
    titleZh: '第四部分：听对话和问句，选择正确答案',
    titleVi: 'Phần 4: Nghe đối thoại và trả lời câu hỏi trắc nghiệm A/B/C',
    guideZh: '一共 5 个题，每题听两次。',
    guideVi: 'Gồm 5 câu (Câu 16 - 20), mỗi câu được nghe 2 lần.',
    example: {
      textZh: '例如：女：下午你去看电影吗？ 男：我不去，我有工作。问：男的下午做什么？',
      textVi: 'Ví dụ mẫu: Nghe hội thoại kèm câu hỏi ở cuối, chọn đáp án A, B hoặc C.'
    }
  },
  'reading_1': {
    titleZh: '第二部分：阅读 · 第一部分：判断对错',
    titleVi: 'Phần 1 (Đọc hiểu): Đọc câu đối chiếu tranh và phán đoán Đúng / Sai',
    guideZh: '一共 5 个题。看图和句子，判断句子意思是否与图片一致。',
    guideVi: 'Gồm 5 câu (Câu 21 - 25). Nhận định Đúng (✓) nếu câu khớp với hình ảnh, Sai (✗) nếu khác.'
  },
  'reading_2': {
    titleZh: '第二部分：阅读 · 第二部分：选词填空',
    titleVi: 'Phần 2 (Đọc hiểu): Điền từ thích hợp vào chỗ trống trong câu',
    guideZh: '一共 5 个题。选择最恰当的词语完成句子。',
    guideVi: 'Gồm 5 câu (Câu 26 - 30). Đọc ngữ cảnh câu và chọn từ vựng A, B, C, D phù hợp nhất.'
  },
  'reading_3': {
    titleZh: '第二部分：阅读 · 第三部分：问答配对',
    titleVi: 'Phần 3 (Đọc hiểu): Ghép câu hỏi với câu đối đáp phù hợp',
    guideZh: '一共 5 个题。选择匹配的问答或句子关系。',
    guideVi: 'Gồm 5 câu (Câu 31 - 35). Chọn câu trả lời logic cho từng câu hỏi.'
  },
  'reading_4': {
    titleZh: '第二部分：阅读 · 第四部分：阅读理解',
    titleVi: 'Phần 4 (Đọc hiểu): Đọc đoạn văn ngắn và trả lời câu hỏi trắc nghiệm',
    guideZh: '一共 5 个题。根据短文内容选择正确答案。',
    guideVi: 'Gồm 5 câu (Câu 36 - 40). Đọc kỹ đoạn văn ngắn (2-3 câu) để tìm dẫn chứng trả lời A/B/C.'
  }
};

export function Hsk30ExamComponent() {
  const [examMeta, setExamMeta] = useState(null);
  const [examData, setExamData] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('hsk30_1');
  const [examState, setExamState] = useState('lobby'); // 'lobby' | 'exam' | 'result'
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(35 * 60);
  const [examResult, setExamResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'incorrect' | 'flagged'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [showPartExample, setShowPartExample] = useState(false);
  const [isSoundTesting, setIsSoundTesting] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Load exam metadata catalog on mount
  useEffect(() => {
    fetch('database/exams/hsk30/index.json')
      .then((res) => res.json())
      .then((meta) => {
        setExamMeta(meta);
      })
      .catch((err) => {
        console.error('Failed to load exam catalog:', err);
      });
  }, []);

  // Timer countdown loop when in 'exam' mode
  useEffect(() => {
    if (examState === 'exam') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, examData, userAnswers]);

  // Flatten all questions across sections into a single linear sequence
  const getAllQuestions = () => {
    if (!examData || !examData.sections) return [];
    const list = [];
    if (examData.sections.listening && examData.sections.listening.questions) {
      examData.sections.listening.questions.forEach((q) => {
        list.push({ ...q, sectionName: 'listening', sectionTitle: examData.sections.listening.name });
      });
    }
    if (examData.sections.reading && examData.sections.reading.questions) {
      examData.sections.reading.questions.forEach((q) => {
        list.push({ ...q, sectionName: 'reading', sectionTitle: examData.sections.reading.name });
      });
    }
    return list;
  };

  const allQuestions = getAllQuestions();
  const activeQuestion = allQuestions[currentQuestionIdx] || null;

  // Auto-play audio when switching to a listening question
  useEffect(() => {
    if (examState === 'exam' && activeQuestion && activeQuestion.audio_clip) {
      playAudio(activeQuestion.audio_clip);
    } else {
      stopAudio();
    }
  }, [currentQuestionIdx, examState]);

  const playAudio = (url) => {
    stopAudio();
    if (!url) return;
    try {
      audioRef.current = new Audio(url);
      audioRef.current.playbackRate = playbackSpeed;
      setIsPlayingAudio(true);
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        setAudioPlayCount((c) => c + 1);
      };
      audioRef.current.play().catch(() => {
        setIsPlayingAudio(false);
      });
    } catch (e) {
      setIsPlayingAudio(false);
    }
  };

  const setAudioSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const runSoundTest = () => {
    stopAudio();
    setIsSoundTesting(true);
    const testAudio = new Audio('assets/audio/exams/hsk30/level1/h10901_l01.mp3');
    testAudio.onended = () => setIsSoundTesting(false);
    testAudio.onerror = () => setIsSoundTesting(false);
    testAudio.play().catch(() => setIsSoundTesting(false));
  };

  const startExam = async (filePath) => {
    try {
      const res = await fetch(filePath || DEFAULT_EXAM_URL);
      if (!res.ok) throw new Error('Cannot load exam json');
      const data = await res.json();
      setExamData(data);
      setUserAnswers({});
      setFlaggedQuestions({});
      setCurrentQuestionIdx(0);
      setTimeRemaining((data.time_minutes || 35) * 60);
      setAudioPlayCount(0);
      setShowPartExample(false);
      setExamState('exam');
    } catch (err) {
      alert('Không thể tải dữ liệu đề thi: ' + err.message);
    }
  };

  const handleSelectAnswer = (qId, answer) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  const toggleFlag = (qId) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const finishExam = () => {
    stopAudio();
    if (timerRef.current) clearInterval(timerRef.current);

    if (!examData) return;
    const questions = getAllQuestions();
    let listeningCorrect = 0;
    let readingCorrect = 0;
    let listeningTotal = 0;
    let readingTotal = 0;

    questions.forEach((q) => {
      const isCorrect = userAnswers[q.id] === q.correct_answer;
      if (q.sectionName === 'listening') {
        listeningTotal += 1;
        if (isCorrect) listeningCorrect += 1;
      } else if (q.sectionName === 'reading') {
        readingTotal += 1;
        if (isCorrect) readingCorrect += 1;
      }
    });

    const listeningScore = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
    const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;
    const totalScore = listeningScore + readingScore;
    const isPassed = totalScore >= (examData.pass_score || 120);

    const resultObj = {
      examId: examData.id,
      examTitle: examData.title,
      date: new Date().toISOString(),
      totalScore,
      maxScore: examData.max_score || 200,
      passScore: examData.pass_score || 120,
      isPassed,
      listeningScore,
      readingScore,
      totalQuestions: questions.length,
      correctCount: listeningCorrect + readingCorrect,
      userAnswers: { ...userAnswers },
    };

    setExamResult(resultObj);
    setExamState('result');

    // Persist test record into localStorage
    try {
      const raw = localStorage.getItem(HSK30_EXAM_STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.unshift(resultObj);
      localStorage.setItem(HSK30_EXAM_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.error('Failed to save exam record:', e);
    }
  };

  const confirmSubmit = () => {
    const answeredCount = Object.keys(userAnswers).length;
    const total = allQuestions.length;
    const unAnswered = total - answeredCount;
    const msg = unAnswered > 0
      ? `Bạn còn ${unAnswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`
      : 'Bạn đã hoàn thành tất cả câu hỏi. Bạn có muốn nộp bài và xem kết quả ngay không?';
    if (window.confirm(msg)) {
      finishExam();
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add incorrect question vocabularies to SRS deck
  const addIncorrectWordsToSrs = () => {
    if (!examData) return;
    const questions = getAllQuestions();
    const incorrectQuestions = questions.filter((q) => userAnswers[q.id] !== q.correct_answer);

    if (incorrectQuestions.length === 0) {
      alert('Tuyệt vời! Bạn không làm sai câu nào để thêm vào ôn tập.');
      return;
    }

    try {
      const weakKey = 'hsk30_exam_weak_questions';
      const existing = JSON.parse(localStorage.getItem(weakKey) || '[]');
      const newIds = incorrectQuestions.map((q) => q.id);
      const merged = Array.from(new Set([...existing, ...newIds]));
      localStorage.setItem(weakKey, JSON.stringify(merged));
      alert(`Đã thêm ${incorrectQuestions.length} câu hỏi làm sai vào danh sách trọng tâm ôn tập!`);
    } catch (e) {
      alert('Đã ghi nhận câu sai để ôn tập.');
    }
  };

  // Get current part instruction
  const getCurrentPartInfo = () => {
    if (!activeQuestion) return null;
    const key = `${activeQuestion.sectionName}_${activeQuestion.part}`;
    return HSK1_PART_INSTRUCTIONS[key] || null;
  };

  // -------------------------------------------------------------------------
  // RENDER: LOBBY
  // -------------------------------------------------------------------------
  if (examState === 'lobby') {
    const levelKey = currentLevel;
    const levelObj = examMeta && examMeta.levels && examMeta.levels[levelKey];
    const examList = levelObj ? levelObj.exams : [];

    return (
      <div class="exam-container">
        <div class="exam-lobby">
          <div class="exam-hero">
            <div>
              <h1 class="exam-hero-title">
                Luyện thi HSK 3.0 Chuẩn Hóa
                <span class="exam-badge">Mô phỏng CBT</span>
              </h1>
              <p class="exam-hero-desc">
                Phòng thi máy tính trực tuyến mô phỏng 1:1 theo chuẩn CTI (汉考国际).
                Đề thi chính thức kèm âm thanh chuẩn studio, đồng hồ đếm ngược và phân tích điểm chi tiết.
              </p>
            </div>
            <div class="exam-level-tabs">
              <button
                class={`exam-level-tab ${currentLevel === 'hsk30_1' ? 'active' : ''}`}
                onClick={() => setCurrentLevel('hsk30_1')}
              >
                HSK 1 (3.0)
              </button>
              <button
                class={`exam-level-tab ${currentLevel === 'hsk30_2' ? 'active' : ''}`}
                onClick={() => alert('Đề thi HSK 2 đang được biên tập theo 样卷 chuẩn CTI và sẽ ra mắt trong bản cập nhật kế tiếp.')}
              >
                HSK 2 (3.0)
              </button>
              <button
                class={`exam-level-tab ${currentLevel === 'hsk30_3' ? 'active' : ''}`}
                onClick={() => alert('Đề thi HSK 3 đang được biên tập theo 样卷 chuẩn CTI và sẽ ra mắt trong bản cập nhật kế tiếp.')}
              >
                HSK 3 (3.0)
              </button>
            </div>
          </div>

          {/* Instructions and Sound Test Card */}
          <div style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h3 style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: #0f172a;">
                  📢 考生须知 · Quy chế phòng thi máy tính CBT
                </h3>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b;">
                  Trước khi bắt đầu, hãy kiểm tra âm thanh tai nghe và nắm rõ cấu trúc đề thi chính thức.
                </p>
              </div>
              <button
                type="button"
                style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid #0284c7; background: rgba(2, 132, 199, 0.08); color: #0284c7; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;"
                onClick={runSoundTest}
              >
                {isSoundTesting ? '🔊 Đang phát âm thanh mẫu...' : '🎧 试音 (Thử âm thanh tai nghe)'}
              </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; font-size: 0.875rem; background: var(--bg-surface, #f8fafc); padding: 1rem; border-radius: 0.75rem; line-height: 1.6;">
              <div>
                <strong style="color: #0284c7;">1. Phần Nghe (听力 - 20 câu - 15 phút):</strong>
                <div>• Gồm 4 phần: Phán đoán tranh, Trắc nghiệm đơn, Đối thoại ngắn, Hiểu hội thoại.</div>
                <div>• Mỗi câu được phát xướng số câu và đọc đúng 2 lần theo chuẩn kỳ thi CTI.</div>
              </div>
              <div>
                <strong style="color: #0284c7;">2. Phần Đọc (阅读 - 20 câu - 17 phút):</strong>
                <div>• Gồm 4 phần: Phán đoán tranh, Điền từ vào chỗ trống, Ghép câu hỏi-đáp, Đọc hiểu đoạn văn.</div>
                <div>• Thí sinh tự do chuyển câu qua Bảng câu hỏi (答题卡).</div>
              </div>
              <div>
                <strong style="color: #0284c7;">3. Điểm số &amp; Tiêu chuẩn đỗ:</strong>
                <div>• Thang điểm tối đa: <strong>200 điểm</strong> (Nghe 100đ, Đọc 100đ).</div>
                <div>• Điểm chuẩn đạt (合格): <strong>120 điểm</strong> (đạt từ 60% trở lên).</div>
              </div>
            </div>
          </div>

          <div class="exam-card-grid">
            {examList.map((item) => (
              <div class="exam-card" key={item.id}>
                <div>
                  <div class="exam-card-header">
                    <span class="exam-card-code">{item.code}</span>
                    <span style="font-size: 0.85rem; font-weight: 600; color: #10b981;">Chính thức</span>
                  </div>
                  <h3 class="exam-card-title">{item.title}</h3>
                  <p class="exam-card-desc">{item.subtitle}</p>
                  <div class="exam-card-meta">
                    <span class="exam-meta-item">⏱️ {item.time_minutes} phút</span>
                    <span class="exam-meta-item">📝 40 câu hỏi</span>
                    <span class="exam-meta-item">🎯 Điểm đạt: 120/200</span>
                  </div>
                </div>
                <button
                  class="exam-start-btn"
                  onClick={() => startExam(item.file)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Bắt đầu vào thi (开始考试)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: REAL CBT EXAM
  // -------------------------------------------------------------------------
  if (examState === 'exam' && activeQuestion) {
    const isFirst = currentQuestionIdx === 0;
    const isLast = currentQuestionIdx === allQuestions.length - 1;
    const currentAnswer = userAnswers[activeQuestion.id];
    const isFlagged = !!flaggedQuestions[activeQuestion.id];
    const isTimerWarning = timeRemaining < 300; // < 5 mins
    const partInfo = getCurrentPartInfo();

    return (
      <div class="exam-container">
        <div class="cbt-exam-wrapper">
          {/* CBT Header */}
          <header class="cbt-top-bar">
            <div class="cbt-title-group">
              <span class="cbt-logo">HSK</span>
              <span class="cbt-exam-name">{examData.title}</span>
            </div>
            <div class="cbt-controls-group">
              <div class={`cbt-timer ${isTimerWarning ? 'warning' : ''}`} title="Thời gian còn lại">
                ⏱️ {formatTimer(timeRemaining)}
              </div>
              <button class="cbt-btn-submit" onClick={confirmSubmit}>
                交卷 (Nộp bài)
              </button>
            </div>
          </header>

          {/* CBT Section Bar */}
          <div class="cbt-section-bar">
            <div>
              <span class="cbt-section-badge">{activeQuestion.sectionTitle}</span>
              <span style="margin-left: 0.75rem; color: #475569;">
                Câu hỏi {currentQuestionIdx + 1} / {allQuestions.length}
              </span>
            </div>
            <button
              class={`cbt-flag-btn ${isFlagged ? 'flagged' : ''}`}
              onClick={() => toggleFlag(activeQuestion.id)}
            >
              🚩 {isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại'}
            </button>
          </div>

          {/* CBT Body */}
          <div class="cbt-body-layout">
            <main class="cbt-main-area">
              <div>
                {/* Part Instruction Banner */}
                {partInfo && (
                  <div class="cbt-part-banner">
                    <div class="cbt-part-banner-header">
                      <div>
                        <div class="cbt-part-title-zh">{partInfo.titleZh}</div>
                        <div class="cbt-part-title-vi">{partInfo.titleVi}</div>
                        <div style="font-size: 0.8rem; color: #4b5563; margin-top: 0.2rem;">
                          {partInfo.guideZh} <em>({partInfo.guideVi})</em>
                        </div>
                      </div>
                      {partInfo.example && (
                        <button
                          type="button"
                          class="cbt-part-example-btn"
                          onClick={() => setShowPartExample((v) => !v)}
                        >
                          {showPartExample ? 'Ẩn ví dụ mẫu' : 'ℹ️ Xem ví dụ mẫu (例如)'}
                        </button>
                      )}
                    </div>
                    {showPartExample && partInfo.example && (
                      <div class="cbt-part-example-box">
                        <strong style="color: #166534;">{partInfo.example.textZh}</strong>
                        <div style="color: #475569; margin-top: 0.25rem;">{partInfo.example.textVi}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio player if question has audio */}
                {activeQuestion.audio_clip && (
                  <div class="cbt-audio-box">
                    <div class="cbt-audio-status">
                      {isPlayingAudio ? (
                        <>
                          <span class="audio-wave-anim">🔊</span>
                          <span>Đang phát ghi âm chuẩn CTI (đọc 2 lần kèm số câu)...</span>
                        </>
                      ) : (
                        <>
                          <span>⏸️</span>
                          <span>Ghi âm bài nghe (Đã phát: {audioPlayCount} lần)</span>
                        </>
                      )}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <select
                        style="padding: 0.35rem 0.6rem; border-radius: 0.35rem; border: 1px solid #cbd5e1; font-size: 0.8rem; background: #fff; color: #334155;"
                        value={playbackSpeed}
                        onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                        title="Tốc độ phát âm"
                      >
                        <option value={1.0}>Tốc độ 1.0x (Chuẩn CTI)</option>
                        <option value={0.85}>Tốc độ 0.85x (Chậm hơn)</option>
                        <option value={0.75}>Tốc độ 0.75x (Rất chậm)</option>
                      </select>
                      <button
                        type="button"
                        class="cbt-audio-play-btn"
                        onClick={() => playAudio(activeQuestion.audio_clip)}
                      >
                        ▶ Phát lại audio
                      </button>
                    </div>
                  </div>
                )}

                {/* Question Prompt */}
                <div class="cbt-q-content">
                  {activeQuestion.passage_zh && (
                    <div class="cbt-passage-card">
                      <p style="font-weight: 600; margin-bottom: 0.35rem;">{activeQuestion.passage_zh}</p>
                      <p style="font-size: 0.9rem; color: #64748b; margin: 0;">{activeQuestion.passage_pinyin}</p>
                    </div>
                  )}

                  {activeQuestion.statement_zh && (
                    <div style="margin-bottom: 1rem;">
                      <h3 class="cbt-q-text">{activeQuestion.statement_zh}</h3>
                      <div class="cbt-q-pinyin">{activeQuestion.statement_pinyin}</div>
                    </div>
                  )}

                  {activeQuestion.prompt_zh && (
                    <div style="margin-bottom: 1rem;">
                      <h3 class="cbt-q-text">{activeQuestion.prompt_zh}</h3>
                      {activeQuestion.prompt_pinyin && (
                        <div class="cbt-q-pinyin">{activeQuestion.prompt_pinyin}</div>
                      )}
                    </div>
                  )}

                  {activeQuestion.image && (
                    <div class="cbt-illustration-wrap">
                      <img
                        src={activeQuestion.image}
                        alt="Question illustration"
                        class="cbt-illustration-img"
                      />
                    </div>
                  )}

                  {/* True/False Input */}
                  {activeQuestion.type === 'true_false' && (
                    <div class="cbt-tf-grid">
                      <button
                        type="button"
                        class={`cbt-tf-btn ${currentAnswer === true ? 'selected-true' : ''}`}
                        onClick={() => handleSelectAnswer(activeQuestion.id, true)}
                      >
                        <span style="font-size: 1.4rem; color: #10b981; font-weight: 900;">✓</span>
                        <span style="color: #0f172a;">Đúng (对 - Duì)</span>
                      </button>
                      <button
                        type="button"
                        class={`cbt-tf-btn ${currentAnswer === false ? 'selected-false' : ''}`}
                        onClick={() => handleSelectAnswer(activeQuestion.id, false)}
                      >
                        <span style="font-size: 1.4rem; color: #ef4444; font-weight: 900;">✗</span>
                        <span style="color: #0f172a;">Sai (错 - Cuò)</span>
                      </button>
                    </div>
                  )}

                  {/* Multiple Choice Options */}
                  {activeQuestion.options && (
                    <div class="cbt-options-list">
                      {activeQuestion.options.map((opt) => (
                        <div
                          key={opt.key}
                          class={`cbt-option-item ${currentAnswer === opt.key ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(activeQuestion.id, opt.key)}
                        >
                          <input
                            type="radio"
                            name={`q_${activeQuestion.id}`}
                            checked={currentAnswer === opt.key}
                            class="cbt-option-radio"
                            readOnly
                          />
                          <span class="cbt-option-label">{opt.key}.</span>
                          <span class="cbt-option-text">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Footer */}
              <footer class="cbt-nav-footer">
                <button
                  class="cbt-btn-nav"
                  disabled={isFirst}
                  onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                >
                  ⬅️ 上一题 (Câu trước)
                </button>
                <span style="font-size: 0.9rem; color: #64748b;">
                  {Object.keys(userAnswers).length} / {allQuestions.length} đã trả lời
                </span>
                <button
                  class="cbt-btn-nav"
                  disabled={isLast}
                  onClick={() => setCurrentQuestionIdx((i) => Math.min(allQuestions.length - 1, i + 1))}
                >
                  ➡️ 下一题 (Câu sau)
                </button>
              </footer>
            </main>

            {/* Question Palette (答题卡) */}
            <aside class="cbt-palette-panel">
              <h4 class="cbt-palette-title">
                <span>答题卡 (Bảng câu hỏi)</span>
                <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">
                  {Object.keys(userAnswers).length}/{allQuestions.length}
                </span>
              </h4>

              <div class="cbt-palette-legend">
                <div class="cbt-legend-item">
                  <span class="cbt-legend-dot" style="background: #0284c7;"></span>
                  <span>Đã làm</span>
                </div>
                <div class="cbt-legend-item">
                  <span class="cbt-legend-dot" style="background: #cbd5e1;"></span>
                  <span>Chưa làm</span>
                </div>
                <div class="cbt-legend-item">
                  <span>🚩 Xem lại</span>
                </div>
              </div>

              <div>
                <div class="cbt-palette-section-label">一、听力 (Câu 1 - 20)</div>
                <div class="cbt-palette-grid">
                  {allQuestions.slice(0, 20).map((q, idx) => {
                    const isAns = userAnswers[q.id] !== undefined;
                    const isFlag = !!flaggedQuestions[q.id];
                    const isCurr = currentQuestionIdx === idx;
                    return (
                      <button
                        key={q.id}
                        class={`cbt-palette-btn ${isCurr ? 'active' : ''} ${isAns ? 'answered' : ''} ${isFlag ? 'flagged' : ''}`}
                        onClick={() => setCurrentQuestionIdx(idx)}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div class="cbt-palette-section-label">二、阅读 (Câu 21 - 40)</div>
                <div class="cbt-palette-grid">
                  {allQuestions.slice(20, 40).map((q, idx) => {
                    const realIdx = idx + 20;
                    const isAns = userAnswers[q.id] !== undefined;
                    const isFlag = !!flaggedQuestions[q.id];
                    const isCurr = currentQuestionIdx === realIdx;
                    return (
                      <button
                        key={q.id}
                        class={`cbt-palette-btn ${isCurr ? 'active' : ''} ${isAns ? 'answered' : ''} ${isFlag ? 'flagged' : ''}`}
                        onClick={() => setCurrentQuestionIdx(realIdx)}
                      >
                        {realIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: RESULT & DETAILED REVIEW
  // -------------------------------------------------------------------------
  if (examState === 'result' && examResult) {
    const questions = getAllQuestions();
    const filteredQuestions = questions.filter((q) => {
      const isCorrect = userAnswers[q.id] === q.correct_answer;
      if (reviewFilter === 'incorrect') return !isCorrect;
      if (reviewFilter === 'flagged') return !!flaggedQuestions[q.id];
      return true;
    });

    return (
      <div class="exam-container">
        {/* Scorecard Summary */}
        <div class="exam-result-card">
          <div class={`exam-result-stamp ${examResult.isPassed ? 'pass' : 'fail'}`}>
            {examResult.isPassed ? '合格 (ĐẠT TIÊU CHUẨN)' : '未通过 (CHƯA ĐẠT)'}
          </div>
          <h2 style="margin: 0; color: #0f172a;">{examResult.examTitle}</h2>
          <div class="exam-result-score">
            {examResult.totalScore}
            <span style="font-size: 1.25rem; font-weight: 500; color: #64748b;"> / 200</span>
          </div>
          <p style="color: #64748b; margin-bottom: 1rem;">
            Đạt {examResult.correctCount}/{examResult.totalQuestions} câu chính xác (Điểm đỗ chuẩn: 120 điểm)
          </p>

          <div class="exam-score-breakdown">
            <div class="exam-breakdown-item">
              <span class="exam-breakdown-label">Phần thi Nghe (听力)</span>
              <span class="exam-breakdown-val">{examResult.listeningScore} / 100</span>
            </div>
            <div class="exam-breakdown-item">
              <span class="exam-breakdown-label">Phần thi Đọc (阅读)</span>
              <span class="exam-breakdown-val">{examResult.readingScore} / 100</span>
            </div>
          </div>

          <div class="exam-result-actions">
            <button class="exam-btn-secondary" onClick={() => setExamState('lobby')}>
              Trở về danh sách đề
            </button>
            <button class="exam-btn-secondary" onClick={() => startExam(examData.file)}>
              Thi lại đề này
            </button>
            <button class="exam-btn-primary" onClick={addIncorrectWordsToSrs}>
              🎯 Thêm từ vựng sai vào Ôn tập SRS
            </button>
          </div>
        </div>

        {/* Detailed Question Review */}
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; color: #0f172a;">Chữa đề &amp; Giải thích chi tiết</h3>
            <div class="review-filter-tabs">
              <button
                class={`exam-level-tab ${reviewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReviewFilter('all')}
              >
                Tất cả ({questions.length})
              </button>
              <button
                class={`exam-level-tab ${reviewFilter === 'incorrect' ? 'active' : ''}`}
                onClick={() => setReviewFilter('incorrect')}
              >
                Câu làm sai ({questions.filter((q) => userAnswers[q.id] !== q.correct_answer).length})
              </button>
              <button
                class={`exam-level-tab ${reviewFilter === 'flagged' ? 'active' : ''}`}
                onClick={() => setReviewFilter('flagged')}
              >
                Đã gắn cờ ({Object.values(flaggedQuestions).filter(Boolean).length})
              </button>
            </div>
          </div>

          {filteredQuestions.map((q, idx) => {
            const userAns = userAnswers[q.id];
            const isCorrect = userAns === q.correct_answer;
            const displayUserAns = userAns === true ? 'Đúng (对)' : userAns === false ? 'Sai (错)' : (userAns || 'Chưa làm');
            const displayCorrectAns = q.correct_answer === true ? 'Đúng (对)' : q.correct_answer === false ? 'Sai (错)' : q.correct_answer;

            return (
              <div class={`review-card ${isCorrect ? 'correct' : 'incorrect'}`} key={q.id}>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; color: #0f172a;">
                    Câu {q.number}: {q.sectionTitle}
                  </span>
                  <span style={{ fontWeight: 700, color: isCorrect ? '#059669' : '#dc2626' }}>
                    {isCorrect ? '✓ Đúng (+5đ)' : '✗ Sai (0đ)'}
                  </span>
                </div>

                {q.audio_clip && (
                  <div style="margin: 0.5rem 0;">
                    <button
                      class="cbt-audio-play-btn"
                      style="display: inline-flex;"
                      onClick={() => playAudio(q.audio_clip)}
                    >
                      🔊 Nghe lại câu {q.number}
                    </button>
                    {q.audio_text && (
                      <p style="font-size: 0.95rem; color: #0284c7; margin: 0.4rem 0 0 0;">
                        <strong>Audio Script:</strong> {q.audio_text}
                      </p>
                    )}
                  </div>
                )}

                {q.passage_zh && (
                  <p style="font-weight: 600; margin: 0.4rem 0;">{q.passage_zh}</p>
                )}

                {q.statement_zh && (
                  <p style="font-weight: 600; margin: 0.4rem 0;">{q.statement_zh}</p>
                )}

                {q.prompt_zh && (
                  <p style="font-weight: 600; margin: 0.4rem 0;">{q.prompt_zh}</p>
                )}

                <div style="display: flex; gap: 1.5rem; margin: 0.5rem 0; font-size: 0.95rem;">
                  <span>
                    Đáp án của bạn: <strong style={{ color: isCorrect ? '#059669' : '#dc2626' }}>{displayUserAns}</strong>
                  </span>
                  <span>
                    Đáp án chuẩn: <strong style="color: #059669;">{displayCorrectAns}</strong>
                  </span>
                </div>

                <div class="review-explanation">
                  <strong>💡 Lời giải chi tiết:</strong> {q.explanation_vi}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export function mountHsk30ExamView() {
  onDomReady(() => {
    const el = document.getElementById('screenHskExam');
    if (el) {
      render(<Hsk30ExamComponent />, el);
    }
  });
}
