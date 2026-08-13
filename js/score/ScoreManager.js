/**
 * ScoreManager manages score logic, word completion rewards, hint penalties,
 * and final score calculation.
 */

export const WORD_POINTS = {
  easy: 100,
  medium: 150,
  hard: 200
};

export const HINT_PENALTY = 50;

export class ScoreManager {
  constructor(initialScore = 0) {
    this.score = Math.max(0, initialScore);
  }

  /**
   * Returns current score
   * @returns {number}
   */
  getScore() {
    return this.score;
  }

  /**
   * Sets score directly
   * @param {number} val 
   */
  setScore(val) {
    this.score = Math.max(0, val);
  }

  /**
   * Adds score based on word difficulty
   * @param {'easy'|'medium'|'hard'} difficulty 
   * @returns {number} points added
   */
  addWordScore(difficulty = 'easy') {
    const points = WORD_POINTS[difficulty] || WORD_POINTS.easy;
    this.score += points;
    return points;
  }

  /**
   * Deducts hint penalty points
   * @returns {number} penalty applied
   */
  applyHintPenalty() {
    this.score = Math.max(0, this.score - HINT_PENALTY);
    return HINT_PENALTY;
  }

  /**
   * Adds completion bonus calculated from total time and total words
   * @param {number} totalWords 
   * @param {number} elapsedSeconds 
   * @returns {number} bonus points
   */
  calculateCompletionBonus(totalWords, elapsedSeconds) {
    // Faster time = larger bonus
    // E.g., baseline time = 45s per word.
    const targetSeconds = totalWords * 45;
    let bonus = 0;
    if (elapsedSeconds < targetSeconds) {
      const savedSeconds = targetSeconds - elapsedSeconds;
      bonus = Math.floor(savedSeconds * 3); // 3 pts per saved second
    }
    this.score += bonus;
    return bonus;
  }
}
