/**
 * SpeakingPractice.jsx
 * Multi-sensory Mandarin Speaking & Tone Practice Station.
 *
 * Features:
 * 1. Visual Tone Pitch Visualizer:
 *    - Real-time pitch tracking with the YIN algorithm on Chao 5-level scale.
 *    - Dual-layer Canvas: Idealized/Studio target contour vs User voice contour.
 *    - Tone Sandhi integration (3-3 rule, bu4, yi1, neutral tones).
 * 2. Vocabulary & Sentence Pronunciation:
 *    - HSK 1 to HSK 6 vocabulary selection.
 *    - Instant A/B Shadowing playback (Studio sample vs User voice).
 *    - Hybrid AI Scoring: Acoustic Pitch DTW (65%) + Web Speech Recognition (35%).
 *    - Diagnostic feedback specifically tailored for Vietnamese learners.
 * 3. Minimal Tone Pairs Challenge:
 *    - Targeted drills for easily confused tone pairs (e.g. mai3 vs mai4, shi2 vs shi4).
 */

import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { colorizePinyin } from './pinyinTones.js';
import { analyzeToneSandhi, generateTargetPitchContour, CHAO_PITCH_MAP } from './ToneSandhi.js';
import { LivePitchTracker, frequencyToChaoScale, fetchAndExtractAudioWaveform } from './PitchDetector.js';
import { scorePitchContour } from './ToneScorer.js';
import { LocalSpeechAI } from './LocalSpeechAI.js';
import { speakChinese, stopSpeaking, loadGlobalHanziAudioMap, resolvePrebuiltAudio } from './SpeechAudio.js';
import { ensureCaptModelReady, evaluatePronunciationWithOnnx } from './OnnxCaptEngine.js';
import { isCaptModelCached } from './SpeechModelManager.js';
import { NewbieToneGuide } from './NewbieToneGuide.jsx';

// Minimal tone pair curated drills for Vietnamese learners
const MINIMAL_TONE_PAIRS = [
  {
    title: 'Phân biệt Mua (买) & Bán (卖)',
    description: 'Cặp từ kinh điển người Việt hay nhầm giữa thanh 3 (mǎi - trũng) và thanh 4 (mài - dốc mạnh xuống).',
    words: [
      { hanzi: '买', pinyin: 'mǎi', hanviet: 'Mãi', meaning: 'mua (thanh 3: 214, hạ sâu rồi hơi lên)' },
      { hanzi: '卖', pinyin: 'mài', hanviet: 'Mại', meaning: 'bán (thanh 4: 51, dứt khoát từ 5 xuống 1)' }
    ]
  },
  {
    title: 'Phân biệt Là (是) & Mười (十)',
    description: 'Người Việt hay đọc "shì" (thanh 4) thành "thanh 2" (shí) giống dấu sắc.',
    words: [
      { hanzi: '十', pinyin: 'shí', hanviet: 'Thập', meaning: 'mười (thanh 2: 35, vuốt lên từ giữa)' },
      { hanzi: '是', pinyin: 'shì', hanviet: 'Thị', meaning: 'là, phải (thanh 4: 51, rơi dứt khoát)' }
    ]
  },
  {
    title: 'Phân biệt Hỏi (问) & Hôn (吻)',
    description: 'Thanh 4 (hỏi) vs Thanh 3 (hôn) - phát âm sai dễ dẫn đến tình huống hiểu nhầm dở khóc dở cười.',
    words: [
      { hanzi: '问', pinyin: 'wèn', hanviet: 'Vấn', meaning: 'hỏi (thanh 4: 51)' },
      { hanzi: '吻', pinyin: 'wěn', hanviet: 'Vẫn', meaning: 'hôn (thanh 3: 214)' }
    ]
  },
  {
    title: 'Chuỗi 4 thanh cơ bản: ma',
    description: 'Luyện tập biến thiên 4 thanh điệu mẫu với cùng một âm tiết mā, má, mǎ, mà.',
    words: [
      { hanzi: '妈', pinyin: 'mā', hanviet: 'Mã', meaning: 'mẹ (thanh 1: 55, cao và bằng)' },
      { hanzi: '麻', pinyin: 'má', hanviet: 'Ma', meaning: 'cây gai / tê bì (thanh 2: 35, vuốt lên)' },
      { hanzi: '马', pinyin: 'mǎ', hanviet: 'Mã', meaning: 'ngựa (thanh 3: 214, trũng sâu)' },
      { hanzi: '骂', pinyin: 'mà', hanviet: 'Mạ', meaning: 'mắng chửi (thanh 4: 51, rơi dốc)' }
    ]
  },
  {
    title: 'Biến điệu chữ 一 (yī)',
    description: 'Thấy rõ cao độ thay đổi khi đi trước thanh 4 (yí) so với trước thanh 3 (yì).',
    words: [
      { hanzi: '一样', pinyin: 'yī yàng', hanviet: 'Nhất Dạng', meaning: 'giống nhau (biến điệu: yí yàng)' },
      { hanzi: '一起', pinyin: 'yī qǐ', hanviet: 'Nhất Khởi', meaning: 'cùng nhau (biến điệu: yì qǐ)' }
    ]
  },
  {
    title: 'Biến điệu chữ 不 (bù)',
    description: 'Trước thanh 4 đọc thành thanh 2 (bú shì); trước các thanh khác giữ thanh 4 (bù hǎo).',
    words: [
      { hanzi: '不是', pinyin: 'bù shì', hanviet: 'Bất Thị', meaning: 'không phải (biến điệu: bú shì)' },
      { hanzi: '不好', pinyin: 'bù hǎo', hanviet: 'Bất Hảo', meaning: 'không tốt (giữ thanh 4: bù hǎo)' }
    ]
  }
];

/**
 * Draws a filled and stroked symmetric waveform envelope polygon on canvas.
 */
