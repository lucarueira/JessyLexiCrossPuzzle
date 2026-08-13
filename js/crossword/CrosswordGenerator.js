/**
 * CrosswordGenerator orchestrates WordSelector, GridBuilder, and GridNumbering
 * to generate a complete valid crossword puzzle.
 */

import { WordSelector } from './WordSelector.js';
import { GridBuilder } from './GridBuilder.js';
import { GridNumbering } from './GridNumbering.js';
import { generateId } from '../utils/helpers.js';

export class CrosswordGenerator {
  /**
   * @param {Array<Object>} wordsDb Full words database loaded from JSON
   */
  constructor(wordsDb) {
    this.wordSelector = new WordSelector(wordsDb);
  }

  /**
   * Generates a complete dynamic crossword puzzle
   * @param {Object} options
   * @param {string} options.language 'pt' | 'en' | 'random'
   * @param {string} options.difficulty 'easy' | 'medium' | 'hard' | 'random'
   * @param {Array<number|string>} options.recentWordIds List of recent word IDs for cooldown
   * @param {number} options.minWords Minimum target words (default 8)
   * @param {number} options.maxWords Maximum target words (default 15)
   * @returns {Object} Complete puzzle object ready for game engine
   */
  generate(options = {}) {
    const {
      language = 'pt',
      difficulty = 'random',
      recentWordIds = [],
      minWords = 8,
      maxWords = 15
    } = options;

    // 1. Select candidates
    const candidates = this.wordSelector.selectWords({
      language,
      difficulty,
      recentWordIds,
      targetCount: maxWords
    });

    if (!candidates || candidates.length === 0) {
      throw new Error('Não há palavras suficientes no banco para o idioma/dificuldade selecionados.');
    }

    // 2. Build grid layout
    const layout = GridBuilder.buildGrid(candidates, {
      minWords,
      maxWords,
      maxAttempts: 50
    });

    if (!layout) {
      throw new Error('Não foi possível gerar uma cruzadinha válida com o grupo de palavras selecionado.');
    }

    // 3. Number grid & build clue structures
    const numbered = GridNumbering.numberGrid(layout.grid, layout.placedWords);

    const gameLanguage = language === 'random' 
      ? (candidates[0] ? candidates[0].language : 'pt')
      : language;

    return {
      id: generateId(),
      language: gameLanguage,
      difficulty: difficulty,
      rows: layout.rows,
      cols: layout.cols,
      cells: numbered.cellMatrix,
      acrossClues: numbered.acrossClues,
      downClues: numbered.downClues,
      words: numbered.numberedWords,
      totalWords: numbered.numberedWords.length,
      createdAt: new Date().toISOString()
    };
  }
}
