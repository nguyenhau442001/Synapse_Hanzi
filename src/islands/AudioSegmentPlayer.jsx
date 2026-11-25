// src/islands/AudioSegmentPlayer.jsx
// Shared audio segment player with rAF boundary monitoring, scrubbable progress bar,
// speed control, optional loop, and optional max-play limit for CTI mock exams.

import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { Play, Pause, RotateCcw, Repeat, Volume2 } from 'lucide-preact';

export const AUDIO_PLAYER_CONSTANTS = {
  MIN_SEGMENT_DURATION_MS: 50,
  SEEK_EPSILON_SEC: 0.03,
  SEEK_TIMEOUT_MS: 1500,
  RETRY_DELAY_MS: 400,
  LOOP_PAUSE_MS: 600,
  SEEK_STEP_SEC: 2,
  DEFAULT_SPEED: 1.0,
  SPEED_OPTIONS: [
    { value: 1.0, label: '1.0x (Chuẩn)' },
    { value: 0.85, label: '0.85x (Chậm)' },
    { value: 0.75, label: '0.75x (Rất chậm)' },
  ],
};

export const AUDIO_PLAYER_LABELS = {
  PLAY: 'Nghe đoạn này',
  PAUSE: 'Tạm dừng',
  SCRUBBER_LABEL: 'Thanh tua âm thanh',
  SCRUBBER_TITLE: 'Bấm để tua hoặc dùng phím mũi tên ← →',
  SCRUBBER_LOCKED_TITLE: 'Chế độ thi thật không cho phép tua âm thanh',
  SPEED_TITLE: 'Tốc độ phát âm',
  LOOP_LABEL: 'Lặp lại',
  LOOP_TITLE: 'Tự động phát lặp lại đoạn này',
  RETRY_BTN: 'Thử lại',
  LIMIT_REACHED: 'Đã hết lượt nghe chuẩn CTI',
  ERR_INVALID_BOUNDARY: 'Mốc thời gian chưa hợp lệ hoặc chưa được thiết lập.',
  ERR_PLAY_BLOCKED: 'Không thể phát âm thanh. Vui lòng bấm nút phát để cấp quyền.',
  ERR_LOAD_FAILED: 'Không thể tải âm thanh. Vui lòng bấm "Thử lại".',
  ERR_STREAM_INTERRUPTED: 'Đường truyền âm thanh bị gián đoạn. Vui lòng bấm "Thử lại".',
};

/**
 * Format milliseconds as M:SS (e.g. 16000 -> "0:16").
 * @param {number} ms
 * @returns {string}
 */
