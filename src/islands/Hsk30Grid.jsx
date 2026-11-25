// HSK 3.0 level picker: version switcher + dynamic grid, reusing the LEVELS/selectLevel pipeline.
// Preact island port replacing legacy assets/js/hsk30.js.
import { onDomReady } from './domReady';

/* global LEVELS_HSK30, hsk30LevelKeys, readSavedLevelProgress, formatProgressPercent, selectLevel */

export const PICKER_VERSION_STORAGE_KEY = 'hsk_picker_version_v2';
export const DEFAULT_PICKER_VERSION = '3.0';
export let pickerVersion = DEFAULT_PICKER_VERSION;

export function getInitialPickerVersion() {
  return DEFAULT_PICKER_VERSION;
}

export function setPickerVersion() {
  pickerVersion = DEFAULT_PICKER_VERSION;
  if (typeof window !== 'undefined') {
    window.pickerVersion = DEFAULT_PICKER_VERSION;
  }
  const g20 = document.getElementById('levelGrid20');
  const g30 = document.getElementById('levelGrid30');
  if (g20) g20.style.display = 'none';
  if (g30) g30.style.display = '';
  renderHsk30Grid();
}

/**
 * Computes mastery counts for an HSK 3.0 level.
 * @param {string} level
 * @returns {{ known: number, studied: number }}
 */
export function hsk30LevelStats(level) {
  const data = typeof readSavedLevelProgress === 'function' ? (readSavedLevelProgress(level) || {}) : {};
  const statuses = Object.values(data);
  const known = statuses.filter(status => status === 'known').length;
  const studied = statuses.filter(status => status === 'known' || status === 'unknown').length;
  return { known, studied };
}

export function hsk30KnownCount(level) {
  return hsk30LevelStats(level).known;
}

export function renderHsk30Grid() {
  const grid = document.getElementById('levelGrid30');
  if (!grid || typeof hsk30LevelKeys !== 'function' || typeof LEVELS_HSK30 === 'undefined') return;

  grid.innerHTML = hsk30LevelKeys().map(key => {
    const cfg = LEVELS_HSK30[key];
    if (!cfg) return '';
    const { known, studied } = hsk30LevelStats(key);
    const rawPct = cfg.total > 0 ? (known / cfg.total * 100) : 0;
    const pctStr = typeof formatProgressPercent === 'function'
      ? formatProgressPercent(known, cfg.total)
      : (cfg.total > 0 ? `${parseFloat(rawPct.toFixed(3))}%` : '0%');
    const complete = known >= cfg.total;
    const isLearning = studied > 0 && !complete;
    const shortLabel = 'HSK' + key.replace('hsk30_', '');
    const metaText = `${cfg.band} · ${cfg.total.toLocaleString('vi-VN')} từ`;
    const tooltip = `${cfg.label} · ${cfg.band} · ${known}/${cfg.total} từ (${pctStr})`;

    const statusBadge = complete
      ? '<span class="level-status-badge is-complete">✓ Hoàn thành</span>'
      : isLearning
      ? '<span class="level-status-badge is-learning">● Đang học</span>'
      : '<span class="level-status-badge">Chưa học</span>';

    return `
      <button class="level-card hsk30-level-card ${cfg.available ? '' : 'disabled'}${complete ? ' is-complete-level' : ''}${isLearning ? ' is-learning-level' : ''}"
        type="button" data-level="${key}" title="${tooltip}" aria-label="${cfg.label}"
        ${cfg.available ? `onclick="selectLevel('${key}')"` : 'disabled'}>
        <div class="level-card-top">
          <div class="level-card-heading">
            <strong class="lvl-num">${shortLabel}</strong>
          </div>
          <strong class="lvl-percent-value">${pctStr}</strong>
        </div>
        <div class="level-card-meta">
          <span class="lvl-label">${metaText}</span>
        </div>
        <div class="level-card-progress">
          <div class="lvl-mastery-track" aria-hidden="true">
            <div class="lvl-mastery-fill" style="width:${known > 0 ? Math.max(rawPct, 0.75) : 0}%"></div>
          </div>
        </div>
        <div class="level-card-bottom">
          <span class="lvl-mastery-text">${known.toLocaleString('vi-VN')} / ${cfg.total.toLocaleString('vi-VN')} đã nhớ</span>
          ${statusBadge}
        </div>
      </button>`;
  }).join('');
}

export function mountHsk30Grid() {
  window.pickerVersion = pickerVersion;
  window.setPickerVersion = setPickerVersion;
  window.hsk30KnownCount = hsk30KnownCount;
  window.renderHsk30Grid = renderHsk30Grid;
  window.getInitialPickerVersion = getInitialPickerVersion;
  window.PICKER_VERSION_STORAGE_KEY = PICKER_VERSION_STORAGE_KEY;
  window.DEFAULT_PICKER_VERSION = DEFAULT_PICKER_VERSION;

  onDomReady(() => {
    setPickerVersion(getInitialPickerVersion());
  });
}
