/**
 * LocalSpeechAI.js
 * In-browser speech recognition and pronunciation scoring engine.
 *
 * Utilizes native Web Speech API (zh-CN) for instant zero-latency speech recognition,
 * with character & pinyin phonetic distance scoring, designed to run 100% client-side.
 */

import { splitPinyinSyllables } from './pinyinTones.js';
import { cleanChineseCharacters } from './ToneSandhi.js';

export class LocalSpeechAI {
  constructor() {
    this.recognition = null;
    this.isRecognizing = false;
    this.currentTranscript = '';
    this.confidence = 0;
    this.onResult = null;
    this.onError = null;
    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        let maxConf = 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
            maxConf = Math.max(maxConf, res[0].confidence || 0.85);
          } else {
            interim += res[0].transcript;
          }
        }

        const transcript = final || interim;
        this.currentTranscript = transcript;
        this.confidence = maxConf;

        if (this.onResult) {
          this.onResult({
            transcript,
            isFinal: Boolean(final),
            confidence: maxConf
          });
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[LocalSpeechAI] Recognition error:', event.error);
        }
        if (this.onError) {
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
      };
    } catch (err) {
      console.warn('[LocalSpeechAI] Failed to initialize SpeechRecognition:', err);
      this.isSupported = false;
    }
  }

  /**
   * Starts listening and transcribing Chinese speech.
   */
  startListening(callbacks = {}) {
    if (!this.isSupported || !this.recognition) {
      if (callbacks.onError) callbacks.onError('not_supported');
      return false;
    }

    this.onResult = callbacks.onResult || null;
    this.onError = callbacks.onError || null;
    this.currentTranscript = '';
    this.confidence = 0;

    try {
      this.recognition.start();
      this.isRecognizing = true;
      return true;
    } catch (e) {
      // If already started, ignore or restart
      try {
        this.recognition.stop();
        this.recognition.start();
        this.isRecognizing = true;
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  /**
   * Stops listening.
   */
  stopListening() {
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isRecognizing = false;
    }
  }

  /**
   * Evaluates text similarity between recognized transcript and target Hanzi.
   * Also accepts optional expectedPinyin to handle browser ASR transliterations.
   *
   * @param {string} recognized What the user said
   * @param {string} target Expected Hanzi (e.g. "你好")
   * @param {string} [expectedPinyin=''] Expected pinyin (e.g. "nǐ hǎo")
   * @returns {{ matchScore: number, matchedChars: number, totalChars: number, exactMatch: boolean }}
   */
  static evaluateTextMatch(recognized, target, expectedPinyin = '') {
    const cleanRec = cleanChineseCharacters(recognized);
    const cleanTar = cleanChineseCharacters(target);

    if (!cleanTar) return { matchScore: 100, matchedChars: 0, totalChars: 0, exactMatch: true };

    if (cleanRec && cleanRec === cleanTar) {
      return { matchScore: 100, matchedChars: cleanTar.length, totalChars: cleanTar.length, exactMatch: true };
    }

    // If Chinese characters are recognized, compute character Levenshtein distance
    if (cleanRec) {
      const n = cleanRec.length;
      const m = cleanTar.length;
      const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
      for (let i = 0; i <= n; i++) dp[i][0] = i;
      for (let j = 0; j <= m; j++) dp[0][j] = j;

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const cost = cleanRec[i - 1] === cleanTar[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }

      const editDistance = dp[n][m];
      const maxLen = Math.max(n, m);
      const score = Math.max(0, Math.round(((maxLen - editDistance) / maxLen) * 100));

      let matched = 0;
      for (let c of cleanTar) {
        if (cleanRec.includes(c)) matched++;
      }

      return {
        matchScore: score,
        matchedChars: matched,
        totalChars: cleanTar.length,
        exactMatch: score >= 90
      };
    }

    // Fallback: If browser ASR transcribed Latin/pinyin phonetics instead of Hanzi
    if (expectedPinyin) {
      const normalizeLatin = (s) =>
        String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z]/g, '');

      const recLatin = normalizeLatin(recognized);
      const tarLatin = normalizeLatin(expectedPinyin);

      if (recLatin && tarLatin) {
        if (recLatin === tarLatin) {
          return { matchScore: 95, matchedChars: cleanTar.length, totalChars: cleanTar.length, exactMatch: true };
        }
        // Handle common English homophones for Chinese vowels (e.g. English "i" or "eye" for Chinese "ai")
        if (tarLatin === 'ai' && (recLatin === 'i' || recLatin === 'eye')) {
          return { matchScore: 90, matchedChars: cleanTar.length, totalChars: cleanTar.length, exactMatch: true };
        }

        // Levenshtein on Latin pinyin letters
        const n = recLatin.length;
        const m = tarLatin.length;
        const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
        for (let i = 0; i <= n; i++) dp[i][0] = i;
        for (let j = 0; j <= m; j++) dp[0][j] = j;

        for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= m; j++) {
            const cost = recLatin[i - 1] === tarLatin[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + cost
            );
          }
        }
        const editDistance = dp[n][m];
        const maxLen = Math.max(n, m);
        const pinyinScore = Math.max(0, Math.round(((maxLen - editDistance) / maxLen) * 90));

        if (pinyinScore >= 60) {
          return {
            matchScore: pinyinScore,
            matchedChars: Math.round((pinyinScore / 100) * cleanTar.length),
            totalChars: cleanTar.length,
            exactMatch: pinyinScore >= 85
          };
        }
      }
    }

    return { matchScore: 0, matchedChars: 0, totalChars: cleanTar.length, exactMatch: false };
  }

  /**
   * Aggregates Pitch Tone score and Speech Recognition text score into final grade.
   * Tailored by learning mode (Visual Tone Trainer vs Vocab Practice).
   */
  static combineScores(pitchScoreObj, recognitionObj, mode = 'vocabPractice') {
    let finalScore = 0;
    const pitchValid = Boolean(pitchScoreObj && pitchScoreObj.valid);
    const hasTextMatch = Boolean(recognitionObj && typeof recognitionObj.matchScore === 'number');

    if (mode === 'toneTrainer') {
      // In Visual Tone Trainer mode, score is anchored on Chao tone contour accuracy,
      // with resilient fallback protection if ASR confirms the user enunciated the exact word.
      if (pitchValid) {
        finalScore = pitchScoreObj.score;
        if (hasTextMatch && recognitionObj.exactMatch) {
          if (finalScore >= 80) {
            finalScore = Math.min(100, finalScore + 5);
          } else if (finalScore >= 60) {
            finalScore = Math.max(finalScore, 82);
          } else {
            // Low pitch score due to microphone clipping or flat line, but word was 100% correct
            finalScore = Math.max(finalScore, 78);
          }
        }
      } else if (hasTextMatch) {
        finalScore = recognitionObj.exactMatch
          ? Math.max(80, Math.round(recognitionObj.matchScore * 0.9))
          : Math.round(recognitionObj.matchScore * 0.85);
      }
    } else {
      // In Vocab Practice and Minimal Pairs modes: balanced multi-pillar scoring
      if (pitchValid && hasTextMatch) {
        const weighted = Math.round(pitchScoreObj.score * 0.50 + recognitionObj.matchScore * 0.50);
        finalScore = recognitionObj.exactMatch ? Math.max(80, weighted) : weighted;
      } else if (pitchValid) {
        finalScore = pitchScoreObj.score;
      } else if (hasTextMatch) {
        finalScore = recognitionObj.matchScore;
      }
    }

    const overallScore = Math.min(100, Math.max(0, finalScore));

    // Consistently derive stars & message from the displayed overallScore
    let stars = 1;
    if (overallScore >= 80) stars = 3;
    else if (overallScore >= 60) stars = 2;

    let message = 'Chưa đạt. Hãy lắng nghe audio mẫu và thử lại nhé!';
    if (overallScore >= 85) {
      message = 'Rất tuyệt vời! Phát âm chuẩn xác, âm điệu tự nhiên.';
    } else if (overallScore >= 70) {
      if (!pitchValid && hasTextMatch) {
        message = 'AI nhận diện bạn đã đọc đúng từ vựng! Hãy nói to hoặc gần micro hơn để vẽ trọn vẹn đường cao độ F0.';
      } else {
        message = 'Phát âm khá tốt và rõ từ! Chú ý một vài điểm thanh điệu chi tiết bên dưới.';
      }
    } else if (overallScore >= 60) {
      message = 'Đạt yêu cầu cơ bản. Hãy nghe audio mẫu và luyện thêm độ dốc thanh điệu nhé!';
    } else if (!pitchValid && hasTextMatch && recognitionObj.exactMatch) {
      message = 'AI nhận diện bạn đã đọc đúng từ vựng! Hãy nói to hoặc gần micro hơn để hệ thống đo cao độ F0.';
    }

    return {
      overallScore,
      stars,
      message,
      pitchScore: pitchValid ? pitchScoreObj.score : 0,
      textScore: hasTextMatch ? recognitionObj.matchScore : 0,
      exactMatch: hasTextMatch ? recognitionObj.exactMatch : false
    };
  }
}
