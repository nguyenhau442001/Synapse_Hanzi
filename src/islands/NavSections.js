// Two-level primary navigation: six top sections (#primaryTabs .primary-tabs-group)
// and a shared sub-tab row (#pickerControls) that shows the active section's tools.
// Internal tab keys used by setPrimaryTab() stay unchanged; this module only maps
// them to sections and keeps both rows in sync.
/* global setPrimaryTab, setVocabSubTab, primaryTab, vocabSubTab */

// Sub-tab keys 'level' and 'topic' are vocab-hub views; every other key is a primary tab key.
export const NAV_SECTIONS = {
  vocab: { navId: 'primaryTabVocab', subtabs: ['level', 'topic', 'radicals', 'guessWord'], showRow: true },
  curriculum: { navId: 'primaryTabCurriculum', subtabs: ['curriculum'], showRow: false },
  listening: { navId: 'primaryNavListening', subtabs: ['listening'], showRow: true },
  speaking: { navId: 'primaryNavSpeaking', subtabs: ['speaking'], showRow: true },
  reading: { navId: 'primaryNavReading', subtabs: ['gradedReading', 'reading'], showRow: true },
  writing: { navId: 'primaryNavWriting', subtabs: ['writing', 'sentenceGame', 'speedQuiz'], showRow: true },
  exam: { navId: 'primaryNavExam', subtabs: ['exam'], showRow: false },
  review: { navId: 'primaryTabReview', subtabs: ['review'], showRow: false },
};

const VOCAB_VIEWS = ['level', 'topic'];
const lastSubtab = {};

function currentVocabView() {
  const view = typeof vocabSubTab !== 'undefined' ? vocabSubTab : window.vocabSubTab;
  return view === 'topic' ? 'topic' : 'level';
}

function currentPrimaryTab() {
  return typeof primaryTab !== 'undefined' ? primaryTab : window.primaryTab;
}

export function subtabForTab(tab) {
  return tab === 'vocab' ? currentVocabView() : tab;
}

export function sectionForTab(tab) {
  const subtab = subtabForTab(tab);
  return Object.keys(NAV_SECTIONS).find((key) => NAV_SECTIONS[key].subtabs.includes(subtab)) || null;
}

export function openSubtab(subtab) {
  if (VOCAB_VIEWS.includes(subtab)) {
    window.setVocabSubTab(subtab);
    if (currentPrimaryTab() !== 'vocab') window.setPrimaryTab('vocab');
    else syncNavSections('vocab');
    return;
  }
  window.setPrimaryTab(subtab);
}

// Opens a section on its last used sub-tab, falling back to the first (default) one.
export function openSection(section) {
  const config = NAV_SECTIONS[section];
  if (!config) return;
  const remembered = lastSubtab[section];
  const target = config.subtabs.includes(remembered) ? remembered : config.subtabs[0];
  // The vocab hub keeps its own persisted level/topic choice.
  if (section === 'vocab' && VOCAB_VIEWS.includes(target)) {
    window.setPrimaryTab('vocab');
    return;
  }
  openSubtab(target);
}

export function syncNavSections(tab) {
  const section = sectionForTab(tab);
  const subtab = subtabForTab(tab);
  if (section) lastSubtab[section] = subtab;

  Object.entries(NAV_SECTIONS).forEach(([key, { navId }]) => {
    const navEl = document.getElementById(navId);
    if (!navEl) return;
    const isActive = key === section;
    navEl.classList.toggle('active', isActive);
    navEl.setAttribute('aria-pressed', String(isActive));
  });

  const row = document.getElementById('pickerControls');
  if (row) row.hidden = !(section && NAV_SECTIONS[section].showRow);
  document.querySelectorAll('#skillSubTabs [data-subtab]').forEach((btn) => {
    const inSection = btn.dataset.section === section;
    const isActive = inSection && btn.dataset.subtab === subtab;
    btn.hidden = !inSection;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // On narrow screens both rows scroll horizontally; keep the active items in view.
  if (section) revealInRow(document.getElementById(NAV_SECTIONS[section].navId));
  revealInRow(document.querySelector('#skillSubTabs .view-tab.active'));
}

function revealInRow(el) {
  const row = el && el.parentElement;
  if (!row || row.scrollWidth <= row.clientWidth) return;
  const left = el.offsetLeft - row.offsetLeft;
  if (left < row.scrollLeft) row.scrollLeft = left;
  else if (left + el.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = left + el.offsetWidth - row.clientWidth;
}

export function initNavSections() {
  Object.entries(NAV_SECTIONS).forEach(([section, { navId }]) => {
    const navEl = document.getElementById(navId);
    if (navEl) navEl.addEventListener('click', () => openSection(section));
  });
  document.querySelectorAll('#skillSubTabs [data-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => openSubtab(btn.dataset.subtab));
  });
  syncNavSections(currentPrimaryTab() || 'vocab');
}

export function mountNavSections() {
  Object.assign(window, { NAV_SECTIONS, openSection, openSubtab, syncNavSections });
}
