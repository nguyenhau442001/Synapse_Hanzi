/**
 * SpeechAudio.js
 * Combined TTS & audio playback service for Chinese vocabulary & example sentences.
 * Port of legacy assets/js/speechService.js and assets/js/speech.js.
 */

/* global LEVELS, currentLevel, WORDS, filteredOrder, idx, SPEECH_RATE, exampleSpeechSpeed */

let cachedVoices = [];
let isVoicesLoaded = false;
let activeUtterance = null;
let activePlaybackId = 0;
const voiceListeners = [];

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'Audio' in window;
}

export function normalizeLang(lang) {
  return (lang || '').toLowerCase().replace(/_/g, '-');
}

export function loadVoices() {
  return [];
}

export function initVoiceLoading() {}

export function onVoicesChanged(callback) {}

export function getChineseVoice() {
  return null;
}

export function stopSpeaking() {
  activePlaybackId++;
  if (activeSpeechAudio) {
    try {
      activeSpeechAudio.pause();
      activeSpeechAudio.currentTime = 0;
    } catch (e) {}
    activeSpeechAudio = null;
  }
  if (typeof window !== 'undefined' && window.activeSpeechAudio && window.activeSpeechAudio !== activeSpeechAudio) {
    try {
      window.activeSpeechAudio.pause();
      window.activeSpeechAudio.currentTime = 0;
    } catch (e) {}
    window.activeSpeechAudio = null;
  }
}

export function speakChinese(text, options = {}) {
  if (!text) return false;

  const cleanText = String(text).replace(/<[^>]*>/g, '').trim();
  if (!cleanText) return false;

  stopSpeaking();
  const playbackId = activePlaybackId;

  const audioUrl = resolvePrebuiltAudio(cleanText);
  if (!audioUrl) {
    if (typeof options.onError === 'function') {
      try {
        options.onError(new Error('Chưa có bản thu studio cho mục này.'));
      } catch (e) {}
    }
    return false;
  }

  try {
    const audio = new Audio(audioUrl);
    activeSpeechAudio = audio;
    const rate = typeof options.rate === 'number' ? Math.max(0.25, Math.min(2.0, options.rate)) : 0.8;
    audio.playbackRate = rate;
    if ('preservesPitch' in audio) audio.preservesPitch = true;

    audio.onplay = () => {
      if (playbackId !== activePlaybackId) return;
      if (typeof options.onStart === 'function') {
        try { options.onStart(); } catch (e) { console.warn(e); }
      }
    };

    audio.onended = () => {
      if (playbackId !== activePlaybackId) return;
      if (activeSpeechAudio === audio) activeSpeechAudio = null;
      if (typeof options.onEnd === 'function') {
        try { options.onEnd(); } catch (e) { console.warn(e); }
      }
    };

    audio.onerror = (event) => {
      if (playbackId !== activePlaybackId) return;
      if (activeSpeechAudio === audio) activeSpeechAudio = null;
      if (typeof options.onError === 'function') {
        try { options.onError(event); } catch (e) { console.warn(e); }
      }
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (playbackId !== activePlaybackId) return;
        if (activeSpeechAudio === audio) activeSpeechAudio = null;
        if (typeof options.onError === 'function') options.onError(err);
      });
    }
    return true;
  } catch (error) {
    console.warn('[SpeechService] Audio playback error:', error);
    if (typeof options.onError === 'function') {
      try { options.onError(error); } catch (e) {}
    }
    return false;
  }
}

export const SpeechService = {
  isSpeechSupported,
  getChineseVoice,
  getVoices: () => cachedVoices.slice(),
  onVoicesChanged,
  speakChinese,
  stopSpeaking,
};

// Playback orchestration
let localAudioManifest = null;
let speechRequestId = 0;
let activeSpeechButton = null;
let activeSpeechAudio = null;
let globalHanziAudioMap = null;
let isLoadingGlobalMap = false;

export async function loadGlobalHanziAudioMap() {
  if (globalHanziAudioMap) return globalHanziAudioMap;
  if (isLoadingGlobalMap) return null;
  isLoadingGlobalMap = true;
  try {
    const res = await fetch('database/prebuilt_audio/hanzi_audio_map.json');
    if (res.ok) {
      const data = await res.json();
      globalHanziAudioMap = data;
      if (typeof window !== 'undefined') window.globalHanziAudioMap = data;
    }
  } catch (err) {
    // Non-fatal, fallback to local manifest or Web Speech
  } finally {
    isLoadingGlobalMap = false;
  }
  return globalHanziAudioMap;
}

