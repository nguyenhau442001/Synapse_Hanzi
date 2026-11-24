// Writing practice (Tập viết) screen #screenWriting: a 字帖-style worksheet for one
// character at a time — stroke-order cells, rows that start with a model glyph followed by
// faded glyphs to trace, then empty cells to write from memory. Learners write straight
// into each cell with a mouse, a finger or a stylus (Apple Pencil, S Pen, Surface Pen…).
//
// Stroke outlines and medians come from database/strokes/level{N}.json (built by
// tools/build_stroke_data.py from Make Me a Hanzi); the service worker caches each level
// bundle on first use so practice works offline. Ink rendering and stroke grading live in
// ./writingInk.js.
import { render } from 'preact';
import { CURRICULUM_LESSONS } from './curriculumIndex';
import {
  brushPath, matchStroke, layoutWorksheet, charactersOfWords, sampleWidth, toDataPoint, CELL_SIZE, DATA_BASELINE,
} from './writingInk';
import {
  CheckIcon,
  CloseIcon,
  ChevronLeftIcon,
  AudioIcon,
} from './Icons.jsx';

/* global SpaRouter, setPrimaryTab, Curriculum, speakText, APP_VERSION */

const STROKE_ROOT = 'database/strokes/';
const CURRICULUM_ROOT = 'database/curriculum/hsk30/';
const SETTINGS_KEY = 'hsk_writing_settings_v1';
const PROGRESS_KEY = 'hsk_writing_v1';
const COMPACT_WIDTH = 560;
const DEFAULT_SETTINGS = { grid: 'mi', rows: 4, faded: 4, strokeRow: true, grade: true, penOnly: null };
const HINT_AFTER = { faint: 2, empty: 3 };
const LESSON_INDEX = {};
CURRICULUM_LESSONS.forEach(([key, level, levelName, n, zh]) => { LESSON_INDEX[key] = { key, level, levelName, n, zh }; });

let screenEl = null;
let resizeObserver = null;
let keyListenerBound = false;
const strokeBundles = {};
const strokePromises = {};
const levelDataCache = {};

let ws = {
  source: null, // curriculum lesson key, e.g. cur30_1_02
  lesson: null, // { words, zh, n, levelName }
  chars: [],
  index: 0,
  cols: 9,
  cells: {}, // char -> [{ ink: [], done, mistakes, reject, hint }]
  active: null, // flat cell index on the current page
  pad: null, // flat cell index shown in the enlarged pad (compact screens)
  status: '',
  statusTone: '',
  penSeen: false,
  showSettings: false,
  loading: false,
  error: null,
};
let settings = readSettings();
let drawing = null;
let openToken = 0;

function versionSuffix() {
  try { return typeof APP_VERSION !== 'undefined' ? '?v=' + APP_VERSION : ''; } catch (e) { return ''; }
}

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(patch) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

function readProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    return { chars: raw.chars || {}, last: raw.last || null };
  } catch (e) {
    return { chars: {}, last: null };
  }
}

function writeProgress(patch) {
  const next = { ...readProgress(), ...patch };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
}

function levelOfLesson(key) {
  const m = /^cur30_(\d+)_\d+$/.exec(key || '');
  return m ? m[1] : null;
}

async function fetchJson(url) {
  const res = await fetch(url + versionSuffix());
  if (!res.ok) throw new Error('fetch failed: ' + url);
  return res.json();
}

function loadStrokes(level) {
  if (strokeBundles[level]) return Promise.resolve(strokeBundles[level]);
  if (!strokePromises[level]) {
    strokePromises[level] = fetchJson(STROKE_ROOT + 'level' + level + '.json')
      .then((data) => { strokeBundles[level] = data.chars || {}; return strokeBundles[level]; })
      .finally(() => { delete strokePromises[level]; });
  }
  return strokePromises[level];
}

function loadLevelData(level) {
  if (levelDataCache[level]) return Promise.resolve(levelDataCache[level]);
  return fetchJson(CURRICULUM_ROOT + 'level' + level + '.json').then((data) => { levelDataCache[level] = data; return data; });
}

function charData(ch) {
  for (const level of Object.keys(strokeBundles)) {
    if (strokeBundles[level][ch]) return strokeBundles[level][ch];
  }
  return null;
}

function rerender() {
  if (screenEl) render(<WritingScreen />, screenEl);
}

