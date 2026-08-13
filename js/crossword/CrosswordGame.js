/**
 * CrosswordGame manages the active game state, timer, keyboard navigation,
 * hint system, word verification, auto-saving, and victory triggers.
 */

import { ScoreManager } from '../score/ScoreManager.js';
import { LocalStorageManager } from '../storage/LocalStorageManager.js';
import { showToast, formatTime } from '../utils/helpers.js';

export class CrosswordGame {
  /**
   * @param {Object} puzzle Generated puzzle object
   * @param {Object} [restoredState] Restored game state from localStorage
   */
  constructor(puzzle, restoredState = null) {
    this.puzzle = puzzle;
    this.rows = puzzle.rows;
    this.cols = puzzle.cols;

    if (restoredState && restoredState.puzzle.id === puzzle.id) {
      // Restore from saved state
      this.userGrid = restoredState.userGrid;
      this.revealedGrid = restoredState.revealedGrid;
      this.completedWords = new Set(restoredState.completedWords || []);
      this.hintsLeft = restoredState.hintsLeft !== undefined ? restoredState.hintsLeft : 4;
      this.scoreManager = new ScoreManager(restoredState.score || 0);
      this.elapsedSeconds = restoredState.elapsedSeconds || 0;
      this.isStarted = restoredState.isStarted || false;
      this.isCompleted = restoredState.isCompleted || false;
      this.selectedCell = restoredState.selectedCell || { row: 0, col: 0 };
      this.currentDirection = restoredState.currentDirection || 'across';
    } else {
      // Initialize fresh state
      this.userGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(''));
      this.revealedGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
      this.completedWords = new Set();
      this.hintsLeft = 4;
      this.scoreManager = new ScoreManager(0);
      this.elapsedSeconds = 0;
      this.isStarted = false;
      this.isCompleted = false;
      this.selectedCell = null;
      this.currentDirection = 'across';

      // Find first non-black cell to focus initially
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!puzzle.cells[r][c].isBlack) {
            this.selectedCell = { row: r, col: c };
            break;
          }
        }
        if (this.selectedCell) break;
      }
    }

    this.timerInterval = null;
    this.onStateChangeCallbacks = [];
    this.onCompleteCallbacks = [];
    this.onHintUsedCallbacks = [];
    this.onWordSolvedCallbacks = [];
  }

  /**
   * Register listener for UI updates
   */
  subscribe(callback) {
    this.onStateChangeCallbacks.push(callback);
  }

  /**
   * Register listener for game victory event
   */
  onComplete(callback) {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Register listener for hint used event
   */
  onHintUsed(callback) {
    this.onHintUsedCallbacks.push(callback);
  }

  /**
   * Register listener for word solved event
   */
  onWordSolved(callback) {
    this.onWordSolvedCallbacks.push(callback);
  }

  notifyStateChange() {
    this.saveState();
    this.onStateChangeCallbacks.forEach(cb => cb(this.getStateSummary()));
  }

  /**
   * Starts game timer loop (starts on first interaction per requirements)
   */
  startTimer() {
    if (this.timerInterval || this.isCompleted) return;
    this.isStarted = true;
    this.timerInterval = setInterval(() => {
      if (!this.isCompleted) {
        this.elapsedSeconds++;
        this.notifyStateChange();
      }
    }, 1000);
  }

  /**
   * Pauses timer
   */
  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Selects a cell and manages direction toggling
   * @param {number} row 
   * @param {number} col 
   */
  selectCell(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (this.puzzle.cells[row][col].isBlack) return;

    if (!this.isStarted) {
      this.startTimer();
    }

    if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
      // Toggle direction if clicking already focused cell
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
    } else {
      this.selectedCell = { row, col };
      // If cell belongs to only one word direction, auto-switch to that direction
      const cellData = this.puzzle.cells[row][col];
      if (cellData.acrossWordId && !cellData.downWordId) {
        this.currentDirection = 'across';
      } else if (cellData.downWordId && !cellData.acrossWordId) {
        this.currentDirection = 'down';
      }
    }

    this.notifyStateChange();
  }

  /**
   * Handles user entering a letter
   * @param {string} char 
   */
  inputLetter(char) {
    if (!this.selectedCell || this.isCompleted) return;
    const { row, col } = this.selectedCell;
    const cellData = this.puzzle.cells[row][col];
    if (cellData.isBlack) return;

    if (!this.isStarted) {
      this.startTimer();
    }

    const upperChar = char.toUpperCase();
    this.userGrid[row][col] = upperChar;

    // Verify words passing through this cell
    this.checkWordsAtCell(row, col);

    // Auto-advance focus to next cell in current direction
    this.moveFocus(1);

    this.notifyStateChange();
  }

  /**
   * Handles backspace action
   */
  handleBackspace() {
    if (!this.selectedCell || this.isCompleted) return;
    const { row, col } = this.selectedCell;

    if (this.userGrid[row][col] !== '') {
      // Clear current cell letter if present
      this.userGrid[row][col] = '';
    } else {
      // Move backward and clear previous cell
      this.moveFocus(-1);
      if (this.selectedCell) {
        this.userGrid[this.selectedCell.row][this.selectedCell.col] = '';
      }
    }

    this.notifyStateChange();
  }

  /**
   * Moves focus along active word direction or arrow keys
   * @param {number} delta 1 (forward) or -1 (backward)
   */
  moveFocus(delta) {
    if (!this.selectedCell) return;
    let { row, col } = this.selectedCell;

    const isAcross = this.currentDirection === 'across';
    let nextRow = row + (isAcross ? 0 : delta);
    let nextCol = col + (isAcross ? delta : 0);

    // Ensure within grid bounds and not black cell
    if (
      nextRow >= 0 && nextRow < this.rows &&
      nextCol >= 0 && nextCol < this.cols &&
      !this.puzzle.cells[nextRow][nextCol].isBlack
    ) {
      this.selectedCell = { row: nextRow, col: nextCol };
    }
  }

  /**
   * Navigates via arrow keys (Up, Down, Left, Right)
   * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} key 
   */
  handleArrowNavigation(key) {
    if (!this.selectedCell) return;
    let { row, col } = this.selectedCell;

    if (key === 'ArrowUp') row--;
    if (key === 'ArrowDown') row++;
    if (key === 'ArrowLeft') col--;
    if (key === 'ArrowRight') col++;

    if (
      row >= 0 && row < this.rows &&
      col >= 0 && col < this.cols &&
      !this.puzzle.cells[row][col].isBlack
    ) {
      this.selectedCell = { row, col };
      this.notifyStateChange();
    }
  }

  /**
   * Uses a hint (max 4 per game). Reveals one letter in selected word or puzzle.
   * Deducts 50 points.
   */
  useHint() {
    if (this.hintsLeft <= 0 || this.isCompleted) {
      showToast('⚠️ Nenhuma dica restante nesta partida!', 'warning');
      return;
    }

    if (!this.isStarted) {
      this.startTimer();
    }

    // Attempt to reveal an unrevealed letter in current word first
    let targetCell = this.findUnrevealedCellInCurrentWord() || this.findAnyUnrevealedCell();

    if (!targetCell) {
      showToast('ℹ️ Todas as letras já foram reveladas!', 'info');
      return;
    }

    const { row, col } = targetCell;
    const solution = this.puzzle.cells[row][col].solutionLetter;

    this.userGrid[row][col] = solution;
    this.revealedGrid[row][col] = true;
    this.hintsLeft--;

    // Deduct 50 points penalty
    const penalty = this.scoreManager.applyHintPenalty();

    showToast(`💡 Uma letra foi revelada! -${penalty} pontos`, 'info');

    // Notify listeners that hint was used
    this.onHintUsedCallbacks.forEach(cb => cb(this.hintsLeft));

    // Check if this completes any word or the entire puzzle
    this.checkWordsAtCell(row, col);

    this.notifyStateChange();
  }

  findUnrevealedCellInCurrentWord() {
    if (!this.selectedCell) return null;
    const activeWord = this.getActiveWord();
    if (!activeWord) return null;

    for (let i = 0; i < activeWord.length; i++) {
      const r = activeWord.direction === 'across' ? activeWord.startRow : activeWord.startRow + i;
      const c = activeWord.direction === 'across' ? activeWord.startCol + i : activeWord.startCol;

      if (this.userGrid[r][c] !== this.puzzle.cells[r][c].solutionLetter) {
        return { row: r, col: c };
      }
    }
    return null;
  }

  findAnyUnrevealedCell() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.puzzle.cells[r][c].isBlack) {
          if (this.userGrid[r][c] !== this.puzzle.cells[r][c].solutionLetter) {
            return { row: r, col: c };
          }
        }
      }
    }
    return null;
  }

  /**
   * Checks if words passing through cell (r, c) are fully solved
   */
  checkWordsAtCell(row, col) {
    const cellData = this.puzzle.cells[row][col];
    if (cellData.acrossWordId) {
      const wordObj = this.puzzle.words.find(w => w.id === cellData.acrossWordId && w.direction === 'across');
      if (wordObj && !this.completedWords.has(wordObj.id)) {
        this.verifyWord(wordObj);
      }
    }
    if (cellData.downWordId) {
      const wordObj = this.puzzle.words.find(w => w.id === cellData.downWordId && w.direction === 'down');
      if (wordObj && !this.completedWords.has(wordObj.id)) {
        this.verifyWord(wordObj);
      }
    }
  }

  /**
   * Verifies if word object is completely and correctly filled
   */
  verifyWord(wordObj) {
    const wordLength = wordObj.length || (wordObj.normalizedWord ? wordObj.normalizedWord.length : (wordObj.word ? wordObj.word.length : 0));
    if (!wordLength || wordLength === 0) return;

    let isFull = true;
    let isCorrect = true;

    for (let i = 0; i < wordLength; i++) {
      const r = wordObj.direction === 'across' ? wordObj.startRow : wordObj.startRow + i;
      const c = wordObj.direction === 'across' ? wordObj.startCol + i : wordObj.startCol;

      const userInput = this.userGrid[r][c];
      const solution = this.puzzle.cells[r][c].solutionLetter;

      if (!userInput) {
        isFull = false;
        isCorrect = false;
        break;
      }
      if (userInput !== solution) {
        isCorrect = false;
      }
    }

    if (isFull && isCorrect) {
      this.completedWords.add(wordObj.id);
      const points = this.scoreManager.addWordScore(wordObj.difficulty);
      showToast(`✓ Palavra correta! (+${points} pts)`, 'success');

      // Notify listeners of solved word
      this.onWordSolvedCallbacks.forEach(cb => cb(wordObj));

      // Check if ALL words in puzzle are completed
      if (this.completedWords.size === this.puzzle.words.length) {
        this.completeGame();
      }
    }
  }

  /**
   * Triggers victory sequence when puzzle is fully solved
   */
  completeGame() {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.pauseTimer();

    // Add time bonus
    const bonus = this.scoreManager.calculateCompletionBonus(this.puzzle.totalWords, this.elapsedSeconds);

    const gameResult = {
      score: this.scoreManager.getScore(),
      timeSeconds: this.elapsedSeconds,
      formattedTime: formatTime(this.elapsedSeconds),
      wordsCount: this.puzzle.totalWords,
      hintsCount: 4 - this.hintsLeft,
      timeBonus: bonus
    };

    // Log to persistent records & clear active save
    LocalStorageManager.updateRecords(gameResult);
    LocalStorageManager.addRecentWords(this.puzzle.words.map(w => w.id));
    LocalStorageManager.clearActiveGame();

    this.onCompleteCallbacks.forEach(cb => cb(gameResult));
  }

  /**
   * Returns current active word based on selected cell & direction
   */
  getActiveWord() {
    if (!this.selectedCell) return null;
    const { row, col } = this.selectedCell;
    const cellData = this.puzzle.cells[row][col];

    if (this.currentDirection === 'across' && cellData.acrossWordId) {
      return this.puzzle.words.find(w => w.id === cellData.acrossWordId && w.direction === 'across');
    }
    if (this.currentDirection === 'down' && cellData.downWordId) {
      return this.puzzle.words.find(w => w.id === cellData.downWordId && w.direction === 'down');
    }
    // Fallback to whichever word direction exists for this cell
    if (cellData.acrossWordId) {
      return this.puzzle.words.find(w => w.id === cellData.acrossWordId && w.direction === 'across');
    }
    if (cellData.downWordId) {
      return this.puzzle.words.find(w => w.id === cellData.downWordId && w.direction === 'down');
    }
    return null;
  }

  /**
   * Saves active state to local storage
   */
  saveState() {
    if (this.isCompleted) return;
    LocalStorageManager.saveActiveGame({
      puzzle: this.puzzle,
      userGrid: this.userGrid,
      revealedGrid: this.revealedGrid,
      completedWords: Array.from(this.completedWords),
      hintsLeft: this.hintsLeft,
      score: this.scoreManager.getScore(),
      elapsedSeconds: this.elapsedSeconds,
      isStarted: this.isStarted,
      selectedCell: this.selectedCell,
      currentDirection: this.currentDirection
    });
  }

  /**
   * Returns current game summary for UI rendering
   */
  getStateSummary() {
    return {
      puzzle: this.puzzle,
      userGrid: this.userGrid,
      revealedGrid: this.revealedGrid,
      completedWords: Array.from(this.completedWords),
      hintsLeft: this.hintsLeft,
      score: this.scoreManager.getScore(),
      elapsedSeconds: this.elapsedSeconds,
      formattedTime: formatTime(this.elapsedSeconds),
      selectedCell: this.selectedCell,
      currentDirection: this.currentDirection,
      activeWord: this.getActiveWord(),
      isCompleted: this.isCompleted
    };
  }

  destroy() {
    this.pauseTimer();
  }
}
