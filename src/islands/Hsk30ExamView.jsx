// src/islands/Hsk30ExamView.jsx
// HSK 3.0 CBT Mock Exam & HSKK Spoken Examination Suite
// Recreates the authentic CTI computer examination environment for both Written CBT (HSK 1-4)
// and Spoken CBT (HSKK Primary, Intermediate, Advanced) with real-time countdown,
// question palette navigation, interactive word reordering (连词成句), Hanzi input,
// microphone recording, audio review, and diagnostic scoring.

import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { onDomReady } from './domReady';
import { LocalSpeechAI } from './LocalSpeechAI.js';
import { cleanChineseCharacters } from './ToneSandhi.js';
import { HskDictationStudio } from './HskDictationStudio.jsx';
import { HskShadowingStudio } from './HskShadowingStudio.jsx';
import { HskErrorNotebook, HSK30_ERROR_NOTEBOOK_KEY } from './HskErrorNotebook.jsx';
import { SpeedPinyinDrill } from './SpeedPinyinDrill.jsx';
import { ReadingSentenceBuilder } from './ReadingSentenceBuilder.jsx';
import { CbtSimulatorShell } from './CbtSimulatorShell.jsx';
import { AiTutorPromptGuide } from './AiTutorPromptGuide.jsx';
import { EXAM_UI_LABELS } from './ExamConstants.js';

export const HSK30_EXAM_STORAGE_KEY = 'hsk30_exam_history_v1';
export const HSKK_EXAM_STORAGE_KEY = 'hskk_exam_history_v1';
export const DEFAULT_EXAM_URL = 'database/exams/hsk30/level1/hsk30_l1_specimen01.json';

// CTI examination part guidelines and examples
export const HSK_PART_INSTRUCTIONS = {
  'listening_1': {
    titleZh: '第一部分：听录音，判断对错',
    titleVi: 'Phần 1: Nghe ghi âm và phán đoán Đúng (✓) / Sai (✗) theo tranh hoặc ngữ cảnh',
    guideZh: '一共 10 个题，每题听两次。',
    guideVi: 'Mỗi câu được xướng số thứ tự và nghe đúng 2 lần theo chuẩn CTI.'
  },
  'listening_2': {
    titleZh: '第二部分：听短对话，选择正确答案',
    titleVi: 'Phần 2: Nghe đối thoại ngắn và chọn đáp án chính xác',
    guideZh: '听对话和问题，从选项中选出正确答案。',
    guideVi: 'Lắng nghe hội thoại và câu hỏi để chọn phương án A/B/C/D.'
  },
  'listening_3': {
    titleZh: '第三部分：听长对话或短文，选择正确答案',
    titleVi: 'Phần 3: Nghe hội thoại dài hoặc đoạn văn và trả lời câu hỏi',
    guideZh: '听长对话或短文，回答给出的题目。',
    guideVi: 'Đoạn văn dài với lượng thông tin phong phú, suy luận logic để chọn đáp án đúng.'
  },
  'reading_1': {
    titleZh: '第二部分：阅读 · 第一部分：选词填空 / 看图选句',
    titleVi: 'Phần 1 (Đọc hiểu): Điền từ vào chỗ trống hoặc ghép câu với hình ảnh',
    guideZh: '选择最恰当的词语完成句子。',
    guideVi: 'Đọc ngữ cảnh câu và chọn từ vựng phù hợp nhất.'
  },
  'reading_2': {
    titleZh: '第二部分：阅读 · 第二部分：排列句子顺序',
    titleVi: 'Phần 2 (Đọc hiểu): Sắp xếp các phân câu A, B, C thành đoạn văn logic',
    guideZh: '排列给出的句子，使其意思连贯完整。',
    guideVi: 'Xác định câu mở đầu, quan hệ nhân quả/bổ sung để xếp đúng trật tự.'
  },
  'reading_3': {
    titleZh: '第二部分：阅读 · 第三部分：阅读理解',
    titleVi: 'Phần 3 (Đọc hiểu): Đọc đoạn văn và trả lời câu hỏi trắc nghiệm',
    guideZh: '根据短文内容选择最佳答案。',
    guideVi: 'Đọc kỹ đoạn văn để tìm dẫn chứng trả lời A/B/C/D.'
  },
  'writing_1': {
    titleZh: '第三部分：书写 · 第一部分：连词成句',
    titleVi: 'Phần 1 (Viết): Nhấn chọn các từ cho sẵn để sắp xếp thành câu hoàn chỉnh',
    guideZh: '点击词块排列词序，组成语法正确的完整句子。',
    guideVi: 'Chú ý trật tự chủ-vị-tân, câu chữ 把/被, và vị trí của định ngữ/trạng ngữ.'
  },
  'writing_2': {
    titleZh: '第三部分：书写 · 第二部分：汉字书写 / 看图造句',
    titleVi: 'Phần 2 (Viết): Viết chữ Hán theo Pinyin hoặc nhìn tranh dùng từ đặt câu',
    guideZh: '看拼音写出对应汉字，或结合图片及给定词语写出一个完整句子。',
    guideVi: 'Viết câu hoàn chỉnh ngữ pháp và diễn đạt trọn vẹn ngữ nghĩa.'
  }
};

/**
 * Play authentic CTI exam electronic beep cue ("嘟"声) using Web Audio API oscillator
 */
function playCtiBeep(freq = 880, duration = 0.35) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Normalize sentence for answer comparison (removes punctuation and spaces)
 */
function normalizeSentence(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[。\.，,！!\?？\s]/g, '');
}