function setWs(patch) {
  ws = { ...ws, ...patch };
  rerender();
}

function isCompact() {
  const sheet = screenEl && screenEl.querySelector('.wr-sheet-wrap');
  const width = sheet ? sheet.clientWidth : window.innerWidth;
  return width < COMPACT_WIDTH;
}

function penOnlyActive() {
  return settings.penOnly === null ? ws.penSeen : Boolean(settings.penOnly);
}

function computeCols() {
  const sheet = screenEl && screenEl.querySelector('.wr-sheet-wrap');
  const width = sheet ? sheet.clientWidth : 900;
  if (width < COMPACT_WIDTH) return 5;
  return Math.max(6, Math.min(12, Math.floor(width / 104)));
}

function currentChar() {
  return ws.chars[ws.index] || null;
}

function pageCells(ch) {
  const data = charData(ch);
  const rows = layoutWorksheet({
    strokeCount: data ? data.m.length : 0,
    cols: ws.cols,
    rows: settings.rows,
    faded: settings.faded,
    strokeRow: settings.strokeRow,
  });
  return rows.flat();
}

function cellStates(ch, count) {
  const list = ws.cells[ch] || [];
  while (list.length < count) list.push({ ink: [], done: false, mistakes: 0, reject: '', hint: -1 });
  ws.cells[ch] = list;
  return list;
}

function writable(kind) {
  return kind === 'faint' || kind === 'empty';
}

function recordCharProgress(ch) {
  const layout = pageCells(ch);
  const states = cellStates(ch, layout.length);
  const total = layout.filter((c) => writable(c.kind)).length;
  const done = layout.filter((c, i) => writable(c.kind) && states[i].done).length;
  const progress = readProgress();
  const prev = progress.chars[ch] || {};
  writeProgress({ chars: { ...progress.chars, [ch]: { cells: Math.max(prev.cells || 0, done), total, at: Date.now() } } });
}

function charIsDone(ch) {
  const rec = readProgress().chars[ch];
  return Boolean(rec && rec.total && rec.cells >= Math.ceil(rec.total * 0.8));
}

function pushRoute() {
  if (typeof SpaRouter === 'undefined') return;
  if (SpaRouter.isNavigatingFromPopstate && SpaRouter.isNavigatingFromPopstate()) return;
  SpaRouter.pushView(ws.source ? { view: 'tab', tab: 'writing', lesson: ws.source } : { view: 'tab', tab: 'writing' });
}

export async function openWriting(source, push = true) {
  const key = LESSON_INDEX[source] ? source : (readProgress().last || 'cur30_1_01');
  const level = levelOfLesson(key);
  const token = ++openToken;
  writeProgress({ last: key });
  ws = { ...ws, source: key, loading: true, error: null, index: 0, active: null, pad: null, status: '', cells: {} };
  rerender();
  if (push) pushRoute();
  try {
    const [levelData] = await Promise.all([loadLevelData(level), loadStrokes(level)]);
    if (token !== openToken) return; // a newer lesson was opened meanwhile
    const lesson = (levelData.lessons || []).find((l) => l.key === key);
    if (!lesson) throw new Error('lesson not found');
    const chars = charactersOfWords(lesson.words).filter((ch) => charData(ch));
    ws = {
      ...ws,
      loading: false,
      lesson: { words: lesson.words, zh: lesson.zh, n: lesson.n, levelName: levelData.name || LESSON_INDEX[key].levelName },
      chars,
    };
    rerender();
    ws.cols = computeCols();
    rerender();
  } catch (e) {
    if (token !== openToken) return;
    setWs({ loading: false, error: 'Không tải được dữ liệu nét chữ. Kiểm tra kết nối mạng rồi thử lại.' });
  }
}

export function initWriting() {
  screenEl = document.getElementById('screenWriting');
  if (!screenEl) return;
  bindKeys();
  if (!ws.source && !openToken) {
    openWriting(null, false);
  } else {
    rerender();
  }
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      const sheet = screenEl.querySelector('.wr-sheet-wrap');
      if (!sheet || !sheet.clientWidth) return; // hidden tab: keep the current layout
      const cols = computeCols();
      if (cols !== ws.cols) setWs({ cols, pad: null });
    });
    resizeObserver.observe(screenEl);
  }
}