export function resolvePrebuiltAudio(text) {
  if (!text) return null;
  const rawText = String(text).replace(/<[^>]*>/g, '').trim();
  const cleanText = rawText.replace(/[（\(].*?[）\)]/g, '').trim() || rawText;

  // 1. Try global Hanzi audio index
  const gMap = globalHanziAudioMap || (typeof window !== 'undefined' && window.globalHanziAudioMap);
  if (gMap) {
    if (gMap[cleanText]) return gMap[cleanText];
    if (gMap[rawText]) return gMap[rawText];
  }

  // 2. Try current active manifest items
  const manifest = localAudioManifest || (typeof window !== 'undefined' && window.prebuiltAudioManifest);
  if (manifest && manifest.items) {
    const words = typeof WORDS !== 'undefined' ? WORDS : (typeof window !== 'undefined' ? window.WORDS : null);
    if (Array.isArray(words)) {
      const match = words.find(w => w && (w.hanzi === rawText || w.hanzi === cleanText || w.example_zh === rawText));
      if (match && manifest.items[String(match.id)]) {
        const item = manifest.items[String(match.id)];
        if (match.example_zh === rawText && item.example) return item.example;
        if (item.word) return item.word;
      }
    }
  }

  return null;
}

const audioManifestCache = new Map();

export async function loadPrebuiltAudioManifest(level) {
  localAudioManifest = null;
  const levels = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  const config = levels ? levels[level] : null;
  if (!config || !config.audioManifestUrl) return null;

  if (audioManifestCache.has(level)) {
    const cached = audioManifestCache.get(level);
    const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
    if (currentLvl === level && cached && cached.items) {
      localAudioManifest = cached;
      if (typeof window !== 'undefined') window.prebuiltAudioManifest = cached;
    }
    return cached;
  }

  const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;

  try {
    const response = await fetch(config.audioManifestUrl);
    if (!response.ok) return null;
    const manifest = await response.json();
    audioManifestCache.set(level, manifest);
    if (currentLvl !== level || manifest.level !== level || !manifest.items) return manifest;
    localAudioManifest = manifest;
    if (typeof window !== 'undefined') window.prebuiltAudioManifest = manifest;
    return manifest;
  } catch (error) {
    // Missing manifest is expected when rolling out or using Web Speech directly.
    return null;
  }
}

export function prebuiltAudioUrl(word, kind) {
  const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
  const manifest = localAudioManifest || (typeof window !== 'undefined' && window.prebuiltAudioManifest);
  if (word && manifest && manifest.level === currentLvl) {
    const item = manifest.items[String(word.id)];
    if (item && typeof item[kind] === 'string') return item[kind];
  }

  // Fallback to global Hanzi audio map
  if (word && kind === 'word') {
    const candidate = resolvePrebuiltAudio(word.hanzi);
    if (candidate) return candidate;
  } else if (word && kind === 'example' && word.example_zh) {
    const candidate = resolvePrebuiltAudio(word.example_zh);
    if (candidate) return candidate;
  }

  return null;
}

export function speakWord() {
  const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
  const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
  const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (!order || order.length === 0 || !words) return;

  const wIdx = order[currentIdx % order.length];
  const word = words[wIdx];
  if (!word || !word.hanzi) return;

  const btn = document.getElementById('soundBtn');
  const cleanHanzi = String(word.hanzi).replace(/[（\(].*?[）\)]/g, '').trim() || word.hanzi;
  const rate = typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : (window.SPEECH_RATE || 0.8);
  speakText(
    cleanHanzi,
    btn,
    rate,
    prebuiltAudioUrl(word, 'word')
  );
}

export function speakExample() {
  const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
  const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
  const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (!order || order.length === 0 || !words) return;

  const wIdx = order[currentIdx % order.length];
  const word = words[wIdx];
  const example = document.getElementById('exZh');
  const text = (example ? example.textContent.trim() : '') || (word ? word.example_zh : '');
  if (!text) return;

  const btn = document.getElementById('exampleSoundBtn');
  const exRate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : (window.exampleSpeechSpeed || 0.8);
  speakText(
    text,
    btn,
    exRate,
    prebuiltAudioUrl(word, 'example')
  );
}

export function speakText(text, button, rate = (typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.8), audioUrl = null) {
  if (!button || !text) return;
  if (activeSpeechButton === button) {
    stopSpeech();
    return;
  }

  stopSpeech();
  const requestId = speechRequestId;
  const hint = document.getElementById('hint');
  const prevHint = hint ? hint.textContent : '';

  activeSpeechButton = button;

  const finalAudioUrl = audioUrl || resolvePrebuiltAudio(text);

  // Prebuilt studio-grade audio
  if (finalAudioUrl) {
    playPrebuiltAudio(text, button, rate, finalAudioUrl, requestId, hint, prevHint);
    return;
  }

  // No prebuilt audio available
  setSpeechButtonState(button, false);
  showSpeechHint(hint, 'Chưa có bản thu âm cho mục này', prevHint);
}

export function playPrebuiltAudio(text, button, rate, audioUrl, requestId, hint, prevHint) {
  const audio = new Audio(audioUrl);
  activeSpeechAudio = audio;
  audio.preload = 'auto';
  audio.playbackRate = Math.min(2, Math.max(0.25, rate));
  if ('preservesPitch' in audio) audio.preservesPitch = true;

  let settled = false;
  const fallback = () => {
    if (settled || requestId !== speechRequestId) return;
    settled = true;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    if (activeSpeechAudio === audio) activeSpeechAudio = null;
    setSpeechButtonState(button, false);
    showSpeechHint(hint, 'Không thể tải âm thanh, vui lòng thử lại', prevHint);
  };

  audio.onplaying = () => {
    if (requestId !== speechRequestId) return;
    setSpeechButtonState(button, true, text);
  };
  audio.onended = () => {
    if (settled || requestId !== speechRequestId) return;
    settled = true;
    if (activeSpeechAudio === audio) activeSpeechAudio = null;
    setSpeechButtonState(button, false);
  };
  audio.onerror = fallback;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(fallback);
}

