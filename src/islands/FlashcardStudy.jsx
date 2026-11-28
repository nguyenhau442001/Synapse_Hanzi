// Flashcard markup, filtering, statistics, and rendering.
import { colorizePinyin, colorizePinyinHtml } from './pinyinTones.js';
import { formatStudyLevelLabel } from './AppUtils.js';
import { APP_TIMEOUTS } from './AppTimeouts.js';

// Tone colors for pinyin (on by default). The syllable spans are always rendered;
// html.tone-colors-off turns the colors off so tone marks alone remain.
const TONE_COLORS_KEY = 'hsk_tone_colors_v1';
function readToneColorsPref() {
  try { return localStorage.getItem(TONE_COLORS_KEY) !== 'off'; } catch (e) { return true; }
}
function applyToneColorsPref(enabled) {
  document.documentElement.classList.toggle('tone-colors-off', !enabled);
}
function toggleToneColors() {
  const enabled = !readToneColorsPref();
  try { localStorage.setItem(TONE_COLORS_KEY, enabled ? 'on' : 'off'); } catch (e) {}
  applyToneColorsPref(enabled);
  updateCardMoreMenuState();
}
// One hint per device: phones/tablets (no hover, coarse pointer) tap; everything with a
// mouse or trackpad, including touch-screen laptops, uses the Space key.
function getCardHintText(isFlipped) {
  const isTouchOnly = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchOnly) {
    return isFlipped ? 'Chạm để lật lại' : 'Chạm để lật';
  }
  return isFlipped ? 'Space để lật lại' : 'Space để lật';
}
window.getCardHintText = getCardHintText;

function buildCardArea() {
  document.getElementById('cardArea').innerHTML = `
    <div class="study-card-grid" id="studyCardGrid">
    <div class="card" id="card">
      <button type="button" class="card-star-btn" id="weakWordToggleBtn" style="display:none" hidden aria-hidden="true"></button>
      <div class="swipe-badge swipe-badge--known" id="swipeBadgeKnown">✓ Được</div>
      <div class="swipe-badge swipe-badge--unknown" id="swipeBadgeUnknown">✗ Quên</div>
      <div id="cardContent" class="card-content">
        <div class="word-hero-container" id="wordMainBlock">
          <!-- Front prompt for the Nghe -> nghĩa and Việt -> Hán directions (hidden after flipping) -->
          <div class="card-direction-prompt" id="cardDirectionPrompt" hidden></div>

          <!-- Chữ Hán to bản ở trung tâm: vững chãi, thoáng đãng, tinh tế (Focal Point chính) -->
          <div class="hanzi-stage" id="hanziStage" data-ui-click="openStudyWriting" data-ui-stop title="Nhấn để luyện viết chữ Hán (W)">
            <div class="hanzi" id="hanzi"></div>
          </div>

          <!-- Pinyin + Loa phát âm (Chỉ hiển thị sau khi lật đáp án) -->
          <div class="pinyin-row" id="pinyinRow">
            <span class="pinyin" id="pinyin"></span>
            <button class="sound-btn speech-btn" id="soundBtn" type="button"
              data-ui-click="speakWord" data-ui-stop
              aria-label="Nghe phát âm" aria-live="polite" title="Nghe phát âm (A)">
              ${speakerIconSvg(16, 'sound-btn-icon')}
            </button>
            <details class="word-speed-picker" id="wordSpeedPicker" data-ui-stop>
              <summary aria-label="Tốc độ đọc từ: ${formatWordSpeechSpeed(wordSpeechSpeed)}" title="Chọn tốc độ đọc từ">
                <span class="word-current-speed" id="wordCurrentSpeed">${formatWordSpeechSpeed(wordSpeechSpeed)}</span>
              </summary>
              <div class="word-speed-options" role="group" aria-label="Chọn tốc độ đọc từ">
                ${WORD_SPEECH_SPEEDS.map(speed => `
                  <button class="word-speed-option${speed === wordSpeechSpeed ? ' selected' : ''}"
                    type="button" data-speed="${speed}"
                    aria-pressed="${speed === wordSpeechSpeed}"
                    data-ui-click="setWordSpeechSpeed" data-ui-prevent>
                    ${formatWordSpeechSpeed(speed)}
                  </button>
                `).join('')}
              </div>
            </details>
          </div>

          <!-- Nghĩa tiếng Việt & Ngữ cảnh từ loại (Chỉ hiển thị sau khi lật đáp án) -->
          <div class="meaning" id="meaning"></div>
          <div class="meta-badges-row" id="metaBadgesRow">
            <span class="pos-badge" id="posBadge" title="Từ loại"></span>
            <span class="hanviet-badge" id="hanvietBadge" title="Âm Hán - Việt"></span>
          </div>

          <!-- Minh họa bổ trợ tinh gọn (Chỉ hiển thị khi có ảnh minh họa thực sự ý nghĩa) -->
          <div class="card-visual-col" id="cardVisualCol" style="display: none;">
            <div class="card-illustration-frame" id="cardIllustrationFrame" title="Minh họa gợi hình">
              <img class="card-illustration-img" id="cardIllustrationImg" alt="Minh họa gợi hình" style="display: none;">
              <div class="card-illustration-svg" id="cardIllustrationSvg"></div>
            </div>
          </div>

          <!-- Vùng chứa ẩn tương thích ngược -->
          <div class="card-supporting-group" id="cardSupportingGroup" style="display: none;"></div>
        </div>

        <!-- One-line character decomposition, e.g. 太 = 大 + 丶 (details stay in the accordion) -->
        <div class="card-decomp-inline" id="cardDecompInline" aria-label="Cấu tạo chữ" hidden></div>

        <!-- Grammar patterns for function words (back of the card only) -->
        <div class="card-patterns" id="cardPatterns" hidden></div>

        <!-- Khối ví dụ thực tế (Chỉ hiển thị sau khi lật đáp án) -->
        <div class="example-box" id="exampleBox">
          <div class="ex-header-row">
            <span class="ex-label">Ví dụ</span>
            <div class="example-audio-controls card-interactive">
              <button class="example-sound-btn speech-btn" id="exampleSoundBtn" type="button"
                data-ui-click="speakExample" data-ui-stop
                aria-label="Nghe câu ví dụ" aria-live="polite" title="Nghe câu ví dụ">
                ${speakerIconSvg(16, 'sound-btn-icon')}
              </button>
              <details class="example-speed-picker" id="exampleSpeedPicker"
                data-ui-stop>
                <summary aria-label="Tốc độ đọc câu ví dụ: ${formatExampleSpeechSpeed(exampleSpeechSpeed)}">
                  <span class="example-speed-label">Tốc độ</span>
                  <span class="example-current-speed" id="exampleCurrentSpeed">${formatExampleSpeechSpeed(exampleSpeechSpeed)}</span>
                </summary>
                <div class="example-speed-options" role="group" aria-label="Chọn tốc độ đọc câu ví dụ">
                  ${EXAMPLE_SPEECH_SPEEDS.map(speed => `
                    <button class="example-speed-option${speed === exampleSpeechSpeed ? ' selected' : ''}"
                       type="button" data-speed="${speed}"
                      aria-pressed="${speed === exampleSpeechSpeed}"
                      data-ui-click="setExampleSpeechSpeed" data-ui-prevent>
                      ${formatExampleSpeechSpeed(speed)}
                    </button>
                  `).join('')}
                </div>
              </details>
            </div>
          </div>
          <div class="ex-line ex-zh" id="exZh"></div>
          <div class="ex-line ex-py" id="exPy"></div>
          <div class="ex-line ex-vi" id="exVi"></div>
        </div>

        <!-- Khối mở rộng học sâu: Accordion thu gọn mặc định cho Cấu tạo chữ & Chữ liên quan -->
        <div class="card-expandable-group" id="cardExpandableGroup">
          ${cardAccordionHtml({
            id: 'cardDecompAccordion',
            title: 'Cấu tạo chữ',
            iconPaths: '<rect x="3" y="3" width="7.5" height="18" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
            bodyId: 'cardDecompositionWrap',
            content: '<div class="card-radicals-row card-interactive" id="cardRadicalsRow" data-ui-stop></div>',
          })}

          ${cardAccordionHtml({
            id: 'cardRelatedAccordion',
            title: 'Chữ liên quan',
            iconPaths: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
            badgeId: 'cardRelatedCountBadge',
            content: '<div class="card-related-wrap" id="cardRelatedWrap" data-ui-stop></div>',
          })}
        </div>

        <div class="card-flip-prompt" id="cardFlipPrompt" data-ui-click="flip" role="button" tabindex="0" aria-label="Lật thẻ">
          <span class="card-flip-prompt-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </span>
          <span class="hint card-flip-prompt-text" id="hint">${getCardHintText(false)}</span>
        </div>
        <div class="card-empty-state card-interactive" id="cardEmptyState" hidden></div>
      </div>
    </div>
    <aside class="study-detail-rail" id="studyDetailRail" aria-label="Thông tin chi tiết chữ Hán" hidden></aside>
    </div>

    <!-- Rating actions row: four FSRS grades (keys 1-4) with the next interval on each button -->
    <div class="rating-area" id="ratingArea">
      <button type="button" class="reveal-answer-btn" id="revealAnswerBtn" data-ui-click="flip" aria-label="Lật thẻ xem đáp án" title="Lật thẻ xem đáp án (Space)">
        <span class="reveal-answer-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </span>
        <span class="reveal-answer-label">Xem đáp án</span>
        <kbd class="reveal-key-hint">Space</kbd>
      </button>
      <div class="rating-row" id="ratingRow" hidden>
        ${ratingButtonsHtml('rateCurrentCard')}
      </div>
    </div>

    <!-- Tactile study navigation controls: Previous, Counter, Next -->
    <nav class="study-nav-controls" id="studyNavRow" aria-label="Điều hướng thẻ từ vựng">
      <button type="button" class="study-nav-btn study-nav-btn--prev nav-btn nav-btn--prev" id="prevCardBtn" data-ui-click="prevCard" title="Từ trước (phím ←)" aria-label="Từ trước">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 12H5m7 7l-7-7 7-7"/>
        </svg>
        <span>Trước</span>
      </button>
      <div class="study-nav-position" id="studyNavPosition" aria-live="polite">
        <span class="study-nav-current" id="studyNavCurrent">1</span>
        <span class="study-nav-sep" aria-hidden="true">/</span>
        <span class="study-nav-total" id="studyNavTotal">1</span>
      </div>
      <button type="button" class="study-nav-btn study-nav-btn--next nav-btn nav-btn--next" id="nextCardBtn" data-ui-click="nextCard" title="Từ tiếp theo (phím →)" aria-label="Từ tiếp theo">
        <span>Tiếp</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14m-7-7l7 7-7 7"/>
        </svg>
      </button>
    </nav>

    <div class="action-row secondary-actions" style="display:none" hidden>
      <button class="show-unknown-btn" id="unknownWordsToggle" data-ui-click="toggleUnknownWords"
        aria-controls="unknownWordsList" aria-expanded="false">
        Hiển thị từ cần ôn
      </button>
      <button class="reset-progress-btn" type="button" data-ui-click="resetProgress">↻ Học lại từ đầu</button>
    </div>
    <div id="dailyNewLimitMessage" class="daily-new-limit-message" role="status"></div>
    <div class="unknown-words-list" id="unknownWordsList"></div>
  `;
  document.body.classList.toggle('hide-illustrations', !showIllustration);
  document.documentElement.classList.toggle('hide-illustrations', !showIllustration);
  updateCardMoreMenuState();
  if (typeof updateWeakWordToggleButton === 'function') updateWeakWordToggleButton();
  updateProgress();
  updateCardPosition();
  initSwipe();
}

