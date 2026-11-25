// src/islands/SprintDashboardPanels.jsx
// Presentational panels for the Exam Sprint dashboard (12-column desktop layout).
// Pure view components: every value comes from existing sprint signals/props;
// no learning logic or persistence lives here.

import { h } from 'preact';
import { Flame, Clock, Gauge, TrendingUp, CheckCircle2, Circle, XCircle } from 'lucide-preact';
import {
  SPRINT_UI_LABELS,
  SPRINT_DASHBOARD_LABELS,
  SPRINT_LEVEL_OPTIONS,
  PERCENT_SCALE,
} from './SprintConstants.js';

/**
 * @typedef {Object} SprintStatsView
 * @property {number} totalPool       Words in the selected HSK levels.
 * @property {number} suspendedCount  Words hidden by the learner.
 * @property {number} activeRemaining Words neither learned nor hidden.
 */

/**
 * Share of the pool already handled (learned or hidden), 0–100.
 * @param {SprintStatsView} stats
 * @returns {number}
 */
export function computeCampaignProgressPct(stats) {
  if (!stats || stats.totalPool <= 0) return 0;
  const handled = stats.totalPool - stats.activeRemaining;
  return Math.round((handled / stats.totalPool) * PERCENT_SCALE);
}

/**
 * Whether a daily slot has recorded any activity today.
 * @param {string} slotId
 * @param {Object} daily - SprintDailyProgress
 * @returns {boolean}
 */
export function isSlotDone(slotId, daily) {
  if (slotId === 'morning') return daily.morningReviewDone > 0;
  if (slotId === 'noon') return (daily.noonNewCardKeys?.length || 0) > 0;
  if (slotId === 'evening') return (daily.eveningNewCardKeys?.length || 0) > 0;
  if (slotId === 'night') return Boolean(daily.nightSkimDone);
  return false;
}

/**
 * Number of new words introduced today across both new-word batches.
 * @param {Object} daily - SprintDailyProgress
 * @returns {number}
 */
export function countTodayNewWords(daily) {
  return (daily.noonNewCardKeys?.length || 0) + (daily.eveningNewCardKeys?.length || 0);
}

function toPct(value, total) {
  if (!total || total <= 0) return 0;
  return Math.min(PERCENT_SCALE, Math.round((value / total) * PERCENT_SCALE));
}

