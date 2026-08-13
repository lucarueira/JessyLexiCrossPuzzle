/**
 * WordSelector selects candidate words from the database based on language,
 * difficulty, and recent word cooldown history.
 */

import { shuffleArray } from '../utils/helpers.js';

export class WordSelector {
  /**
   * @param {Array<Object>} wordsDb Full dataset from words.json
   */
  constructor(wordsDb) {
    this.wordsDb = wordsDb || [];
  }

  /**
   * Selects a candidate word list for crossword generation
   * @param {Object} options 
   * @param {string} options.language 'pt' | 'en' | 'random'
   * @param {string} options.difficulty 'easy' | 'medium' | 'hard' | 'random'
   * @param {Array<number|string>} options.recentWordIds Array of recently used word IDs
   * @param {number} options.targetCount Desired target word count (default 12)
   * @returns {Array<Object>} Filtered and sorted word objects
   */
  selectWords(options = {}) {
    let {
      language = 'pt',
      difficulty = 'random',
      recentWordIds = [],
      targetCount = 12
    } = options;

    if (language === 'random') {
      language = Math.random() > 0.5 ? 'pt' : 'en';
    }

    // Filter by language & enabled flag
    let pool = this.wordsDb.filter(w => w.enabled !== false && w.language === language);

    // If pool is empty for language, fallback to all enabled words
    if (pool.length === 0) {
      pool = this.wordsDb.filter(w => w.enabled !== false);
    }

    // Filter by difficulty if specific difficulty requested
    if (difficulty !== 'random') {
      const diffPool = pool.filter(w => w.difficulty === difficulty);
      if (diffPool.length >= 6) {
        pool = diffPool;
      }
    }

    // Separate into unused vs recent words (cooldown mechanism)
    const recentSet = new Set(recentWordIds.map(String));
    const freshWords = [];
    const usedWords = [];

    pool.forEach(w => {
      if (recentSet.has(String(w.id))) {
        usedWords.push(w);
      } else {
        freshWords.push(w);
      }
    });

    // Shuffle both groups
    const shuffledFresh = shuffleArray(freshWords);
    const shuffledUsed = shuffleArray(usedWords);

    // Combine fresh words first, fallback to used words if needed
    const candidatePool = [...shuffledFresh, ...shuffledUsed];

    // Pick top candidates up to targetCount * 2.5 (e.g. 30 words for 12 target) to give GridBuilder ample choices
    const poolSize = Math.max(targetCount * 2.5, 25);
    const selectedBatch = candidatePool.slice(0, Math.min(candidatePool.length, poolSize));

    // Sort descending by word length so longer words serve as grid anchors
    return selectedBatch.sort((a, b) => b.word.length - a.word.length);
  }
}