// The study-screen dropdown menus. Only one is open at a time, and a
// pointerdown outside a menu's wrap closes it.
const STUDY_MENUS = {
  studyHeader: {
    menu: 'studyHeaderDropdown',
    trigger: 'studyHeaderMoreBtn',
    wrap: '#studyHeaderMenuWrap',
    beforeOpen: () => updateCardMoreMenuState(),
  },
};

function closeStudyMenu(name) {
  const { menu: menuId, trigger: triggerId } = STUDY_MENUS[name];
  const menu = document.getElementById(menuId);
  const trigger = document.getElementById(triggerId);
  if (menu) {
    menu.hidden = true;
    menu.classList.remove('is-open');
  }
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function toggleStudyMenu(name, event) {
  if (event) event.stopPropagation();
  const config = STUDY_MENUS[name];
  const menu = document.getElementById(config.menu);
  const trigger = document.getElementById(config.trigger);
  if (!menu || !trigger) return;
  if (!menu.hidden) {
    closeStudyMenu(name);
    return;
  }
  Object.keys(STUDY_MENUS).forEach(other => { if (other !== name) closeStudyMenu(other); });
  if (config.beforeOpen) config.beforeOpen();
  menu.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  menu.classList.add('is-open');
}

function toggleStudyHeaderMenu(event) { toggleStudyMenu('studyHeader', event); }
function closeStudyHeaderMenu() { closeStudyMenu('studyHeader'); }
function toggleCardMoreMenu(event) { toggleStudyMenu('studyHeader', event); }
function closeCardMoreMenu() { closeStudyMenu('studyHeader'); }
window.toggleStudyHeaderMenu = toggleStudyHeaderMenu;
window.closeStudyHeaderMenu = closeStudyHeaderMenu;
window.toggleToneColors = toggleToneColors;

function updateCardMoreMenuState() {
  const pinyinLabel = document.getElementById('menuPinyinText');
  const pinyinIcon = document.getElementById('menuPinyinIcon');
  if (pinyinLabel) pinyinLabel.textContent = showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin';
  if (pinyinIcon) pinyinIcon.textContent = showPinyin ? '👁️' : '🙈';

  const toneLabel = document.getElementById('menuToneColorsText');
  if (toneLabel) toneLabel.textContent = readToneColorsPref() ? 'Tắt màu thanh điệu' : 'Bật màu thanh điệu';

  const hvLabel = document.getElementById('menuHanvietText');
  if (hvLabel) hvLabel.textContent = showHanViet ? 'Tắt âm Hán - Việt' : 'Bật âm Hán - Việt';

  const illuLabel = document.getElementById('menuIllustrationText');
  const illuIcon = document.getElementById('menuIllustrationIcon');
  if (illuLabel) illuLabel.textContent = showIllustration ? 'Ẩn hình minh họa' : 'Hiện hình minh họa';
  if (illuIcon) illuIcon.textContent = showIllustration ? '🖼️' : '🚫';

  const isWeak = Boolean(activeStudyWord && typeof isWeakWord === 'function' && isWeakWord(activeStudyWord.hanzi));
  const weakLabel = document.getElementById('menuWeakText');
  const weakIcon = document.getElementById('menuWeakIcon');
  if (weakLabel) weakLabel.textContent = isWeak ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó';
  if (weakIcon) weakIcon.textContent = isWeak ? '⭐' : '☆';

  const moreBtn = document.getElementById('studyHeaderMoreBtn');
  if (moreBtn) {
    moreBtn.classList.toggle('has-weak-word', isWeak);
    moreBtn.title = isWeak ? 'Từ khó đã đánh dấu · Tùy chọn khác' : 'Tùy chọn khác';
  }

  if (typeof syncWordSpeechSpeedUi === 'function') {
    syncWordSpeechSpeedUi();
  }
}

const STUDY_WIDE_MEDIA_QUERY = '(min-width: 1600px)';

function syncDetailRailPlacement() {
  const rail = document.getElementById('studyDetailRail');
  const cardContent = document.getElementById('cardContent');
  const expandableGroup = document.getElementById('cardExpandableGroup');
  const card = document.getElementById('card');
  const cardGrid = document.getElementById('studyCardGrid');
  if (!rail || !cardContent || !expandableGroup) return;

  const isWide = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(STUDY_WIDE_MEDIA_QUERY).matches;
  const isFlipped = Boolean(card && card.classList.contains('is-flipped'));
  const decompAcc = document.getElementById('cardDecompAccordion');
  const relatedAcc = document.getElementById('cardRelatedAccordion');

  if (isWide) {
    if (expandableGroup.parentElement !== rail) {
      rail.appendChild(expandableGroup);
    }
    const showRail = isFlipped;
    rail.hidden = !showRail;
    if (cardGrid) cardGrid.classList.toggle('has-detail-rail', showRail);
    if (showRail) {
      if (decompAcc && !decompAcc.hidden) decompAcc.open = true;
      if (relatedAcc && !relatedAcc.hidden) relatedAcc.open = true;
    }
  } else {
    if (expandableGroup.parentElement !== cardContent) {
      const flipPrompt = document.getElementById('cardFlipPrompt');
      if (flipPrompt && flipPrompt.parentElement === cardContent) {
        cardContent.insertBefore(expandableGroup, flipPrompt);
      } else {
        cardContent.appendChild(expandableGroup);
      }
    }
    rail.hidden = true;
    if (cardGrid) cardGrid.classList.remove('has-detail-rail');
  }
}
window.syncDetailRailPlacement = syncDetailRailPlacement;

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const wideMq = window.matchMedia(STUDY_WIDE_MEDIA_QUERY);
  const onWideChange = () => syncDetailRailPlacement();
  if (typeof wideMq.addEventListener === 'function') {
    wideMq.addEventListener('change', onWideChange);
  } else if (typeof wideMq.addListener === 'function') {
    wideMq.addListener(onWideChange);
  }
}

document.addEventListener('pointerdown', event => {
  Object.entries(STUDY_MENUS).forEach(([name, { wrap }]) => {
    const wrapEl = document.querySelector(wrap);
    if (wrapEl && !wrapEl.contains(event.target)) closeStudyMenu(name);
  });
});

function toggleIllustration() {
  showIllustration = !showIllustration;
  try { localStorage.setItem('hsk_show_illustrations_v2', String(showIllustration)); } catch (e) {}
  document.body.classList.toggle('hide-illustrations', !showIllustration);
  document.documentElement.classList.toggle('hide-illustrations', !showIllustration);
  updateCardMoreMenuState();

  const card = document.getElementById('card');
  const wasFlipped = Boolean(card && card.classList.contains('is-flipped'));
  const shouldBeFlipped = wasFlipped || showIllustration;

  if (typeof render === 'function') {
    render();
    if (shouldBeFlipped) {
      const c = document.getElementById('card');
      const m = document.getElementById('meaning');
      const ex = document.getElementById('exampleBox');
      const snd = document.getElementById('soundBtn');
      if (c) c.classList.add('is-flipped');
      if (m) m.classList.add('show');
      if (ex) ex.classList.add('show');
      if (snd) snd.classList.add('show');
      const hintEl = document.getElementById('hint');
      if (hintEl && typeof getCardHintText === 'function') {
        hintEl.textContent = getCardHintText(true);
      }
    }
  }
}
window.toggleIllustration = toggleIllustration;

function toggleHanViet() {
  showHanViet = !showHanViet;
  try { localStorage.setItem('hsk_show_hanviet', String(showHanViet)); } catch (e) {}
  document.body.classList.toggle('hide-hanviet', !showHanViet);
  document.documentElement.classList.toggle('hide-hanviet', !showHanViet);
  const badge = document.getElementById('hanvietBadge');
  if (badge) {
    badge.style.display = showHanViet && badge.textContent ? 'inline-flex' : 'none';
  }
  const btn = document.getElementById('hanvietToggle');
  if (btn) {
    btn.classList.toggle('on', !showHanViet);
    btn.title = showHanViet ? 'Ẩn âm Hán - Việt (H)' : 'Hiện âm Hán - Việt (H)';
    btn.setAttribute('aria-label', showHanViet ? 'Ẩn âm Hán - Việt (H)' : 'Hiện âm Hán - Việt (H)');
  }
  const topbarBtn = document.getElementById('studyHanvietToggleBtn');
  if (topbarBtn) {
    topbarBtn.classList.toggle('active', showHanViet);
  }
  document.querySelectorAll('.hanviet-badge, .study-word-hanviet, .active-hv, .vocabulary-hanviet').forEach(el => {
    el.style.display = showHanViet ? '' : 'none';
  });
}
window.toggleHanViet = toggleHanViet;

