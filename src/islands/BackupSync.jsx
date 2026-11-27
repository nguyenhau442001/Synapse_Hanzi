// Export and import progress snapshots between devices.
// Preact island port replacing legacy assets/js/backup.js.

import { APP_VERSION } from './AppUtils.js';
import { buildBackup, parseBackup, applyBackup } from './SyncSnapshot.js';
import {
  BACKUP_TYPE,
  BACKUP_MAX_FILE_BYTES,
  BACKUP_FILE_PREFIX,
  BACKUP_FILE_EXTENSION,
  BACKUP_MIME_TYPE,
  BACKUP_JSON_INDENT,
  BACKUP_PANEL_CLOSE_DELAY_MS,
  BACKUP_LABELS,
} from './SyncConstants.js';

/** Length of the YYYY-MM-DD prefix of an ISO timestamp. */
const ISO_DATE_LENGTH = 10;

/* global currentLevel, srsCards, readSrsReviewLog, showPinyin, showIllustration, order,
   srsRetention, progress, WORDS, SRS, migrateLegacyProgress, progressFromCards,
   appendImportedReviewLog, saveRetention, saveProgress, savePrefs, renderLearningDashboard,
   setFilter, updateSrsPreviews, toggleTransferPanel, toggleRadicalTransferPanel,
   radicalProgress, showRadicalPinyin, saveRadicalProgress, saveRadicalPrefs,
   setRadicalFilter, radicalCurrentFilter, radicalCurrentView, renderRadicalOverview, readStudyDirection */

/**
 * Trigger a browser download of a JSON payload.
 * @param {string} json
 * @param {string} filename
 */
