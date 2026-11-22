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
   *
   * @param {string} recognized What the user said
   * @param {string} target Expected Hanzi (e.g. "你好")
   * @returns {{ matchScore: number, matchedChars: number, totalChars: number, exactMatch: boolean }}
   */
  static evaluateTextMatch(recognized, target) {
    const cleanRec = cleanChineseCharacters(recognized);
    const cleanTar = cleanChineseCharacters(target);

    if (!cleanTar) return { matchScore: 100, matchedChars: 0, totalChars: 0, exactMatch: true };
    if (!cleanRec) return { matchScore: 0, matchedChars: 0, totalChars: cleanTar.length, exactMatch: false };

    if (cleanRec === cleanTar) {
      return { matchScore: 100, matchedChars: cleanTar.length, totalChars: cleanTar.length, exactMatch: true };
    }

    // Levenshtein distance on characters
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

    // Count direct character intersection
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

  /**
   * Aggregates Pitch Tone score and Speech Recognition text score into final grade.
   */
  static combineScores(pitchScoreObj, recognitionObj) {
    const pitchWeight = 0.65;
    const asrWeight = 0.35;

    let finalScore = 0;
    if (pitchScoreObj.valid && recognitionObj) {
      finalScore = Math.round(
        pitchScoreObj.score * pitchWeight + recognitionObj.matchScore * asrWeight
      );
    } else if (pitchScoreObj.valid) {
      finalScore = pitchScoreObj.score;
    } else if (recognitionObj) {
      finalScore = recognitionObj.matchScore;
    }

    return {
      overallScore: Math.min(100, Math.max(0, finalScore)),
      pitchScore: pitchScoreObj.score || 0,
      textScore: recognitionObj ? recognitionObj.matchScore : 0,
      exactMatch: recognitionObj ? recognitionObj.exactMatch : false
    };
  }
}
