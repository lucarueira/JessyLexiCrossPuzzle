/**
 * CrosswordGame manages the active game state, timer, keyboard navigation,
 * tile rack (Banco de Letras), hint system, word verification, auto-saving, and victory triggers.
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
      this.tileRack = restoredState.tileRack || [];
      this.inputMode = restoredState.inputMode || 'keyboard';
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
      this.tileRack = [];
      this.inputMode = 'keyboard';

      // Find first solution cell to focus initially
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = puzzle.cells[r][c];
          if (!cell.isBlack && !cell.isClueCell) {
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

    this.updateTileRack();
  }

  subscribe(callback) {
    this.onStateChangeCallbacks.push(callback);
  }

  onComplete(callback) {
    this.onCompleteCallbacks.push(callback);
  }

  onHintUsed(callback) {
    this.onHintUsedCallbacks.push(callback);
  }

  onWordSolved(callback) {
    this.onWordSolvedCallbacks.push(callback);
  }

  notifyStateChange() {
    this.saveState();
    this.onStateChangeCallbacks.forEach(cb => cb(this.getStateSummary()));
  }

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

  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Selects a cell or clue cell in grid
   */
  selectCell(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    const cellData = this.puzzle.cells[row][col];
    if (cellData.isBlack) return;

    if (!this.isStarted) {
      this.startTimer();
    }

    // Handle clicking a Clue Cell
    if (cellData.isClueCell && cellData.clues && cellData.clues.length > 0) {
      let clueToFocus = cellData.clues[0];
      if (cellData.clues.length > 1 && this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
        // Toggle to second clue in dual clue cell
        clueToFocus = cellData.clues[1];
      }
      this.currentDirection = clueToFocus.direction;
      this.selectedCell = { row: clueToFocus.startRow, col: clueToFocus.startCol };
      this.updateTileRack();
      this.notifyStateChange();
      return;
    }

    // Handle clicking solution cell
    const prevWordId = this.getActiveWord() ? this.getActiveWord().id : null;

    if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
    } else {
      this.selectedCell = { row, col };
      if (cellData.acrossWordId && !cellData.downWordId) {
        this.currentDirection = 'across';
      } else if (cellData.downWordId && !cellData.acrossWordId) {
        this.currentDirection = 'down';
      }
    }

    const newWord = this.getActiveWord();
    if (!newWord || newWord.id !== prevWordId) {
      this.updateTileRack();
    }

    this.notifyStateChange();
  }

  /**
   * Generates or refreshes the tile rack (Banco de Letras)
   */
  updateTileRack() {
    const activeWord = this.getActiveWord();
    let neededLetters = [];

    if (activeWord) {
      const wordLen = activeWord.length;
      for (let i = 0; i < wordLen; i++) {
        const r = activeWord.direction === 'across' ? activeWord.startRow : activeWord.startRow + i;
        const c = activeWord.direction === 'across' ? activeWord.startCol + i : activeWord.startCol;
        if (!this.userGrid[r][c] && !this.revealedGrid[r][c]) {
          neededLetters.push(this.puzzle.cells[r][c].solutionLetter);
        }
      }
    }

    if (neededLetters.length === 0) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.puzzle.cells[r][c];
          if (!cell.isBlack && !cell.isClueCell) {
            if (!this.userGrid[r][c] && !this.revealedGrid[r][c]) {
              neededLetters.push(cell.solutionLetter);
            }
          }
        }
      }
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const targetSize = Math.max(8, neededLetters.length + 2);

    while (neededLetters.length < targetSize) {
      const randChar = alphabet[Math.floor(Math.random() * alphabet.length)];
      neededLetters.push(randChar);
    }

    neededLetters = neededLetters.slice(0, 9);
    neededLetters.sort(() => Math.random() - 0.5);

    this.tileRack = neededLetters.map((char, index) => ({
      id: `tile_${index}_${char}_${Date.now()}`,
      letter: char,
      isUsed: false
    }));
  }

  /**
   * Selects a letter tile from Banco de Letras
   */
  selectRackTile(tileIndex) {
    if (this.isCompleted || !this.selectedCell) return;
    const tile = this.tileRack[tileIndex];
    if (!tile || tile.isUsed) return;

    const { row, col } = this.selectedCell;
    const cellData = this.puzzle.cells[row][col];
    if (cellData.isBlack || cellData.isClueCell) return;

    if (!this.isStarted) {
      this.startTimer();
    }

    this.userGrid[row][col] = tile.letter;
    tile.isUsed = true;

    this.checkWordsAtCell(row, col);
    this.moveFocus(1);
    this.notifyStateChange();
  }

  /**
   * Recalls placed draft letters back to Banco de Letras
   */
  recallPlacedTiles() {
    if (this.isCompleted) return;
    const activeWord = this.getActiveWord();
    if (!activeWord) return;

    const wordLen = activeWord.length;
    for (let i = 0; i < wordLen; i++) {
      const r = activeWord.direction === 'across' ? activeWord.startRow : activeWord.startRow + i;
      const c = activeWord.direction === 'across' ? activeWord.startCol + i : activeWord.startCol;

      if (!this.revealedGrid[r][c] && this.userGrid[r][c] !== '') {
        const char = this.userGrid[r][c];
        this.userGrid[r][c] = '';

        const usedTile = this.tileRack.find(t => t.isUsed && t.letter === char);
        if (usedTile) {
          usedTile.isUsed = false;
        }
      }
    }

    this.notifyStateChange();
  }

  /**
   * Shuffles the Banco de Letras tiles
   */
  shuffleRack() {
    if (!this.tileRack || this.tileRack.length === 0) return;
    this.tileRack.sort(() => Math.random() - 0.5);
    this.notifyStateChange();
  }

  inputLetter(char) {
    if (!this.selectedCell || this.isCompleted) return;
    const { row, col } = this.selectedCell;
    const cellData = this.puzzle.cells[row][col];
    if (cellData.isBlack || cellData.isClueCell) return;

    if (!this.isStarted) {
      this.startTimer();
    }

    const upperChar = char.toUpperCase();
    this.userGrid[row][col] = upperChar;

    // Mark matching tile as used in rack if available
    const rackTile = this.tileRack.find(t => !t.isUsed && t.letter === upperChar);
    if (rackTile) {
      rackTile.isUsed = true;
    }

    this.checkWordsAtCell(row, col);
    this.moveFocus(1);
    this.notifyStateChange();
  }

  handleBackspace() {
    if (!this.selectedCell || this.isCompleted) return;
    const { row, col } = this.selectedCell;

    if (this.userGrid[row][col] !== '') {
      const char = this.userGrid[row][col];
      this.userGrid[row][col] = '';
      const usedTile = this.tileRack.find(t => t.isUsed && t.letter === char);
      if (usedTile) usedTile.isUsed = false;
    } else {
      this.moveFocus(-1);
      if (this.selectedCell) {
        const prevR = this.selectedCell.row;
        const prevC = this.selectedCell.col;
        const char = this.userGrid[prevR][prevC];
        this.userGrid[prevR][prevC] = '';
        const usedTile = this.tileRack.find(t => t.isUsed && t.letter === char);
        if (usedTile) usedTile.isUsed = false;
      }
    }

    this.notifyStateChange();
  }

  moveFocus(delta) {
    if (!this.selectedCell) return;
    let { row, col } = this.selectedCell;

    const isAcross = this.currentDirection === 'across';
    let nextRow = row + (isAcross ? 0 : delta);
    let nextCol = col + (isAcross ? delta : 0);

    if (
      nextRow >= 0 && nextRow < this.rows &&
      nextCol >= 0 && nextCol < this.cols
    ) {
      const cell = this.puzzle.cells[nextRow][nextCol];
      if (!cell.isBlack && !cell.isClueCell) {
        this.selectedCell = { row: nextRow, col: nextCol };
      }
    }
  }

  handleArrowNavigation(key) {
    if (!this.selectedCell) return;
    let { row, col } = this.selectedCell;

    if (key === 'ArrowUp') row--;
    if (key === 'ArrowDown') row++;
    if (key === 'ArrowLeft') col--;
    if (key === 'ArrowRight') col++;

    if (
      row >= 0 && row < this.rows &&
      col >= 0 && col < this.cols
    ) {
      const cell = this.puzzle.cells[row][col];
      if (!cell.isBlack && !cell.isClueCell) {
        this.selectedCell = { row, col };
        this.notifyStateChange();
      }
    }
  }

  useHint() {
    if (this.hintsLeft <= 0 || this.isCompleted) {
      showToast('⚠️ Nenhuma dica restante nesta partida!', 'warning');
      return;
    }

    if (!this.isStarted) {
      this.startTimer();
    }

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

    const penalty = this.scoreManager.applyHintPenalty();
    showToast(`💡 Uma letra foi revelada! -${penalty} pontos`, 'info');

    this.onHintUsedCallbacks.forEach(cb => cb(this.hintsLeft));
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
        const cell = this.puzzle.cells[r][c];
        if (!cell.isBlack && !cell.isClueCell) {
          if (this.userGrid[r][c] !== cell.solutionLetter) {
            return { row: r, col: c };
          }
        }
      }
    }
    return null;
  }

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

      this.onWordSolvedCallbacks.forEach(cb => cb(wordObj));
      this.updateTileRack();

      if (this.completedWords.size === this.puzzle.words.length) {
        this.completeGame();
      }
    }
  }

  completeGame() {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.pauseTimer();

    const bonus = this.scoreManager.calculateCompletionBonus(this.puzzle.totalWords, this.elapsedSeconds);

    const gameResult = {
      score: this.scoreManager.getScore(),
      timeSeconds: this.elapsedSeconds,
      formattedTime: formatTime(this.elapsedSeconds),
      wordsCount: this.puzzle.totalWords,
      hintsCount: 4 - this.hintsLeft,
      timeBonus: bonus
    };

    LocalStorageManager.updateRecords(gameResult);
    LocalStorageManager.addRecentWords(this.puzzle.words.map(w => w.id));
    LocalStorageManager.clearActiveGame();

    this.onCompleteCallbacks.forEach(cb => cb(gameResult));
  }

  getActiveWord() {
    if (!this.selectedCell) return null;
    const { row, col } = this.selectedCell;
    const cellData = this.puzzle.cells[row][col];
    if (!cellData) return null;

    if (this.currentDirection === 'across' && cellData.acrossWordId) {
      return this.puzzle.words.find(w => w.id === cellData.acrossWordId && w.direction === 'across');
    }
    if (this.currentDirection === 'down' && cellData.downWordId) {
      return this.puzzle.words.find(w => w.id === cellData.downWordId && w.direction === 'down');
    }
    if (cellData.acrossWordId) {
      return this.puzzle.words.find(w => w.id === cellData.acrossWordId && w.direction === 'across');
    }
    if (cellData.downWordId) {
      return this.puzzle.words.find(w => w.id === cellData.downWordId && w.direction === 'down');
    }
    return null;
  }

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
      currentDirection: this.currentDirection,
      tileRack: this.tileRack,
      inputMode: this.inputMode
    });
  }

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
      tileRack: this.tileRack,
      inputMode: this.inputMode,
      isCompleted: this.isCompleted
    };
  }

  destroy() {
    this.pauseTimer();
  }
}