function ProgressMeter({ pct, label }) {
  return (
    <div
      class="exam-sprint-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={PERCENT_SCALE}
      aria-valuenow={pct}
    >
      <div
        class="exam-sprint-meter-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function levelSummary(targetLevels) {
  return SPRINT_LEVEL_OPTIONS
    .filter((opt) => targetLevels.includes(opt.id))
    .map((opt) => opt.label)
    .join(', ');
}

/**
 * Campaign hero: identity on the left, countdown / pace / progress metrics on the right.
 */
export function SprintHero({ countdown, stats, config, isLoading }) {
  const progressPct = computeCampaignProgressPct(stats);
  const L = SPRINT_DASHBOARD_LABELS;

  let countdownValue = null;
  if (countdown.status === 'upcoming') {
    countdownValue = (
      <>
        <strong>{countdown.daysLeft}</strong>
        <span class="exam-sprint-metric-unit">{L.countdownDaysSuffix}</span>
        <small class="exam-sprint-metric-sub">
          {countdown.hoursLeft} {L.countdownHoursSuffix}
        </small>
      </>
    );
  } else {
    const text = countdown.status === 'today'
      ? SPRINT_UI_LABELS.countdownToday
      : countdown.status === 'passed'
        ? SPRINT_UI_LABELS.countdownPassed
        : SPRINT_UI_LABELS.countdownEmpty;
    countdownValue = <span class="exam-sprint-metric-text">{text}</span>;
  }

  return (
    <section class="exam-sprint-hero">
      <div class="exam-sprint-hero-left">
        <h2>
          <Flame size={20} />
          {SPRINT_UI_LABELS.title}
        </h2>
        <p>{SPRINT_UI_LABELS.subtitle}</p>
        <div class="exam-sprint-hero-tags">
          <span class="exam-sprint-tag">
            {L.levelsSummaryPrefix}: {levelSummary(config.targetLevels)}
          </span>
          <span class="exam-sprint-tag">
            {isLoading ? '…' : stats.totalPool} {L.wordsSuffix}
          </span>
        </div>
      </div>

      <div class="exam-sprint-hero-metrics">
        <div class="exam-sprint-metric exam-sprint-metric--accent">
          <span class="exam-sprint-metric-label">
            <Clock size={14} />
            {L.countdownLabel}
          </span>
          <div class="exam-sprint-metric-value">{countdownValue}</div>
        </div>

        <div class="exam-sprint-metric">
          <span class="exam-sprint-metric-label">
            <Gauge size={14} />
            {L.recommendedPaceLabel}
          </span>
          <div class="exam-sprint-metric-value">
            {countdown.status === 'upcoming' ? (
              <>
                <strong>{countdown.recommendedQuota}</strong>
                <span class="exam-sprint-metric-unit">{L.wordsPerDaySuffix}</span>
              </>
            ) : (
              <span class="exam-sprint-metric-text">{L.recommendedPaceUnset}</span>
            )}
          </div>
        </div>

        <div class="exam-sprint-metric">
          <span class="exam-sprint-metric-label">
            <TrendingUp size={14} />
            {L.campaignProgressLabel}
          </span>
          <div class="exam-sprint-metric-value">
            <strong>{progressPct}%</strong>
            <span class="exam-sprint-metric-unit">{L.campaignProgressHint}</span>
          </div>
          <ProgressMeter
            pct={progressPct}
            label={L.campaignProgressLabel}
          />
        </div>
      </div>
    </section>
  );
}

function TodayRow({ label, children }) {
  return (
    <li class="exam-sprint-today-row">
      <span class="exam-sprint-today-label">{label}</span>
      <span class="exam-sprint-today-value">{children}</span>
    </li>
  );
}

function DoneStatus({ done }) {
  const L = SPRINT_DASHBOARD_LABELS;
  return done ? (
    <span class="exam-sprint-status is-done">
      <CheckCircle2 size={14} />
      {L.statusDone}
    </span>
  ) : (
    <span class="exam-sprint-status">
      <Circle size={14} />
      {L.statusPending}
    </span>
  );
}

/**
 * Today's progress: new-word quota, review counts, end-of-day tasks, Reverse SRS entry.
 */
export function SprintTodayPanel({ daily, config, onStartReverseSrs }) {
  const L = SPRINT_DASHBOARD_LABELS;
  const newWords = countTodayNewWords(daily);
  const quota = config.dailyNewQuota;
  const newWordsPct = toPct(newWords, quota);

  return (
    <aside class="exam-sprint-today-wrap">
      <h3 class="exam-sprint-section-title">{L.todayHeading}</h3>
      <div class="exam-sprint-today">
        <div class="exam-sprint-today-quota">
          <div class="exam-sprint-today-quota-head">
            <span>{L.todayNewWords}</span>
            <strong>
              {newWords}
              <span class="exam-sprint-metric-unit"> / {quota}</span>
            </strong>
          </div>
          <ProgressMeter
            pct={newWordsPct}
            label={L.todayNewWords}
          />
        </div>

        <ul class="exam-sprint-today-list">
          <TodayRow label={L.todayMorningReviews}>
            <strong>{daily.morningReviewDone || 0}</strong>
          </TodayRow>
          <TodayRow label={L.todayNightSkim}>
            <DoneStatus done={Boolean(daily.nightSkimDone)} />
          </TodayRow>
          <TodayRow label={L.todayReverseSrs}>
            <DoneStatus done={Boolean(daily.reverseSrsDone)} />
          </TodayRow>
        </ul>

        <button
          type="button"
          class="exam-sprint-btn-keep exam-sprint-today-cta"
          onClick={onStartReverseSrs}
        >
          <XCircle size={18} />
          {SPRINT_UI_LABELS.reverseSrsBtn}
        </button>
      </div>
    </aside>
  );
}