function goToChar(index) {
  if (index < 0 || index >= ws.chars.length) return;
  setWs({ index, active: null, pad: null, status: '', statusTone: '' });
  const top = screenEl && screenEl.querySelector('.wr-head');
  if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
}

function speak(ch, event) {
  const button = event && event.currentTarget;
  if (typeof speakText === 'function') speakText(ch, button);
  else if (window.speakText) window.speakText(ch, button);
}

function backToLesson() {
  if (typeof setPrimaryTab === 'function') setPrimaryTab('curriculum');
  if (typeof Curriculum !== 'undefined' && ws.source) Curriculum.openLesson(ws.source);
}

// ── Input ────────────────────────────────────────────────────────────────

function svgPoint(el, e) {
  const rect = el.getBoundingClientRect();
  return [((e.clientX - rect.left) / rect.width) * CELL_SIZE, ((e.clientY - rect.top) / rect.height) * CELL_SIZE];
}

function addSample(e, el) {
  const p = svgPoint(el, e);
  const now = e.timeStamp || performance.now();
  let speed = 0;
  if (drawing.last) {
    const dt = Math.max(1, now - drawing.lastT);
    speed = Math.hypot(p[0] - drawing.last[0], p[1] - drawing.last[1]) / dt;
    if (Math.hypot(p[0] - drawing.last[0], p[1] - drawing.last[1]) < 2) return; // skip sub-pixel noise
  }
  drawing.raw.push(p);
  drawing.samples.push([p[0], p[1], sampleWidth(drawing.pointerType, e.pressure, speed)]);
  drawing.last = p;
  drawing.lastT = now;
}

function scheduleLiveInk() {
  if (drawing.frame) return;
  drawing.frame = requestAnimationFrame(() => {
    if (!drawing) return;
    drawing.frame = 0;
    if (drawing.pathEl) drawing.pathEl.setAttribute('d', brushPath(drawing.samples, false));
  });
}

function onCellPointerDown(e, cellIndex, kind, isPad) {
  if (!writable(kind)) return;
  if (e.pointerType === 'pen' && !ws.penSeen) ws.penSeen = true;
  if (e.pointerType === 'touch' && penOnlyActive()) return; // palm rejection while a stylus is in use
  if (e.button !== undefined && e.button > 0) return;
  if (!isPad && isCompact()) {
    e.preventDefault();
    setWs({ pad: cellIndex, active: cellIndex });
    return;
  }
  const ch = currentChar();
  const data = ch && charData(ch);
  if (!data) return;
  const states = cellStates(ch, pageCells(ch).length);
  if (states[cellIndex].done) {
    ws.status = 'Ô này đã xong. Bấm "Xóa ô" để viết lại.';
    ws.statusTone = '';
    setWs({ active: cellIndex });
    return;
  }
  e.preventDefault();
  const el = e.currentTarget;
  try { el.setPointerCapture(e.pointerId); } catch (err) {}
  drawing = {
    pointerId: e.pointerId,
    pointerType: e.pointerType || 'mouse',
    cellIndex,
    kind,
    raw: [],
    samples: [],
    last: null,
    lastT: 0,
    frame: 0,
    pathEl: el.querySelector('.wr-live'),
  };
  addSample(e, el);
  scheduleLiveInk();
  if (ws.active !== cellIndex) {
    ws.active = cellIndex;
    el.classList.add('is-active');
  }
}

function onCellPointerMove(e) {
  if (!drawing || e.pointerId !== drawing.pointerId) return;
  e.preventDefault();
  const el = e.currentTarget;
  const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  (events.length ? events : [e]).forEach((ev) => addSample(ev, el));
  scheduleLiveInk();
}