export function Hsk30ExamComponent() {
  // Navigation & Category states
  const [hubMode, setHubMode] = useState('cbt'); // 'cbt' | 'dictation' | 'shadowing' | 'error_notebook' | 'speed_drill' | 'reading_builder' | 'mock_simulator'
  const [specMockData, setSpecMockData] = useState(null);
  const [unresolvedErrorCount, setUnresolvedErrorCount] = useState(0);
  const [examCategory, setExamCategory] = useState('hsk30'); // 'hsk30' (Written CBT) | 'hskk' (Spoken)
  const [examMeta, setExamMeta] = useState(null);
  const [hskkMeta, setHskkMeta] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('hsk30_1'); // 'hsk30_1' | 'hsk30_2' | 'hsk30_3' | 'hsk30_4'
  const [currentHskkLevel, setCurrentHskkLevel] = useState('hskk_primary');
  const [examState, setExamState] = useState('lobby'); // 'lobby' | 'exam' | 'result' | 'hskk_exam' | 'hskk_result'
  const [examData, setExamData] = useState(null);

  // CBT Written Exam state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(35 * 60);
  const [examResult, setExamResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all');

  // Audio & Mic states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showPartExample, setShowPartExample] = useState(false);
  const [isSoundTesting, setIsSoundTesting] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micTestStatus, setMicTestStatus] = useState('');

  // HSKK Spoken Exam state
  const [candidateRecordings, setCandidateRecordings] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [showHskkTranscript, setShowHskkTranscript] = useState({});
  const [hskkResult, setHskkResult] = useState(null);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechAiRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const currentRecordingQuestionRef = useRef(null);

  // Load catalogs on mount
  useEffect(() => {
    fetch('database/exams/hsk30/index.json')
      .then((res) => res.json())
      .then((data) => setExamMeta(data))
      .catch((e) => console.error('Failed to load HSK 3.0 catalog:', e));

    fetch('database/exams/hskk/index.json')
      .then((res) => res.json())
      .then((data) => setHskkMeta(data))
      .catch((e) => console.error('Failed to load HSKK catalog:', e));
  }, []);

  // Sync unresolved errors count from Error Notebook storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HSK30_ERROR_NOTEBOOK_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setUnresolvedErrorCount(list.filter((i) => !i.resolved).length);
        }
      }
    } catch (e) {
      // Graceful fallback
    }
  }, [hubMode]);

  // Timer countdown loop
  useEffect(() => {
    if (examState === 'exam' || examState === 'hskk_exam') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (examState === 'exam') finishExam();
            else if (examState === 'hskk_exam') finishHskkExam();
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
  }, [examState, examData, userAnswers, candidateRecordings]);

  // Flatten questions from examData
  const getAllQuestions = () => {
    if (!examData || !examData.sections) return [];
    const list = [];
    const sectionOrder = ['listening', 'reading', 'writing', 'repeat', 'answer_short', 'picture_story', 'summarize', 'reading_aloud', 'answer_open'];
    
    // Process sections in standard order
    const orderedKeys = [
      ...sectionOrder.filter((k) => !!examData.sections[k]),
      ...Object.keys(examData.sections).filter((k) => !sectionOrder.includes(k)),
    ];

    orderedKeys.forEach((secKey) => {
      const section = examData.sections[secKey];
      if (section && Array.isArray(section.questions)) {
        section.questions.forEach((q) => {
          list.push({
            ...q,
            sectionKey: secKey,
            sectionName: section.name || section.name_vi || secKey,
            sectionTitleZh: section.name_zh || section.name,
            sectionTitleVi: section.name_vi,
            guideZh: section.guide_zh,
            guideVi: section.guide_vi,
            recordSeconds: section.record_seconds || q.record_seconds || 10,
          });
        });
      }
    });
    return list;
  };

  const allQuestions = getAllQuestions();
  const activeQuestion = allQuestions[currentQuestionIdx] || null;

  // Auto-play audio on question switch for CBT listening and stop active recordings
  useEffect(() => {
    if (isRecording) {
      stopRecordingQuestion();
    }
    setLiveTranscript('');
    if (examState === 'exam' && activeQuestion && activeQuestion.audio_clip) {
      playAudio(activeQuestion.audio_clip);
    } else {
      stopAudio();
    }
  }, [currentQuestionIdx, examState]);

  // Clean up timers, audio, and speech recognition on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (speechAiRef.current) {
        speechAiRef.current.stopListening();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      audioRef.current.play().catch(() => setIsPlayingAudio(false));
    } catch (e) {
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const setAudioSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const runSoundTest = () => {
    stopAudio();
    setIsSoundTesting(true);
    const testAudio = new Audio('assets/audio/exams/hsk30/level1/h10901_l01.mp3');
    testAudio.onended = () => setIsSoundTesting(false);
    testAudio.onerror = () => setIsSoundTesting(false);
    testAudio.play().catch(() => setIsSoundTesting(false));
  };

  // Test microphone recording for 3 seconds
  const runMicTest = async () => {
    try {
      setIsMicTesting(true);
      setMicTestStatus('Đang xin quyền truy cập micro...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      setMicTestStatus('🎙️ Đang ghi âm 3 giây thử giọng... Hãy nói "Nǐ hǎo"');
      playCtiBeep(880, 0.25);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const testUrl = URL.createObjectURL(blob);
        setMicTestStatus('🔊 Đang phát lại giọng của bạn qua loa...');
        const playback = new Audio(testUrl);
        playback.onended = () => {
          setMicTestStatus('✅ Micro & Tai nghe hoạt động rất tốt!');
          setIsMicTesting(false);
        };
        playback.play().catch(() => {
          setMicTestStatus('✅ Ghi âm thành công!');
          setIsMicTesting(false);
        });
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          playCtiBeep(660, 0.25);
          recorder.stop();
        }
      }, 3000);
    } catch (err) {
      setIsMicTesting(false);
      setMicTestStatus('❌ Không thể mở micro: ' + err.message);
      alert('Vui lòng cấp quyền truy cập Micro trên trình duyệt để thi khẩu ngữ HSKK.');
    }
  };

  // Start CBT Written Exam
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

  // Start HSKK Spoken Exam
  const startHskkExam = async (filePath) => {
    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error('Cannot load HSKK exam file');
      const data = await res.json();
      setExamData(data);
      setCandidateRecordings({});
      setCurrentQuestionIdx(0);
      setTimeRemaining((data.time_minutes || 20) * 60);
      setIsRecording(false);
      setRecordingSeconds(0);
      setShowHskkTranscript({});
      setExamState('hskk_exam');
    } catch (err) {
      alert('Không thể tải đề thi HSKK: ' + err.message);
    }
  };

  // Stop candidate voice recording
  const stopRecordingQuestion = () => {
    if (speechAiRef.current) {
      speechAiRef.current.stopListening();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Hsk30ExamView] MediaRecorder stop error:', err);
      }
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Start candidate voice recording for HSKK question
  const startRecordingQuestion = async () => {
    if (!activeQuestion) return;
    try {
      stopAudio();
      playCtiBeep(880, 0.35);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      currentRecordingQuestionRef.current = activeQuestion;
      recordingStartTimeRef.current = Date.now();

      // Initialize and start Speech Recognition in Mandarin (zh-CN)
      if (!speechAiRef.current) {
        speechAiRef.current = new LocalSpeechAI();
      }
      setLiveTranscript('');
      try {
        speechAiRef.current.startListening({
          onResult: ({ transcript }) => {
            setLiveTranscript(transcript);
          },
          onError: (err) => {
            console.warn('[Hsk30ExamView] Speech recognition error:', err);
          },
        });
      } catch (speechErr) {
        console.warn('[Hsk30ExamView] Failed to start speech recognition:', speechErr);
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const blobUrl = URL.createObjectURL(blob);

        const targetQ = currentRecordingQuestionRef.current || activeQuestion;
        const actualSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        const rawTranscript = (speechAiRef.current && speechAiRef.current.currentTranscript) || liveTranscript || '';
        const cleanRec = cleanChineseCharacters(rawTranscript);

        let evaluatedScore = 0;
        let note = '';

        if (!speechAiRef.current || !speechAiRef.current.isSupported) {
          evaluatedScore = null;
          note = 'Trình duyệt chưa hỗ trợ Web Speech API để tự động chấm điểm. Bản ghi âm đã được lưu để tự nghe lại đối chiếu.';
        } else if (!cleanRec || cleanRec.length === 0) {
          // Candidate spoke Vietnamese, non-Chinese language, or stayed silent
          evaluatedScore = 0;
          note = '⚠️ Không phát hiện khẩu ngữ tiếng Trung trong câu trả lời (0 điểm). Vui lòng phát âm tiếng Trung theo đề thi.';
        } else {
          // Chinese speech recognized
          const targetZh = targetQ.prompt_zh || '';
          const suggestedZh = targetQ.suggested_zh || '';
          const cleanPrompt = cleanChineseCharacters(targetZh);
          const isRepeatPart = (targetQ.sectionKey || '').includes('repeat') || targetQ.part === 1 || (!suggestedZh && cleanPrompt.length > 2);

          if (isRepeatPart && cleanPrompt) {
            // Part 1: Repeat after audio - evaluate phonetic and character match against target sentence
            const match = LocalSpeechAI.evaluateTextMatch(rawTranscript, cleanPrompt, targetQ.pinyin || '');
            evaluatedScore = match.matchScore;
            if (evaluatedScore >= 80) {
              note = 'Xuất sắc! Bạn đã nhắc lại câu tiếng Trung rất chuẩn xác và rõ ràng.';
            } else if (evaluatedScore >= 50) {
              note = 'Khá tốt! Bạn đã nhắc lại được phần lớn câu, hãy chú ý các âm tiết chưa khớp.';
            } else {
              note = 'Nội dung nhắc lại chưa khớp hoặc phát âm lệch nhiều so với câu mẫu.';
            }
          } else {
            // Part 2 & 3: Answer questions or monologue / picture story
            let keywordMatches = 0;
            const keywordsToCheck = cleanChineseCharacters(suggestedZh || targetZh);
            for (const char of cleanRec) {
              if (keywordsToCheck.includes(char)) keywordMatches++;
            }

            const charCount = cleanRec.length;
            const lengthScore = Math.min(60, charCount * 6);
            const relevanceScore = Math.min(30, keywordMatches * 5);
            const fluencyScore = Math.min(10, Math.round((actualSec / (targetQ.recordSeconds || 10)) * 10));

            evaluatedScore = Math.min(100, Math.max(30, lengthScore + relevanceScore + fluencyScore));
            if (evaluatedScore >= 80) {
              note = 'Câu trả lời tiếng Trung phong phú, lưu loát và đúng trọng tâm câu hỏi.';
            } else if (evaluatedScore >= 60) {
              note = 'Đã trả lời bằng tiếng Trung đạt yêu cầu cơ bản.';
            } else {
              note = 'Câu trả lời tiếng Trung còn quá ngắn. Hãy cố gắng trả lời thành câu hoàn chỉnh.';
            }
          }
        }

        setCandidateRecordings((prev) => ({
          ...prev,
          [targetQ.id]: {
            blob,
            url: blobUrl,
            duration: actualSec,
            aiScore: evaluatedScore,
            transcript: rawTranscript,
            evaluationNote: note,
            recordedAt: new Date().toLocaleTimeString(),
          },
        }));
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        playCtiBeep(660, 0.3);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const maxSec = activeQuestion.recordSeconds || 10;
          if (prev + 1 >= maxSec) {
            stopRecordingQuestion();
            return maxSec;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      alert('Lỗi truy cập micro: ' + e.message);
      setIsRecording(false);
    }
  };

  const handleSelectAnswer = (qId, answer) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  // Handle word reordering click
  const handleToggleWordReorder = (qId, word, wordsList) => {
    const currentAns = userAnswers[qId] || [];
    const currentWords = Array.isArray(currentAns) ? [...currentAns] : [];
    
    // If word is already in the list, remove the last occurrence
    const idx = currentWords.lastIndexOf(word);
    if (idx !== -1) {
      currentWords.splice(idx, 1);
    } else {
      currentWords.push(word);
    }

    handleSelectAnswer(qId, currentWords);
  };

  const resetWordReorder = (qId) => {
    handleSelectAnswer(qId, []);
  };

  const toggleFlag = (qId) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Finish Written CBT Exam
  const finishExam = () => {
    stopAudio();
    if (timerRef.current) clearInterval(timerRef.current);
    if (!examData) return;

    const questions = getAllQuestions();
    let listeningCorrect = 0;
    let readingCorrect = 0;
    let writingCorrect = 0;
    let listeningTotal = 0;
    let readingTotal = 0;
    let writingTotal = 0;
    const wrongQuestions = [];

    questions.forEach((q) => {
      const userAns = userAnswers[q.id];
      let isCorrect = false;

      if (q.type === 'word_reorder') {
        const assembled = Array.isArray(userAns) ? userAns.join('') : (userAns || '');
        isCorrect = normalizeSentence(assembled) === normalizeSentence(q.correct_answer);
      } else if (q.type === 'hanzi_fill') {
        isCorrect = String(userAns || '').trim() === String(q.correct_answer || '').trim();
      } else if (q.type === 'picture_sentence') {
        isCorrect = typeof userAns === 'string' && userAns.trim().length >= 4;
      } else {
        isCorrect = userAns === q.correct_answer || String(userAns) === String(q.correct_answer);
      }

      if (!isCorrect) {
        wrongQuestions.push({
          question: q,
          userAns: userAns,
          sectionKey: q.sectionKey || (q.sectionName && q.sectionName.includes('听力') ? 'listening' : q.sectionName && q.sectionName.includes('书写') ? 'writing' : 'reading')
        });
      }

      if (q.sectionKey === 'listening' || q.sectionName.includes('听力')) {
        listeningTotal += 1;
        if (isCorrect) listeningCorrect += 1;
      } else if (q.sectionKey === 'writing' || q.sectionName.includes('书写')) {
        writingTotal += 1;
        if (isCorrect) writingCorrect += 1;
      } else {
        readingTotal += 1;
        if (isCorrect) readingCorrect += 1;
      }
    });

    const hasWriting = writingTotal > 0;
    const listeningScore = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
    const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;
    const writingScore = hasWriting ? Math.round((writingCorrect / writingTotal) * 100) : 0;
    const totalScore = listeningScore + readingScore + writingScore;
    const maxScore = examData.max_score || (hasWriting ? 300 : 200);
    const passScore = examData.pass_score || (hasWriting ? 180 : 120);
    const isPassed = totalScore >= passScore;

    const resultObj = {
      examId: examData.id,
      examTitle: examData.title,
      date: new Date().toISOString(),
      totalScore,
      maxScore,
      passScore,
      isPassed,
      hasWriting,
      listeningScore,
      readingScore,
      writingScore,
      totalQuestions: questions.length,
      correctCount: listeningCorrect + readingCorrect + writingCorrect,
      userAnswers: { ...userAnswers },
    };

    setExamResult(resultObj);
    setExamState('result');

    // Auto record wrong questions to Error Notebook
    try {
      const existingRaw = localStorage.getItem(HSK30_ERROR_NOTEBOOK_KEY);
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const existingMap = new Map(existingList.map((item) => [item.id, item]));

      wrongQuestions.forEach((wq) => {
        const errId = `${examData.id}_q${wq.question.number}`;
        const prev = existingMap.get(errId);
        existingMap.set(errId, {
          id: errId,
          examId: examData.id,
          examTitle: examData.title,
          level: currentLevel,
          partType: wq.sectionKey,
          questionNumber: wq.question.number,
          questionData: wq.question,
          userWrongAnswer: wq.userAns,
          attemptCount: prev ? (prev.attemptCount || 1) + 1 : 1,
          resolved: false,
          savedAt: Date.now()
        });
      });

      const updatedErrors = Array.from(existingMap.values()).slice(0, 100);
      localStorage.setItem(HSK30_ERROR_NOTEBOOK_KEY, JSON.stringify(updatedErrors));
      setUnresolvedErrorCount(updatedErrors.filter((i) => !i.resolved).length);
    } catch (e) {
      console.error('Failed to update error notebook:', e);
    }

    try {
      const raw = localStorage.getItem(HSK30_EXAM_STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.unshift(resultObj);
      localStorage.setItem(HSK30_EXAM_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.error('Failed to save exam record:', e);
    }
  };

  // Finish HSKK Spoken Exam
  const finishHskkExam = () => {
    stopAudio();
    stopRecordingQuestion();
    if (timerRef.current) clearInterval(timerRef.current);
    if (!examData) return;

    const questions = getAllQuestions();
    const recordedIds = Object.keys(candidateRecordings);
    const recordedCount = recordedIds.length;
    const completionRate = Math.round((recordedCount / questions.length) * 100);

    let totalScore = 0;
    recordedIds.forEach((id) => {
      const rec = candidateRecordings[id];
      const score = (rec && typeof rec.aiScore === 'number') ? rec.aiScore : 0;
      totalScore += score;
    });
    const avgScore = recordedCount > 0 ? Math.round(totalScore / recordedCount) : 0;
    const finalScore = Math.round(avgScore * (recordedCount / questions.length));
    const isPassed = finalScore >= (examData.pass_score || 60);

    const resultObj = {
      examId: examData.id,
      examTitle: examData.title,
      date: new Date().toISOString(),
      totalQuestions: questions.length,
      recordedCount,
      completionRate,
      finalScore,
      passScore: examData.pass_score || 60,
      isPassed,
      candidateRecordings: { ...candidateRecordings },
    };

    setHskkResult(resultObj);
    setExamState('hskk_result');

    try {
      const raw = localStorage.getItem(HSKK_EXAM_STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.unshift({
        examId: examData.id,
        examTitle: examData.title,
        date: resultObj.date,
        finalScore,
        recordedCount,
        totalQuestions: questions.length,
        isPassed,
      });
      localStorage.setItem(HSKK_EXAM_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.error('Failed to save HSKK history:', e);
    }
  };

  const confirmSubmitHskk = () => {
    const recordedCount = Object.keys(candidateRecordings).length;
    const total = allQuestions.length;
    const unRecorded = total - recordedCount;
    const msg = unRecorded > 0
      ? `Bạn còn ${unRecorded} câu chưa ghi âm câu trả lời. Bạn có chắc chắn muốn nộp bài thi nói HSKK ngay bây giờ?`
      : 'Bạn đã ghi âm hoàn thành tất cả câu hỏi! Bạn có muốn nộp bài thi nói và xem bảng đánh giá không?';
    if (window.confirm(msg)) {
      finishHskkExam();
    }
  };

  const confirmSubmitCbt = () => {
    const answeredCount = Object.keys(userAnswers).length;
    const total = allQuestions.length;
    const unAnswered = total - answeredCount;
    const msg = unAnswered > 0
      ? `Bạn còn ${unAnswered} câu chưa hoàn thành. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`
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

  const getCurrentPartInfo = () => {
    if (!activeQuestion) return null;
    const key = `${activeQuestion.sectionKey}_${activeQuestion.part}`;
    return HSK_PART_INSTRUCTIONS[key] || null;
  };

  // Group questions by section for palette
  const getPaletteSections = () => {
    const sections = [];
    const listening = allQuestions.filter((q) => q.sectionKey === 'listening' || q.sectionName.includes('听力'));
    const reading = allQuestions.filter((q) => q.sectionKey === 'reading' || q.sectionName.includes('阅读'));
    const writing = allQuestions.filter((q) => q.sectionKey === 'writing' || q.sectionName.includes('书写'));

    if (listening.length > 0) sections.push({ name: '一、听力 (Nghe)', questions: listening });
    if (reading.length > 0) sections.push({ name: '二、阅读 (Đọc)', questions: reading });
    if (writing.length > 0) sections.push({ name: '三、书写 (Viết)', questions: writing });

    return sections.length > 0 ? sections : [{ name: 'Danh sách câu hỏi', questions: allQuestions }];
  };

  // -------------------------------------------------------------------------
  // RENDER: LOBBY
  // -------------------------------------------------------------------------
  if (examState === 'lobby') {
    if (hubMode === 'dictation') {
      return <HskDictationStudio onBack={() => setHubMode('cbt')} />;
    }
    if (hubMode === 'shadowing') {
      return <HskShadowingStudio onBack={() => setHubMode('cbt')} />;
    }
    if (hubMode === 'error_notebook') {
      return (
        <HskErrorNotebook
          onBack={() => setHubMode('cbt')}
          onStartExam={() => setHubMode('cbt')}
        />
      );
    }
    if (hubMode === 'speed_drill') {
      return <SpeedPinyinDrill onBack={() => setHubMode('cbt')} />;
    }
    if (hubMode === 'reading_builder') {
      return <ReadingSentenceBuilder onBack={() => setHubMode('cbt')} />;
    }
    if (hubMode === 'ai_live_tutor') {
      return <AiTutorPromptGuide onBack={() => setHubMode('cbt')} />;
    }
    if (hubMode === 'mock_simulator') {
      return (
        <CbtSimulatorShell
          rawExam={specMockData}
          onBack={() => setHubMode('cbt')}
        />
      );
    }

    const isHsk30 = examCategory === 'hsk30';
    const hsk30Obj = examMeta && examMeta.levels && examMeta.levels[currentLevel];
    const hsk30Exams = hsk30Obj ? hsk30Obj.exams : [];

    const hskkObj = hskkMeta && hskkMeta.levels && hskkMeta.levels[currentHskkLevel];
    const hskkExams = hskkObj ? hskkObj.exams : [];

    return (
      <div class="exam-container">
        <div class="exam-lobby">
          {/* Top Exam Hub Mode Selector */}
          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.85rem;">
            <button
              type="button"
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                border: hubMode === 'cbt' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: hubMode === 'cbt' ? '#0284c7' : '#ffffff',
                color: hubMode === 'cbt' ? '#ffffff' : '#334155',
                boxShadow: hubMode === 'cbt' ? '0 3px 8px rgba(2,132,199,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              onClick={() => setHubMode('cbt')}
            >
              📝 Thi thử CBT & Khẩu ngữ
            </button>

            <button
              type="button"
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                border: hubMode === 'dictation' ? '2px solid #059669' : '1px solid #cbd5e1',
                background: hubMode === 'dictation' ? '#059669' : '#ffffff',
                color: hubMode === 'dictation' ? '#ffffff' : '#334155',
                boxShadow: hubMode === 'dictation' ? '0 3px 8px rgba(5,150,105,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              onClick={() => setHubMode('dictation')}
            >
              ✍️ Nghe chép chính tả (听写)
            </button>

            <button
              type="button"
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                border: hubMode === 'shadowing' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                background: hubMode === 'shadowing' ? '#0d9488' : '#ffffff',
                color: hubMode === 'shadowing' ? '#ffffff' : '#334155',
                boxShadow: hubMode === 'shadowing' ? '0 3px 8px rgba(13,148,136,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              onClick={() => setHubMode('shadowing')}
            >
              🎙️ Nghe nhại & Cao độ (跟读)
            </button>

            <button
              type="button"
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                border: hubMode === 'error_notebook' ? '2px solid #c2410c' : '1px solid #cbd5e1',
                background: hubMode === 'error_notebook' ? '#c2410c' : '#ffffff',
                color: hubMode === 'error_notebook' ? '#ffffff' : '#334155',
                boxShadow: hubMode === 'error_notebook' ? '0 3px 8px rgba(194,65,12,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              onClick={() => setHubMode('error_notebook')}
            >
              📕 Sổ tay câu sai (错题本)
              {unresolvedErrorCount > 0 && (
                <span style="background: #fee2e2; color: #991b1b; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800;">
                  {unresolvedErrorCount}
                </span>
              )}
            </button>

            <button
              type="button"
              class="exam-pill-btn"
              onClick={() => setHubMode('speed_drill')}
            >
              {EXAM_UI_LABELS.hubTabs.speedDrill}
            </button>

            <button
              type="button"
              class="exam-pill-btn"
              onClick={() => setHubMode('reading_builder')}
            >
              {EXAM_UI_LABELS.hubTabs.readingBuilder}
            </button>

            <button
              type="button"
              class="exam-pill-btn"
              onClick={() => {
                fetch('database/exams/hsk30/level4/hsk3_lv4_mock_01.json')
                  .then((r) => r.json())
                  .then((d) => {
                    setSpecMockData(d);
                    setHubMode('mock_simulator');
                  })
                  .catch((err) => console.error('Failed to load mock simulator paper:', err));
              }}
            >
              {EXAM_UI_LABELS.hubTabs.mockSimulator}
            </button>

            <button
              type="button"
              class="exam-pill-btn"
              onClick={() => setHubMode('ai_live_tutor')}
            >
              {EXAM_UI_LABELS.hubTabs.aiLiveTutor}
            </button>
          </div>

          <div class="exam-hero">
            <div>
              <h1 class="exam-hero-title">
                {isHsk30 ? 'Luyện thi HSK 3.0 Chuẩn Hóa' : 'Luyện thi Khẩu ngữ HSKK (口语考试)'}
                <span class="exam-badge">{isHsk30 ? 'Mô phỏng CBT 机考' : 'Khẩu ngữ 口试'}</span>
              </h1>
              <p class="exam-hero-desc">
                {isHsk30
                  ? 'Phòng thi máy tính trực tuyến mô phỏng 1:1 theo chuẩn CTI (汉考国际). Đầy đủ cấp 1 đến cấp 4, kèm âm thanh chuẩn studio, kéo thả sắp xếp câu và phân tích điểm chi tiết.'
                  : 'Phòng thi khẩu ngữ chuẩn hóa CTI: Đầy đủ 3 cấp Sơ cấp, Trung cấp, Cao cấp. Ghi âm trực tiếp, âm hiệu "嘟" chuẩn quốc tế, kiểm tra phát âm và gợi ý câu trả lời đạt điểm cao.'}
              </p>
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
              <button
                type="button"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: isHsk30 ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: isHsk30 ? '#0284c7' : '#ffffff',
                  color: isHsk30 ? '#ffffff' : '#475569',
                  boxShadow: isHsk30 ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onClick={() => setExamCategory('hsk30')}
              >
                📝 HSK 3.0 Bút thi (机考 CBT)
              </button>
              <button
                type="button"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: !isHsk30 ? '2px solid #e11d48' : '1px solid #cbd5e1',
                  background: !isHsk30 ? '#e11d48' : '#ffffff',
                  color: !isHsk30 ? '#ffffff' : '#475569',
                  boxShadow: !isHsk30 ? '0 4px 12px rgba(225, 29, 72, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onClick={() => setExamCategory('hskk')}
              >
                🎙️ HSKK Khẩu ngữ (口语考试)
              </button>
            </div>

            {isHsk30 ? (
              <div class="exam-level-tabs">
                <button
                  class={`exam-level-tab ${currentLevel === 'hsk30_1' ? 'active' : ''}`}
                  onClick={() => setCurrentLevel('hsk30_1')}
                >
                  HSK 1 (3.0)
                </button>
                <button
                  class={`exam-level-tab ${currentLevel === 'hsk30_2' ? 'active' : ''}`}
                  onClick={() => setCurrentLevel('hsk30_2')}
                >
                  HSK 2 (3.0)
                </button>
                <button
                  class={`exam-level-tab ${currentLevel === 'hsk30_3' ? 'active' : ''}`}
                  onClick={() => setCurrentLevel('hsk30_3')}
                >
                  HSK 3 (3.0)
                </button>
                <button
                  class={`exam-level-tab ${currentLevel === 'hsk30_4' ? 'active' : ''}`}
                  onClick={() => setCurrentLevel('hsk30_4')}
                >
                  HSK 4 (3.0)
                </button>
              </div>
            ) : (
              <div class="exam-level-tabs">
                <button
                  class={`exam-level-tab ${currentHskkLevel === 'hskk_primary' ? 'active' : ''}`}
                  onClick={() => setCurrentHskkLevel('hskk_primary')}
                >
                  HSKK Sơ cấp (初级)
                </button>
                <button
                  class={`exam-level-tab ${currentHskkLevel === 'hskk_intermediate' ? 'active' : ''}`}
                  onClick={() => setCurrentHskkLevel('hskk_intermediate')}
                >
                  HSKK Trung cấp (中级)
                </button>
                <button
                  class={`exam-level-tab ${currentHskkLevel === 'hskk_advanced' ? 'active' : ''}`}
                  onClick={() => setCurrentHskkLevel('hskk_advanced')}
                >
                  HSKK Cao cấp (高级)
                </button>
              </div>
            )}
          </div>

          {/* Test Equipment & Guidelines Card */}
          <div style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h3 style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: #0f172a;">
                  {isHsk30 ? '📢 考生须知 · Quy chế phòng thi máy tính CBT' : '📢 考生须知 · Hướng dẫn phòng thi khẩu ngữ HSKK'}
                </h3>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b;">
                  {isHsk30
                    ? 'Trước khi bắt đầu, hãy kiểm tra âm thanh tai nghe và nắm rõ cấu trúc đề thi chính thức.'
                    : 'Kiểm tra micro trước khi làm bài thi nói để đảm bảo giọng của bạn được thu rõ ràng.'}
                </p>
              </div>

              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button
                  type="button"
                  style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid #0284c7; background: rgba(2, 132, 199, 0.08); color: #0284c7; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;"
                  onClick={runSoundTest}
                >
                  {isSoundTesting ? '🔊 Đang phát âm thanh...' : '🎧 试音 (Thử tai nghe)'}
                </button>
                <button
                  type="button"
                  style="padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid #e11d48; background: rgba(225, 29, 72, 0.08); color: #e11d48; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;"
                  onClick={runMicTest}
                >
                  {isMicTesting ? '🔴 Đang thử ghi âm...' : '🎙️ 试麦 (Thử Micro)'}
                </button>
              </div>
            </div>

            {micTestStatus && (
              <div style="padding: 0.75rem 1rem; border-radius: 0.5rem; background: #f0fdf4; border: 1px solid #86efac; color: #166534; font-size: 0.9rem; font-weight: 600;">
                {micTestStatus}
              </div>
            )}

            {isHsk30 ? (
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; font-size: 0.875rem; background: var(--bg-surface, #f8fafc); padding: 1rem; border-radius: 0.75rem; line-height: 1.6;">
                <div>
                  <strong style="color: #0284c7;">1. Cấu trúc bài thi máy tính:</strong>
                  <div>• HSK 1: 40 câu (Nghe 20, Đọc 20) - 35 phút (Thang điểm: 200, Đỗ: 120đ).</div>
                  <div>• HSK 2: 60 câu (Nghe 35, Đọc 25) - 55 phút (Thang điểm: 200, Đỗ: 120đ).</div>
                  <div>• HSK 3: 80 câu (Nghe 40, Đọc 30, Viết 10) - 90 phút (Thang điểm: 300, Đỗ: 180đ).</div>
                  <div>• HSK 4: 100 câu (Nghe 45, Đọc 40, Viết 15) - 105 phút (Thang điểm: 300, Đỗ: 180đ).</div>
                </div>
                <div>
                  <strong style="color: #0284c7;">2. Kỹ năng Viết (书写) tương tác:</strong>
                  <div>• 连词成句 (Sắp xếp từ): Nhấn chọn các từ ngữ cho sẵn để xếp thành câu đúng ngữ pháp.</div>
                  <div>• 选词/写汉字: Điền chữ Hán chuẩn xác theo pinyin gợi ý.</div>
                  <div>• 看图造句: Nhìn tranh và dùng từ vựng quy định để đặt câu hoàn chỉnh.</div>
                </div>
                <div>
                  <strong style="color: #0284c7;">3. Tiêu chuẩn âm thanh chuẩn CTI:</strong>
                  <div>• Mỗi câu nghe được phát xướng số thứ tự câu ("第一题。") và đọc đúng 2 lần.</div>
                  <div>• Khoảng nghỉ giữa 2 lần đọc chuẩn 3.5 giây theo quy chuẩn quốc tế.</div>
                </div>
              </div>
            ) : (
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; font-size: 0.875rem; background: #fff1f2; padding: 1rem; border-radius: 0.75rem; line-height: 1.6; border: 1px solid #fecdd3;">
                <div>
                  <strong style="color: #be123c;">1. Cấu trúc bài thi khẩu ngữ HSKK:</strong>
                  <div>• Sơ cấp: 27 câu (15 câu nhắc lại, 10 câu hỏi ngắn, 2 câu tự giới thiệu).</div>
                  <div>• Trung cấp: 14 câu (10 câu nhắc lại, 2 bức tranh kể chuyện, 2 câu nghị luận).</div>
                  <div>• Cao cấp: 6 câu (3 đoạn tóm tắt, 1 đoạn đọc to, 2 câu chuyên sâu).</div>
                </div>
                <div>
                  <strong style="color: #be123c;">2. Tín hiệu âm thanh chuẩn CTI:</strong>
                  <div>• Sau khi nghe câu hỏi, hãy chú ý lắng nghe tiếng <strong>"Bíp 🔔" (嘟声)</strong>.</div>
                  <div>• Bắt đầu nói ngay khi nghe tiếng bíp và hoàn thành trong thời gian quy định.</div>
                </div>
              </div>
            )}
          </div>

          {/* Exam Cards Grid */}
          <div class="exam-card-grid">
            {isHsk30
              ? hsk30Exams.map((item) => (
                  <div class="exam-card" key={item.id}>
                    <div>
                      <div class="exam-card-header">
                        <span class="exam-card-code">{item.code}</span>
                        <span style="font-size: 0.85rem; font-weight: 600; color: #10b981;">Chính thức CTI</span>
                      </div>
                      <h3 class="exam-card-title">{item.title}</h3>
                      <p class="exam-card-desc">{item.subtitle}</p>
                      <div class="exam-card-meta">
                        <span class="exam-meta-item">⏱️ {item.time_minutes} phút</span>
                        <span class="exam-meta-item">📝 {item.listening_questions + item.reading_questions + (item.writing_questions || 0)} câu hỏi</span>
                        <span class="exam-meta-item">🎯 Điểm đạt: {hsk30Obj ? hsk30Obj.pass_score : 180}/{hsk30Obj ? hsk30Obj.max_score : 300}</span>
                      </div>
                    </div>
                    <button class="exam-start-btn" onClick={() => startExam(item.file)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Bắt đầu vào thi (开始考试)
                    </button>
                  </div>
                ))
              : hskkExams.map((item) => (
                  <div class="exam-card" key={item.id} style="border-top: 4px solid #e11d48;">
                    <div>
                      <div class="exam-card-header">
                        <span class="exam-card-code" style="background: rgba(225, 29, 72, 0.1); color: #e11d48;">
                          {item.code}
                        </span>
                        <span style="font-size: 0.85rem; font-weight: 600; color: #e11d48;">Khẩu ngữ CTI</span>
                      </div>
                      <h3 class="exam-card-title">{item.title}</h3>
                      <p class="exam-card-desc">{item.subtitle}</p>
                      <div class="exam-card-meta">
                        <span class="exam-meta-item">⏱️ {item.time_minutes} phút</span>
                        <span class="exam-meta-item">🎙️ Đầy đủ audio &amp; mic</span>
                        <span class="exam-meta-item">🎯 Điểm đạt: 60/100</span>
                      </div>
                    </div>
                    <button
                      class="exam-start-btn"
                      style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);"
                      onClick={() => startHskkExam(item.file)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Bắt đầu thi nói (开始口试)
                    </button>
                  </div>
                ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: HSKK SPOKEN EXAM RUNNER
  // -------------------------------------------------------------------------
  if (examState === 'hskk_exam' && activeQuestion) {
    const isFirst = currentQuestionIdx === 0;
    const isLast = currentQuestionIdx === allQuestions.length - 1;
    const currentRec = candidateRecordings[activeQuestion.id];
    const isTimerWarning = timeRemaining < 180;
    const isVisibleTranscript = !!showHskkTranscript[activeQuestion.id];

    return (
      <div class="exam-container">
        <div class="cbt-exam-wrapper" style="border-top: 4px solid #e11d48;">
          <header class="cbt-top-bar" style="background: linear-gradient(90deg, #881337 0%, #4c0519 100%);">
            <div class="cbt-title-group">
              <span class="cbt-logo" style="background: #e11d48;">HSKK</span>
              <span class="cbt-exam-name">{examData.title}</span>
            </div>
            <div class="cbt-controls-group">
              <div class={`cbt-timer ${isTimerWarning ? 'warning' : ''}`} title="Thời gian thi nói còn lại">
                ⏱️ {formatTimer(timeRemaining)}
              </div>
              <button
                class="cbt-btn-submit"
                style="background: #e11d48; border-color: #be123c;"
                onClick={confirmSubmitHskk}
              >
                交卷 (Nộp bài thi nói)
              </button>
            </div>
          </header>

          <div class="cbt-section-bar">
            <div>
              <span class="cbt-section-badge" style="background: #be123c;">
                {activeQuestion.sectionTitleZh || activeQuestion.sectionName}
              </span>
              <span style="margin-left: 0.75rem; color: #475569; font-weight: 600;">
                Câu hỏi {currentQuestionIdx + 1} / {allQuestions.length}
              </span>
            </div>
            <div style="font-size: 0.85rem; color: #be123c; font-weight: 600;">
              🎙️ Thời gian trả lời quy định: {activeQuestion.recordSeconds} giây
            </div>
          </div>

          <div class="cbt-body-layout">
            <main class="cbt-main-area">
              <div class="cbt-part-banner" style="background: #fff1f2; border-left: 4px solid #e11d48;">
                <div style="font-weight: 700; color: #9f1239; font-size: 1rem;">
                  {activeQuestion.sectionTitleZh} ({activeQuestion.sectionTitleVi})
                </div>
                <div style="font-size: 0.85rem; color: #4b5563; margin-top: 0.25rem;">
                  {activeQuestion.guideZh} — <em>{activeQuestion.guideVi}</em>
                </div>
              </div>

              {activeQuestion.audio_clip && (
                <div class="cbt-audio-box" style="border-left: 4px solid #0284c7;">
                  <div class="cbt-audio-status">
                    {isPlayingAudio ? (
                      <>
                        <span class="audio-wave-anim">🔊</span>
                        <span style="color: #0369a1; font-weight: 600;">Đang phát câu hỏi mẫu chuẩn CTI...</span>
                      </>
                    ) : (
                      <>
                        <span>🎧</span>
                        <span>Đoạn ghi âm câu hỏi</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    class="cbt-audio-play-btn"
                    onClick={() => playAudio(activeQuestion.audio_clip)}
                  >
                    ▶ Phát audio câu {activeQuestion.number}
                  </button>
                </div>
              )}

              <div class="cbt-q-content" style="padding: 1.5rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid #f1f5f9;">
                {activeQuestion.image && (
                  <div class="cbt-illustration-wrap" style="margin-bottom: 1.25rem;">
                    <img src={activeQuestion.image} alt="HSKK prompt" class="cbt-illustration-img" />
                  </div>
                )}

                <div style="margin-bottom: 1.5rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase;">
                      Nội dung câu hỏi:
                    </span>
                    <button
                      type="button"
                      style="background: none; border: none; color: #0284c7; font-size: 0.85rem; cursor: pointer; text-decoration: underline;"
                      onClick={() =>
                        setShowHskkTranscript((prev) => ({
                          ...prev,
                          [activeQuestion.id]: !prev[activeQuestion.id],
                        }))
                      }
                    >
                      {isVisibleTranscript ? 'Ẩn văn bản mẫu' : '👁️ Xem văn bản câu hỏi'}
                    </button>
                  </div>

                  {isVisibleTranscript ? (
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border: 1px dashed #cbd5e1;">
                      <h3 style="margin: 0 0 0.25rem 0; font-size: 1.25rem; color: #0f172a; line-height: 1.5;">
                        {activeQuestion.prompt_zh}
                      </h3>
                      {activeQuestion.pinyin && (
                        <div style="font-size: 0.95rem; color: #0284c7; margin-bottom: 0.35rem;">
                          {activeQuestion.pinyin}
                        </div>
                      )}
                      {activeQuestion.meaning_vi && (
                        <div style="font-size: 0.9rem; color: #475569;">
                          Ý nghĩa: {activeQuestion.meaning_vi}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style="padding: 0.75rem 1rem; background: #f1f5f9; border-radius: 0.5rem; color: #64748b; font-size: 0.9rem; font-style: italic;">
                      (Theo quy chế thi HSKK, nội dung chữ được ẩn trong phần nhắc lại. Bạn có thể bấm "Xem văn bản câu hỏi" ở trên để đối chiếu lúc luyện tập).
                    </div>
                  )}
                </div>

                {/* Recording Studio */}
                <div style="background: #fafafa; border: 2px dashed #e2e8f0; border-radius: 1rem; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1.1rem;">
                    🎙️ Phòng ghi âm câu trả lời thí sinh
                  </h4>

                  {isRecording ? (
                    <div>
                      <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #ffe4e6; border-radius: 9999px; color: #e11d48; font-weight: 700; margin-bottom: 0.75rem; animation: pulse 1.5s infinite;">
                        <span style="font-size: 1.2rem;">🔴</span>
                        <span>Đang ghi âm: {formatTimer(recordingSeconds)} / {formatTimer(activeQuestion.recordSeconds)}</span>
                      </div>
                      {liveTranscript ? (
                        <div style="font-size: 0.9rem; color: #475569; margin-bottom: 0.75rem; font-style: italic;">
                          AI đang nghe (zh-CN): <strong style="color: #0f172a;">"{liveTranscript}"</strong>
                        </div>
                      ) : null}
                      <div>
                        <button
                          type="button"
                          style="padding: 0.75rem 1.75rem; border-radius: 0.75rem; background: #e11d48; color: #ffffff; border: none; font-weight: 700; font-size: 1rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);"
                          onClick={stopRecordingQuestion}
                        >
                          ⏹️ Hoàn thành / Dừng ghi âm
                        </button>
                      </div>
                    </div>
                  ) : currentRec ? (
                    <div>
                      <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                        <span style="color: #166534; font-weight: 700;">✅ Đã ghi âm thành công ({currentRec.duration}s)!</span>
                        {typeof currentRec.aiScore === 'number' ? (
                          <span style={`padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.88rem; font-weight: 700; ${currentRec.aiScore >= 60 ? 'background: #dcfce7; color: #15803d;' : 'background: #fee2e2; color: #b91c1c;'}`}>
                            Điểm AI đánh giá: {currentRec.aiScore} / 100
                          </span>
                        ) : (
                          <span style="background: #f1f5f9; color: #475569; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.85rem;">
                            Bản ghi lưu trữ đối chiếu
                          </span>
                        )}
                      </div>

                      {/* AI Speech Recognition Feedback */}
                      <div style={`margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 0.5rem; text-align: left; font-size: 0.9rem; ${typeof currentRec.aiScore === 'number' && currentRec.aiScore > 0 ? 'background: #f0fdf4; border: 1px solid #bbf7d0;' : 'background: #fef2f2; border: 1px solid #fecaca;'}`}>
                        <div style="font-weight: 600; margin-bottom: 0.25rem; color: #0f172a;">
                          🗣️ Văn bản AI nhận diện (ASR zh-CN):
                        </div>
                        <div style="font-family: inherit; font-size: 1rem; color: #1e293b; margin-bottom: 0.35rem;">
                          {currentRec.transcript ? (
                            <strong style="color: #0f172a;">"{currentRec.transcript}"</strong>
                          ) : (
                            <em style="color: #94a3b8;">(Không nhận diện được khẩu ngữ tiếng Trung)</em>
                          )}
                        </div>
                        {currentRec.evaluationNote && (
                          <div style={`font-size: 0.85rem; ${typeof currentRec.aiScore === 'number' && currentRec.aiScore > 0 ? 'color: #15803d;' : 'color: #dc2626; font-weight: 600;'}`}>
                            {currentRec.evaluationNote}
                          </div>
                        )}
                      </div>

                      <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <audio controls src={currentRec.url} style="max-width: 320px;" />
                        <button
                          type="button"
                          style="padding: 0.6rem 1.2rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-weight: 600; cursor: pointer;"
                          onClick={startRecordingQuestion}
                        >
                          🔄 Ghi âm lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style="margin: 0 0 1rem 0; color: #64748b; font-size: 0.9rem;">
                        Nhấn nút dưới đây để bắt đầu thu âm. Tiếng bíp "嘟" sẽ xướng lên báo hiệu bắt đầu nói.
                      </p>
                      <button
                        type="button"
                        style="padding: 0.85rem 2rem; border-radius: 0.75rem; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; border: none; font-weight: 700; font-size: 1.05rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);"
                        onClick={startRecordingQuestion}
                      >
                        🎙️ Bắt đầu ghi âm câu trả lời
                      </button>
                    </div>
                  )}
                </div>

                {activeQuestion.suggested_zh && (
                  <div style="border: 1px solid #fde68a; background: #fffbeb; border-radius: 0.75rem; padding: 1rem;">
                    <div style="font-weight: 700; color: #92400e; margin-bottom: 0.25rem;">
                      💡 Gợi ý câu trả lời mẫu (参考答案):
                    </div>
                    <div style="font-size: 1rem; color: #0f172a; line-height: 1.6; margin-bottom: 0.35rem;">
                      {activeQuestion.suggested_zh}
                    </div>
                    {activeQuestion.meaning_vi && (
                      <div style="font-size: 0.85rem; color: #78350f;">
                        Dịch nghĩa: {activeQuestion.meaning_vi}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <footer class="cbt-nav-footer">
                <button
                  class="cbt-btn-nav"
                  disabled={isFirst}
                  onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                >
                  ⬅️ 上一题 (Câu trước)
                </button>
                <span style="font-size: 0.9rem; color: #64748b; font-weight: 600;">
                  {Object.keys(candidateRecordings).length} / {allQuestions.length} câu đã ghi âm
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

            <aside class="cbt-palette-panel">
              <h4 class="cbt-palette-title">
                <span>答题卡 (Danh sách câu hỏi)</span>
                <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">
                  {Object.keys(candidateRecordings).length}/{allQuestions.length}
                </span>
              </h4>

              <div class="cbt-palette-legend">
                <div class="cbt-legend-item">
                  <span class="cbt-legend-dot" style="background: #10b981;"></span>
                  <span>Đã ghi âm</span>
                </div>
                <div class="cbt-legend-item">
                  <span class="cbt-legend-dot" style="background: #cbd5e1;"></span>
                  <span>Chưa ghi</span>
                </div>
              </div>

              <div class="cbt-palette-grid">
                {allQuestions.map((q, idx) => {
                  const isRec = !!candidateRecordings[q.id];
                  const isCurr = currentQuestionIdx === idx;
                  return (
                    <button
                      key={q.id}
                      class={`cbt-palette-btn ${isCurr ? 'active' : ''} ${isRec ? 'answered' : ''}`}
                      style={{
                        background: isCurr ? '#be123c' : isRec ? '#10b981' : '#f1f5f9',
                        color: isCurr || isRec ? '#ffffff' : '#334155',
                      }}
                      onClick={() => setCurrentQuestionIdx(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: HSKK SPOKEN EXAM RESULT
  // -------------------------------------------------------------------------
  if (examState === 'hskk_result' && hskkResult) {
    const questions = getAllQuestions();

    return (
      <div class="exam-container">
        <div class="exam-result-card" style="border-top: 4px solid #e11d48;">
          <div class={`exam-result-stamp ${hskkResult.isPassed ? 'pass' : 'fail'}`}>
            {hskkResult.isPassed ? '合格 (ĐẠT TIÊU CHUẨN)' : '未通过 (CHƯA ĐẠT)'}
          </div>
          <h2 style="margin: 0; color: #0f172a;">{hskkResult.examTitle}</h2>
          <div class="exam-result-score" style="color: #e11d48;">
            {hskkResult.finalScore}
            <span style="font-size: 1.25rem; font-weight: 500; color: #64748b;"> / 100</span>
          </div>
          <p style="color: #64748b; margin-bottom: 1rem;">
            Đã hoàn thành thu âm {hskkResult.recordedCount}/{hskkResult.totalQuestions} câu hỏi (Tỉ lệ {hskkResult.completionRate}%)
          </p>

          <div class="exam-result-actions">
            <button class="exam-btn-secondary" onClick={() => setExamState('lobby')}>
              Trở về danh sách đề
            </button>
            <button
              class="exam-btn-primary"
              style="background: #e11d48;"
              onClick={() => startHskkExam(examData.file)}
            >
              Thi lại đề này
            </button>
          </div>
        </div>

        <div style="margin-top: 2rem;">
          <h3 style="margin: 0 0 1rem 0; color: #0f172a;">
            🎧 Nghe lại toàn bộ bài thu âm &amp; So sánh phát âm chuẩn
          </h3>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            {questions.map((q) => {
              const rec = candidateRecordings[q.id];
              return (
                <div
                  key={q.id}
                  style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem;"
                >
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <span style="font-weight: 700; color: #0f172a;">
                      Câu {q.number}: {q.sectionTitleZh || q.sectionName}
                    </span>
                    <span style={{ fontWeight: 700, color: rec ? (typeof rec.aiScore === 'number' && rec.aiScore > 0 ? '#059669' : '#dc2626') : '#dc2626' }}>
                      {rec ? (typeof rec.aiScore === 'number' ? `Đã ghi (${rec.duration}s) · ${rec.aiScore}đ` : `Đã ghi (${rec.duration}s)`) : 'Chưa thu âm'}
                    </span>
                  </div>

                  <p style="font-size: 1.05rem; font-weight: 600; color: #0f172a; margin: 0.4rem 0;">
                    {q.prompt_zh}
                  </p>
                  {q.pinyin && <p style="font-size: 0.9rem; color: #0284c7; margin: 0 0 0.5rem 0;">{q.pinyin}</p>}

                  <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-top: 0.75rem;">
                    {q.audio_clip && (
                      <button
                        type="button"
                        class="cbt-audio-play-btn"
                        onClick={() => playAudio(q.audio_clip)}
                      >
                        🔊 Nghe audio mẫu CTI
                      </button>
                    )}
                    {rec && (
                      <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%; margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                          <span style="font-size: 0.85rem; font-weight: 600; color: #475569;">Bản ghi của bạn:</span>
                          <audio controls src={rec.url} style="height: 36px;" />
                        </div>
                        {rec.transcript && (
                          <div style="font-size: 0.85rem; color: #334155;">
                            🗣️ AI nhận diện: <strong>"{rec.transcript}"</strong>
                          </div>
                        )}
                        {rec.evaluationNote && (
                          <div style={`font-size: 0.82rem; ${typeof rec.aiScore === 'number' && rec.aiScore > 0 ? 'color: #15803d;' : 'color: #dc2626;'}`}>
                            {rec.evaluationNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {q.suggested_zh && (
                    <div style="margin-top: 0.75rem; padding: 0.75rem; background: #fffbeb; border-radius: 0.5rem; font-size: 0.9rem; color: #78350f;">
                      <strong>Gợi ý đạt điểm cao:</strong> {q.suggested_zh}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: CBT WRITTEN EXAM RUNNER
  // -------------------------------------------------------------------------
  if (examState === 'exam' && activeQuestion) {
    const isFirst = currentQuestionIdx === 0;
    const isLast = currentQuestionIdx === allQuestions.length - 1;
    const currentAnswer = userAnswers[activeQuestion.id];
    const isFlagged = !!flaggedQuestions[activeQuestion.id];
    const isTimerWarning = timeRemaining < 300;
    const partInfo = getCurrentPartInfo();
    const paletteSections = getPaletteSections();

    // Word Reordering helpers
    const selectedWords = Array.isArray(currentAnswer) ? currentAnswer : [];
    const availableWords = activeQuestion.words || [];

    return (
      <div class="exam-container">
        <div class="cbt-exam-wrapper">
          <header class="cbt-top-bar">
            <div class="cbt-title-group">
              <span class="cbt-logo">HSK</span>
              <span class="cbt-exam-name">{examData.title}</span>
            </div>
            <div class="cbt-controls-group">
              <div class={`cbt-timer ${isTimerWarning ? 'warning' : ''}`} title="Thời gian còn lại">
                ⏱️ {formatTimer(timeRemaining)}
              </div>
              <button class="cbt-btn-submit" onClick={confirmSubmitCbt}>
                交卷 (Nộp bài)
              </button>
            </div>
          </header>

          <div class="cbt-section-bar">
            <div>
              <span class="cbt-section-badge">{activeQuestion.sectionName}</span>
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

          <div class="cbt-body-layout">
            <main class="cbt-main-area">
              <div>
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
                    </div>
                  </div>
                )}

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

                <div class="cbt-q-content">
                  {activeQuestion.prompt_zh && (
                    <div style="margin-bottom: 1.25rem;">
                      <h3 class="cbt-q-text" style="line-height: 1.6; white-space: pre-line;">
                        {activeQuestion.prompt_zh}
                      </h3>
                      {activeQuestion.prompt_pinyin && (
                        <div class="cbt-q-pinyin">{activeQuestion.prompt_pinyin}</div>
                      )}
                    </div>
                  )}

                  {activeQuestion.image && (
                    <div class="cbt-illustration-wrap" style="margin-bottom: 1rem;">
                      <img src={activeQuestion.image} alt="Question illustration" class="cbt-illustration-img" />
                    </div>
                  )}

                  {/* 1. True / False Mode */}
                  {activeQuestion.type === 'true_false' && (
                    <div class="cbt-tf-grid">
                      <button
                        type="button"
                        class={`cbt-tf-btn ${currentAnswer === true || currentAnswer === 'true' ? 'selected-true' : ''}`}
                        onClick={() => handleSelectAnswer(activeQuestion.id, true)}
                      >
                        <span style="font-size: 1.4rem; color: #10b981; font-weight: 900;">✓</span>
                        <span style="color: #0f172a;">Đúng (对 - Duì)</span>
                      </button>
                      <button
                        type="button"
                        class={`cbt-tf-btn ${currentAnswer === false || currentAnswer === 'false' ? 'selected-false' : ''}`}
                        onClick={() => handleSelectAnswer(activeQuestion.id, false)}
                      >
                        <span style="font-size: 1.4rem; color: #ef4444; font-weight: 900;">✗</span>
                        <span style="color: #0f172a;">Sai (错 - Cuò)</span>
                      </button>
                    </div>
                  )}

                  {/* 2. Multiple Choice Mode */}
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

                  {/* 3. Word Reordering Mode (连词成句) */}
                  {activeQuestion.type === 'word_reorder' && (
                    <div style="margin-top: 1.25rem;">
                      <div style="font-size: 0.9rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem;">
                        Nhấn chọn từ để sắp xếp vào câu (nhấn từ đã chọn để gỡ bỏ):
                      </div>

                      {/* Assembled sentence drop/display area */}
                      <div
                        style="min-height: 60px; padding: 0.85rem 1rem; border: 2px dashed #0284c7; background: #f0f9ff; border-radius: 0.75rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;"
                      >
                        {selectedWords.length === 0 ? (
                          <span style="color: #94a3b8; font-style: italic; font-size: 0.95rem;">
                            (Chưa có từ nào được chọn. Nhấn vào các thẻ từ bên dưới để ghép câu...)
                          </span>
                        ) : (
                          selectedWords.map((word, wIdx) => (
                            <span
                              key={wIdx}
                              style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.8rem; background: #0284c7; color: #ffffff; border-radius: 0.5rem; font-size: 1.05rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);"
                              onClick={() => handleToggleWordReorder(activeQuestion.id, word, availableWords)}
                              title="Nhấn để gỡ bỏ từ này"
                            >
                              <span>{word}</span>
                              <span style="font-size: 0.75rem; opacity: 0.8;">✕</span>
                            </span>
                          ))
                        )}
                        {selectedWords.length > 0 && (
                          <span style="font-size: 1.3rem; font-weight: bold; color: #0284c7;">。</span>
                        )}
                      </div>

                      {/* Available Words Pool */}
                      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem;">
                        {availableWords.map((w, wIdx) => {
                          const isUsed = selectedWords.includes(w);
                          return (
                            <button
                              key={wIdx}
                              type="button"
                              disabled={isUsed}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #cbd5e1',
                                background: isUsed ? '#f1f5f9' : '#ffffff',
                                color: isUsed ? '#94a3b8' : '#0f172a',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: isUsed ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: isUsed ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                              }}
                              onClick={() => handleToggleWordReorder(activeQuestion.id, w, availableWords)}
                            >
                              {w}
                            </button>
                          );
                        })}

                        {selectedWords.length > 0 && (
                          <button
                            type="button"
                            style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; border: 1px solid #fecdd3; background: #fff1f2; color: #e11d48; font-weight: 600; font-size: 0.85rem; cursor: pointer;"
                            onClick={() => resetWordReorder(activeQuestion.id)}
                          >
                            🔄 Xếp lại từ đầu
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Hanzi Fill Mode (看拼音写汉字) */}
                  {activeQuestion.type === 'hanzi_fill' && (
                    <div style="margin-top: 1.25rem; background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
                      <div style="font-size: 1.2rem; line-height: 1.8; color: #0f172a; margin-bottom: 1rem;">
                        {activeQuestion.sentence_zh.split('（    ）')[0]}
                        <span style="display: inline-block; padding: 0.2rem 0.75rem; margin: 0 0.35rem; background: #e0f2fe; border-bottom: 2px solid #0284c7; font-weight: 700; color: #0369a1;">
                          {currentAnswer || activeQuestion.pinyin_clue}
                        </span>
                        {activeQuestion.sentence_zh.split('（    ）')[1]}
                      </div>

                      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                        <span style="font-size: 0.95rem; font-weight: 600; color: #475569;">
                          Nhập 1 chữ Hán có pinyin [{activeQuestion.pinyin_clue}]:
                        </span>
                        <input
                          type="text"
                          maxLength={2}
                          value={currentAnswer || ''}
                          placeholder="Chữ Hán..."
                          style="font-size: 1.3rem; padding: 0.4rem 0.8rem; width: 120px; text-align: center; border-radius: 0.5rem; border: 2px solid #0284c7; font-weight: 700; color: #0f172a;"
                          onInput={(e) => handleSelectAnswer(activeQuestion.id, e.target.value.trim())}
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. Picture Sentence Mode (看图用词造句) */}
                  {activeQuestion.type === 'picture_sentence' && (
                    <div style="margin-top: 1.25rem; background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
                      <div style="margin-bottom: 0.75rem; font-size: 1rem;">
                        <span style="font-weight: 700; color: #475569;">Từ vựng bắt buộc: </span>
                        <span style="display: inline-block; padding: 0.25rem 0.75rem; background: #dcfce7; color: #166534; font-weight: 800; border-radius: 0.5rem; font-size: 1.15rem;">
                          【 {activeQuestion.keyword} 】
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        placeholder={`Hãy viết một câu tiếng Trung hoàn chỉnh có chứa từ ‘${activeQuestion.keyword}’...`}
                        value={currentAnswer || ''}
                        style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; font-size: 1.05rem; font-family: inherit; box-sizing: border-box; line-height: 1.5;"
                        onInput={(e) => handleSelectAnswer(activeQuestion.id, e.target.value)}
                      />
                      <div style="text-align: right; font-size: 0.8rem; color: #64748b; margin-top: 0.35rem;">
                        Đã nhập: {(currentAnswer || '').length} ký tự
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

            {/* Dynamic Question Palette (答题卡) */}
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

              <div style="display: flex; flex-direction: column; gap: 1rem;">
                {paletteSections.map((sec, secIdx) => (
                  <div key={secIdx}>
                    <div class="cbt-palette-section-label">{sec.name}</div>
                    <div class="cbt-palette-grid">
                      {sec.questions.map((q) => {
                        const globalIdx = allQuestions.findIndex((item) => item.id === q.id);
                        const isAns = userAnswers[q.id] !== undefined && (Array.isArray(userAnswers[q.id]) ? userAnswers[q.id].length > 0 : String(userAnswers[q.id]).length > 0);
                        const isFlag = !!flaggedQuestions[q.id];
                        const isCurr = currentQuestionIdx === globalIdx;
                        return (
                          <button
                            key={q.id}
                            class={`cbt-palette-btn ${isCurr ? 'active' : ''} ${isAns ? 'answered' : ''} ${isFlag ? 'flagged' : ''}`}
                            onClick={() => setCurrentQuestionIdx(globalIdx)}
                          >
                            {q.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: CBT WRITTEN RESULT & REVIEW
  // -------------------------------------------------------------------------
  if (examState === 'result' && examResult) {
    const questions = getAllQuestions();
    const filteredQuestions = questions.filter((q) => {
      const userAns = userAnswers[q.id];
      let isCorrect = false;

      if (q.type === 'word_reorder') {
        const assembled = Array.isArray(userAns) ? userAns.join('') : (userAns || '');
        isCorrect = normalizeSentence(assembled) === normalizeSentence(q.correct_answer);
      } else if (q.type === 'hanzi_fill') {
        isCorrect = String(userAns || '').trim() === String(q.correct_answer || '').trim();
      } else if (q.type === 'picture_sentence') {
        isCorrect = typeof userAns === 'string' && userAns.trim().length >= 4;
      } else {
        isCorrect = userAns === q.correct_answer || String(userAns) === String(q.correct_answer);
      }

      if (reviewFilter === 'incorrect') return !isCorrect;
      if (reviewFilter === 'flagged') return !!flaggedQuestions[q.id];
      return true;
    });

    return (
      <div class="exam-container">
        <div class="exam-result-card">
          <div class={`exam-result-stamp ${examResult.isPassed ? 'pass' : 'fail'}`}>
            {examResult.isPassed ? '合格 (ĐẠT TIÊU CHUẨN)' : '未通过 (CHƯA ĐẠT)'}
          </div>
          <h2 style="margin: 0; color: #0f172a;">{examResult.examTitle}</h2>
          <div class="exam-result-score">
            {examResult.totalScore}
            <span style="font-size: 1.25rem; font-weight: 500; color: #64748b;"> / {examResult.maxScore}</span>
          </div>
          <p style="color: #64748b; margin-bottom: 1rem;">
            Đạt {examResult.correctCount}/{examResult.totalQuestions} câu chính xác (Điểm đỗ chuẩn: {examResult.passScore} điểm)
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
            {examResult.hasWriting && (
              <div class="exam-breakdown-item">
                <span class="exam-breakdown-label">Phần thi Viết (书写)</span>
                <span class="exam-breakdown-val">{examResult.writingScore} / 100</span>
              </div>
            )}
          </div>

          <div class="exam-result-actions">
            <button class="exam-btn-secondary" onClick={() => setExamState('lobby')}>
              Trở về danh sách đề
            </button>
            <button class="exam-btn-secondary" onClick={() => startExam(examData.file)}>
              Thi lại đề này
            </button>
            <button
              class="exam-btn-secondary"
              style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; font-weight: 700;"
              onClick={() => {
                setExamState('lobby');
                setHubMode('error_notebook');
              }}
            >
              📕 Mở Sổ tay câu sai (Ôn lại trọng điểm)
            </button>
          </div>
        </div>

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
                Câu làm sai
              </button>
              <button
                class={`exam-level-tab ${reviewFilter === 'flagged' ? 'active' : ''}`}
                onClick={() => setReviewFilter('flagged')}
              >
                Đã gắn cờ ({Object.values(flaggedQuestions).filter(Boolean).length})
              </button>
            </div>
          </div>

          {filteredQuestions.map((q) => {
            const userAns = userAnswers[q.id];
            let isCorrect = false;
            let displayUserAns = '';
            let displayCorrectAns = '';

            if (q.type === 'word_reorder') {
              const assembled = Array.isArray(userAns) ? userAns.join('') : (userAns || '');
              isCorrect = normalizeSentence(assembled) === normalizeSentence(q.correct_answer);
              displayUserAns = assembled || 'Chưa xếp từ';
              displayCorrectAns = q.correct_answer;
            } else if (q.type === 'hanzi_fill') {
              isCorrect = String(userAns || '').trim() === String(q.correct_answer || '').trim();
              displayUserAns = userAns || 'Chưa điền';
              displayCorrectAns = q.correct_answer;
            } else if (q.type === 'picture_sentence') {
              isCorrect = typeof userAns === 'string' && userAns.trim().length >= 4;
              displayUserAns = userAns || 'Chưa đặt câu';
              displayCorrectAns = q.sample_sentence || q.correct_answer;
            } else {
              isCorrect = userAns === q.correct_answer || String(userAns) === String(q.correct_answer);
              displayUserAns = userAns === true || userAns === 'true' ? 'Đúng (对)' : userAns === false || userAns === 'false' ? 'Sai (错)' : (userAns || 'Chưa làm');
              displayCorrectAns = q.correct_answer === true || q.correct_answer === 'true' ? 'Đúng (对)' : q.correct_answer === false || q.correct_answer === 'false' ? 'Sai (错)' : q.correct_answer;
            }

            return (
              <div class={`review-card ${isCorrect ? 'correct' : 'incorrect'}`} key={q.id}>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; color: #0f172a;">
                    Câu {q.number}: {q.sectionName}
                  </span>
                  <span style={{ fontWeight: 700, color: isCorrect ? '#059669' : '#dc2626' }}>
                    {isCorrect ? '✓ Đúng' : '✗ Sai'}
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

                {q.prompt_zh && <p style="font-weight: 600; margin: 0.4rem 0;">{q.prompt_zh}</p>}

                <div style="display: flex; gap: 1.5rem; margin: 0.5rem 0; font-size: 0.95rem; flex-wrap: wrap;">
                  <span>
                    Đáp án của bạn: <strong style={{ color: isCorrect ? '#059669' : '#dc2626' }}>{displayUserAns}</strong>
                  </span>
                  <span>
                    Đáp án chuẩn: <strong style="color: #059669;">{displayCorrectAns}</strong>
                  </span>
                </div>

                <div class="review-explanation">
                  <strong>💡 Lời giải chi tiết:</strong> {q.explanation || q.explanation_vi || 'Đáp án theo tiêu chuẩn CTI.'}
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
