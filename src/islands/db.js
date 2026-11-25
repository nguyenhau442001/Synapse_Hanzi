import Dexie from 'dexie';

/**
 * Hanzi Mind IndexedDB Storage Layer using Dexie.js
 * Provides scalable, non-blocking offline storage with indexing for FSRS cards and review logs.
 */
export class HanziMindDB extends Dexie {
  constructor(dbName = 'HanziMindDB') {
    super(dbName);

    this.version(1).stores({
      // id: `${level}_${direction}_${wordId}`
      cards: 'id, [level+direction], due, state, level, wordId',
      // Auto-incremented review history log
      reviewLogs: '++id, [level+direction], wordId, timestamp',
      // Key-value store for app settings
      preferences: 'key',
    });

    this.version(2).stores({
      cards: 'id, [level+direction], due, state, level, wordId, *tags, examMistakeAt',
      reviewLogs: '++id, [level+direction], wordId, timestamp',
      preferences: 'key',
    });

    this.version(3).stores({
      cards: 'id, [level+direction], due, state, level, wordId, *tags, examMistakeAt, suspended',
      reviewLogs: '++id, [level+direction], wordId, timestamp',
      preferences: 'key',
    }).upgrade((tx) =>
      tx.table('cards').toCollection().modify((card) => {
        if (card.suspended === undefined) card.suspended = false;
        if (card.sprintBatchDate === undefined) card.sprintBatchDate = null;
      })
    );

    this.cards = this.table('cards');
    this.reviewLogs = this.table('reviewLogs');
    this.preferences = this.table('preferences');
  }

  /**
   * Generates a composite primary key for a card
   */
  static getCardKey(level, direction, wordId) {
    return `${level}_${direction}_${wordId}`;
  }

  /**
   * Retrieves all cards for a specific deck (level + direction)
   */
  async getCardsForDeck(level, direction) {
    return this.cards.where('[level+direction]').equals([level, direction]).toArray();
  }

  /**
   * Finds all active (non-suspended) cards that are due for review across all levels
   */
  async getDueCards(now = new Date()) {
    const isoNow = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const due = await this.cards.where('due').belowOrEqual(isoNow).toArray();
    return due.filter((card) => !card.suspended);
  }

  /**
   * Finds all cards that are due for review across all levels,
   * prioritizing cards tagged with `exam_mistake` at the front of the queue.
   */
  async getPrioritizedDueCards(now = new Date(), mistakeTag = 'exam_mistake') {
    const dueCards = await this.getDueCards(now);
    const tagged = [];
    const standard = [];
    for (const card of dueCards) {
      if (Array.isArray(card.tags) && card.tags.includes(mistakeTag)) {
        tagged.push(card);
      } else {
        standard.push(card);
      }
    }
    tagged.sort((a, b) => String(b.examMistakeAt || '').localeCompare(String(a.examMistakeAt || '')));
    return [...tagged, ...standard];
  }