export function formatAudioTime(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Hook that manages a single HTMLAudioElement with rAF segment boundary detection.
 */
export function useAudioSegmentController({
  audioSrc,
  speed = AUDIO_PLAYER_CONSTANTS.DEFAULT_SPEED,
  loop = false,
  maxPlays = null,
  onSegmentEnd = null,
}) {
  const audioRef = useRef(null);
  const activeSegRef = useRef(null);
  const rafRef = useRef(null);
  const loopTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const autoRetriedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const speedRef = useRef(speed);
  const loopRef = useRef(loop);

  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  speedRef.current = speed;
  loopRef.current = loop;
  if (audioRef.current) {
    audioRef.current.playbackRate = speed;
  }
  if (activeSegRef.current) {
    activeSegRef.current.loop = Boolean(loop);
  }

  const stopMonitoring = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    stopMonitoring();
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (e) { /* ignore */ }
    }
    activeSegRef.current = null;
    isSeekingRef.current = false;
    setIsPlaying(false);
    setActiveSegmentId(null);
  }, [clearTimers, stopMonitoring]);

  const resetAudioElement = useCallback(() => {
    stop();
    if (audioRef.current) {
      try {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (e) { /* ignore */ }
      audioRef.current = null;
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      resetAudioElement();
    };
  }, [resetAudioElement]);

  // Reset play count when audioSrc changes
  useEffect(() => {
    stop();
    setPlayCount(0);
    setCurrentMs(0);
    setErrorMsg('');
  }, [audioSrc, stop]);

  const playSegment = useCallback((segmentId, startMs, endMs, overrideSrc = null) => {
    const src = overrideSrc || audioSrc;
    if (!src) return;

    const isFullClip = startMs == null || endMs == null;
    if (!isFullClip && (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs)) {
      setErrorMsg(AUDIO_PLAYER_LABELS.ERR_INVALID_BOUNDARY);
      return;
    }
    if (maxPlays != null && playCount >= maxPlays && activeSegmentId !== segmentId) {
      return;
    }

    clearTimers();
    stopMonitoring();
    setErrorMsg('');

    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      if ('preservesPitch' in el) el.preservesPitch = true;
      el.addEventListener('loadedmetadata', () => {
        if (el.duration && Number.isFinite(el.duration)) {
          setDurationMs(Math.round(el.duration * 1000));
        }
      });
      el.addEventListener('error', () => {
        const raw = el.error ? el.error.message : '';
        const prev = activeSegRef.current;
        stop();
        if (!autoRetriedRef.current && prev) {
          autoRetriedRef.current = true;
          resetAudioElement();
          retryTimerRef.current = setTimeout(() => {
            playSegment(prev.segmentId, prev.rawStartMs, prev.rawEndMs, prev.src);
          }, AUDIO_PLAYER_CONSTANTS.RETRY_DELAY_MS);
          return;
        }
        autoRetriedRef.current = false;
        const msg = raw && (raw.includes('Format error') || raw.includes('MEDIA_ELEMENT_ERROR'))
          ? AUDIO_PLAYER_LABELS.ERR_STREAM_INTERRUPTED
          : AUDIO_PLAYER_LABELS.ERR_LOAD_FAILED;
        setErrorMsg(msg);
      });
      audioRef.current = el;
    }

    const el = audioRef.current;
    if (!el.src || !el.src.endsWith(src)) {
      el.src = src;
    }
    el.playbackRate = speedRef.current;

    const resolvedStart = isFullClip ? 0 : Math.max(0, startMs);
    const resolvedEnd = isFullClip
      ? (el.duration && Number.isFinite(el.duration) ? el.duration * 1000 : Infinity)
      : Math.max(resolvedStart + AUDIO_PLAYER_CONSTANTS.MIN_SEGMENT_DURATION_MS, endMs);

    const seg = {
      segmentId,
      src,
      rawStartMs: startMs,
      rawEndMs: endMs,
      startMs: resolvedStart,
      endMs: resolvedEnd,
      isFullClip,
      loop: Boolean(loopRef.current),
    };
    activeSegRef.current = seg;
    setActiveSegmentId(segmentId);
    setCurrentMs(0);
    if (!isFullClip) {
      setDurationMs(resolvedEnd - resolvedStart);
    }

    const monitor = () => {
      if (!audioRef.current || !activeSegRef.current || audioRef.current.paused || isSeekingRef.current) {
        return;
      }
      const curSeg = activeSegRef.current;
      const nowMs = audioRef.current.currentTime * 1000;
      const effectiveEnd = curSeg.isFullClip && audioRef.current.duration
        ? audioRef.current.duration * 1000
        : curSeg.endMs;

      if (curSeg.isFullClip && audioRef.current.duration) {
        setDurationMs(Math.round(audioRef.current.duration * 1000));
      }
      setCurrentMs(Math.max(0, nowMs - curSeg.startMs));

      if (nowMs >= effectiveEnd || audioRef.current.ended) {
        audioRef.current.pause();
        if (curSeg.loop) {
          loopTimerRef.current = setTimeout(() => {
            if (activeSegRef.current === curSeg) {
              playSegment(curSeg.segmentId, curSeg.rawStartMs, curSeg.rawEndMs, curSeg.src);
            }
          }, AUDIO_PLAYER_CONSTANTS.LOOP_PAUSE_MS);
          return;
        }
        activeSegRef.current = null;
        setIsPlaying(false);
        setActiveSegmentId(null);
        setPlayCount((c) => c + 1);
        if (typeof onSegmentEnd === 'function') onSegmentEnd(curSeg.segmentId);
        return;
      }
      rafRef.current = requestAnimationFrame(monitor);
    };

    const beginPlayback = () => {
      isSeekingRef.current = false;
      autoRetriedRef.current = false;
      setIsPlaying(true);
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          if (err && err.name !== 'AbortError') {
            setErrorMsg(AUDIO_PLAYER_LABELS.ERR_PLAY_BLOCKED);
          }
          stop();
        });
      }
      stopMonitoring();
      rafRef.current = requestAnimationFrame(monitor);
    };

    const seekAndPlay = () => {
      const targetSec = resolvedStart / 1000;
      if (Math.abs(el.currentTime - targetSec) < AUDIO_PLAYER_CONSTANTS.SEEK_EPSILON_SEC) {
        beginPlayback();
        return;
      }
      isSeekingRef.current = true;
      let timer = null;
      const onSeeked = () => {
        if (timer) clearTimeout(timer);
        el.removeEventListener('seeked', onSeeked);
        beginPlayback();
      };
      el.addEventListener('seeked', onSeeked, { once: true });
      timer = setTimeout(() => {
        el.removeEventListener('seeked', onSeeked);
        beginPlayback();
      }, AUDIO_PLAYER_CONSTANTS.SEEK_TIMEOUT_MS);
      try {
        el.currentTime = targetSec;
      } catch (e) {
        if (timer) clearTimeout(timer);
        el.removeEventListener('seeked', onSeeked);
        beginPlayback();
      }
    };

    if (el.readyState === 0) {
      let readyTimer = null;
      const onReady = () => {
        if (readyTimer) clearTimeout(readyTimer);
        el.removeEventListener('loadedmetadata', onReady);
        el.removeEventListener('canplay', onReady);
        seekAndPlay();
      };
      el.addEventListener('loadedmetadata', onReady, { once: true });
      el.addEventListener('canplay', onReady, { once: true });
      readyTimer = setTimeout(() => {
        el.removeEventListener('loadedmetadata', onReady);
        el.removeEventListener('canplay', onReady);
        seekAndPlay();
      }, AUDIO_PLAYER_CONSTANTS.SEEK_TIMEOUT_MS);
      try { el.load(); } catch (e) { /* ignore */ }
    } else {
      seekAndPlay();
    }
  }, [audioSrc, maxPlays, playCount, activeSegmentId, clearTimers, stopMonitoring, stop, resetAudioElement, onSegmentEnd]);

  const seekWithinSegment = useCallback((relativeMs) => {
    const el = audioRef.current;
    const seg = activeSegRef.current;
    if (!el || !seg) return;
    const maxRel = Math.max(0, (seg.isFullClip ? durationMs : seg.endMs - seg.startMs));
    const clamped = Math.max(0, Math.min(relativeMs, maxRel));
    el.currentTime = (seg.startMs + clamped) / 1000;
    setCurrentMs(clamped);
  }, [durationMs]);

  return {
    activeSegmentId,
    isPlaying,
    currentMs,
    durationMs,
    playCount,
    errorMsg,
    playSegment,
    stop,
    seekWithinSegment,
  };
}

