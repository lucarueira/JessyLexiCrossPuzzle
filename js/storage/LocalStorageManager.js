/**
 * LocalStorageManager handles persistent storage for game state, recent word cooldowns,
 * high score records, and user settings.
 */

const STORAGE_KEYS = {
  ACTIVE_GAME: 'jessy_lexi_active_game',
  RECENT_WORDS: 'jessy_lexi_recent_words',
  RECORDS: 'jessy_lexi_records',
  SETTINGS: 'jessy_lexi_settings'
};

const DEFAULT_RECORDS = {
  highScore: 0,
  bestTime: null, // in seconds
  gamesCompleted: 0,
  wordsSolved: 0,
  hintsUsed: 0
};

const DEFAULT_SETTINGS = {
  language: 'pt', // 'pt', 'en', 'random'
  difficulty: 'random', // 'easy', 'medium', 'hard', 'random'
  theme: 'dark'
};

export class LocalStorageManager {
  /**
   * Saves active crossword game state
   * @param {Object} gameState 
   */
  static saveActiveGame(gameState) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, JSON.stringify(gameState));
    } catch (e) {
      console.warn('Failed to save active game state to LocalStorage:', e);
    }
  }

  /**
   * Gets saved active game state if present
   * @returns {Object|null}
   */
  static getActiveGame() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load active game state:', e);
      return null;
    }
  }

  /**
   * Clears saved active game
   */
  static clearActiveGame() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME);
    } catch (e) {
      console.warn('Failed to clear active game:', e);
    }
  }

  /**
   * Retrieves array of recently used word IDs/strings
   * @returns {Array<string|number>}
   */
  static getRecentWords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_WORDS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Adds word IDs to recent words list and caps list length
   * @param {Array<string|number>} newWordIds 
   * @param {number} maxHistory 
   */
  static addRecentWords(newWordIds, maxHistory = 100) {
    try {
      const recent = this.getRecentWords();
      const updated = [...new Set([...newWordIds, ...recent])].slice(0, maxHistory);
      localStorage.setItem(STORAGE_KEYS.RECENT_WORDS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update recent words:', e);
    }
  }

  /**
   * Retrieves player high score records
   * @returns {Object}
   */
  static getRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      return data ? { ...DEFAULT_RECORDS, ...JSON.parse(data) } : { ...DEFAULT_RECORDS };
    } catch (e) {
      return { ...DEFAULT_RECORDS };
    }
  }

  /**
   * Updates player records upon game completion
   * @param {Object} gameResult { score, timeSeconds, wordsCount, hintsCount }
   * @returns {Object} updated records
   */
  static updateRecords(gameResult) {
    const current = this.getRecords();
    const newHighScore = Math.max(current.highScore, gameResult.score || 0);
    const newBestTime = (current.bestTime === null || (gameResult.timeSeconds < current.bestTime)) 
      ? gameResult.timeSeconds 
      : current.bestTime;

    const updated = {
      highScore: newHighScore,
      bestTime: newBestTime,
      gamesCompleted: current.gamesCompleted + 1,
      wordsSolved: current.wordsSolved + (gameResult.wordsCount || 0),
      hintsUsed: current.hintsUsed + (gameResult.hintsCount || 0)
    };

    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save records:', e);
    }

    return updated;
  }

  /**
   * Get user preferences
   * @returns {Object}
   */
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save user preferences
   * @param {Object} settings 
   */
  static saveSettings(settings) {
    try {
      const current = this.getSettings();
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }
}