  /**
   * Marks missed vocabulary cards with the exam_mistake tag and schedules them
   * for priority review on the next morning if not already due sooner.
   */
  async markExamMistakes(wordIds, level, direction = 'zh2vi', nextMorningIso, mistakeTag = 'exam_mistake') {
    if (!Array.isArray(wordIds) || wordIds.length === 0) return 0;
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const wordId of wordIds) {
      if (!wordId) continue;
      const id = HanziMindDB.getCardKey(level, direction, wordId);
      const existing = await this.cards.get(id);
      const existingTags = Array.isArray(existing?.tags) ? existing.tags : [];
      const nextTags = existingTags.includes(mistakeTag)
        ? existingTags
        : [...existingTags, mistakeTag];

      const effectiveDue =
        existing?.due && existing.due < nextMorningIso ? existing.due : nextMorningIso;

      await this.cards.put({
        id,
        level: existing?.level || level,
        direction: existing?.direction || direction,
        wordId,
        due: effectiveDue,
        stability: existing?.stability || 0,
        difficulty: existing?.difficulty || 0,
        elapsed_days: existing?.elapsed_days || 0,
        scheduled_days: existing?.scheduled_days || 0,
        reps: existing?.reps || 0,
        lapses: (existing?.lapses || 0) + 1,
        state: existing?.state ?? 0,
        last_review: existing?.last_review || null,
        tags: nextTags,
        examMistakeAt: nowIso,
      });
      updatedCount += 1;
    }
    return updatedCount;
  }

  /**
   * Saves or updates a single FSRS card
   */
  async saveCard(level, direction, wordId, cardData) {
    const id = HanziMindDB.getCardKey(level, direction, wordId);
    const existing = await this.cards.get(id);
    return this.cards.put({
      id,
      level,
      direction,
      wordId,
      due: cardData.due instanceof Date ? cardData.due.toISOString() : cardData.due,
      stability: cardData.stability || 0,
      difficulty: cardData.difficulty || 0,
      elapsed_days: cardData.elapsed_days || 0,
      scheduled_days: cardData.scheduled_days || 0,
      reps: cardData.reps || 0,
      lapses: cardData.lapses || 0,
      state: cardData.state ?? 0,
      last_review: cardData.last_review ? new Date(cardData.last_review).toISOString() : null,
      tags: Array.isArray(cardData.tags) ? cardData.tags : (existing?.tags || []),
      examMistakeAt: cardData.examMistakeAt || existing?.examMistakeAt || null,
      suspended: cardData.suspended !== undefined ? Boolean(cardData.suspended) : Boolean(existing?.suspended),
      sprintBatchDate: cardData.sprintBatchDate !== undefined ? cardData.sprintBatchDate : (existing?.sprintBatchDate || null),
    });
  }

  /**
   * Marks or unmarks a card as suspended (skipped during 2s rough sweep).
   */
  async setCardSuspended(level, direction, wordId, suspended = true) {
    const id = HanziMindDB.getCardKey(level, direction, wordId);
    const existing = await this.cards.get(id);
    return this.cards.put({
      id,
      level: existing?.level || level,
      direction: existing?.direction || direction,
      wordId,
      due: existing?.due || new Date().toISOString(),
      stability: existing?.stability || 0,
      difficulty: existing?.difficulty || 0,
      elapsed_days: existing?.elapsed_days || 0,
      scheduled_days: existing?.scheduled_days || 0,
      reps: existing?.reps || 0,
      lapses: existing?.lapses || 0,
      state: existing?.state ?? 0,
      last_review: existing?.last_review || null,
      tags: existing?.tags || [],
      examMistakeAt: existing?.examMistakeAt || null,
      suspended: Boolean(suspended),
      sprintBatchDate: existing?.sprintBatchDate || null,
    });
  }

  /**
   * Appends an entry to the review logs
   */
  async addReviewLog(entry) {
    return this.reviewLogs.add({
      level: entry.level,
      direction: entry.direction || 'zh2vi',
      wordId: entry.wordId,
      rating: entry.rating,
      stateBefore: entry.stateBefore,
      stateAfter: entry.stateAfter,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  }
}

/**
 * Singleton database instance for browser environment
 */
export const db = typeof window !== 'undefined' ? new HanziMindDB() : null;

/**
 * Transparent auto-migration from localStorage to Dexie IndexedDB.
 * Preserves 100% of existing user progress without data loss.
 */
export async function migrateFromLocalStorage(databaseInstance, storageSource = null) {
  const store = storageSource || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store || !databaseInstance) return { migratedCards: 0, migratedLogs: 0 };

  const migrationKey = 'hsk_dexie_migration_v1';
  try {
    const flag = await databaseInstance.preferences.get(migrationKey);
    if (flag && flag.value) {
      return { migratedCards: 0, migratedLogs: 0, alreadyMigrated: true };
    }
  } catch (e) {
    // Continue migration attempt if check fails
  }

  let cardBatch = [];
  let logBatch = [];

  const keyCount = store.length || 0;
  for (let i = 0; i < keyCount; i++) {
    const key = store.key(i);
    if (!key) continue;

    // 1. Migrate FSRS Cards: e.g. hsk_hsk1_srs_v3, hsk_hsk2_srs_v3_listen
    const srsMatch = key.match(/^hsk_([a-zA-Z0-9]+)_srs_v3(?:_([a-zA-Z0-9]+))?$/);
    if (srsMatch) {
      const level = srsMatch[1];
      const direction = srsMatch[2] || 'zh2vi';
      try {
        const raw = JSON.parse(store.getItem(key));
        if (raw && raw.cards && typeof raw.cards === 'object') {
          Object.entries(raw.cards).forEach(([wordId, card]) => {
            if (card) {
              cardBatch.push({
                id: HanziMindDB.getCardKey(level, direction, wordId),
                level,
                direction,
                wordId: Number.isNaN(Number(wordId)) ? wordId : Number(wordId),
                due: card.due ? new Date(card.due).toISOString() : new Date().toISOString(),
                stability: card.stability || 0,
                difficulty: card.difficulty || 0,
                elapsed_days: card.elapsed_days || 0,
                scheduled_days: card.scheduled_days || 0,
                reps: card.reps || 0,
                lapses: card.lapses || 0,
                state: card.state ?? 0,
                last_review: card.last_review ? new Date(card.last_review).toISOString() : null,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed parsing SRS card key during migration:', key, err);
      }
    }

    // 2. Migrate Review Logs: e.g. hsk_hsk1_review_log_v1, hsk_hsk1_review_log_v1_listen
    const logMatch = key.match(/^hsk_([a-zA-Z0-9]+)_review_log_v1(?:_([a-zA-Z0-9]+))?$/);
    if (logMatch) {
      const level = logMatch[1];
      const direction = logMatch[2] || 'zh2vi';
      try {
        const rawLogs = JSON.parse(store.getItem(key));
        if (Array.isArray(rawLogs)) {
          rawLogs.forEach(entry => {
            if (entry && entry.wordId && entry.rating) {
              logBatch.push({
                level,
                direction,
                wordId: entry.wordId,
                rating: entry.rating,
                stateBefore: entry.stateBefore,
                stateAfter: entry.stateAfter,
                timestamp: entry.timestamp || new Date().toISOString(),
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed parsing review log key during migration:', key, err);
      }
    }
  }

  // Execute atomic batch insert in Dexie transaction
  await databaseInstance.transaction('rw', databaseInstance.cards, databaseInstance.reviewLogs, databaseInstance.preferences, async () => {
    if (cardBatch.length > 0) {
      await databaseInstance.cards.bulkPut(cardBatch);
    }
    if (logBatch.length > 0) {
      await databaseInstance.reviewLogs.bulkAdd(logBatch);
    }
    await databaseInstance.preferences.put({
      key: migrationKey,
      value: true,
      migratedAt: new Date().toISOString(),
      cardCount: cardBatch.length,
      logCount: logBatch.length,
    });
  });

  return {
    migratedCards: cardBatch.length,
    migratedLogs: logBatch.length,
    alreadyMigrated: false,
  };
}