function drawWaveformPolygon(ctx, envelope, padLeft, plotW, yCenter, maxAmp, fillStyle, strokeStyle) {
  if (!envelope || envelope.length === 0) return;
  const n = envelope.length;
  ctx.save();

  // Positive half (top)
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = padLeft + (i / Math.max(1, n - 1)) * plotW;
    const y = yCenter - (envelope[i].max || envelope[i].amp || 0) * maxAmp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  // Negative half (bottom, going backwards)
  for (let i = n - 1; i >= 0; i--) {
    const x = padLeft + (i / Math.max(1, n - 1)) * plotW;
    const y = yCenter - (envelope[i].min || -envelope[i].amp || 0) * maxAmp;
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a rounded rectangle path on canvas.
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function SpeakingPracticeApp() {
  const [activeTab, setActiveTab] = useState('toneTrainer'); // 'toneTrainer' | 'vocabPractice' | 'minimalPairs'
  const [selectedLevel, setSelectedLevel] = useState('hsk1');
  const [vocabList, setVocabList] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);

  // Active word details
  const [currentWord, setCurrentWord] = useState({
    hanzi: '你好',
    pinyin: 'nǐ hǎo',
    hanviet: 'Nhĩ Hảo',
    meaning: 'xin chào',
    example_zh: '你好！很高兴认识你。',
    example_py: 'Nǐ hǎo! Hěn gāoxìng rènshí nǐ.'
  });

  // Pitch Tracker & AI status
  const [isRecording, setIsRecording] = useState(false);
  const [liveHz, setLiveHz] = useState(0);
  const [liveVolume, setLiveVolume] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [userRecordedAudio, setUserRecordedAudio] = useState(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [aiTranscript, setAiTranscript] = useState('');
  const [isDeepAiReady, setIsDeepAiReady] = useState(false);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState(null);
  const [captResult, setCaptResult] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);

  // Minimal pair challenge index
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [selectedPairWordIndex, setSelectedPairWordIndex] = useState(0);

  // Waveform & Visualizer Modes
  const [visualizerMode, setVisualizerMode] = useState('combined'); // 'combined' | 'dualWaveform'
  const [referenceWaveform, setReferenceWaveform] = useState(null);
  const [userRecordedWaveform, setUserRecordedWaveform] = useState(null);

  const canvasRef = useRef(null);
  const trackerRef = useRef(null);
  const speechAiRef = useRef(null);
  const livePointsRef = useRef([]);
  const liveWaveformRef = useRef(null);
  const refWaveformRef = useRef(null);
  const userWaveformRef = useRef(null);
  const scoreResultRef = useRef(null);
  const playheadPosRef = useRef(null); // null or 0.0 -> 1.0
  const playheadAnimRef = useRef(null);

  // Check if Deep ONNX model is already cached
  useEffect(() => {
    isCaptModelCached().then((cached) => {
      if (cached) {
        ensureCaptModelReady().then((ready) => {
          setIsDeepAiReady(ready);
        });
      }
    });
  }, []);

  // Load vocabulary when level changes
  useEffect(() => {
    let isCancelled = false;
    async function loadLevelVocab(lvl) {
      setIsLoadingVocab(true);
      try {
        const res = await fetch(`database/vocabs/${lvl}_vocabularies.json`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data) && data.length > 0) {
            setVocabList(data);
            setCurrentWordIndex(0);
            setCurrentWord(data[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to load level vocab:', err);
      } finally {
        if (!isCancelled) setIsLoadingVocab(false);
      }
    }
    loadLevelVocab(selectedLevel);
    return () => { isCancelled = true; };
  }, [selectedLevel]);

  // Clean up on unmount & warm prebuilt audio map
  useEffect(() => {
    speechAiRef.current = new LocalSpeechAI();
    loadGlobalHanziAudioMap();
    return () => {
      if (trackerRef.current) trackerRef.current.stop();
      if (speechAiRef.current) speechAiRef.current.stopListening();
      if (playheadAnimRef.current) cancelAnimationFrame(playheadAnimRef.current);
      stopSpeaking();
    };
  }, []);

  // Auto re-evaluate combined score whenever a late-arriving speech transcript is received
  useEffect(() => {
    if (!aiTranscript || !scoreResultRef.current) return;
    setScoreResult((prev) => {
      if (!prev) return prev;
      const textMatch = LocalSpeechAI.evaluateTextMatch(aiTranscript, currentWord.hanzi, currentWord.pinyin);
      const combined = LocalSpeechAI.combineScores(prev, textMatch, activeTab);
      if (prev.deepCapt && prev.deepCapt.success) {
        combined.overallScore = Math.round(combined.overallScore * 0.4 + prev.deepCapt.overallScore * 0.6);
        combined.stars = combined.overallScore >= 80 ? 3 : combined.overallScore >= 60 ? 2 : 1;
        combined.message = combined.overallScore >= 80
          ? 'Xuất sắc! Phát âm thanh mẫu, vận mẫu & thanh điệu đều rất chuẩn.'
          : combined.overallScore >= 60
          ? 'Khá tốt! Chú ý một vài điểm ngữ âm chi tiết bên dưới.'
          : 'Chưa đạt. Hãy lắng nghe audio mẫu và chú ý khẩu hình nhé!';
      }
      return { ...prev, combined, textMatch };
    });
  }, [aiTranscript]);

  // Target pitch contour and Tone Sandhi analysis
  const targetContour = generateTargetPitchContour(currentWord.hanzi, currentWord.pinyin, 60);
  const syllableInfos = analyzeToneSandhi(currentWord.hanzi, currentWord.pinyin);

  const lastUserPitchesRef = useRef(null);

  // Dynamic DPI-aware & Responsive pitch canvas renderer
  const drawContourCanvas = (userPitches = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (userPitches) {
      lastUserPitchesRef.current = userPitches;
    }

    // Measure actual displayed bounding box
    const rect = canvas.getBoundingClientRect();
    const displayWidth = Math.floor(rect.width) || 680;
    const displayHeight = Math.floor(rect.height) || 260;
    const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 3);

    // Sync bitmap buffer with high-DPI (Retina / OLED) screens
    const targetWidth = Math.round(displayWidth * dpr);
    const targetHeight = Math.round(displayHeight * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Adaptive padding & sizing (desktop vs compact mobile)
    const isCompact = displayWidth < 480;
    const padLeft = isCompact ? 46 : 85;
    const padRight = isCompact ? 16 : 24;
    const padY = isCompact ? 24 : 28;
    const plotW = displayWidth - padLeft - padRight;
    const plotH = displayHeight - padY * 2;
    const numSyllables = syllableInfos.length;

    // 1. Alternating subtle syllable column backgrounds
    for (let s = 0; s < numSyllables; s++) {
      const xStart = padLeft + (s / numSyllables) * plotW;
      const xEnd = padLeft + ((s + 1) / numSyllables) * plotW;
      if (s % 2 === 1) {
        ctx.fillStyle = 'rgba(180, 150, 100, 0.04)';
        ctx.fillRect(xStart, padY, xEnd - xStart, plotH);
      }
    }

    // 2. Draw Chao 5-scale horizontal reference lines with adaptive labels
    ctx.lineWidth = 1;
    const chaoLabels = isCompact
      ? [
          { level: 5, text: '5 Đỉnh' },
          { level: 4, text: '4' },
          { level: 3, text: '3 Vừa' },
          { level: 2, text: '2' },
          { level: 1, text: '1 Đáy' }
        ]
      : [
          { level: 5, text: '5 - Đỉnh cao' },
          { level: 4, text: '4 - Hơi cao' },
          { level: 3, text: '3 - Chuẩn (Vừa)' },
          { level: 2, text: '2 - Hơi trầm' },
          { level: 1, text: '1 - Đáy cổ' }
        ];

    chaoLabels.forEach(({ level, text }) => {
      const y = padY + plotH - ((level - 1) / 4) * plotH;
      ctx.strokeStyle = level === 3 ? 'rgba(180, 150, 100, 0.28)' : 'rgba(180, 150, 100, 0.12)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(150, 140, 130, 0.85)';
      ctx.font = isCompact
        ? 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(text, padLeft - 6, y + 3.5);
    });

    // 3. Syllable vertical separators
    for (let s = 1; s < numSyllables; s++) {
      const x = padLeft + (s / numSyllables) * plotW;
      ctx.strokeStyle = 'rgba(180, 150, 100, 0.22)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. REAL-TIME OSCILLOSCOPE WAVEFORM (While recording)
    if (isRecording && liveWaveformRef.current && liveWaveformRef.current.length > 0) {
      const waveData = liveWaveformRef.current;
      const waveLen = waveData.length;
      const yCenter = padY + plotH / 2;
      const maxAmp = plotH * 0.42;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0d9488';
      ctx.shadowColor = 'rgba(20, 184, 166, 0.65)';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(waveLen / plotW));
      for (let px = 0; px < plotW; px++) {
        const sampleIdx = Math.min(waveLen - 1, px * step);
        const sampleVal = waveData[sampleIdx] || 0;
        const x = padLeft + px;
        const y = yCenter - sampleVal * maxAmp;
        if (px === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Realtime recording badge on canvas
      ctx.fillStyle = '#0d9488';
      ctx.font = isCompact ? 'bold 10px sans-serif' : 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('● THU SÓNG ÂM REAL-TIME', padLeft + 6, padY + 16);
    }

    // 5. POST-RECORDING & IDLE WAVEFORM ENVELOPES
    if (!isRecording) {
      if (visualizerMode === 'dualWaveform') {
        // Dual Track Mode: Top is Studio Xiaoxiao, Bottom is User
        const trackH = plotH * 0.46;
        const track1CenterY = padY + trackH * 0.5;
        const track2CenterY = padY + plotH - trackH * 0.5;

        // Middle track divider
        ctx.strokeStyle = 'rgba(180, 150, 100, 0.3)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padLeft, padY + plotH * 0.5);
        ctx.lineTo(padLeft + plotW, padY + plotH * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Track Labels
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MẪU STUDIO (XIAOXIAO)', padLeft + 4, padY + 12);
        ctx.fillStyle = '#0d9488';
        ctx.fillText('GIỌNG THU CỦA BẠN', padLeft + 4, padY + plotH * 0.5 + 13);

        // Draw Studio Waveform Envelope in Track 1
        const refWave = refWaveformRef.current;
        if (refWave && refWave.length > 0) {
          drawWaveformPolygon(ctx, refWave, padLeft, plotW, track1CenterY, trackH * 0.42, 'rgba(217, 119, 6, 0.35)', '#d97706');
        }

        // Draw User Waveform Envelope in Track 2
        const userWave = userWaveformRef.current;
        if (userWave && userWave.length > 0) {
          drawWaveformPolygon(ctx, userWave, padLeft, plotW, track2CenterY, trackH * 0.42, 'rgba(13, 148, 136, 0.35)', '#0d9488');
        }
      } else {
        // Combined View Mode: Layered subtle waveform backdrop
        const yCenter = padY + plotH / 2;
        const waveMaxH = plotH * 0.38;

        // Reference studio waveform (amber)
        const refWave = refWaveformRef.current;
        if (refWave && refWave.length > 0) {
          drawWaveformPolygon(ctx, refWave, padLeft, plotW, yCenter, waveMaxH, 'rgba(217, 119, 6, 0.16)', 'rgba(217, 119, 6, 0.45)');
        }

        // User recorded waveform (teal)
        const userWave = userWaveformRef.current;
        if (userWave && userWave.length > 0) {
          drawWaveformPolygon(ctx, userWave, padLeft, plotW, yCenter, waveMaxH, 'rgba(13, 148, 136, 0.22)', 'rgba(13, 148, 136, 0.65)');
        }
      }
    }

    // 6. Draw Target Pitch Contour (Golden Amber Line)
    if (targetContour.length > 1) {
      ctx.lineWidth = isCompact ? 3.5 : 4;
      ctx.strokeStyle = '#d97706'; // Golden amber
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      targetContour.forEach((pt, idx) => {
        const x = padLeft + pt.timeNorm * plotW;
        const y = padY + plotH - ((pt.pitchNorm - 1.0) / 4.0) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Syllable header & Tone info
      syllableInfos.forEach((syl, sIdx) => {
        const midTime = (sIdx + 0.5) / numSyllables;
        const midX = padLeft + midTime * plotW;
        ctx.fillStyle = '#b45309';
        ctx.font = isCompact
          ? 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
          : 'bold 12.5px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        const toneText = syl.sandhiApplied
          ? `T${syl.actualTone} (biến)`
          : `Thanh ${syl.actualTone}`;
        ctx.fillText(`${syl.char} [${toneText}]`, midX, padY - (isCompact ? 5 : 8));
      });
    }

    // 7. Draw User Recorded / Live Pitch Contour (Teal/Emerald Line)
    const pitchesToDraw = userPitches || lastUserPitchesRef.current || livePointsRef.current;
    if (pitchesToDraw && pitchesToDraw.length > 1) {
      ctx.lineWidth = isCompact ? 4 : 4.5;
      ctx.strokeStyle = '#0d9488'; // Vibrant teal
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const n = pitchesToDraw.length;
      pitchesToDraw.forEach((pVal, idx) => {
        const tNorm = idx / Math.max(1, n - 1);
        const x = padLeft + tNorm * plotW;
        const y = padY + plotH - ((pVal - 1.0) / 4.0) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 8. ERROR ALERT PINS / BADGES (Directly highlighting where mistakes occurred)
    const curScore = scoreResultRef.current;
    if (curScore && curScore.toneBreakdown && curScore.toneBreakdown.length > 0) {
      curScore.toneBreakdown.forEach((item, sIdx) => {
        const midX = padLeft + ((sIdx + 0.5) / numSyllables) * plotW;
        const badgeY = padY + 18;

        if (item.errorTag) {
          const text = `⚠️ ${item.errorTag}`;
          ctx.font = 'bold 10px sans-serif';
          const textW = ctx.measureText(text).width;
          const padBox = 6;
          const boxW = textW + padBox * 2;
          const boxH = 18;

          ctx.fillStyle = '#fef3c7'; // Amber yellow
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          roundRect(ctx, midX - boxW / 2, badgeY, boxW, boxH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#b45309';
          ctx.textAlign = 'center';
          ctx.fillText(text, midX, badgeY + 12.5);
        } else if (item.status === 'excellent') {
          const text = `✓ Chuẩn T${item.tone}`;
          ctx.font = 'bold 9.5px sans-serif';
          const textW = ctx.measureText(text).width;
          const padBox = 5;
          const boxW = textW + padBox * 2;
          const boxH = 17;

          ctx.fillStyle = '#ecfdf5';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          roundRect(ctx, midX - boxW / 2, badgeY, boxW, boxH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#047857';
          ctx.textAlign = 'center';
          ctx.fillText(text, midX, badgeY + 12);
        }
      });
    }

    // 9. PLAYHEAD SCRUBBER CURSOR (Real-time tracking of audio playback)
    if (playheadPosRef.current !== null && playheadPosRef.current >= 0 && playheadPosRef.current <= 1.0) {
      const cursorX = padLeft + playheadPosRef.current * plotW;
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.moveTo(cursorX, padY - 6);
      ctx.lineTo(cursorX, padY + plotH + 4);
      ctx.stroke();

      // Top triangle pointer
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cursorX - 5, padY - 8);
      ctx.lineTo(cursorX + 5, padY - 8);
      ctx.lineTo(cursorX, padY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // Load studio reference audio waveform when active word changes
  useEffect(() => {
    let isCancelled = false;
    setUserRecordedWaveform(null);
    userWaveformRef.current = null;
    scoreResultRef.current = null;
    const audioUrl = resolvePrebuiltAudio(currentWord.hanzi);
    if (audioUrl) {
      fetchAndExtractAudioWaveform(audioUrl, 120).then((envelope) => {
        if (!isCancelled && envelope && envelope.length > 0) {
          setReferenceWaveform(envelope);
          refWaveformRef.current = envelope;
          drawContourCanvas();
        }
      });
    } else {
      setReferenceWaveform(null);
      refWaveformRef.current = null;
    }
    return () => { isCancelled = true; };
  }, [currentWord]);

  // Redraw when visualizer mode changes
  useEffect(() => {
    drawContourCanvas();
  }, [visualizerMode]);

  // Observe container resize to re-render sharp canvas smoothly across desktop and mobile
  useEffect(() => {
    lastUserPitchesRef.current = null;
    drawContourCanvas();

    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        drawContourCanvas();
      });
      resizeObserver.observe(canvas);
    } else {
      const handleResize = () => drawContourCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [currentWord]);

  // Animate playback scrubber cursor
  const startPlayheadAnimation = (durationMs) => {
    if (playheadAnimRef.current) cancelAnimationFrame(playheadAnimRef.current);
    const startT = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startT;
      const progress = Math.min(1.0, elapsed / durationMs);
      playheadPosRef.current = progress;
      drawContourCanvas();
      if (progress < 1.0) {
        playheadAnimRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          playheadPosRef.current = null;
          drawContourCanvas();
        }, 120);
      }
    };
    playheadAnimRef.current = requestAnimationFrame(tick);
  };

  // Handle Play Sample Audio
  const handlePlaySample = () => {
    const ok = speakChinese(currentWord.hanzi, {
      onStart: () => startPlayheadAnimation(1000),
      onEnd: () => {
        playheadPosRef.current = null;
        drawContourCanvas();
      }
    });
    if (!ok) {
      startPlayheadAnimation(1000);
    }
  };

  // Handle Activate / Download Deep AI Model
  const handleActivateDeepAi = async () => {
    setIsDownloadingModel(true);
    setDownloadProgress(0);
    setDownloadError(null);
    setShowModelModal(true);
    try {
      const ok = await ensureCaptModelReady((prog) => {
        setDownloadProgress(prog.percent);
      });
      setIsDeepAiReady(ok);
      if (ok) {
        setTimeout(() => setShowModelModal(false), 800);
      } else {
        setDownloadError('Không thể nạp mô hình vào trình duyệt. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
    } catch (err) {
      console.warn('[SpeakingPractice] Deep AI activation error:', err);
      setDownloadError(err?.message || 'Lỗi tải mô hình. Vui lòng thử lại.');
    } finally {
      setIsDownloadingModel(false);
    }
  };

  // Toggle Recording & Speech Analysis
  const handleToggleRecord = async () => {
    if (isRecording) {
      // STOP recording
      setIsRecording(false);
      if (trackerRef.current) trackerRef.current.stop();
      if (speechAiRef.current) speechAiRef.current.stopListening();

      const capturedFrames = trackerRef.current ? trackerRef.current.getCapturedContour() : [];
      const score = scorePitchContour(capturedFrames, targetContour, syllableInfos);
      scoreResultRef.current = score;

      const latestTranscript = (speechAiRef.current && speechAiRef.current.currentTranscript) || aiTranscript;
      let textMatch = null;
      if (latestTranscript) {
        textMatch = LocalSpeechAI.evaluateTextMatch(latestTranscript, currentWord.hanzi, currentWord.pinyin);
      }

      let deepCapt = null;
      if (isDeepAiReady && trackerRef.current) {
        try {
          const pcm = await trackerRef.current.getPcm16k();
          if (pcm && pcm.length > 2000) {
            deepCapt = await evaluatePronunciationWithOnnx(pcm, currentWord.pinyin);
            setCaptResult(deepCapt);
          }
        } catch (e) {
          console.warn('[SpeakingPractice] Deep AI evaluation error:', e);
        }
      }

      const combined = LocalSpeechAI.combineScores(score, textMatch, activeTab);
      if (deepCapt && deepCapt.success) {
        combined.overallScore = Math.round(combined.overallScore * 0.4 + deepCapt.overallScore * 0.6);
        combined.stars = combined.overallScore >= 80 ? 3 : combined.overallScore >= 60 ? 2 : 1;
        combined.message = combined.overallScore >= 80
          ? 'Xuất sắc! Phát âm thanh mẫu, vận mẫu & thanh điệu đều rất chuẩn.'
          : combined.overallScore >= 60
          ? 'Khá tốt! Chú ý một vài điểm ngữ âm chi tiết bên dưới.'
          : 'Chưa đạt. Hãy lắng nghe audio mẫu và chú ý khẩu hình nhé!';
      }

      setScoreResult({ ...score, combined, textMatch, deepCapt });

      if (trackerRef.current) {
        trackerRef.current.getRecordedWaveform(120).then((waveform) => {
          setUserRecordedWaveform(waveform);
          userWaveformRef.current = waveform;
          if (score.valid && score.userChaoPitches) {
            drawContourCanvas(score.userChaoPitches);
          } else {
            drawContourCanvas();
          }
        });
      } else if (score.valid && score.userChaoPitches) {
        drawContourCanvas(score.userChaoPitches);
      }
    } else {
      // START recording
      setScoreResult(null);
      scoreResultRef.current = null;
      setCaptResult(null);
      setAiTranscript('');
      livePointsRef.current = [];
      liveWaveformRef.current = null;
      userWaveformRef.current = null;
      setUserRecordedWaveform(null);
      drawContourCanvas();

      trackerRef.current = new LivePitchTracker({
        onPitch: (frame) => {
          if (frame.isVoiced) {
            setLiveHz(Math.round(frame.frequency));
            const chao = frequencyToChaoScale(frame.frequency, 180); // baseline
            livePointsRef.current.push(chao);
          }
        },
        onVolume: (rms) => {
          setLiveVolume(Math.min(1.0, rms * 8));
        },
        onWaveform: (timeDomainData, rms) => {
          liveWaveformRef.current = timeDomainData.slice();
          drawContourCanvas();
        },
        onStatus: (status, data) => {
          if (status === 'recorded' && data.audioUrl) {
            setRecordedAudioUrl(data.audioUrl);
            setUserRecordedAudio(new Audio(data.audioUrl));
          }
        }
      });

      const started = await trackerRef.current.start();
      if (started) {
        setIsRecording(true);
        if (speechAiRef.current && speechAiRef.current.isSupported) {
          speechAiRef.current.startListening({
            onResult: (res) => {
              setAiTranscript(res.transcript);
            }
          });
        }
      }
    }
  };

  // Play User Recorded Audio (A/B Shadowing)
  const handlePlayUserAudio = () => {
    if (!userRecordedAudio) return;
    setIsPlayingUserAudio(true);
    userRecordedAudio.currentTime = 0;
    const dur = userRecordedAudio.duration && !isNaN(userRecordedAudio.duration) && userRecordedAudio.duration > 0
      ? userRecordedAudio.duration * 1000
      : 1200;
    startPlayheadAnimation(dur);
    userRecordedAudio.play().catch(() => {});
    userRecordedAudio.onended = () => {
      setIsPlayingUserAudio(false);
      playheadPosRef.current = null;
      drawContourCanvas();
    };
  };

  // Navigate words in vocab mode
  const handleNextWord = () => {
    if (vocabList.length === 0) return;
    const nextIdx = (currentWordIndex + 1) % vocabList.length;
    setCurrentWordIndex(nextIdx);
    setCurrentWord(vocabList[nextIdx]);
    setScoreResult(null);
  };

  const handlePrevWord = () => {
    if (vocabList.length === 0) return;
    const prevIdx = (currentWordIndex - 1 + vocabList.length) % vocabList.length;
    setCurrentWordIndex(prevIdx);
    setCurrentWord(vocabList[prevIdx]);
    setScoreResult(null);
  };

  // Select minimal pair
  const handleSelectPair = (pIdx, wIdx) => {
    setSelectedPairIndex(pIdx);
    setSelectedPairWordIndex(wIdx);
    const item = MINIMAL_TONE_PAIRS[pIdx].words[wIdx];
    setCurrentWord({
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      hanviet: item.hanviet,
      meaning: item.meaning,
      example_zh: `${item.hanzi}`,
      example_py: `${item.pinyin}`
    });
    setScoreResult(null);
  };

  // Route from Newbie Tone Guide directly into Tone Trainer with selected word
  const handlePracticeNewbieWord = (wordItem) => {
    setCurrentWord({
      id: `newbie_${wordItem.hanzi}`,
      hanzi: wordItem.hanzi,
      pinyin: wordItem.pinyin,
      hanviet: wordItem.hanviet,
      meaning: wordItem.meaning,
      example_zh: wordItem.hanzi,
      example_py: wordItem.pinyin
    });
    setScoreResult(null);
    setCaptResult(null);
    setActiveTab('toneTrainer');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div class="speaking-station-wrap">
      {/* Speaking header & Mode switcher */}
      <header class="speaking-header">
        <div class="speaking-title-row">
          <div class="speaking-badge-chip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            <span>Phòng Luyện Nói & Chấm Điểm Thanh Điệu AI</span>
          </div>
          <span class="speaking-subtitle">Phân tích cao độ F0 (YIN) & Biến điệu Sandhi chuẩn hóa 100% Client-side</span>
        </div>

        {/* Deep AI ONNX Model Activation Bar */}
        <div class="deep-ai-badge-row">
          <div class="deep-ai-status-indicator">
            <span class={`deep-ai-pulse-dot ${isDeepAiReady ? '' : 'inactive'}`}></span>
            <span>
              {isDeepAiReady
                ? 'AI Conformer (ONNX): Đang hoạt động 100% Offline (Chấm Âm đầu · Vần · Thanh điệu)'
                : 'AI Conformer (ONNX 14MB): Chưa kích hoạt'}
            </span>
          </div>
          {!isDeepAiReady && (
            <button
              type="button"
              class="deep-ai-activate-btn"
              onClick={handleActivateDeepAi}
              disabled={isDownloadingModel}
            >
              {isDownloadingModel ? 'Đang tải...' : '⚡ Kích hoạt AI Chuyên Sâu'}
            </button>
          )}
        </div>

        <div class="speaking-mode-tabs" role="tablist">
          <button
            class={`speaking-mode-btn ${activeTab === 'toneTrainer' ? 'active' : ''}`}
            onClick={() => setActiveTab('toneTrainer')}
          >
            📊 Luyện Thanh Điệu Trực Quan
          </button>
          <button
            class={`speaking-mode-btn ${activeTab === 'vocabPractice' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocabPractice')}
          >
            🎙️ Luyện Phát Âm Từ Vựng HSK
          </button>
          <button
            class={`speaking-mode-btn ${activeTab === 'minimalPairs' ? 'active' : ''}`}
            onClick={() => setActiveTab('minimalPairs')}
          >
            ⚡ Cặp Âm Dễ Nhầm (Người Việt)
          </button>
          <button
            class={`speaking-mode-btn ${activeTab === 'newbieGuide' ? 'active' : ''}`}
            onClick={() => setActiveTab('newbieGuide')}
          >
            📖 Cẩm Nang Thanh Điệu (Newbie)
          </button>
        </div>
      </header>

      {/* Main Study Arena or Newbie Tone Handbook */}
      {activeTab === 'newbieGuide' ? (
        <NewbieToneGuide onPracticeWord={handlePracticeNewbieWord} />
      ) : (
        <div class="speaking-arena">
        {/* Left Column: Word Card & Visual Pitch Canvas */}
        <section class="speaking-display-card">
          {/* Target Hanzi Display */}
          <div class="speaking-word-hero">
            <div class="speaking-hanzi-large">{currentWord.hanzi}</div>
            <div
              class="speaking-pinyin-large"
              dangerouslySetInnerHTML={{ __html: colorizePinyin(currentWord.pinyin) }}
            />
            <div class="speaking-meta-row">
              <span class="speaking-hanviet">Âm Hán-Việt: <strong>{currentWord.hanviet}</strong></span>
              <span class="speaking-dot">•</span>
              <span class="speaking-meaning">{currentWord.meaning}</span>
            </div>

            {/* Tone Sandhi notification if applied */}
            {syllableInfos.some((s) => s.sandhiApplied) && (
              <div class="speaking-sandhi-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16.01"/></svg>
                <span>Có biến điệu (Sandhi): {syllableInfos.filter(s => s.sandhiApplied).map(s => `${s.char} (Thanh ${s.rawTone} → Thanh ${s.actualTone})`).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Interactive Pitch & Audio Waveform Station */}
          <div class="speaking-canvas-container">
            {/* Visualizer Mode Switcher & Legend Bar */}
            <div class="canvas-toolbar">
              <div class="canvas-mode-toggle" role="tablist">
                <button
                  type="button"
                  class={`canvas-mode-btn ${visualizerMode === 'combined' ? 'active' : ''}`}
                  onClick={() => setVisualizerMode('combined')}
                  title="Hiển thị kết hợp Cao độ F0 và Lớp nền Sóng âm"
                >
                  📊 Kết Hợp (Cao Độ + Sóng Âm)
                </button>
                <button
                  type="button"
                  class={`canvas-mode-btn ${visualizerMode === 'dualWaveform' ? 'active' : ''}`}
                  onClick={() => setVisualizerMode('dualWaveform')}
                  title="So sánh trực quan 2 tầng dạng sóng Studio vs Bạn"
                >
                  🌊 Dạng Sóng A/B (Mẫu vs Bạn)
                </button>
              </div>

              <div class="canvas-legend">
                <span class="legend-item target">
                  <span class="legend-color-dot target-dot"></span> Mẫu Studio (Chao & Wave)
                </span>
                <span class="legend-item user">
                  <span class="legend-color-dot user-dot"></span> Giọng của bạn (F0 & Wave)
                </span>
                {isRecording ? (
                  <span class="legend-live-pulse">
                    <span class="pulse-ring"></span>
                    <span>Sóng âm Real-time: <strong>{liveHz > 0 ? `${liveHz} Hz` : 'Đang thu...'}</strong></span>
                  </span>
                ) : (
                  liveHz > 0 && <span class="legend-live-freq">F0: <strong>{liveHz} Hz</strong></span>
                )}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              class={`speaking-pitch-canvas ${isRecording ? 'is-recording-wave' : ''}`}
              aria-label="Biểu đồ sóng âm và đường cao độ thanh điệu"
            />

            {/* Quick Diagnostic Waveform Banner beneath canvas */}
            {scoreResult && scoreResult.toneBreakdown && scoreResult.toneBreakdown.length > 0 && (
              <div class="waveform-diagnostic-banner">
                {scoreResult.toneBreakdown.some((item) => item.errorTag) ? (
                  <div class="waveform-diagnostic-alert">
                    <span class="diag-icon">⚠️</span>
                    <span class="diag-text">
                      <strong>Cảnh báo ngữ âm: </strong>
                      {scoreResult.toneBreakdown
                        .filter((item) => item.errorTag)
                        .map((item) => `Từ "${item.char}": ${item.errorTag}`)
                        .join(' · ')}
                    </span>
                  </div>
                ) : (
                  <div class="waveform-diagnostic-pass">
                    <span class="diag-icon">✓</span>
                    <span class="diag-text">
                      <strong>Rất tốt!</strong> Cao độ thanh điệu và hình dạng phát âm khớp tốt với audio mẫu studio.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls: Sample audio, Record, A/B Shadowing playback */}
          <div class="speaking-action-cluster">
            <button
              class="speaking-btn sample-btn"
              onClick={handlePlaySample}
              title="Nghe phát âm chuẩn studio"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              <span>Nghe Audio Mẫu</span>
            </button>

            <button
              class={`speaking-btn record-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleToggleRecord}
              title={isRecording ? 'Bấm để dừng và chấm điểm' : 'Bấm để bắt đầu ghi âm'}
            >
              <span class="rec-icon-wrap">
                {isRecording ? (
                  <span class="rec-stop-square"></span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                )}
              </span>
              <span>{isRecording ? 'Đang Thu Âm (Bấm để Dừng)' : 'Bấm Nói (Ghi Âm & Chấm Điểm)'}</span>
            </button>

            <button
              class="speaking-btn user-btn"
              onClick={handlePlayUserAudio}
              disabled={!recordedAudioUrl}
              title="Nghe lại giọng bạn vừa thu âm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>{isPlayingUserAudio ? 'Đang Phát...' : 'Nghe Giọng Mình (A/B)'}</span>
            </button>
          </div>
        </section>

        {/* Right Column: Diagnostic & Feedback / Mode Sidebars */}
        <aside class="speaking-sidebar">
          {/* Mode 1 & 2: Evaluation Card */}
          {scoreResult && (
            <div class="speaking-score-card">
              <div class="score-header">
                <div class="score-stars">
                  {'⭐'.repeat(scoreResult.combined ? scoreResult.combined.stars : (scoreResult.stars || 1))}
                </div>
                <div class="score-badge">
                  {scoreResult.combined ? scoreResult.combined.overallScore : scoreResult.score} / 100
                </div>
              </div>

              <div class="score-message">
                {scoreResult.combined ? scoreResult.combined.message : scoreResult.message}
              </div>

              {/* Character by character tone breakdown */}
              {scoreResult.toneBreakdown && scoreResult.toneBreakdown.length > 0 && (
                <div class="tone-breakdown-list">
                  <h4 class="breakdown-title">Chi tiết thanh điệu từng từ:</h4>
                  {scoreResult.toneBreakdown.map((item) => (
                    <div class={`breakdown-item status-${item.status}`}>
                      <div class="breakdown-head">
                        <span class="breakdown-char">{item.char} ({item.syllable})</span>
                        <span class="breakdown-tone-badge">Thanh {item.tone}</span>
                        <span class="breakdown-points">{item.score}đ</span>
                      </div>
                      <p class="breakdown-advice">{item.advice}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Neural CAPT 3-Pillar Deep Breakdown (Initial, Final, Tone) */}
              {captResult && captResult.success && (
                <div class="capt-deep-analysis">
                  <div class="capt-deep-title">
                    <span>🔬 Phân Tích Ngữ Âm Chuyên Sâu (ONNX GOP)</span>
                    <span class="capt-model-tag">Neural Conformer</span>
                  </div>
                  <div class="capt-pillar-row">
                    {/* Initial */}
                    <div class={`capt-pillar-card ${captResult.initial.passed ? 'passed' : 'warning'}`}>
                      <span class="pillar-label">Thanh Mẫu (Âm đầu)</span>
                      <div class="pillar-score-row">
                        <span class="pillar-name">{captResult.initial.target !== 'none' ? captResult.initial.target : '—'}</span>
                        <span class="pillar-points">{captResult.initial.score}đ</span>
                      </div>
                      <p class="pillar-advice">{captResult.initial.advice}</p>
                    </div>

                    {/* Final */}
                    <div class={`capt-pillar-card ${captResult.final.passed ? 'passed' : 'warning'}`}>
                      <span class="pillar-label">Vận Mẫu (Vần)</span>
                      <div class="pillar-score-row">
                        <span class="pillar-name">{captResult.final.target}</span>
                        <span class="pillar-points">{captResult.final.score}đ</span>
                      </div>
                      <p class="pillar-advice">{captResult.final.advice}</p>
                    </div>

                    {/* Tone */}
                    <div class={`capt-pillar-card ${captResult.tone.passed ? 'passed' : 'warning'}`}>
                      <span class="pillar-label">Thanh Điệu</span>
                      <div class="pillar-score-row">
                        <span class="pillar-name">Thanh {captResult.tone.target}</span>
                        <span class="pillar-points">{captResult.tone.score}đ</span>
                      </div>
                      <p class="pillar-advice">{captResult.tone.advice}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Invitation banner to activate Deep AI if not yet ready */}
              {!isDeepAiReady && (
                <div class="deep-ai-cta-banner">
                  <span class="deep-ai-cta-text">
                    💡 Chấm thêm độ chuẩn của âm đầu (zh/z, ch/c, sh/s) & vần (an/ang, u/ü) bằng Neural Conformer.
                  </span>
                  <button
                    type="button"
                    class="deep-ai-cta-btn"
                    onClick={handleActivateDeepAi}
                    disabled={isDownloadingModel}
                  >
                    Bật AI (14MB)
                  </button>
                </div>
              )}

              {/* AI Transcript if captured */}
              {aiTranscript && (
                <div class="ai-transcript-box">
                  <span class="ai-trans-label">AI nhận diện văn bản:</span>
                  <strong class="ai-trans-val">{aiTranscript}</strong>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: HSK Level & Word Navigation */}
          {activeTab === 'vocabPractice' && (
            <div class="vocab-navigation-panel">
              <div class="vocab-nav-header">
                <label for="hskLevelSelect" class="vocab-select-label">Cấp độ HSK:</label>
                <select
                  id="hskLevelSelect"
                  class="speaking-level-select"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  <option value="hsk1">HSK 1 (150 từ)</option>
                  <option value="hsk2">HSK 2 (150 từ)</option>
                  <option value="hsk3">HSK 3 (300 từ)</option>
                  <option value="hsk4">HSK 4 (600 từ)</option>
                  <option value="hsk5">HSK 5 (1300 từ)</option>
                  <option value="hsk6">HSK 6 (2500 từ)</option>
                </select>
              </div>

              <div class="vocab-stepper">
                <button
                  class="stepper-btn"
                  onClick={handlePrevWord}
                  disabled={vocabList.length === 0}
                >
                  ← Từ trước
                </button>
                <span class="stepper-count">
                  {vocabList.length > 0 ? `${currentWordIndex + 1} / ${vocabList.length}` : 'Đang tải...'}
                </span>
                <button
                  class="stepper-btn"
                  onClick={handleNextWord}
                  disabled={vocabList.length === 0}
                >
                  Từ kế tiếp →
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: Minimal Pairs List */}
          {activeTab === 'minimalPairs' && (
            <div class="minimal-pairs-panel">
              <h3 class="minimal-panel-title">Cặp âm luyện phản xạ:</h3>
              <div class="pairs-accordion">
                {MINIMAL_TONE_PAIRS.map((pair, pIdx) => (
                  <div class={`pair-group ${selectedPairIndex === pIdx ? 'active-group' : ''}`}>
                    <div class="pair-group-title">{pair.title}</div>
                    <div class="pair-words-row">
                      {pair.words.map((w, wIdx) => (
                        <button
                          class={`pair-word-btn ${selectedPairIndex === pIdx && selectedPairWordIndex === wIdx ? 'selected' : ''}`}
                          onClick={() => handleSelectPair(pIdx, wIdx)}
                        >
                          <span class="pair-btn-hanzi">{w.hanzi}</span>
                          <span class="pair-btn-py">{w.pinyin}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedagogical Guide for Vietnamese Learners */}
          <div class="vietnamese-tone-guide">
            <h4 class="guide-title">Mẹo Thanh Điệu Cho Người Việt</h4>
            <ul class="guide-list">
              <li><strong>Thanh 1 (55)</strong>: Bằng phẳng, không được thả rơi giọng như dấu huyền.</li>
              <li><strong>Thanh 2 (35)</strong>: Cao độ vuốt lên, giống dấu sắc nhưng dài và đều hơn.</li>
              <li><strong>Thanh 3 (214)</strong>: Hạ thật sâu rồi hơi lượn nhẹ, tránh đọc thành dấu hỏi cộc.</li>
              <li><strong>Thanh 4 (51)</strong>: Rơi dốc dứt khoát từ 5 xuống 1, <em>tuyệt đối không đọc thành dấu sắc</em>!</li>
            </ul>
          </div>
        </aside>
      </div>
      )}

      {/* Model Download Progress Modal */}
      {showModelModal && (
        <div class="capt-model-modal-overlay" onClick={() => !isDownloadingModel && setShowModelModal(false)}>
          <div class="capt-model-modal" onClick={(e) => e.stopPropagation()}>
            <div class="capt-modal-header">
              <h3>Tải Mô Hình AI Chấm Ngữ Âm Chuyên Sâu</h3>
              {!isDownloadingModel && (
                <button
                  type="button"
                  class="capt-modal-close-btn"
                  onClick={() => setShowModelModal(false)}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              )}
            </div>
            <p>Mô hình Neural Conformer-CTC (14.2 MB) chạy trực tiếp 100% Offline trên trình duyệt qua WebAssembly SIMD.</p>
            {!downloadError ? (
              <>
                <div class="capt-progress-bar-wrap">
                  <div class="capt-progress-bar-fill" style={{ width: `${downloadProgress}%` }}></div>
                </div>
                <div class="capt-progress-text">
                  {downloadProgress >= 100 ? 'Đang nạp mô hình vào WebAssembly...' : `Đang tải: ${downloadProgress}%`}
                </div>
              </>
            ) : (
              <div class="capt-modal-error">
                <p class="capt-error-msg">⚠️ {downloadError}</p>
                <div class="capt-error-actions">
                  <button type="button" class="capt-retry-btn" onClick={handleActivateDeepAi}>
                    Thử lại
                  </button>
                  <button type="button" class="capt-dismiss-btn" onClick={() => setShowModelModal(false)}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

let speakingAppMounted = false;
let screenEl = null;

export function mountSpeakingPractice() {
  screenEl = document.getElementById('screenSpeakingPractice');
  if (screenEl && !speakingAppMounted) {
    render(<SpeakingPracticeApp />, screenEl);
    speakingAppMounted = true;
  }
}

export function rerenderSpeakingPractice() {
  if (screenEl) {
    render(<SpeakingPracticeApp />, screenEl);
  }
}