function openStudyFilterSheet() {
  const dlg = document.getElementById('studyFilterDialog');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
  }
}
function closeStudyFilterSheet() {
  const dlg = document.getElementById('studyFilterDialog');
  if (dlg && dlg.open) dlg.close();
}
window.openStudyFilterSheet = openStudyFilterSheet;
window.closeStudyFilterSheet = closeStudyFilterSheet;

function renderFilters() {
  const row = document.getElementById('filterRow');
  const topbarControls = document.getElementById('studyTopbarControls');
  const levelBadgeEl = document.getElementById('studyTopbarLevelBadge');

  const deck = typeof computeDeckProgress === 'function'
    ? computeDeckProgress()
    : { learned: 0, total: WORDS.length, pct: 0, known: 0, unknown: 0, unseen: 0 };

  const total = deck.total || (Array.isArray(WORDS) ? WORDS.length : 0);
  const known = deck.known || 0;
  const unknown = deck.unknown || 0;
  const unseen = deck.unseen || 0;

  const rawLevelLabel = (typeof LEVELS !== 'undefined' && LEVELS[currentLevel]?.label)
    ? LEVELS[currentLevel].label
    : (typeof currentLevel === 'string' ? currentLevel.toUpperCase() : 'HSK');
  const levelLabel = typeof formatStudyLevelLabel === 'function'
    ? formatStudyLevelLabel(rawLevelLabel)
    : (window.formatStudyLevelLabel ? window.formatStudyLevelLabel(rawLevelLabel) : rawLevelLabel);

  if (levelBadgeEl) {
    levelBadgeEl.textContent = levelLabel;
  }

  if (topbarControls) {
    topbarControls.innerHTML = `
      <div class="study-mode-bar">
        <div class="study-mode-switch" role="tablist" aria-label="Chế độ học">
          <button type="button" role="tab" class="study-mode-tab${studyMode === 'review' ? ' is-active' : ''}"
            aria-selected="${studyMode === 'review'}" data-ui-click="setStudyMode" data-ui-arg="review">
            Ôn tập
          </button>
          <button type="button" role="tab" class="study-mode-tab${studyMode === 'browse' ? ' is-active' : ''}"
            aria-selected="${studyMode === 'browse'}" data-ui-click="setStudyMode" data-ui-arg="browse">
            Danh sách
          </button>
        </div>
        ${studyMode === 'review' ? reviewCountersHtml() : ''}
        ${studyDirectionSelectHtml()}
      </div>
    `;
  }

  const filters = [
    {
      key: 'all',
      label: 'Tất cả',
      count: total,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>`
    },
    {
      key: 'known',
      label: 'Đã nhớ',
      count: known,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    },
    {
      key: 'unknown',
      label: 'Cần ôn',
      count: unknown,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/></svg>`
    },
    {
      key: 'unseen',
      label: 'Chưa học',
      count: unseen,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3.5 3.5"/><polyline points="12 7 12 12 15 15"/></svg>`
    },
  ];

  if (row) {
    const isBrowse = studyMode === 'browse';
    row.hidden = !isBrowse;
    row.innerHTML = isBrowse ? `
      <div class="progress-nav-cards" role="radiogroup" aria-label="Lọc danh sách thẻ từ vựng">
        ${filters.map(f => {
          const isSelected = currentFilter === f.key;
          const isEmpty = f.count === 0;
          return `
            <button type="button"
              class="progress-nav-card progress-nav-card--${f.key}${isSelected ? ' is-active' : ''}${isEmpty ? ' is-empty' : ''}"
              data-ui-click="setFilter" data-ui-arg="${f.key}"
              role="radio"
              aria-checked="${isSelected}"
              aria-label="${f.label}: ${f.count} từ${isSelected ? ', đang chọn' : ''}"
              title="${f.label}: ${f.count} từ${isEmpty ? ' (Chưa có từ)' : ''}">
              <div class="progress-nav-card-head">
                <span class="progress-nav-card-icon" aria-hidden="true">${f.iconSvg}</span>
                <span class="progress-nav-card-label">${f.label}</span>
              </div>
              <div class="progress-nav-card-body">
                <span class="progress-nav-card-count">${f.count}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    ` : '';
  }

  const sheetBody = document.getElementById('studyFilterSheetBody');
  if (sheetBody) {
    sheetBody.innerHTML = `
      <div class="study-filter-sheet-options" role="radiogroup" aria-label="Chọn bộ lọc học">
        ${filters.map(f => `
          <button type="button" class="study-filter-sheet-option${currentFilter === f.key ? ' is-active' : ''}"
            data-ui-click="setFilterAndCloseSheet" data-ui-arg="${f.key}"
            role="radio" aria-checked="${currentFilter === f.key}">
            <div class="filter-sheet-option-left">
              <span class="filter-sheet-option-label">${f.label}</span>
            </div>
            <div class="filter-sheet-option-right">
              <span class="filter-sheet-option-count">${f.count} từ</span>
              ${currentFilter === f.key ? '<span class="filter-sheet-check">✓</span>' : ''}
            </div>
          </button>
        `).join('')}
      </div>
    `;
  }
}
const STUDY_DIRECTION_LABELS = {
  zh2vi: 'Hán → Nghĩa',
  listen: 'Nghe → Nghĩa',
  vi2zh: 'Việt → Hán',
};

function studyDirectionSelectHtml() {
  const current = readStudyDirection();
  return `
    <label class="study-direction-picker" title="Mỗi chiều học có lịch ôn riêng">
      <span class="study-direction-label">Chiều học</span>
      <select class="study-direction-select" data-ui-change="setStudyDirection" aria-label="Chiều học">
        ${Object.entries(STUDY_DIRECTION_LABELS).map(([value, label]) =>
          `<option value="${value}"${value === current ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
    </label>`;
}

// Directions whose front is audio-only, so the word is spoken on card load.
const AUTO_SPEAK_DIRECTIONS = new Set(['listen']);

// Front of the card for the non-default directions. Hán -> nghĩa keeps the Hanzi front.
function renderDirectionPrompt(word) {
  const prompt = document.getElementById('cardDirectionPrompt');
  if (!prompt) return;
  const direction = readStudyDirection();
  if (!word || direction === 'zh2vi') {
    prompt.hidden = true;
    prompt.innerHTML = '';
    return;
  }
  prompt.hidden = false;
  if (direction === 'listen') {
    prompt.innerHTML = `
      <button type="button" class="direction-listen-btn speech-btn" data-ui-click="speakWord" data-ui-stop
        aria-label="Nghe lại (A)" title="Nghe lại (A)">
        ${speakerIconSvg(28, 'sound-btn-icon')}
      </button>
      <span class="direction-prompt-hint">Nghe và nhớ lại nghĩa</span>`;
  } else {
    const pos = typeof getWordPartOfSpeech === 'function' ? getWordPartOfSpeech(word) : null;
    prompt.innerHTML = `
      <span class="direction-prompt-meaning">${window.escapeHtml(word.meaning || '')}</span>
      ${pos && pos.label ? `<span class="direction-prompt-pos">${window.escapeHtml(pos.label)}</span>` : ''}
      <span class="direction-prompt-hint">Nhớ lại chữ Hán và pinyin</span>`;
  }
}

// "Hôm nay cần ôn: N · Thẻ mới: M" for the cards left in the current review session.
function reviewCountersHtml() {
  let dueCount = 0;
  let newCount = 0;
  (filteredOrder || []).forEach(i => {
    const card = WORDS[i] && srsCards[WORDS[i].id];
    if (!card || card.state === SRS.State.New) newCount++; else dueCount++;
  });
  const goal = typeof readDailyStudyGoal === 'function' ? readDailyStudyGoal() : 20;
  return `
    <div class="study-review-counters" aria-live="polite">
      <span class="study-review-counter study-review-counter--due">Hôm nay cần ôn: <strong>${dueCount}</strong></span>
      <span class="study-review-counter study-review-counter--new" title="Tối đa ${goal} thẻ mới mỗi ngày (đổi ở Mục tiêu hằng ngày trên trang chủ)">Thẻ mới: <strong>${newCount}</strong></span>
    </div>`;
}
function setFilter(key) {
  const currentWordId = (filteredOrder && filteredOrder[idx] !== undefined && WORDS[filteredOrder[idx]])
    ? WORDS[filteredOrder[idx]].id
    : null;

  // Filters are a browse-mode tool: picking one leaves the graded review queue.
  studyMode = 'browse';
  window.studyMode = 'browse';
  if (typeof syncStudyModeUrl === 'function') syncStudyModeUrl();
  currentFilter = key;
  if (key === 'all') filteredOrder = order.slice();
  else if (key === 'unseen') filteredOrder = order.filter(i => !progress[WORDS[i].id]);
  else filteredOrder = order.filter(i => progress[WORDS[i].id] === key);

  if (currentWordId && filteredOrder.length > 0) {
    const newIdx = filteredOrder.findIndex(i => WORDS[i] && WORDS[i].id === currentWordId);
    idx = newIdx !== -1 ? newIdx : 0;
  } else {
    idx = 0;
  }

  renderFilters();
  renderStudyWordList();
  render('fade');
}
function updateStats() {
  let known = 0, unknown = 0;
  Object.values(progress).forEach(v => { if (v === 'known') known++; else if (v === 'unknown') unknown++; });
  const sTotal = document.getElementById('s-total');
  if (sTotal) sTotal.textContent = WORDS.length;
  const sKnown = document.getElementById('s-known');
  if (sKnown) sKnown.textContent = known;
  const sUnknown = document.getElementById('s-unknown');
  if (sUnknown) sUnknown.textContent = unknown;
  const sUnseen = document.getElementById('s-unseen');
  if (sUnseen) sUnseen.textContent = Math.max(0, WORDS.length - known - unknown);
  renderFilters();
  updateProgress();
}
// FSRS grades. Each button shows the interval the card would get (e.g. "10p", "1n", "3n").
const RATING_BUTTONS = [
  { rating: 'again', label: 'Quên', key: '1', interval: '' },
  { rating: 'hard', label: 'Khó', key: '2', interval: '' },
  { rating: 'good', label: 'Được', key: '3', interval: '' },
  { rating: 'easy', label: 'Dễ', key: '4', interval: '' },
];
const RATING_KEYS = {
  '1': 'again',
  '2': 'hard',
  '3': 'good',
  '4': 'easy',
};

// Shared by the level deck and "Ôn hôm nay".
function ratingButtonsHtml(handlerName, previews) {
  return RATING_BUTTONS.map(button => {
    const preview = previews ? previews[button.rating] : null;
    const intervalText = formatSrsInterval(preview, button.interval);
    const titleText = `${button.label}${intervalText ? ` (ôn lại sau ${intervalText})` : ''} • Phím [${button.key}]`;
    return `
    <button type="button" class="rating-btn rating-btn--${button.rating}"
      data-ui-click="${handlerName}" data-ui-arg="${button.rating}" aria-keyshortcuts="${button.key}"
      title="${titleText}">
      <span class="rating-label">${button.label}</span>
    </button>`;
  }).join('');
}
function formatSrsInterval(preview, fallback) {
  if (preview && preview.intervalText) return preview.intervalText;
  if (preview && Number.isFinite(preview.intervalMs)) return SRS.formatInterval(preview.intervalMs);
  return fallback || '';
}
function updateSrsPreviews(word) {
  const card = word && srsCards[word.id];
  const previews = card ? SRS.preview(card, new Date(), srsRetention) : {};
  RATING_BUTTONS.forEach(({ rating, interval, label, key }) => {
    const nextInterval = formatSrsInterval(previews[rating], interval);
    const node = document.getElementById('preview-' + rating);
    if (node) node.textContent = nextInterval;
    const btn = document.querySelector(`#ratingRow .rating-btn--${rating}`);
    if (btn) btn.title = `${label}${nextInterval ? ` (ôn lại sau ${nextInterval})` : ''} • Phím [${key}]`;
  });
}
// "Mẫu câu" line: [{ form, meaning, match? }] from the vocab data (function words only).
function renderCardPatterns(patterns) {
  const box = document.getElementById('cardPatterns');
  if (!box) return;
  const list = Array.isArray(patterns) ? patterns.filter(p => p && p.form) : [];
  box.hidden = list.length === 0;
  box.innerHTML = list.length === 0 ? '' : `
    <span class="card-patterns-label">Mẫu câu</span>
    <ul class="card-patterns-list">
      ${list.map(p => `
        <li class="card-pattern">
          <span class="card-pattern-form">${window.escapeHtml(p.form)}</span>
          ${p.meaning ? `<span class="card-pattern-meaning">${window.escapeHtml(p.meaning)}</span>` : ''}
        </li>`).join('')}
    </ul>`;
}

// Underlines the whole grammar pattern (e.g. 太贵了) instead of only the headword when a
// pattern's `match` regex finds it in the sentence; otherwise keeps the original markup.
function highlightPatternInExample(exampleHtml, patterns) {
  if (!exampleHtml || !Array.isArray(patterns)) return exampleHtml || '';
  const plain = String(exampleHtml).replace(/<\/?u>/g, '');
  for (const p of patterns) {
    if (!p || !p.match) continue;
    let found = null;
    try { found = new RegExp(p.match).exec(plain); } catch (e) { found = null; }
    if (found && found[0]) {
      const start = found.index;
      const end = start + found[0].length;
      return plain.slice(0, start) + '<u class="pattern-hl">' + found[0] + '</u>' + plain.slice(end);
    }
  }
  return exampleHtml;
}

function isCardRevealed() {
  const meaning = document.getElementById('meaning');
  return Boolean(meaning && meaning.classList.contains('show'));
}
window.isCardRevealed = isCardRevealed;

// Rating buttons appear only once the card is flipped/revealed.
function syncRevealControls() {
  const revealAnswerBtn = document.getElementById('revealAnswerBtn');
  const ratingRow = document.getElementById('ratingRow');
  const ratingArea = document.getElementById('ratingArea');
  const studyNavRow = document.getElementById('studyNavRow');
  const hasCard = Array.isArray(filteredOrder) && filteredOrder.length > 0;
  const revealed = hasCard && isCardRevealed();
  // Review mode: show reveal button before flipping, show 4 rating buttons after flipping.
  const isReview = studyMode === 'review' && hasCard;
  const showRating = isReview && revealed;
  const showRevealBtn = isReview && !revealed;

  if (showRating) updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
  const showNav = hasCard && studyMode === 'browse';

  if (revealAnswerBtn) {
    revealAnswerBtn.hidden = !showRevealBtn;
    revealAnswerBtn.style.display = showRevealBtn ? '' : 'none';
  }
  if (ratingRow) {
    ratingRow.hidden = !showRating;
    ratingRow.style.display = showRating ? '' : 'none';
  }
  if (ratingArea) {
    const showArea = showRating || showRevealBtn;
    ratingArea.hidden = !showArea;
    ratingArea.style.display = showArea ? '' : 'none';
  }
  if (studyNavRow) {
    studyNavRow.hidden = !showNav;
    studyNavRow.style.display = showNav ? '' : 'none';
  }
  document.body.classList.toggle('study-mode-review', studyMode === 'review');
  document.body.classList.toggle('study-mode-browse', studyMode === 'browse');
}
function computeDeckProgress() {
  if (!Array.isArray(WORDS) || WORDS.length === 0) {
    return { learned: 0, total: 0, pct: 0, known: 0, unknown: 0, unseen: 0 };
  }
  let known = 0, unknown = 0;
  WORDS.forEach(w => {
    const st = progress[w.id];
    if (st === 'known') known++;
    else if (st === 'unknown') unknown++;
  });
  const learned = known + unknown;
  const total = WORDS.length;
  const unseen = Math.max(0, total - learned);
  const pct = total === 0 ? 0 : Math.round((learned / total) * 100);
  return { learned, total, pct, known, unknown, unseen };
}

function updateProgress(current, total) {
  const deck = computeDeckProgress();
  const el = document.getElementById('progress');
  if (el) {
    el.innerHTML = deck.total === 0
      ? '0/0'
      : `<span class="study-progress-count">${deck.learned}/${deck.total}</span>`;
  }
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = deck.pct + '%';
  const topbar = document.getElementById('studyTopbarProgress');
  if (topbar) {
    topbar.title = `Tiến độ học: ${deck.learned}/${deck.total} • Đã nhớ: ${deck.known}, Cần ôn: ${deck.unknown}`;
    if (deck.pct === 100 && deck.total > 0) {
      topbar.classList.add('is-completed');
      topbar.style.cursor = 'pointer';
      topbar.onclick = e => {
        e.stopPropagation();
        if (typeof showCelebration === 'function') {
          showCelebration(deck.known === deck.total ? 'mastered' : 'learned', true);
        }
      };
    } else {
      topbar.classList.remove('is-completed');
      topbar.style.cursor = '';
      topbar.onclick = null;
    }
  }

  // Also synchronize learning progress navigator in study view
  const navSegKnown = document.querySelector('.progress-nav-seg--known');
  const navSegUnknown = document.querySelector('.progress-nav-seg--unknown');
  if (navSegKnown && navSegUnknown) {
    const tot = deck.total || 1;
    const kPct = deck.total > 0 ? (deck.known / tot) * 100 : 0;
    const uPct = deck.total > 0 ? (deck.unknown / tot) * 100 : 0;
    navSegKnown.style.width = kPct + '%';
    navSegKnown.title = `Đã nhớ: ${deck.known} từ (${Math.round(kPct)}%)`;
    navSegUnknown.style.width = uPct + '%';
    navSegUnknown.title = `Cần ôn: ${deck.unknown} từ (${Math.round(uPct)}%)`;
    const navSegUnseen = document.querySelector('.progress-nav-seg--unseen');
    if (navSegUnseen) {
      navSegUnseen.style.width = (deck.total > 0 ? (deck.unseen / tot) * 100 : 0) + '%';
      navSegUnseen.title = `Chưa học: ${deck.unseen} từ`;
    }
  }
  const navBar = document.querySelector('.progress-nav-bar');
  if (navBar) {
    navBar.setAttribute('aria-label', `Tiến độ học: ${deck.known} đã nhớ, ${deck.unknown} cần ôn, ${deck.unseen} chưa học trên tổng số ${deck.total} từ`);
  }
}

// The only position counter is the one between Trước / Tiếp (browse mode); review mode shows
// the remaining due/new counts in the mode bar instead.
function updateCardPosition() {
  const counter = document.getElementById('cardCounter');
  const navCurrent = document.getElementById('studyNavCurrent');
  const navTotal = document.getElementById('studyNavTotal');
  const prevBtn = document.getElementById('prevCardBtn');
  const nextBtn = document.getElementById('nextCardBtn');

  if (!filteredOrder || filteredOrder.length === 0) {
    const deck = computeDeckProgress();
    const txt = (currentFilter === 'unseen' && deck.unseen === 0 && deck.total > 0) ? 'Hoàn thành' : '0 / 0';
    if (counter) counter.textContent = txt;
    if (navCurrent) navCurrent.textContent = '0';
    if (navTotal) navTotal.textContent = '0';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }
  const current = (idx % filteredOrder.length) + 1;
  const total = filteredOrder.length;
  if (counter) {
    counter.textContent = `${current} / ${total}`;
  }
  if (navCurrent) navCurrent.textContent = String(current);
  if (navTotal) navTotal.textContent = String(total);
  if (prevBtn) prevBtn.disabled = (total <= 1);
  if (nextBtn) nextBtn.disabled = (total <= 1);
}

function renderHanziWithClarifier(el, text) {
  if (!el) return;
  const raw = String(text || '').trim();
  const match = raw.match(/^([^（\(]+)[（\(](.+?)[）\)]$/);
  if (match) {
    el.textContent = '';
    const mainSpan = document.createElement('span');
    mainSpan.className = 'hanzi-text';
    mainSpan.textContent = match[1].trim();
    const clarifierSpan = document.createElement('span');
    clarifierSpan.className = 'hanzi-clarifier';
    clarifierSpan.textContent = `（${match[2].trim()}）`;
    el.appendChild(mainSpan);
    el.appendChild(clarifierSpan);
  } else {
    el.textContent = raw;
  }
}

function applyHanziLengthFit(el, text) {
  if (!el) return;
  const core = String(text || '').replace(/[（\(].*?[）\)]/g, '').trim() || text || '';
  const chars = Array.from(core);
  const len = chars.length;
  el.dataset.length = String(len);
  el.classList.remove('is-len-1', 'is-len-2', 'is-len-3', 'is-len-4', 'is-len-5', 'is-len-6-plus', 'is-len-long');
  if (len >= 6) {
    el.classList.add('is-len-6-plus', 'is-len-long');
  } else if (len === 5) {
    el.classList.add('is-len-5', 'is-len-long');
  } else if (len === 4) {
    el.classList.add('is-len-4');
  } else if (len === 3) {
    el.classList.add('is-len-3');
  } else if (len === 2) {
    el.classList.add('is-len-2');
  } else {
    el.classList.add('is-len-1');
  }
  fitHanziToContainer(el);

  if (typeof ResizeObserver !== 'undefined' && !window.__hanziResizeObserver) {
    const parent = el.parentElement;
    if (parent) {
      window.__hanziResizeObserver = new ResizeObserver(() => {
        const currentHanzi = document.getElementById('hanzi');
        if (currentHanzi && currentHanzi.textContent) {
          fitHanziToContainer(currentHanzi);
        }
      });
      window.__hanziResizeObserver.observe(parent);
    }
  }
}

function fitHanziToContainer(el) {
  if (!el) return;
  el.style.fontSize = '';
  requestAnimationFrame(() => {
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    const availableWidth = parent.clientWidth - 16;
    if (availableWidth <= 50) return;
    if (el.scrollWidth > availableWidth) {
      const computed = window.getComputedStyle(el);
      const currentSize = parseFloat(computed.fontSize);
      if (currentSize > 16) {
        const ratio = availableWidth / el.scrollWidth;
        const newSize = Math.max(16, Math.floor(currentSize * ratio * 0.98));
        el.style.fontSize = `${newSize}px`;
      }
    }
  });
}

window.addEventListener('resize', () => {
  const h = document.getElementById('hanzi');
  if (h && h.textContent) fitHanziToContainer(h);
});

// Lock mouse wheel scrolling on flashcard study stage since there is no extra content below
window.addEventListener('wheel', (e) => {
  if (!document.body.classList.contains('flashcard-study-mode')) return;

  // Allow wheel scrolling in Overview list
  const overviewView = document.getElementById('overviewView');
  if (overviewView && !overviewView.hidden && overviewView.contains(e.target)) {
    return;
  }

  // Allow scrolling inside slide-over study drawer (handwriting canvas, radicals, etc.)
  if (document.body.classList.contains('study-sidebar-open') && e.target.closest('.workstation-right')) {
    return;
  }

  // Allow scrolling in open dialogs/modals (e.g., filter dialog, help modal)
  const openModal = document.querySelector('dialog[open], .study-modal.open, .study-filter-dialog[open]');
  if (openModal && openModal.contains(e.target)) {
    return;
  }

  // If inside the card and card itself is overflowing and can scroll in that direction, allow it
  const card = e.target.closest('.card');
  if (card && card.scrollHeight > card.clientHeight) {
    const isScrollingDown = e.deltaY > 0;
    const canScrollDown = card.scrollTop + card.clientHeight < card.scrollHeight - 1;
    const canScrollUp = card.scrollTop > 1;
    if ((isScrollingDown && canScrollDown) || (!isScrollingDown && canScrollUp)) {
      return;
    }
  }

  // Prevent wheel scrolling on the study view since there is no extra content below
  e.preventDefault();
}, { passive: false });

// Collapsible section on the back of the card (radical breakdown, related words).
// Starts hidden; renderCardRadicals / renderCardRelated show it when it has content.
function cardAccordionHtml({ id, title, iconPaths, badgeId, bodyId, content }) {
  return `
          <details class="card-accordion" id="${id}" data-ui-stop style="display: none;">
            <summary class="card-accordion-summary" data-ui-stop>
              <span class="accordion-left">
                <span class="accordion-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</svg></span>
                <span class="accordion-title">${title}</span>${badgeId ? `
                <span class="accordion-badge" id="${badgeId}" hidden></span>` : ''}
              </span>
              <span class="accordion-chevron" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </summary>
            <div class="card-accordion-body"${bodyId ? ` id="${bodyId}"` : ''}>
              ${content}
            </div>
          </details>`;
}

// Open the study sidebar on `tab` (or close it when it is already showing that
// tab, or when forceOpen === false). onOpen fills the tab's content.
function toggleStudySidebarTab(tab, forceOpen, onOpen) {
  const isOpen = document.body.classList.contains('study-sidebar-open');
  const isTargetTab = document.body.dataset.sidebarTab === tab;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : (!isOpen || !isTargetTab);

  if (shouldOpen) {
    document.body.classList.add('study-sidebar-open');
    if (typeof window.setSidebarStudyTab === 'function') {
      window.setSidebarStudyTab(tab);
    }
    onOpen();
    if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
      SpaRouter.pushView({ view: 'cards', level: currentLevel, drawerOpen: true });
    }
  } else {
    document.body.classList.remove('study-sidebar-open');
  }
  updateStudyDrawerButtons();
}

function toggleStudySidebar(forceOpen) {
  toggleStudySidebarTab('words', forceOpen, () => {
    if (typeof renderStudyWordList === 'function') renderStudyWordList();
  });
}

function toggleStudyWritingPanel(forceOpen) {
  toggleStudySidebarTab('stroke', forceOpen, () => {
    if (typeof renderActiveStrokeChar === 'function') {
      setTimeout(() => renderActiveStrokeChar(true), 50);
    } else if (typeof loadStrokeCanvasWord === 'function' && typeof activeStudyWord !== 'undefined') {
      setTimeout(() => loadStrokeCanvasWord(activeStudyWord), 50);
    }
  });
}

function closeAllStudyDrawers() {
  if (typeof closeMobileStatsSheet === 'function') closeMobileStatsSheet();
  if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
  if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
  const wasOpen = document.body.classList.contains('study-sidebar-open');
  document.body.classList.remove('study-sidebar-open');
  updateStudyDrawerButtons();
  if (wasOpen && typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    if (window.history.state && window.history.state.drawerOpen) {
      window.history.back();
    }
  }
}

function updateStudyDrawerButtons() {
  const isPanelOpen = document.body.classList.contains('study-sidebar-open');
  const activeTab = document.body.dataset.sidebarTab || 'stroke';

  const sidebarBtn = document.getElementById('studySidebarToggleBtn');
  if (sidebarBtn) sidebarBtn.classList.toggle('active', isPanelOpen && activeTab === 'words');
  const writingBtn = document.getElementById('studyWritingToggleBtn');
  if (writingBtn) writingBtn.classList.toggle('active', isPanelOpen && activeTab === 'stroke');
  const cardWritingBtn = document.getElementById('cardWritingBtn');
  if (cardWritingBtn) cardWritingBtn.classList.toggle('active', isPanelOpen && activeTab === 'stroke');

  const currentHanzi = document.getElementById('hanzi');
  if (currentHanzi && currentHanzi.textContent) {
    fitHanziToContainer(currentHanzi);
  }
}

function ensureStudyWordList() {
  if (!document.body.classList.contains('is-desktop-dock') && !document.body.classList.contains('flashcard-study-mode')) return null;
  let panel = document.getElementById('studyWordListPanel');
  if (panel) return panel;
  const isStudy = document.body.classList.contains('flashcard-study-mode');
  const mount = isStudy
    ? (document.getElementById('workstationRight') || document.getElementById('workstationLeft'))
    : document.getElementById('workstationLeft');
  if (!mount) return null;
  panel = document.createElement('section');
  panel.id = 'studyWordListPanel';
  panel.className = 'study-word-list-panel';
  panel.setAttribute('aria-label', 'Danh sách từ trong bài học hiện tại');
  panel.innerHTML = `
    <div class="study-word-list-heading">
      <div class="study-word-list-header-row">
        <strong id="studyWordListTitle">Danh sách từ</strong>
        <span id="studyWordListCount" class="study-word-count-badge"></span>
        <button type="button" class="study-drawer-close-btn" data-ui-click="closeAllStudyDrawers" aria-label="Đóng danh sách">✕</button>
      </div>
      <div id="studyWordListActiveWord" class="study-word-active-banner"></div>
      <label class="study-word-list-search">
        <span class="sr-only">Tìm trong bài học</span>
        <input type="search" id="studyWordListSearch" placeholder="Tìm kiếm từ trong bài..." autocomplete="off">
      </label>
    </div>
    <div class="study-word-list-items" id="studyWordListItems" role="listbox" aria-label="Chọn từ trong bài học"></div>`;
  mount.appendChild(panel);
  const searchEl = panel.querySelector('#studyWordListSearch');
  if (searchEl) {
    searchEl.addEventListener('input', renderStudyWordList);
    searchEl.addEventListener('search', renderStudyWordList);
  }
  return panel;
}

// Show WORDS[wordIndex] on the card, keeping the current filter when the word
// is in it and falling back to "all" otherwise. Returns whether it moved.
function jumpToWordByIndex(wordIndex) {
  if (wordIndex < 0 || !Array.isArray(WORDS) || wordIndex >= WORDS.length) return false;
  if (studyMode !== 'browse') {
    studyMode = 'browse';
    window.studyMode = 'browse';
    if (typeof syncStudyModeUrl === 'function') syncStudyModeUrl();
    currentFilter = 'all';
    filteredOrder = order.slice();
    renderFilters();
  } else if (!filteredOrder.includes(wordIndex)) {
    currentFilter = 'all';
    filteredOrder = order.slice();
    renderFilters();
  }
  const filteredIndex = filteredOrder.indexOf(wordIndex);
  if (filteredIndex < 0) return false;
  idx = filteredIndex;
  render('fade');
  return true;
}

function renderStudyWordList() {
  const panel = ensureStudyWordList();
  if (!panel) return;
  const items = panel.querySelector('#studyWordListItems');
  const searchInput = panel.querySelector('#studyWordListSearch');
  const query = searchInput ? searchInput.value.trim() : '';
  const currentIndex = filteredOrder.length ? filteredOrder[idx % filteredOrder.length] : -1;
  const activeWord = currentIndex >= 0 ? WORDS[currentIndex] : null;

  const countBadge = panel.querySelector('#studyWordListCount');
  if (countBadge) {
    const rawLabel = currentLevel && LEVELS[currentLevel] ? LEVELS[currentLevel].label : '';
    const levelLabel = typeof formatStudyLevelLabel === 'function'
      ? formatStudyLevelLabel(rawLabel)
      : (window.formatStudyLevelLabel ? window.formatStudyLevelLabel(rawLabel) : rawLabel);
    countBadge.textContent = WORDS.length ? `${levelLabel} · ${WORDS.length} từ` : '';
  }

  const activeBanner = panel.querySelector('#studyWordListActiveWord');
  if (activeBanner) {
    if (activeWord) {
      const status = progress[activeWord.id];
      const statusText = status === 'known' ? 'Đã nhớ' : status === 'unknown' ? 'Cần ôn' : 'Chưa học';
      const statusClass = status === 'known' ? 'badge-known' : status === 'unknown' ? 'badge-unknown' : 'badge-unseen';
      activeBanner.innerHTML = `
        <div class="active-word-info">
          <span class="active-kicker">Từ số ${currentIndex + 1}:</span>
          <strong class="active-hanzi">${activeWord.hanzi}</strong>
          <span class="active-py">${activeWord.pinyin || ''}</span>
          ${activeWord.hanviet ? `<span class="active-hv">［${activeWord.hanviet}］</span>` : ''}
        </div>
        <span class="active-status ${statusClass}">${statusText}</span>
      `;
    } else {
      activeBanner.innerHTML = '<span class="active-kicker">Chọn một từ để học</span>';
    }
  }

  const filteredWords = WORDS.map((word, wordIndex) => ({ word, wordIndex }))
    .filter(({ word }) => !query || (typeof wordMatchesQuery === 'function' ? wordMatchesQuery(word, query) : `${word.hanzi} ${word.pinyin} ${word.hanviet || ''} ${word.meaning}`.toLowerCase().includes(query.toLowerCase())));

  if (filteredWords.length === 0) {
    items.innerHTML = '<div class="study-word-list-empty" style="padding: 1.5rem; text-align: center; color: var(--text-muted, #888); font-size: 0.9rem;">Không tìm thấy từ nào phù hợp.</div>';
    return;
  }

  items.innerHTML = filteredWords.map(({ word, wordIndex }) => {
    const isCurrent = wordIndex === currentIndex;
    const status = progress[word.id];
    const statusIcon = status === 'known' ? '✓' : status === 'unknown' ? '✗' : '·';
    const statusClass = status === 'known' ? 'status-known' : status === 'unknown' ? 'status-unknown' : 'status-unseen';
    return `
      <button type="button" class="study-word-list-item${isCurrent ? ' active' : ''}"
        role="option" aria-selected="${isCurrent}" data-word-index="${wordIndex}"
        title="${word.hanzi} ${word.pinyin || ''}${word.hanviet ? ' ［' + word.hanviet + '］' : ''} - ${word.meaning || ''}">
        <span class="study-word-status ${statusClass}" aria-hidden="true">${statusIcon}</span>
        <span class="study-word-list-content">
          <span class="study-word-list-main">
            <span class="study-word-list-hanzi">${word.hanzi}</span>
            <span class="word-py">${word.pinyin || ''}</span>
            ${word.hanviet ? `<span class="study-word-hanviet">［${word.hanviet}］</span>` : ''}
          </span>
          <small class="word-vi">${word.meaning || ''}</small>
        </span>
        <span class="study-word-list-number">#${wordIndex + 1}</span>
      </button>
    `;
  }).join('');

  items.querySelectorAll('[data-word-index]').forEach(button => {
    const wordIndex = Number(button.dataset.wordIndex);
    const targetWord = WORDS[wordIndex];
    if (targetWord && typeof preloadSingleWordIllustration === 'function') {
      button.addEventListener('pointerenter', () => preloadSingleWordIllustration(targetWord, 'high'), { passive: true });
      button.addEventListener('touchstart', () => preloadSingleWordIllustration(targetWord, 'high'), { passive: true });
    }
    button.addEventListener('click', () => {
      if (jumpToWordByIndex(wordIndex) && window.innerWidth < 768) {
        closeAllStudyDrawers();
      }
    });
  });

  if (currentIndex >= 0) {
    const activeButton = items.querySelector('.active');
    if (activeButton && !query) activeButton.scrollIntoView({ block: 'nearest' });
  }
}

function syncCardSupportingGroup() {
  const group = document.getElementById('cardSupportingGroup');
  const visualCol = document.getElementById('cardVisualCol');
  const decompWrap = document.getElementById('cardDecompositionWrap');
  if (!group) return;
  const hasVisual = Boolean(showIllustration && visualCol && visualCol.style.display !== 'none');
  const radsRow = document.getElementById('cardRadicalsRow');
  const hasDecomp = Boolean(decompWrap && decompWrap.style.display !== 'none' && radsRow && radsRow.children && radsRow.children.length > 0);
  // Split layout hook: hero becomes info (left) + illustration (right) when an illustration exists.
  const heroBlock = document.getElementById('wordMainBlock');
  if (heroBlock) heroBlock.classList.toggle('has-illustration', hasVisual);
  if (hasVisual || hasDecomp) {
    group.hidden = false;
    group.removeAttribute('hidden');
    group.style.display = 'flex';
    group.classList.toggle('has-both', Boolean(hasVisual && hasDecomp));
    group.classList.toggle('has-only-visual', Boolean(hasVisual && !hasDecomp));
    group.classList.toggle('has-only-decomp', Boolean(!hasVisual && hasDecomp));
  } else {
    group.hidden = true;
    group.setAttribute('hidden', '');
    group.style.display = 'none';
    group.classList.remove('has-both', 'has-only-visual', 'has-only-decomp');
  }
}
window.syncCardSupportingGroup = syncCardSupportingGroup;

function render(animate) {
  stopSpeech();
  if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer = null; }
  // Hide ratings right away so a double press cannot rate the next card during the exit animation.
  const ratingRow = document.getElementById('ratingRow');
  if (ratingRow) ratingRow.hidden = true;

  // Zero-Latency Anticipatory Preload:
  // Before running the 150ms transition, fetch the incoming target card & immediate neighbors with TOP priority!
  if (Array.isArray(WORDS) && Array.isArray(filteredOrder) && filteredOrder.length > 0) {
    const targetWIdx = filteredOrder[idx % filteredOrder.length];
    const targetWord = WORDS[targetWIdx];
    if (targetWord && typeof preloadSingleWordIllustration === 'function') {
      preloadSingleWordIllustration(targetWord, 'high');
    }
    const nextWIdx = filteredOrder[(idx + 1) % filteredOrder.length];
    if (WORDS[nextWIdx] && typeof preloadSingleWordIllustration === 'function') {
      preloadSingleWordIllustration(WORDS[nextWIdx], 'high');
    }
  }

  const content = document.getElementById('cardContent');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function celebrateDeckMilestone() {
    if (typeof launchConfettiFireworks === 'function') launchConfettiFireworks();
    if (typeof playCelebrationChime === 'function') playCelebrationChime();
  }

  function renderEmptyCardState(container) {
    if (!container) return;
    const deck = typeof computeDeckProgress === 'function' ? computeDeckProgress() : { learned: 0, total: WORDS.length, known: 0, unknown: 0, unseen: 0 };
    const rawLabel = (LEVELS[currentLevel] && LEVELS[currentLevel].label) || 'cấp độ này';
    const levelLabel = typeof formatStudyLevelLabel === 'function'
      ? formatStudyLevelLabel(rawLabel)
      : (window.formatStudyLevelLabel ? window.formatStudyLevelLabel(rawLabel) : rawLabel);

    if (studyMode === 'review') {
      // Unseen cards left but today's new-card limit is used up.
      const limitReached = deck.unseen > 0;
      container.innerHTML = `
        <div class="generic-empty-card">
          <h3 class="generic-empty-title">Đã xong phiên ôn tập hôm nay</h3>
          <p class="generic-empty-desc">
            ${limitReached
              ? `Không còn thẻ đến hạn, và bạn đã học đủ số thẻ mới của hôm nay. ${levelLabel} còn ${deck.unseen} từ chưa học.`
              : `Không còn thẻ đến hạn hay thẻ mới trong ${levelLabel}. Hãy quay lại khi có thẻ cần ôn.`}
          </p>
          <div class="generic-empty-actions">
            ${limitReached ? `
            <button type="button" class="empty-btn empty-btn--primary" data-ui-click="studyMoreNewCards">
              Học thêm 10 thẻ mới
            </button>` : ''}
            <button type="button" class="empty-btn empty-btn--secondary" data-ui-click="setFilter" data-ui-arg="all">
              Duyệt danh sách từ
            </button>
          </div>
        </div>`;
      return;
    }

    if (currentFilter === 'unseen' || (deck.unseen === 0 && deck.total > 0 && currentFilter !== 'unknown' && currentFilter !== 'known')) {
      celebrateDeckMilestone();
      container.innerHTML = `
        <div class="achievement-hero-card">
          <div class="achievement-hero-trophy-wrap">
            <span class="achievement-hero-trophy">🏆</span>
            <span class="achievement-hero-sparkle-1">✨</span>
            <span class="achievement-hero-sparkle-2">⭐</span>
          </div>
          <div class="achievement-hero-badge">ĐÃ HOÀN THÀNH 100% TỪ VỰNG</div>
          <h2 class="achievement-hero-title">Bạn đã học hết từ vựng ${levelLabel}!</h2>
          <p class="achievement-hero-desc">
            Toàn bộ <strong>${deck.total}</strong> từ vựng đã được bạn học qua ít nhất một lần. Thành tựu thật tuyệt vời!
          </p>
          <div class="achievement-hero-stats">
            <div class="hero-stat-card">
              <span class="hero-stat-num">${deck.total}</span>
              <span class="hero-stat-label">Tổng số từ</span>
            </div>
            <div class="hero-stat-card hero-stat-card--known">
              <span class="hero-stat-num">${deck.known}</span>
              <span class="hero-stat-label">Đã nhớ tốt</span>
            </div>
            <div class="hero-stat-card hero-stat-card--unknown">
              <span class="hero-stat-num">${deck.unknown}</span>
              <span class="hero-stat-label">Cần củng cố</span>
            </div>
          </div>
          <div class="achievement-hero-actions">
            ${deck.unknown > 0 ? `
            <button type="button" class="empty-btn empty-btn--primary" data-ui-click="setStudyMode" data-ui-arg="review">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Ôn tập ngay ${deck.unknown} từ cần ôn
            </button>` : ''}
            <button type="button" class="empty-btn empty-btn--secondary" data-ui-click="showAllShuffled">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/></svg>
              Xáo trộn & ôn tất cả từ
            </button>
          </div>
        </div>`;
      return;
    }

    if (currentFilter === 'unknown') {
      if (deck.known === deck.total && deck.total > 0) {
        celebrateDeckMilestone();
        container.innerHTML = `
          <div class="achievement-hero-card">
            <div class="achievement-hero-trophy-wrap">
              <span class="achievement-hero-trophy">👑</span>
              <span class="achievement-hero-sparkle-1">✨</span>
            </div>
            <div class="achievement-hero-badge achievement-hero-badge--gold">ĐẠI THÀNH TỰU · MASTERED</div>
            <h2 class="achievement-hero-title">Tuyệt Đỉnh Tinh Thông ${levelLabel}!</h2>
            <p class="achievement-hero-desc">
              Bạn đã nhớ hoàn toàn <strong>${deck.total} / ${deck.total}</strong> từ vựng. Không còn bất kỳ từ nào cần ôn!
            </p>
            <div class="achievement-hero-actions">
              <button type="button" class="empty-btn empty-btn--primary" data-ui-click="showAllShuffled">
                Ôn tập củng cố tất cả từ
              </button>
            </div>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="generic-empty-card">
          <h3 class="generic-empty-title">Không còn từ cần ôn tập</h3>
          <p class="generic-empty-desc">
            Tuyệt vời, bạn đã ghi nhớ hết các từ cần củng cố trong danh sách ôn tập hiện tại.
          </p>
          <div class="generic-empty-actions">
            ${deck.unseen > 0 ? `
            <button type="button" class="empty-btn empty-btn--primary" data-ui-click="setStudyMode" data-ui-arg="review">
              Học tiếp ${deck.unseen} từ mới
            </button>` : ''}
            <button type="button" class="empty-btn empty-btn--secondary" data-ui-click="setFilter" data-ui-arg="all">
              Xem tất cả từ
            </button>
          </div>
        </div>`;
      return;
    }

    if (currentFilter === 'known') {
      container.innerHTML = `
        <div class="generic-empty-card">
          <h3 class="generic-empty-title">Chưa có từ nào đã nhớ</h3>
          <p class="generic-empty-desc">Hãy bắt đầu ôn luyện các từ vựng để đánh dấu những từ bạn đã nhớ tốt.</p>
          <button type="button" class="empty-btn empty-btn--primary" data-ui-click="setFilter" data-ui-arg="all">
            Bắt đầu học ngay
          </button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="generic-empty-card">
        <h3 class="generic-empty-title">Không có từ trong bộ lọc này</h3>
        <p class="generic-empty-desc">Chưa có thẻ từ vựng nào thỏa mãn điều kiện lọc đã chọn.</p>
        <button type="button" class="empty-btn empty-btn--secondary" data-ui-click="setFilter" data-ui-arg="all">
          Quay về tất cả từ
        </button>
      </div>`;
  }

  function normalizeSvgViewBox(svgText) {
    if (!svgText || typeof svgText !== 'string') return svgText;
    let normalized = svgText.replace(/viewBox=["']\s*0\s+0\s+240\s*["']/gi, 'viewBox="0 0 240 240"');
    if (!/viewBox=/i.test(normalized) && /width=["']240["']/i.test(normalized) && /height=["']240["']/i.test(normalized)) {
      normalized = normalized.replace(/<svg\b([^>]*)>/i, '<svg$1 viewBox="0 0 240 240">');
    }
    // Presentation hook only (artwork untouched): tag the full-bleed backdrop rect that
    // ~99.5% of the illustration set starts with, so CSS can repaint the baked-in navy
    // panel with the app's warm ink tone consistently across the whole collection.
    normalized = normalized.replace(
      /(<svg\b[^>]*>(?:\s|<!--[\s\S]*?-->|<defs\b[\s\S]*?<\/defs>)*)<rect\b(?=[^>]*\bwidth=["'](?:240|100%)["'])(?=[^>]*\bheight=["'](?:240|100%)["'])/i,
      '$1<rect class="illu-backdrop"'
    );
    return normalized;
  }

  function applyContent() {
    if (content) content.className = 'card-content';
    const card = document.getElementById('card');
    if (card) card.classList.remove('is-flipped');
    const decompAcc = document.getElementById('cardDecompAccordion');
    if (decompAcc) { decompAcc.open = false; }
    const relatedAcc = document.getElementById('cardRelatedAccordion');
    if (relatedAcc) { relatedAcc.open = false; }
    syncDetailRailPlacement();
    const wordMainBlock = document.getElementById('wordMainBlock');
    const cardEmptyState = document.getElementById('cardEmptyState');
    const exBox = document.getElementById('exampleBox');
    if (exBox) exBox.classList.remove('show');
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) soundBtn.classList.remove('show');
    const initImgEl = document.getElementById('cardIllustrationImg');
    if (initImgEl) { initImgEl.hidden = true; initImgEl.style.display = 'none'; initImgEl.removeAttribute('src'); }
    const hint = document.getElementById('hint');
    const initSupGroup = document.getElementById('cardSupportingGroup');
    if (initSupGroup) { initSupGroup.hidden = true; initSupGroup.style.display = 'none'; }
    const initDecompWrap = document.getElementById('cardDecompositionWrap');
    if (initDecompWrap) { initDecompWrap.hidden = true; initDecompWrap.style.display = 'none'; }
    const initRelatedWrap = document.getElementById('cardRelatedWrap');
    if (initRelatedWrap) { initRelatedWrap.hidden = true; initRelatedWrap.style.display = 'none'; }

    if (filteredOrder.length === 0) {
      renderDirectionPrompt(null);
      if (wordMainBlock) wordMainBlock.style.display = 'none';
      if (exBox) { exBox.classList.remove('show'); exBox.style.display = 'none'; }
      if (decompAcc) { decompAcc.open = false; decompAcc.style.display = 'none'; decompAcc.hidden = true; }
      if (relatedAcc) { relatedAcc.open = false; relatedAcc.style.display = 'none'; relatedAcc.hidden = true; }
      if (hint) hint.style.display = 'none';
      const emptyHanzi = document.getElementById('hanzi');
      if (emptyHanzi) {
        emptyHanzi.textContent = '';
        emptyHanzi.style.fontSize = '';
        emptyHanzi.removeAttribute('data-length');
        emptyHanzi.className = 'hanzi';
      }
      document.getElementById('pinyin').textContent = '';
      const emptyHv = document.getElementById('hanvietBadge');
      if (emptyHv) { emptyHv.textContent = ''; emptyHv.style.display = 'none'; }
      const emptyPos = document.getElementById('posBadge');
      if (emptyPos) { emptyPos.textContent = ''; emptyPos.hidden = true; emptyPos.style.display = 'none'; }
      const emptyLevel = document.getElementById('levelBadge');
      if (emptyLevel) { emptyLevel.textContent = ''; emptyLevel.hidden = true; emptyLevel.style.display = 'none'; }
      const emptySupporting = document.getElementById('cardSupportingGroup');
      if (emptySupporting) { emptySupporting.hidden = true; emptySupporting.style.display = 'none'; }
      const emptyDecompWrap = document.getElementById('cardDecompositionWrap');
      if (emptyDecompWrap) { emptyDecompWrap.hidden = true; emptyDecompWrap.style.display = 'none'; }
      const emptyRelatedWrap = document.getElementById('cardRelatedWrap');
      if (emptyRelatedWrap) { emptyRelatedWrap.hidden = true; emptyRelatedWrap.style.display = 'none'; emptyRelatedWrap.innerHTML = ''; }
      const meaningEl = document.getElementById('meaning');
      if (meaningEl) { meaningEl.textContent = ''; meaningEl.classList.remove('show'); }
      const emptyRads = document.getElementById('cardRadicalsRow');
      if (emptyRads) { emptyRads.innerHTML = ''; emptyRads.style.display = 'none'; }
      const emptySvg = document.getElementById('cardIllustrationSvg');
      const emptyImg = document.getElementById('cardIllustrationImg');
      if (emptySvg) emptySvg.innerHTML = '';
      if (emptyImg) { emptyImg.src = ''; emptyImg.hidden = true; }
      if (cardEmptyState) {
        cardEmptyState.hidden = false;
        cardEmptyState.style.display = 'block';
        renderEmptyCardState(cardEmptyState);
      }
      if (content) content.classList.add('is-empty');
      const ratingRow = document.getElementById('ratingRow');
      if (ratingRow) { ratingRow.hidden = true; ratingRow.style.display = 'none'; }
      const ratingArea = document.getElementById('ratingArea');
      if (ratingArea) { ratingArea.hidden = true; ratingArea.style.display = 'none'; }
      const navRow = document.getElementById('studyNavRow');
      if (navRow) { navRow.hidden = true; navRow.style.display = 'none'; }
      updateProgress();
      updateCardPosition();
      updateStats();
      setActiveStudyWord(null);
      renderStudyWordList();
      syncRevealControls();
      if (typeof syncSpeechButtons === 'function') syncSpeechButtons();
      return;
    }
    if (wordMainBlock) wordMainBlock.style.display = '';
    if (cardEmptyState) {
      cardEmptyState.hidden = true;
      cardEmptyState.style.display = 'none';
    }
    if (hint) hint.style.display = '';
    if (content) content.classList.remove('is-empty');
    const wIdx = filteredOrder[idx % filteredOrder.length];
    const w = WORDS[wIdx];
    if (!w) return; // deck was swapped out (level change) while this render was pending
    setActiveStudyWord(w);
    if (typeof renderCardRadicals === 'function') renderCardRadicals(w);
    if (typeof renderCardRelated === 'function') renderCardRelated(w);
    renderStudyWordList();
    const hanziEl = document.getElementById('hanzi');
    if (hanziEl) {
      renderHanziWithClarifier(hanziEl, w.hanzi);
      applyHanziLengthFit(hanziEl, w.hanzi);
    }
    document.getElementById('pinyin').innerHTML = showPinyin ? colorizePinyin(w.pinyin) : '';
    const hvBadge = document.getElementById('hanvietBadge');
    if (hvBadge) {
      let hv = (typeof getWordHanViet === 'function' ? getWordHanViet(w) : '') || w.hanviet;
      if (hv) {
        hv = hv.replace(/[（\(].*?[）\)]/g, '').replace(/\s+/g, ' ').trim();
      }
      const cleanMeaning = String(w.meaning || '').toLowerCase().trim();
      const cleanHv = String(hv || '').toLowerCase().trim();
      const isDuplicateOfMeaning = cleanHv && (
        cleanMeaning === cleanHv ||
        cleanMeaning.split(/[,;\/]/)[0].trim() === cleanHv ||
        cleanMeaning.startsWith(cleanHv + ',') ||
        cleanMeaning.startsWith(cleanHv + ' ')
      );
      if (hv && !isDuplicateOfMeaning) {
        // Labelled explicitly so it never reads as an unnamed tag after the part of speech.
        hvBadge.innerHTML = `<span class="hanviet-label">Hán Việt:</span> <b class="hanviet-value">${window.escapeHtml(hv.toLocaleUpperCase('vi'))}</b>`;
        hvBadge.title = `Âm Hán - Việt: ${hv}`;
        hvBadge.hidden = false;
        hvBadge.style.display = showHanViet ? 'inline-flex' : 'none';
      } else {
        hvBadge.textContent = '';
        hvBadge.hidden = true;
        hvBadge.style.display = 'none';
      }
    }

    // Cập nhật Part of Speech (Từ loại)
    const pos = (typeof getWordPartOfSpeech === 'function') ? getWordPartOfSpeech(w) : null;
    const posBadge = document.getElementById('posBadge');
    if (posBadge) {
      if (pos && pos.label) {
        posBadge.textContent = pos.label;
        posBadge.className = `pos-badge pos-badge--${pos.code || 'noun'}`;
        posBadge.title = `Từ loại: ${pos.full || pos.label}`;
        posBadge.hidden = false;
        posBadge.style.display = 'inline-flex';
      } else {
        posBadge.textContent = '';
        posBadge.hidden = true;
        posBadge.style.display = 'none';
      }
    }

    // Cấp độ HSK không hiển thị trên thẻ flashcard để tránh dư thừa với thanh tiêu đề
    const levelBadge = document.getElementById('levelBadge');
    if (levelBadge) {
      levelBadge.textContent = '';
      levelBadge.hidden = true;
      levelBadge.style.display = 'none';
    }

    const m = document.getElementById('meaning');
    m.textContent = w.meaning;
    m.classList.remove('show');
    const hasExample = Boolean(w.example_zh || w.example_py || w.example_vi);
    const exampleBox = document.getElementById('exampleBox');
    if (exampleBox) exampleBox.hidden = !hasExample;
    document.getElementById('exZh').innerHTML = highlightPatternInExample(w.example_zh, w.patterns);
    renderCardPatterns(w.patterns);
    document.getElementById('exPy').innerHTML = colorizePinyinHtml(w.example_py);
    document.getElementById('exVi').innerHTML = w.example_vi;

    // Cập nhật hình ảnh minh họa trực quan (Visual Mnemonic Anchor): inline SVG, or an <img> fallback.
    const visualCol = document.getElementById('cardVisualCol');
    const imgEl = document.getElementById('cardIllustrationImg');
    const svgEl = document.getElementById('cardIllustrationSvg');
    const frameEl = document.getElementById('cardIllustrationFrame');
    const setShown = (el, display) => {
      if (!el) return;
      el.hidden = !display;
      el.style.display = display || 'none';
    };
    const hideIllustration = () => {
      setShown(visualCol, null);
      if (svgEl) { setShown(svgEl, null); svgEl.innerHTML = ''; }
      if (imgEl) { setShown(imgEl, null); imgEl.removeAttribute('src'); }
      syncCardSupportingGroup();
    };
    const finishLoading = () => {
      if (frameEl) frameEl.classList.remove('is-loading');
      syncCardSupportingGroup();
    };
    const showSvg = svg => {
      svgEl.innerHTML = normalizeSvgViewBox(svg);
      setShown(svgEl, 'flex');
      setShown(imgEl, null);
      imgEl.removeAttribute('src');
      finishLoading();
    };
    const showImg = src => {
      imgEl.onerror = hideIllustration;
      imgEl.onload = () => {
        setShown(imgEl, 'block');
        setShown(svgEl, null);
        svgEl.innerHTML = '';
        setShown(visualCol, 'flex');
        syncCardSupportingGroup();
      };
      imgEl.src = src;
      imgEl.alt = 'Minh họa gợi hình';
      finishLoading();
    };
    const cachedSvgFor = (src, word) => (typeof SynapseSvgCache !== 'undefined')
      ? (SynapseSvgCache.get(src) || (word.hanzi && SynapseSvgCache.get(word.hanzi)))
      : null;

    const illu = (imgEl && svgEl && showIllustration && typeof getWordIllustration === 'function') ? getWordIllustration(w) : null;
    if (illu && !illu.isFallback && (illu.src || (illu.type === 'svg' && illu.svg))) {
      setShown(visualCol, 'flex');
      if (frameEl) frameEl.title = 'Minh họa gợi hình';
      const readySvg = (illu.type === 'svg' && illu.svg) ? illu.svg : cachedSvgFor(illu.src, w);
      if (readySvg) {
        showSvg(readySvg); // instant render from the in-memory cache
      } else if (typeof preloadIllustration === 'function') {
        // Cache miss: shimmer while fetching, then render only if the card is still on screen.
        const curWord = w;
        if (frameEl) frameEl.classList.add('is-loading');
        preloadIllustration(illu.src || w, 'high').then(svgText => {
          if (typeof activeStudyWord === 'undefined' || !activeStudyWord ||
              (activeStudyWord !== curWord && activeStudyWord.hanzi !== curWord.hanzi)) return;
          const svg = svgText || cachedSvgFor(illu.src, curWord);
          if (svg) showSvg(svg); else showImg(illu.src);
        }).catch(() => showImg(illu.src));
      } else {
        showImg(illu.src);
      }
    } else {
      hideIllustration();
    }
    syncCardSupportingGroup();

    // Predictive sliding-window preloader: prefetch next 15 cards and previous 5 cards in background (if enabled)
    if (showIllustration && typeof preloadNearbyIllustrations === 'function' && Array.isArray(WORDS) && Array.isArray(filteredOrder) && filteredOrder.length > 0) {
      preloadNearbyIllustrations(WORDS, filteredOrder, idx % filteredOrder.length, 15);
    }

    renderDirectionPrompt(w);
    if (AUTO_SPEAK_DIRECTIONS.has(readStudyDirection()) && typeof speakWord === 'function') {
      // Play the word as soon as the card appears (A replays it).
      setTimeout(() => { if (!isCardRevealed()) speakWord(); }, APP_TIMEOUTS.AUTO_SPEAK_DELAY_MS);
    }
    document.getElementById('hint').textContent = getCardHintText(false);
    updateCardMoreMenuState();
    updateProgress();
    updateCardPosition();
    updateStats();
    syncRevealControls();
    if (typeof syncSpeechButtons === 'function') syncSpeechButtons();
    if (animate && content && !prefersReduced) {
      if (animate === 'next') content.classList.add('enter-right');
      else if (animate === 'prev') content.classList.add('enter-left');
      else content.classList.add('enter-fade');
    }
  }

  if (!animate || !content || prefersReduced) {
    applyContent();
    return;
  }

  content.className = 'card-content';
  if (animate === 'next') content.classList.add('exit-left');
  else if (animate === 'prev') content.classList.add('exit-right');
  else content.classList.add('exit-fade');

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    applyContent();
  }, 150);
}

export function mountFlashcardStudy() {
  applyToneColorsPref(readToneColorsPref());
  window.toggleToneColors = toggleToneColors;
  window.getCardHintText = getCardHintText;
  window.buildCardArea = buildCardArea;
  window.STUDY_MENUS = STUDY_MENUS;
  window.closeStudyMenu = closeStudyMenu;
  window.toggleStudyMenu = toggleStudyMenu;
  window.toggleStudyHeaderMenu = toggleStudyHeaderMenu;
  window.closeStudyHeaderMenu = closeStudyHeaderMenu;
  window.toggleCardMoreMenu = toggleCardMoreMenu;
  window.closeCardMoreMenu = closeCardMoreMenu;
  window.updateCardMoreMenuState = updateCardMoreMenuState;
  window.toggleIllustration = toggleIllustration;
  window.toggleHanViet = toggleHanViet;
  window.openStudyFilterSheet = openStudyFilterSheet;
  window.closeStudyFilterSheet = closeStudyFilterSheet;
  window.renderFilters = renderFilters;
  window.setFilter = setFilter;
  window.updateStats = updateStats;
  window.RATING_BUTTONS = RATING_BUTTONS;
  window.RATING_KEYS = RATING_KEYS;
  window.ratingButtonsHtml = ratingButtonsHtml;
  window.formatSrsInterval = formatSrsInterval;
  window.updateSrsPreviews = updateSrsPreviews;
  window.isCardRevealed = isCardRevealed;
  window.syncRevealControls = syncRevealControls;
  window.computeDeckProgress = computeDeckProgress;
  window.updateProgress = updateProgress;
  window.updateCardPosition = updateCardPosition;
  window.renderHanziWithClarifier = renderHanziWithClarifier;
  window.applyHanziLengthFit = applyHanziLengthFit;
  window.fitHanziToContainer = fitHanziToContainer;
  window.cardAccordionHtml = cardAccordionHtml;
  window.toggleStudySidebarTab = toggleStudySidebarTab;
  window.toggleStudySidebar = toggleStudySidebar;
  window.toggleStudyWritingPanel = toggleStudyWritingPanel;
  window.closeAllStudyDrawers = closeAllStudyDrawers;
  window.updateStudyDrawerButtons = updateStudyDrawerButtons;
  window.ensureStudyWordList = ensureStudyWordList;
  window.jumpToWordByIndex = jumpToWordByIndex;
  window.renderStudyWordList = renderStudyWordList;
  window.render = render;
  window.syncCardSupportingGroup = syncCardSupportingGroup;
}