function downloadJson(json, filename) {
  const blob = new Blob([json], { type: BACKUP_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Download a full-app backup of every allowlisted progress key (all levels and directions). */
export function exportProgress() {
  // Flush the in-memory active deck so the backup includes the latest reviews.
  const hasActiveDeck = typeof currentLevel !== 'undefined' && Boolean(currentLevel);
  if (hasActiveDeck && typeof saveProgress === 'function') saveProgress();
  if (hasActiveDeck && typeof savePrefs === 'function') savePrefs();
  const backup = buildBackup(localStorage, { appVersion: APP_VERSION });
  const date = backup.exportedAt.slice(0, ISO_DATE_LENGTH);
  downloadJson(JSON.stringify(backup, null, BACKUP_JSON_INDENT), BACKUP_FILE_PREFIX + date + BACKUP_FILE_EXTENSION);
  setTimeout(() => {
    if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
  }, BACKUP_PANEL_CLOSE_DELAY_MS);
}

/**
 * Validate, merge and apply a full-app backup, then reload so every island re-reads storage.
 * @param {string} text
 */
function restoreFullBackup(text) {
  const result = parseBackup(text);
  if (!result.ok) {
    alert(result.reason === 'too_large' ? BACKUP_LABELS.fileTooLarge : BACKUP_LABELS.invalidFile);
    return;
  }
  if (!confirm(BACKUP_LABELS.confirmRestore)) return;
  try {
    applyBackup(localStorage, result.backup, { normalizeCard: card => SRS.serializeCard(card) });
  } catch (error) {
    alert(BACKUP_LABELS.invalidFile);
    return;
  }
  alert(BACKUP_LABELS.restoreDone);
  window.location.reload();
}

export function importProgress(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > BACKUP_MAX_FILE_BYTES) {
    alert(BACKUP_LABELS.fileTooLarge);
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data && data.type === BACKUP_TYPE) {
        restoreFullBackup(String(e.target.result));
        return;
      }
      // Legacy single-level backup (schemaVersion 3, written before v3.72).
      if (data.level && data.level !== currentLevel) {
        if (!confirm('Bản sao này thuộc cấp độ ' + data.level.toUpperCase() + ', không phải ' + currentLevel.toUpperCase() + '. Vẫn khôi phục?')) return;
      }
      if (!confirm('Khôi phục tiến trình từ một bản sao đã tải trước đó. Tiến trình hiện tại có thể bị thay thế.')) return;
      const backupPrefs = data.prefs && typeof data.prefs === 'object' ? data.prefs : data;
      if (data.schemaVersion >= 3 && data.cards && typeof data.cards === 'object') {
        const restoredCards = {};
        Object.entries(data.cards).forEach(([id, card]) => {
          const normalized = SRS.serializeCard(card);
          if (!normalized) throw new Error('invalid FSRS card');
          restoredCards[id] = normalized;
        });
        WORDS.forEach(word => {
          if (!restoredCards[word.id]) restoredCards[word.id] = SRS.createNewCard();
        });
        Object.keys(srsCards).forEach(key => delete srsCards[key]);
        Object.assign(srsCards, restoredCards);
      } else {
        const legacyProgress = data.progress && typeof data.progress === 'object' ? data.progress : {};
        const migrated = migrateLegacyProgress(currentLevel, WORDS, legacyProgress, srsRetention);
        Object.keys(srsCards).forEach(key => delete srsCards[key]);
        Object.assign(srsCards, migrated);
      }
      const newProg = progressFromCards(srsCards);
      Object.keys(progress).forEach(key => delete progress[key]);
      Object.assign(progress, newProg);

      appendImportedReviewLog(currentLevel, data.reviewLog, typeof readStudyDirection === 'function' ? readStudyDirection() : undefined);
      if (Array.isArray(backupPrefs.order) && backupPrefs.order.length === WORDS.length) {
        order.length = 0;
        backupPrefs.order.forEach(item => order.push(item));
      }
      if (typeof backupPrefs.showPinyin === 'boolean') {
        window.showPinyin = backupPrefs.showPinyin;
      }
      if (typeof backupPrefs.showIllustrationV2 === 'boolean') {
        window.showIllustration = backupPrefs.showIllustrationV2;
        try { localStorage.setItem('hsk_show_illustrations_v2', String(backupPrefs.showIllustrationV2)); } catch (_) {}
        document.body.classList.toggle('hide-illustrations', !backupPrefs.showIllustrationV2);
      }
      if (Number.isFinite(Number(backupPrefs.desiredRetention))) {
        window.srsRetention = saveRetention(backupPrefs.desiredRetention);
      }
      const retentionSlider = document.getElementById('desiredRetentionSlider');
      const retentionLabel = document.getElementById('desiredRetentionValue');
      if (retentionSlider) retentionSlider.value = String(srsRetention);
      if (retentionLabel) retentionLabel.textContent = Math.round(srsRetention * 100) + '%';
      saveProgress();
      savePrefs();
      if (typeof renderLearningDashboard === 'function') renderLearningDashboard();
      const btn = document.getElementById('pinyinToggle');
      if (btn) {
        btn.textContent = showPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
        btn.classList.toggle('on', !showPinyin);
      }
      if (typeof setFilter === 'function') setFilter(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
      if (typeof filteredOrder !== 'undefined' && filteredOrder.length && typeof updateSrsPreviews === 'function') {
        updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
      }
      if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
      alert('Đã khôi phục tiến trình thành công!');
    } catch (err) {
      alert('Bản sao tiến trình không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

export function updateDesiredRetention(value) {
  if (typeof saveRetention === 'function') {
    window.srsRetention = saveRetention(value);
  }
  if (typeof savePrefs === 'function') savePrefs();
  const display = document.getElementById('desiredRetentionValue');
  if (display) display.textContent = Math.round(srsRetention * 100) + '%';
  if (currentLevel && typeof filteredOrder !== 'undefined' && filteredOrder.length && typeof updateSrsPreviews === 'function') {
    updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
  }
  if (typeof renderLearningDashboard === 'function') renderLearningDashboard();
}

export function exportRadicalProgress() {
  const data = JSON.stringify({
    type: 'radicals',
    version: 1,
    progress: typeof radicalProgress !== 'undefined' ? radicalProgress : {},
    showPinyin: typeof showRadicalPinyin !== 'undefined' ? showRadicalPinyin : true,
  }, null, 2);
  downloadJson(data, 'hsk_radicals_progress.json');
  setTimeout(() => {
    if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
  }, BACKUP_PANEL_CLOSE_DELAY_MS);
}

export function importRadicalProgress(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    try {
      const data = JSON.parse(loadEvent.target.result);
      if (data.type !== 'radicals' || !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) {
        throw new Error('invalid radical backup');
      }
      if (!confirm('Khôi phục tiến trình Bộ thủ từ bản sao này? Tiến trình hiện tại có thể bị thay thế.')) return;

      const restoredProgress = {};
      Object.entries(data.progress).forEach(([key, status]) => {
        if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= 214 && ['known', 'unknown'].includes(status)) {
          restoredProgress[key] = status;
        }
      });
      if (typeof radicalProgress !== 'undefined') {
        Object.keys(radicalProgress).forEach(key => delete radicalProgress[key]);
        Object.assign(radicalProgress, restoredProgress);
      }
      if (typeof data.showPinyin === 'boolean') {
        window.showRadicalPinyin = data.showPinyin;
      }
      if (typeof saveRadicalProgress === 'function') saveRadicalProgress();
      if (typeof saveRadicalPrefs === 'function') saveRadicalPrefs();

      const pinyinButton = document.getElementById('radicalPinyinToggle');
      if (pinyinButton) {
        pinyinButton.textContent = showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
        pinyinButton.classList.toggle('on', !showRadicalPinyin);
      }
      if (typeof setRadicalFilter === 'function') {
        setRadicalFilter(typeof radicalCurrentFilter !== 'undefined' ? radicalCurrentFilter : 'all');
      }
      if (typeof radicalCurrentView !== 'undefined' && radicalCurrentView === 'overview' && typeof renderRadicalOverview === 'function') {
        renderRadicalOverview();
      }
      if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
      alert('Đã khôi phục tiến trình Bộ thủ thành công!');
    } catch (error) {
      alert('Bản sao tiến trình Bộ thủ không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

export function mountBackupSync() {
  window.exportProgress = exportProgress;
  window.importProgress = importProgress;
  window.updateDesiredRetention = updateDesiredRetention;
  window.exportRadicalProgress = exportRadicalProgress;
  window.importRadicalProgress = importRadicalProgress;
}