export function speakWithWebSpeech(text, button, rate, requestId, hint, prevHint) {
  if (requestId !== speechRequestId) return;
  setSpeechButtonState(button, false);
  showSpeechHint(hint, 'Chưa có bản thu âm cho mục này', prevHint);
}

export function showSpeechHint(hint, message, previousMessage) {
  if (!hint) return;
  hint.textContent = message;
  setTimeout(() => {
    if (hint.textContent === message) hint.textContent = previousMessage;
  }, 2500);
}

export function setSpeechButtonState(button, isPlaying, text) {
  if (!button) return;
  const isExample = button.classList.contains('example-sound-btn');

  button.classList.toggle('is-playing', isPlaying);
  button.setAttribute('aria-pressed', String(isPlaying));
  button.setAttribute(
    'aria-label',
    isPlaying
      ? (isExample ? 'Đang phát câu ví dụ' : `Đang phát âm ${text || ''}`.trim())
      : (isExample ? 'Nghe câu ví dụ' : 'Nghe phát âm')
  );
  button.title = isPlaying ? 'Bấm để dừng' : (isExample ? 'Nghe câu ví dụ' : 'Nghe phát âm (A)');

  if (isPlaying) activeSpeechButton = button;
  else if (activeSpeechButton === button) activeSpeechButton = null;
}

export function syncSpeechButtons() {
  const soundBtn = document.getElementById('soundBtn');
  const exampleSoundBtn = document.getElementById('exampleSoundBtn');
  const supported = isSpeechSupported();

  if (soundBtn) {
    if (!supported) {
      soundBtn.disabled = true;
      soundBtn.classList.add('is-disabled');
      soundBtn.setAttribute('aria-disabled', 'true');
      soundBtn.title = 'Trình duyệt không hỗ trợ phát âm (Web Speech API)';
    } else {
      soundBtn.disabled = false;
      soundBtn.classList.remove('is-disabled');
      soundBtn.removeAttribute('aria-disabled');
      soundBtn.title = 'Nghe phát âm (A)';
    }
  }

  if (exampleSoundBtn) {
    const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
    const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
    const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
    const currentWord = (order && order.length > 0 && words) ? words[order[currentIdx % order.length]] : null;
    const hasExample = Boolean(currentWord && (currentWord.example_zh || currentWord.example_py || currentWord.example_vi));

    if (!supported) {
      exampleSoundBtn.disabled = true;
      exampleSoundBtn.classList.add('is-disabled');
      exampleSoundBtn.setAttribute('aria-disabled', 'true');
      exampleSoundBtn.title = 'Trình duyệt không hỗ trợ phát âm (Web Speech API)';
    } else if (!hasExample) {
      exampleSoundBtn.disabled = true;
      exampleSoundBtn.classList.add('is-disabled');
      exampleSoundBtn.setAttribute('aria-disabled', 'true');
      exampleSoundBtn.title = 'Không có câu ví dụ';
    } else {
      exampleSoundBtn.disabled = false;
      exampleSoundBtn.classList.remove('is-disabled');
      exampleSoundBtn.removeAttribute('aria-disabled');
      exampleSoundBtn.title = 'Nghe câu ví dụ';
    }
  }
}

export function stopSpeech() {
  speechRequestId++;
  stopSpeaking();

  if (activeSpeechAudio) {
    const audio = activeSpeechAudio;
    activeSpeechAudio = null;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    try { audio.currentTime = 0; } catch (error) {}
  }

  if (activeSpeechButton) setSpeechButtonState(activeSpeechButton, false);
}

export function mountSpeechAudio() {
  initVoiceLoading();
  loadGlobalHanziAudioMap().catch(() => {});

  window.SpeechService = SpeechService;
  window.isSpeechSupported = isSpeechSupported;
  window.getChineseVoice = getChineseVoice;
  window.speakChinese = speakChinese;
  window.stopSpeaking = stopSpeaking;
  window.loadPrebuiltAudioManifest = loadPrebuiltAudioManifest;
  window.loadGlobalHanziAudioMap = loadGlobalHanziAudioMap;
  window.resolvePrebuiltAudio = resolvePrebuiltAudio;
  window.prebuiltAudioUrl = prebuiltAudioUrl;
  window.speakWord = speakWord;
  window.speakExample = speakExample;
  window.speakText = speakText;
  window.playPrebuiltAudio = playPrebuiltAudio;
  window.speakWithWebSpeech = speakWithWebSpeech;
  window.showSpeechHint = showSpeechHint;
  window.setSpeechButtonState = setSpeechButtonState;
  window.syncSpeechButtons = syncSpeechButtons;
  window.stopSpeech = stopSpeech;

  onVoicesChanged(() => {
    syncSpeechButtons();
  });
}