function finishStroke(e, cancelled) {
  if (!drawing || e.pointerId !== drawing.pointerId) return;
  const stroke = drawing;
  drawing = null;
  if (stroke.frame) cancelAnimationFrame(stroke.frame);
  if (stroke.pathEl) stroke.pathEl.setAttribute('d', '');
  if (cancelled || !stroke.samples.length) return;

  const ch = currentChar();
  const data = charData(ch);
  const layout = pageCells(ch);
  const states = cellStates(ch, layout.length);
  const cell = states[stroke.cellIndex];
  const strokeIdx = cell.ink.length;
  if (strokeIdx >= data.m.length) return;
  const path = brushPath(stroke.samples, true);

  if (!settings.grade) {
    cell.ink.push(path);
    cell.done = cell.ink.length >= data.m.length;
    if (cell.done) recordCharProgress(ch);
    setWs({ status: cell.done ? 'Xong một ô.' : '', statusTone: cell.done ? 'good' : '' });
    return;
  }

  let leniency = stroke.pointerType === 'touch' ? 1.35 : 1;
  if (stroke.kind === 'empty') leniency *= 1.1;
  const result = matchStroke(stroke.raw.map(toDataPoint), data.m[strokeIdx], leniency, data.m.slice(strokeIdx + 1));
  if (result.ok) {
    cell.ink.push(path);
    cell.mistakes = 0;
    cell.hint = -1;
    cell.done = cell.ink.length >= data.m.length;
    if (cell.done) recordCharProgress(ch);
    setWs({
      status: cell.done ? 'Đúng cả chữ. Viết tiếp ô sau nhé.' : `Đúng nét ${strokeIdx + 1}/${data.m.length}.`,
      statusTone: 'good',
    });
    return;
  }
  cell.mistakes += 1;
  cell.reject = path;
  const showHint = cell.mistakes >= HINT_AFTER[stroke.kind];
  if (showHint) cell.hint = strokeIdx;
  setWs({
    status: `Chưa đúng nét ${strokeIdx + 1}: ${result.reason}.${showHint ? ' Nét cần viết đang nhấp nháy.' : ''}`,
    statusTone: 'bad',
  });
  const cellRef = cell;
  setTimeout(() => {
    cellRef.reject = '';
    if (showHint) cellRef.hint = -1;
    rerender();
  }, showHint ? 1400 : 650);
}

function activeTarget() {
  const ch = currentChar();
  if (!ch || ws.active === null) return null;
  const layout = pageCells(ch);
  if (!writable((layout[ws.active] || {}).kind)) return null;
  return { ch, cell: cellStates(ch, layout.length)[ws.active] };
}

function undoStroke() {
  const t = activeTarget();
  if (!t || !t.cell.ink.length) return;
  t.cell.ink.pop();
  t.cell.done = false;
  setWs({ status: 'Đã hoàn tác một nét.', statusTone: '' });
}

function clearCell() {
  const t = activeTarget();
  if (!t) return;
  Object.assign(t.cell, { ink: [], done: false, mistakes: 0, reject: '', hint: -1 });
  setWs({ status: 'Đã xóa ô.', statusTone: '' });
}

function clearPage() {
  const ch = currentChar();
  if (!ch) return;
  ws.cells[ch] = [];
  setWs({ active: null, pad: null, status: 'Đã xóa cả trang.', statusTone: '' });
}

function nextWritableCell(from) {
  const ch = currentChar();
  const layout = pageCells(ch);
  const states = cellStates(ch, layout.length);
  for (let i = from + 1; i < layout.length; i += 1) {
    if (writable(layout[i].kind) && !states[i].done) return i;
  }
  return null;
}

function bindKeys() {
  if (keyListenerBound) return;
  keyListenerBound = true;
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('writing-view-active')) return;
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoStroke(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (ws.active !== null) { e.preventDefault(); clearCell(); } }
    else if (e.key === 'ArrowRight' && !e.altKey) { goToChar(ws.index + 1); }
    else if (e.key === 'ArrowLeft' && !e.altKey) { goToChar(ws.index - 1); }
    else if (e.key === 'Escape' && ws.pad !== null) { setWs({ pad: null }); }
  });
}

// ── Rendering ────────────────────────────────────────────────────────────

function GridLines({ grid }) {
  if (grid === 'none') return null;
  return (
    <g class="wr-grid-lines" aria-hidden="true">
      <line x1="512" y1="0" x2="512" y2="1024" />
      <line x1="0" y1="512" x2="1024" y2="512" />
      {grid === 'mi' && <line x1="0" y1="0" x2="1024" y2="1024" />}
      {grid === 'mi' && <line x1="1024" y1="0" x2="0" y2="1024" />}
    </g>
  );
}

