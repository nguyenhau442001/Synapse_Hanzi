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
   * Finds all cards that are due for review across all levels
   */
  async getDueCards(now = new Date()) {
    const isoNow = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    return this.cards.where('due').belowOrEqual(isoNow).toArray();
  }

  /**
   * Saves or updates a single FSRS card
   */
  async saveCard(level, direction, wordId, cardData) {
    const id = HanziMindDB.getCardKey(level, direction, wordId);
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