/**
 * Shared UI component for segment-based audio playback with scrubbable progress bar.
 */
export function AudioSegmentPlayer({
  controller,
  segmentId = 'full_question',
  startMs = null,
  endMs = null,
  allowSeek = true,
  allowLoop = false,
  loop = false,
  onToggleLoop = null,
  speed = AUDIO_PLAYER_CONSTANTS.DEFAULT_SPEED,
  onSpeedChange = null,
  maxPlays = null,
  showPlayCount = false,
  playLabel = AUDIO_PLAYER_LABELS.PLAY,
}) {
  const isThisPlaying = controller.isPlaying && controller.activeSegmentId === segmentId;
  const totalMs = startMs != null && endMs != null
    ? Math.max(0, endMs - startMs)
    : controller.durationMs;
  const pct = totalMs > 0 && controller.activeSegmentId === segmentId
    ? Math.min(100, Math.max(0, (controller.currentMs / totalMs) * 100))
    : 0;
  const isLimitReached = maxPlays != null && controller.playCount >= maxPlays && !isThisPlaying;

  const handleTogglePlay = () => {
    if (isThisPlaying) {
      controller.stop();
    } else {
      controller.playSegment(segmentId, startMs, endMs);
    }
  };

  const handleTrackClick = (e) => {
    if (!allowSeek || !totalMs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetRelMs = ratio * totalMs;
    if (!isThisPlaying) {
      controller.playSegment(segmentId, startMs, endMs);
    }
    controller.seekWithinSegment(targetRelMs);
  };

  const handleTrackKey = (e) => {
    if (!allowSeek || !totalMs) return;
    const stepMs = AUDIO_PLAYER_CONSTANTS.SEEK_STEP_SEC * 1000;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      controller.seekWithinSegment(controller.currentMs - stepMs);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      controller.seekWithinSegment(controller.currentMs + stepMs);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleTogglePlay();
    }
  };

  return (
    <div class="listening-player-surface">
      <div class="listening-player-controls-grid">
        <button
          type="button"
          class={`listening-play-primary-btn ${isThisPlaying ? 'is-playing' : ''}`}
          onClick={handleTogglePlay}
          disabled={isLimitReached}
          aria-label={isThisPlaying ? AUDIO_PLAYER_LABELS.PAUSE : playLabel}
          title={isLimitReached ? AUDIO_PLAYER_LABELS.LIMIT_REACHED : (isThisPlaying ? AUDIO_PLAYER_LABELS.PAUSE : playLabel)}
        >
          {isThisPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isThisPlaying ? AUDIO_PLAYER_LABELS.PAUSE : playLabel}</span>
        </button>

        <div class="listening-player-right-col">
          <div class="listening-progress-wrap">
            <div
              class={`listening-progress-track ${!allowSeek ? 'is-seek-locked' : ''}`}
              tabindex={allowSeek ? '0' : undefined}
              role="slider"
              aria-label={AUDIO_PLAYER_LABELS.SCRUBBER_LABEL}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(pct)}
              title={allowSeek ? AUDIO_PLAYER_LABELS.SCRUBBER_TITLE : AUDIO_PLAYER_LABELS.SCRUBBER_LOCKED_TITLE}
              onClick={handleTrackClick}
              onKeyDown={handleTrackKey}
            >
              <div
                class="listening-progress-fill"
                style={{ width: `${pct.toFixed(2)}%` }}
              />
              {allowSeek && (
                <span
                  class="listening-progress-thumb"
                  style={{ left: `${pct.toFixed(2)}%` }}
                />
              )}
            </div>
            <div class="listening-time-readout">
              {`${formatAudioTime(controller.activeSegmentId === segmentId ? controller.currentMs : 0)} / ${formatAudioTime(totalMs)}`}
            </div>
          </div>

          <div class="listening-player-meta-controls" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.35rem;flex-wrap:wrap;">
            {onSpeedChange && (
              <select
                class="listening-speed-select"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.currentTarget.value))}
                title={AUDIO_PLAYER_LABELS.SPEED_TITLE}
                aria-label={AUDIO_PLAYER_LABELS.SPEED_TITLE}
              >
                {AUDIO_PLAYER_CONSTANTS.SPEED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {allowLoop && onToggleLoop && (
              <button
                type="button"
                class={`listening-toggle-pill ${loop ? 'is-active' : ''}`}
                onClick={onToggleLoop}
                aria-pressed={String(loop)}
                title={AUDIO_PLAYER_LABELS.LOOP_TITLE}
              >
                <Repeat size={13} />
                <span>{AUDIO_PLAYER_LABELS.LOOP_LABEL}</span>
              </button>
            )}

            {showPlayCount && (
              <span style="font-size:0.78rem;color:var(--exam-text-muted, #64748b);display:inline-flex;align-items:center;gap:0.25rem;">
                <Volume2 size={13} />
                <span>
                  {maxPlays != null
                    ? `Đã nghe: ${controller.playCount}/${maxPlays} lần`
                    : `Đã nghe: ${controller.playCount} lần`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {controller.errorMsg && (
        <div class="listening-audio-error-banner" role="alert" style="margin-top:0.5rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;font-size:0.85rem;color:#b91c1c;">
          <span>{controller.errorMsg}</span>
          <button
            type="button"
            class="listening-editor-btn"
            onClick={() => controller.playSegment(segmentId, startMs, endMs)}
          >
            <RotateCcw size={13} />
            <span>{AUDIO_PLAYER_LABELS.RETRY_BTN}</span>
          </button>
        </div>
      )}
    </div>
  );
}
