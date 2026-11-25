// Sticky right-hand panel of the curriculum lesson workspace: lesson progress,
// vocabulary statistics, a scrollspy outline and quick study actions.
// Reads only data the app already stores (quiz record + flashcard progress).
import { useEffect, useState } from 'preact/hooks';
import { Layers, PenLine, Headphones } from 'lucide-preact';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';
import {
  CUR_LABELS,
  OUTLINE_VISIBLE_THRESHOLD,
  OUTLINE_ROOT_MARGIN_TOP_PX,
  OUTLINE_ROOT_MARGIN_BOTTOM_PERCENT,
} from './CurriculumConstants.js';

const ICON_SIZE = 16;
const PERCENT = 100;
const SECTION_ID_PREFIX = 'curSection-';

function percentOf(part, total) {
  return total ? Math.round((part / total) * PERCENT) : 0;
}

/** Tracks which lesson section currently sits under the sticky header. */
function useActiveSection(sectionIds) {
  const [active, setActive] = useState(sectionIds[0]);
  const idsKey = sectionIds.join('|');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id.slice(SECTION_ID_PREFIX.length));
      },
      {
        rootMargin: `-${OUTLINE_ROOT_MARGIN_TOP_PX}px 0px -${OUTLINE_ROOT_MARGIN_BOTTOM_PERCENT}% 0px`,
        threshold: OUTLINE_VISIBLE_THRESHOLD,
      },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(SECTION_ID_PREFIX + id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [idsKey]);
  return active;
}

function Meter({ label, value, pct, hint }) {
  return (
    <div class="cur-ws-meter">
      <div class="cur-ws-meter-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div
        class="cur-progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={PERCENT}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          class="cur-progress-fill"
          style={`width:${pct}%`}
        ></div>
      </div>
      {hint && <span class="cur-ws-hint">{hint}</span>}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.lesson                 Current lesson data.
 * @param {Object} props.levelData              Level data (name + lessons).
 * @param {import('./CurriculumConstants.js').LessonRecord|undefined} props.record
 * @param {import('./CurriculumConstants.js').LessonWordStats} props.wordStats
 * @param {number} props.levelDone              Lessons completed in this level.
 * @param {Array<{id:string,label:string,meta:string}>} props.outline
 * @param {(id:string) => void} props.onJump
 * @param {(key:string) => void} props.onOpenLesson
 * @param {() => void} props.onFlashcards
 * @param {() => void} props.onWriting
 * @param {(e:Event) => void} props.onListen
 */
export function CurriculumLessonAside({
  lesson,
  levelData,
  record,
  wordStats,
  levelDone,
  outline,
  onJump,
  onOpenLesson,
  onFlashcards,
  onWriting,
  onListen,
}) {
  const active = useActiveSection(outline.map((s) => s.id));
  const done = Boolean(record && record.done);
  const best = record ? record.best : 0;
  const prev = levelData.lessons.find((l) => l.n === lesson.n - 1);
  const next = levelData.lessons.find((l) => l.n === lesson.n + 1);

  return (
    <aside
      class="cur-ws-aside"
      aria-label={CUR_LABELS.ASIDE}
    >
      <section class="cur-ws-panel cur-ws-progress">
        <div class="cur-ws-panel-head">
          <h3 class="cur-ws-title">{CUR_LABELS.PROGRESS_TITLE}</h3>
          <span class={'cur-ws-status' + (done ? ' is-done' : '')}>
            {done && <CheckIcon size={12} />}
            {done ? CUR_LABELS.STATUS_DONE : CUR_LABELS.STATUS_TODO}
          </span>
        </div>
        <Meter
          label={CUR_LABELS.VOCAB_PROGRESS}
          value={`${wordStats.known}/${wordStats.total}`}
          pct={percentOf(wordStats.known, wordStats.total)}
        />
        <Meter
          label={CUR_LABELS.QUIZ_PROGRESS}
          value={record ? `${best}%` : CUR_LABELS.QUIZ_NOT_TAKEN}
          pct={best}
          hint={done ? null : CUR_LABELS.QUIZ_PASS_HINT}
        />
        <dl
          class="cur-ws-stats"
          aria-label={CUR_LABELS.STATS_TITLE}
        >
          <div class="is-known">
            <dt>{CUR_LABELS.STAT_KNOWN}</dt>
            <dd>{wordStats.known}</dd>
          </div>
          <div class="is-learning">
            <dt>{CUR_LABELS.STAT_LEARNING}</dt>
            <dd>{wordStats.learning}</dd>
          </div>
          <div class="is-new">
            <dt>{CUR_LABELS.STAT_NEW}</dt>
            <dd>{wordStats.fresh}</dd>
          </div>
        </dl>
      </section>

      <nav
        class="cur-ws-panel cur-ws-outline"
        aria-label={CUR_LABELS.OUTLINE_NAV}
      >
        <h3 class="cur-ws-title">{CUR_LABELS.OUTLINE_TITLE}</h3>
        <ol class="cur-ws-outline-list">
          {outline.map((s, i) => (
            <li>
              <button
                type="button"
                class={'cur-ws-outline-link' + (active === s.id ? ' is-active' : '')}
                aria-current={active === s.id ? 'location' : undefined}
                onClick={() => onJump(s.id)}
              >
                <span
                  class="cur-ws-outline-num"
                  aria-hidden="true"
                >
                  {s.id === 'practice' && done ? <CheckIcon size={12} /> : i + 1}
                </span>
                <span class="cur-ws-outline-label">{s.label}</span>
                <span class="cur-ws-outline-meta">{s.meta}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section class="cur-ws-panel cur-ws-actions">
        <h3 class="cur-ws-title">{CUR_LABELS.ACTIONS_TITLE}</h3>
        <button
          type="button"
          class="ds-btn ds-btn--primary cur-ws-action"
          onClick={onFlashcards}
        >
          <Layers size={ICON_SIZE} />
          {CUR_LABELS.ACTION_FLASHCARD}
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--secondary cur-ws-action"
          onClick={onWriting}
        >
          <PenLine size={ICON_SIZE} />
          {CUR_LABELS.ACTION_WRITING}
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--secondary cur-ws-action"
          onClick={onListen}
        >
          <Headphones size={ICON_SIZE} />
          {CUR_LABELS.ACTION_LISTEN}
        </button>
      </section>

      <nav
        class="cur-ws-lesson-nav"
        aria-label={CUR_LABELS.LESSON_NAV}
      >
        <span class="cur-ws-level-done">{`${levelData.name} · ${CUR_LABELS.LEVEL_DONE(levelDone, levelData.lessons.length)}`}</span>
        <div class="cur-ws-lesson-nav-row">
          <button
            type="button"
            class="cur-ws-step"
            disabled={!prev}
            title={prev ? `${CUR_LABELS.PREV_LESSON}: ${prev.zh}` : CUR_LABELS.PREV_LESSON}
            onClick={() => prev && onOpenLesson(prev.key)}
          >
            <ChevronLeftIcon size={ICON_SIZE} />
            {CUR_LABELS.PREV_LESSON}
          </button>
          <button
            type="button"
            class="cur-ws-step is-next"
            disabled={!next}
            title={next ? `${CUR_LABELS.NEXT_LESSON}: ${next.zh}` : CUR_LABELS.NEXT_LESSON}
            onClick={() => next && onOpenLesson(next.key)}
          >
            {CUR_LABELS.NEXT_LESSON}
            <ChevronRightIcon size={ICON_SIZE} />
          </button>
        </div>
      </nav>
    </aside>
  );
}
