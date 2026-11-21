// src/islands/SrsEngine.js
// FSRS boundary. Application code should use SRS instead of ts-fsrs directly.

import * as tsFsrs from 'ts-fsrs';

function createSrsEngine() {
  const library = (typeof window !== 'undefined' && window.FSRS) || tsFsrs;
  if (!library || typeof library.fsrs !== 'function') {
    throw new Error('Không tải được ts-fsrs (global FSRS không tồn tại).');
  }

  const RATINGS = {
    again: library.Rating.Again,
    hard: library.Rating.Hard,
    good: library.Rating.Good,
    easy: library.Rating.Easy,
  };
  const RATING_NAMES = {
    [RATINGS.again]: 'again',
    [RATINGS.hard]: 'hard',
    [RATINGS.good]: 'good',
    [RATINGS.easy]: 'easy',
  };
  const DEFAULT_RETENTION = 0.9;

  function normalizeRetention(value) {
    const retention = Number(value);
    return Number.isFinite(retention)
      ? Math.min(0.97, Math.max(0.8, retention))
      : DEFAULT_RETENTION;
  }

  function scheduler(retention) {
    return library.fsrs({
      request_retention: normalizeRetention(retention),
      enable_fuzz: true,
    });
  }

  function parseDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date;
    }
    return null;
  }

  function deserializeCard(value) {
    if (!value || typeof value !== 'object') return null;
    const card = { ...value };
    card.due = parseDate(card.due);
    card.last_review = card.last_review == null ? undefined : parseDate(card.last_review);
    if (!card.due || (value.last_review != null && !card.last_review)) return null;
    return card;
  }

  function serializeCard(value) {
    const card = deserializeCard(value);
    if (!card) return null;
    return {
      ...card,
      due: card.due.toISOString(),
      last_review: card.last_review ? card.last_review.toISOString() : null,
    };
  }

  function createNewCard(now) {
    return serializeCard(library.createEmptyCard(parseDate(now) || new Date()));
  }

  // Compact Vietnamese interval label: "1p", "10p", "3g", "1n", "12n", "2th", "1,5 năm".
  function formatInterval(ms) {
    const minutes = Math.max(0, ms) / 60000;
    if (minutes < 1) return '<1p';
    if (minutes < 60) return Math.round(minutes) + 'p';
    const hours = minutes / 60;
    if (hours < 24) return Math.round(hours) + 'g';
    const days = hours / 24;
    if (days < 30) return Math.round(days) + 'n';
    if (days < 365) return Math.round(days / 30) + 'th';
    const years = Math.round((days / 365) * 10) / 10;
    return String(years).replace('.', ',') + ' năm';
  }

  function decorate(nextCard, ratingName, previous, reviewedAt) {
    // Older builds stored a derived `status`; the learning state is now computed from state/due.
    const { status: _legacyStatus, ...rest } = nextCard;
    return serializeCard({
      ...rest,
      last_rating: ratingName,
      historyStartAt: previous.historyStartAt || reviewedAt.toISOString(),
    });
  }

  function review(cardValue, ratingName, now, retention) {
    const card = deserializeCard(cardValue);
    const rating = RATINGS[ratingName];
    if (!card) throw new Error('Thẻ FSRS không hợp lệ.');
    if (rating === undefined) throw new Error('Mức đánh giá FSRS không hợp lệ.');
    const reviewedAt = parseDate(now) || new Date();
    const result = scheduler(retention).next(card, reviewedAt, rating);
    const nextCard = decorate(result.card, ratingName, card, reviewedAt);

    return {
      card: nextCard,
      log: {
        ...result.log,
        rating: ratingName,
        state: result.card.state,
        scheduled_days: result.card.scheduled_days,
        due: nextCard.due,
        review: reviewedAt.toISOString(),
      },
      rating: ratingName,
      stateBefore: card.state,
      stateAfter: result.card.state,
      elapsedDays: card.last_review
        ? Math.max(0, (reviewedAt.getTime() - card.last_review.getTime()) / 86400000)
        : 0,
    };
  }

  // Next interval for every rating, without changing the card.
  function preview(cardValue, now, retention) {
    const card = deserializeCard(cardValue);
    if (!card) return {};
    const reviewedAt = parseDate(now) || new Date();
    const outcomes = scheduler(retention).repeat(card, reviewedAt);
    const previews = {};
    Object.keys(RATINGS).forEach(name => {
      const outcome = outcomes[RATINGS[name]];
      if (!outcome) return;
      const intervalMs = outcome.card.due.getTime() - reviewedAt.getTime();
      previews[name] = {
        card: decorate(outcome.card, name, card, reviewedAt),
        due: outcome.card.due.toISOString(),
        intervalMs,
        scheduledDays: outcome.card.scheduled_days,
        intervalText: formatInterval(intervalMs),
      };
    });
    return previews;
  }

  function isDue(cardValue, now) {
    const card = deserializeCard(cardValue);
    if (!card || card.state === library.State.New) return false;
    return card.due.getTime() <= (parseDate(now) || new Date()).getTime();
  }

  function retrievability(cardValue, now, retention) {
    const card = deserializeCard(cardValue);
    if (!card || card.state === library.State.New) return 0;
    return scheduler(retention).get_retrievability(card, parseDate(now) || new Date(), false);
  }

  function ratingValue(name) {
    return RATINGS[name];
  }

  function ratingName(value) {
    return RATING_NAMES[value] || null;
  }

  return Object.freeze({
    DEFAULT_RETENTION,
    State: library.State,
    RATINGS: Object.freeze({ ...RATINGS }),
    RATING_NAMES: Object.freeze({ ...RATING_NAMES }),
    normalizeRetention,
    createNewCard,
    deserializeCard,
    serializeCard,
    review,
    preview,
    formatInterval,
    isDue,
    retrievability,
    ratingValue,
    ratingName,
  });
}

export const SRS = createSrsEngine();

export function mountSrsEngine() {
  if (typeof window !== 'undefined') {
    window.SRS = SRS;
  }
  return SRS;
}

if (typeof window !== 'undefined') {
  window.SRS = SRS;
}