function Cell({ data, kind, step, state, index, active, isPad }) {
  const strokes = data ? data.s : [];
  const glyph = strokes.map((d, i) => {
    let cls = '';
    if (kind === 'model') cls = 'wr-glyph-model';
    else if (kind === 'faint') cls = 'wr-glyph-faint';
    else if (kind === 'step' && i < step) cls = i === step - 1 ? 'wr-glyph-current' : 'wr-glyph-model';
    if (state && state.hint === i) cls = 'wr-glyph-hint';
    return cls ? <path d={d} class={cls} /> : null;
  });
  const canWrite = writable(kind);
  const label = kind === 'step' ? `Nét ${step}` : kind === 'model' ? 'Chữ mẫu'
    : `Ô ${index + 1}${state && state.done ? ', đã viết đúng' : kind === 'faint' ? ', tô theo chữ mờ' : ', tự viết'}`;
  return (
    <div
      class={'wr-cell is-' + kind + (active ? ' is-active' : '') + (state && state.done ? ' is-done' : '') + (isPad ? ' is-pad' : '')}
      role={canWrite ? 'img' : undefined}
      aria-label={label}
      onPointerDown={canWrite ? (e) => onCellPointerDown(e, index, kind, isPad) : undefined}
      onPointerMove={canWrite ? onCellPointerMove : undefined}
      onPointerUp={canWrite ? (e) => finishStroke(e, false) : undefined}
      onPointerCancel={canWrite ? (e) => finishStroke(e, true) : undefined}
      onContextMenu={canWrite ? (e) => e.preventDefault() : undefined}
    >
      <svg viewBox={`0 0 ${CELL_SIZE} ${CELL_SIZE}`} aria-hidden="true">
        <GridLines grid={settings.grid} />
        <g transform={`translate(0, ${DATA_BASELINE}) scale(1, -1)`}>{glyph}</g>
        {state && state.ink.map((d) => <path d={d} class="wr-ink" />)}
        {state && state.reject && <path d={state.reject} class="wr-ink-reject" />}
        {canWrite && <path class="wr-ink wr-live" d="" />}
      </svg>
      {kind === 'step' && <span class="wr-step-n" aria-hidden="true">{step}</span>}
      {state && state.done && (
        <span class="wr-done" aria-hidden="true">
          <CheckIcon size={11} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

function wordForChar(ch) {
  const words = (ws.lesson && ws.lesson.words) || [];
  return words.find((w) => w.hanzi === ch) || words.find((w) => (w.hanzi || '').includes(ch)) || null;
}

function SourcePicker() {
  const groups = {};
  CURRICULUM_LESSONS.forEach(([key, level, levelName, n, zh]) => {
    (groups[levelName] = groups[levelName] || []).push({ key, n, zh });
  });
  return (
    <label class="wr-source">
      <span class="wr-sr-only">Chọn bài để tập viết</span>
      <select value={ws.source || ''} onChange={(e) => openWriting(e.currentTarget.value)}>
        {Object.keys(groups).map((name) => (
          <optgroup label={name}>
            {groups[name].map((l) => <option value={l.key}>{`${name} · Bài ${l.n}: ${l.zh}`}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function SettingsPanel() {
  const stepper = (label, key, min, max) => (
    <div class="wr-setting-row">
      <span>{label}</span>
      <span class="wr-stepper">
        <button type="button" class="wr-step-btn" aria-label={`Giảm ${label.toLowerCase()}`} disabled={settings[key] <= min}
          onClick={() => { saveSettings({ [key]: settings[key] - 1 }); rerender(); }}>−</button>
        <strong>{settings[key]}</strong>
        <button type="button" class="wr-step-btn" aria-label={`Tăng ${label.toLowerCase()}`} disabled={settings[key] >= max}
          onClick={() => { saveSettings({ [key]: settings[key] + 1 }); rerender(); }}>+</button>
      </span>
    </div>
  );
  const toggle = (label, key, value, onChange) => (
    <label class="wr-setting-row">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => { onChange(e.currentTarget.checked); rerender(); }} />
    </label>
  );
  return (
    <aside class={'wr-settings' + (ws.showSettings ? ' is-open' : '')} aria-label="Tùy chỉnh trang tập viết">
      <h3 class="wr-h3">Trang tập viết</h3>
      {stepper('Số hàng mỗi chữ', 'rows', 2, 8)}
      {stepper('Ô chữ mờ mỗi hàng', 'faded', 0, 8)}
      {toggle('Hàng đầu theo thứ tự nét', 'strokeRow', settings.strokeRow, (v) => saveSettings({ strokeRow: v }))}
      {toggle('Chấm từng nét khi viết', 'grade', settings.grade, (v) => saveSettings({ grade: v }))}
      {toggle('Chỉ nhận nét từ bút cảm ứng', 'penOnly', penOnlyActive(), (v) => saveSettings({ penOnly: v }))}
      <p class="wr-setting-note">Khi bật, chạm bằng tay vào ô sẽ không vẽ nét (chống tì lòng bàn tay). Tự bật khi phát hiện bút.</p>
      <button type="button" class="ds-btn ds-btn--secondary wr-clear-page" onClick={clearPage}>Xóa cả trang</button>
    </aside>
  );
}

function Pad({ ch, data, layout, states }) {
  const i = ws.pad;
  const cell = layout[i];
  if (!cell) return null;
  const next = nextWritableCell(i);
  return (
    <div class="wr-pad-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setWs({ pad: null }); }}>
      <div class="wr-pad" role="dialog" aria-modal="true" aria-label="Ô đang viết, phóng to">
        <div class="wr-pad-head">
          <strong>{`Ô ${i + 1}`}</strong>
          <span>{states[i].done ? 'Đã xong' : `Nét ${Math.min(states[i].ink.length + 1, data.m.length)} / ${data.m.length}`}</span>
          <button
            type="button"
            class="wr-icon-btn"
            aria-label="Đóng ô phóng to"
            onClick={() => setWs({ pad: null })}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <Cell data={data} kind={cell.kind} step={cell.step} state={states[i]} index={i} active isPad />
        <p class={'wr-status' + (ws.statusTone ? ' is-' + ws.statusTone : '')} role="status">{ws.status || ' '}</p>
        <div class="wr-pad-actions">
          <button type="button" class="ds-btn ds-btn--secondary" onClick={undoStroke}>Hoàn tác</button>
          <button type="button" class="ds-btn ds-btn--secondary" onClick={clearCell}>Xóa ô</button>
          <button type="button" class="ds-btn ds-btn--primary" disabled={next === null}
            onClick={() => setWs({ pad: next, active: next, status: '', statusTone: '' })}>Ô tiếp</button>
        </div>
      </div>
    </div>
  );
}

function WritingScreen() {
  if (ws.error) {
    return (
      <div class="wr-wrap"><div class="wr-empty" role="alert">
        <h2 class="wr-h2">Chưa tải được trang tập viết</h2>
        <p>{ws.error}</p>
        <button type="button" class="ds-btn ds-btn--primary" onClick={() => openWriting(ws.source, false)}>Thử lại</button>
      </div></div>
    );
  }
  if (ws.loading || !ws.lesson) {
    return <div class="wr-wrap" aria-busy="true"><div class="wr-skel" /><span class="wr-sr-only" role="status">Đang tải trang tập viết…</span></div>;
  }
  const ch = currentChar();
  const data = ch && charData(ch);
  const layout = ch ? pageCells(ch) : [];
  const states = ch ? cellStates(ch, layout.length) : [];
  const word = ch ? wordForChar(ch) : null;
  const doneCells = layout.filter((c, i) => writable(c.kind) && states[i].done).length;
  const totalCells = layout.filter((c) => writable(c.kind)).length;
  const info = LESSON_INDEX[ws.source] || {};
  const nextChar = ws.chars[ws.index + 1];
  return (
    <div class="wr-wrap">
      <header class="wr-head">
        <div class="wr-head-row">
          <button
            type="button"
            class="wr-back"
            onClick={backToLesson}
          >
            <ChevronLeftIcon size={16} />
            {`Bài ${info.n || ''}`}
          </button>
          <h2 class="wr-title" tabindex="-1">Tập viết</h2>
          <SourcePicker />
        </div>
        <nav class="wr-chars" aria-label="Chữ trong bài">
          {ws.chars.map((c, i) => (
            <button type="button" lang="zh-CN"
              class={'wr-char-chip' + (i === ws.index ? ' is-current' : '') + (charIsDone(c) ? ' is-done' : '')}
              aria-current={i === ws.index ? 'true' : undefined}
              aria-label={`${c}${charIsDone(c) ? ', đã viết xong' : ''}`}
              onClick={() => goToChar(i)}>{c}</button>
          ))}
        </nav>
      </header>

      {!ch ? (
        <div class="wr-empty"><p>Bài này chưa có chữ để tập viết.</p></div>
      ) : (
        <div class={'wr-body' + (ws.showSettings ? ' has-settings' : '')}>
          <section class="wr-main" aria-label={`Trang tập viết chữ ${ch}`}>
            <div class="wr-char-info">
              <span class="wr-char-big" lang="zh-CN">{ch}</span>
              {word && <span class="wr-char-py">{word.hanzi === ch ? word.pinyin : `${word.hanzi} · ${word.pinyin}`}</span>}
              {word && <span class="wr-char-vi">{word.meaning}{word.hanzi === ch && word.hanviet ? ` · ${String(word.hanviet).toUpperCase()}` : ''}</span>}
              <span class="wr-char-meta">{`${data.m.length} nét · ${doneCells}/${totalCells} ô`}</span>
              <button
                type="button"
                class="wr-icon-btn"
                aria-label={`Nghe phát âm ${ch}`}
                onClick={(e) => speak(word && word.hanzi === ch ? ch : ch, e)}
              >
                <AudioIcon size={18} />
              </button>
            </div>

            <div class="wr-toolbar">
              <div class="wr-seg" role="radiogroup" aria-label="Kiểu ô">
                {[['tian', '田字格'], ['mi', '米字格'], ['none', 'Ô trơn']].map(([id, label]) => (
                  <button type="button" role="radio" aria-checked={String(settings.grid === id)}
                    class={'wr-seg-btn' + (settings.grid === id ? ' is-on' : '')}
                    onClick={() => { saveSettings({ grid: id }); rerender(); }}>{label}</button>
                ))}
              </div>
              {ws.penSeen && (
                <button type="button" class={'wr-pen-toggle' + (penOnlyActive() ? ' is-on' : '')} aria-pressed={String(penOnlyActive())}
                  onClick={() => { saveSettings({ penOnly: !penOnlyActive() }); rerender(); }}>
                  Chỉ dùng bút <span class="wr-switch" aria-hidden="true" />
                </button>
              )}
              <button type="button" class="ds-btn ds-btn--secondary wr-settings-btn" aria-expanded={String(ws.showSettings)}
                onClick={() => setWs({ showSettings: !ws.showSettings })}>Tùy chỉnh trang</button>
            </div>

            <div class="wr-sheet-wrap">
              <div class="wr-sheet" style={`grid-template-columns: repeat(${ws.cols}, minmax(0, 1fr))`}>
                {layout.map((cell, i) => (
                  <Cell data={data} kind={cell.kind} step={cell.step} state={writable(cell.kind) ? states[i] : null}
                    index={i} active={ws.active === i} />
                ))}
              </div>
            </div>

            <p class={'wr-status' + (ws.statusTone ? ' is-' + ws.statusTone : '')} role="status" aria-live="polite">
              {ws.status || (isCompactHint() ? 'Chạm vào một ô để phóng to và viết.' : 'Viết thẳng vào ô bằng chuột, ngón tay hoặc bút. Hàng đầu là thứ tự nét.')}
            </p>

            <div class="wr-actions">
              <button type="button" class="ds-btn ds-btn--secondary" onClick={undoStroke} disabled={ws.active === null}>Hoàn tác nét</button>
              <button type="button" class="ds-btn ds-btn--secondary" onClick={clearCell} disabled={ws.active === null}>Xóa ô</button>
              <span class="wr-actions-spacer" />
              <button type="button" class="ds-btn ds-btn--secondary" disabled={ws.index === 0} onClick={() => goToChar(ws.index - 1)}>Chữ trước</button>
              <button type="button" class="ds-btn ds-btn--primary" disabled={!nextChar} onClick={() => goToChar(ws.index + 1)}>
                {nextChar ? <span>Chữ tiếp: <span lang="zh-CN" class="wr-zh">{nextChar}</span></span> : 'Hết bài'}
              </button>
            </div>
          </section>
          <SettingsPanel />
        </div>
      )}
      {ch && ws.pad !== null && <Pad ch={ch} data={data} layout={layout} states={states} />}
    </div>
  );
}

function isCompactHint() {
  return typeof window !== 'undefined' && window.innerWidth < COMPACT_WIDTH + 40;
}

export function mountWriting() {
  window.Writing = { init: initWriting, open: openWriting };
  window.openWritingPractice = (lessonKey) => {
    if (typeof setPrimaryTab === 'function') setPrimaryTab('writing');
    openWriting(lessonKey, true);
  };
}
