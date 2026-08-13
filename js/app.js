/**
 * JESSY LEXI CROSS PUZZLE - MAIN APP CONTROLLER
 * Initializes components, handles UI routes, grid rendering, and user interactions.
 */

import { CrosswordGenerator } from './crossword/CrosswordGenerator.js';
import { CrosswordGame } from './crossword/CrosswordGame.js';
import { LocalStorageManager } from './storage/LocalStorageManager.js';
import { showToast, formatTime } from './utils/helpers.js';
import { JessyManager } from './jessy/JessyManager.js';

class App {
  constructor() {
    this.wordsDb = [];
    this.generator = null;
    this.currentGame = null;
    this.jessy = new JessyManager();
    this.setupConfig = {
      language: 'pt',
      difficulty: 'random'
    };

    this.init();
  }

  async init() {
    this.initTheme();
    this.bindEvents();

    // Register Jessy DOM targets
    this.jessy.registerTarget({
      imgEl: document.getElementById('jessy-hub-img'),
      textEl: document.getElementById('jessy-hub-text')
    });
    this.jessy.registerTarget({
      imgEl: document.getElementById('jessy-game-img'),
      textEl: document.getElementById('jessy-game-text')
    });
    this.jessy.registerTarget({
      imgEl: document.getElementById('jessy-vic-img'),
      textEl: document.getElementById('jessy-vic-text')
    });

    try {
      // Load words database
      const response = await fetch('js/data/words.json');
      if (!response.ok) throw new Error('Falha ao carregar o banco de palavras.');
      this.wordsDb = await response.json();
      this.generator = new CrosswordGenerator(this.wordsDb);

      // Check for unfinished saved game on launch
      const savedGame = LocalStorageManager.getActiveGame();
      if (savedGame && savedGame.puzzle && !savedGame.isCompleted) {
        this.openModal('modal-resume');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar banco de dados de palavras.', 'error');
    }
  }

  initTheme() {
    const settings = LocalStorageManager.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    this.updateThemeButtonIcon(settings.theme || 'dark');
  }

  updateThemeButtonIcon(theme) {
    const btn = document.getElementById('btn-theme');
    if (btn) {
      btn.innerText = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    LocalStorageManager.saveSettings({ theme: next });
    this.updateThemeButtonIcon(next);
  }

  bindEvents() {
    // Header Actions
    document.getElementById('logo-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHubView();
    });
    document.getElementById('btn-theme')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('btn-records')?.addEventListener('click', () => this.showRecordsModal());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettingsModal());

    // Hub Play Button -> Open Setup Modal
    document.getElementById('btn-play-crossword')?.addEventListener('click', () => {
      this.openModal('modal-setup');
    });

    // Option Chips in Setup Modal
    this.bindOptionChips('opt-language', (val) => { this.setupConfig.language = val; });
    this.bindOptionChips('opt-difficulty', (val) => { this.setupConfig.difficulty = val; });

    // Option Chips in Settings Modal
    this.bindOptionChips('opt-theme-setting', (val) => {
      document.documentElement.setAttribute('data-theme', val);
      LocalStorageManager.saveSettings({ theme: val });
      this.updateThemeButtonIcon(val);
    });

    // Start New Game
    document.getElementById('btn-start-new-game')?.addEventListener('click', () => {
      this.closeModal('modal-setup');
      this.startNewGame();
    });
    document.getElementById('btn-cancel-setup')?.addEventListener('click', () => this.closeModal('modal-setup'));
    document.getElementById('btn-close-setup')?.addEventListener('click', () => this.closeModal('modal-setup'));

    // Resume Modal Actions
    document.getElementById('btn-resume-game')?.addEventListener('click', () => {
      this.closeModal('modal-resume');
      this.resumeSavedGame();
    });
    document.getElementById('btn-discard-resume')?.addEventListener('click', () => {
      LocalStorageManager.clearActiveGame();
      this.closeModal('modal-resume');
      this.openModal('modal-setup');
    });

    // Close Modals
    document.getElementById('btn-close-records')?.addEventListener('click', () => this.closeModal('modal-records'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeModal('modal-settings'));

    // Clear Data Button in Settings
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja apagar todo o progresso e estatísticas salvas?')) {
        localStorage.clear();
        this.initTheme();
        this.closeModal('modal-settings');
        showToast('Dados limpos com sucesso.', 'info');
      }
    });

    // In-Game Top Actions
    document.getElementById('btn-game-back')?.addEventListener('click', () => this.showHubView());
    document.getElementById('btn-game-pause')?.addEventListener('click', () => {
      if (this.currentGame) {
        this.currentGame.pauseTimer();
        showToast('Partida pausada.', 'info');
      }
    });
    document.getElementById('btn-hint')?.addEventListener('click', () => {
      if (this.currentGame) {
        if (this.currentGame.hintsLeft <= 0) {
          this.jessy.showPedindoAjuda(0);
        }
        this.currentGame.useHint();
      }
    });

    // Victory Modal Actions
    document.getElementById('btn-vic-again')?.addEventListener('click', () => {
      this.closeModal('modal-victory');
      this.startNewGame();
    });
    document.getElementById('btn-vic-hub')?.addEventListener('click', () => {
      this.closeModal('modal-victory');
      this.showHubView();
    });

    // Physical Keyboard Handler
    window.addEventListener('keydown', (e) => this.handlePhysicalKeyDown(e));

    // Window Resize Handler for Dynamic Grid Cell Scaling
    window.addEventListener('resize', () => {
      if (this.currentGame && document.getElementById('view-game').style.display !== 'none') {
        this.renderGame(this.currentGame.getStateSummary());
      }
    });

    // Virtual Keyboard Buttons Handler
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-key');
        if (!key || !this.currentGame) return;

        if (key === 'BACKSPACE') {
          this.currentGame.handleBackspace();
        } else {
          this.currentGame.inputLetter(key);
        }
      });
    });
  }

  bindOptionChips(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        container.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        const val = e.currentTarget.getAttribute('data-value');
        callback(val);
      });
    });
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  showHubView() {
    if (this.currentGame) {
      this.currentGame.pauseTimer();
    }
    this.jessy.setState('feliz');
    document.getElementById('view-hub').style.display = 'flex';
    document.getElementById('view-game').style.display = 'none';
    document.getElementById('virtual-keyboard').classList.remove('active');
  }

  showGameView() {
    document.getElementById('view-hub').style.display = 'none';
    document.getElementById('view-game').style.display = 'flex';
    if (window.innerWidth <= 768) {
      document.getElementById('virtual-keyboard').classList.add('active');
    }
  }

  startNewGame() {
    if (!this.generator) return;

    this.jessy.setState('esperando');

    setTimeout(() => {
      try {
        const recentWordIds = LocalStorageManager.getRecentWords();
        const puzzle = this.generator.generate({
          language: this.setupConfig.language,
          difficulty: this.setupConfig.difficulty,
          recentWordIds,
          minWords: 8,
          maxWords: 15
        });

        this.currentGame = new CrosswordGame(puzzle);
        this.setupGameListeners();
        this.showGameView();
        this.renderGame(this.currentGame.getStateSummary());
        this.jessy.setState('escrevendo');
      } catch (err) {
        showToast(err.message || 'Erro ao gerar cruzadinha.', 'error');
        this.jessy.setState('feliz');
      }
    }, 250);
  }

  resumeSavedGame() {
    const savedState = LocalStorageManager.getActiveGame();
    if (!savedState || !savedState.puzzle) return;

    this.currentGame = new CrosswordGame(savedState.puzzle, savedState);
    this.setupGameListeners();
    this.showGameView();
    this.renderGame(this.currentGame.getStateSummary());
    this.jessy.setState('escrevendo');
    showToast('Partida retomada!', 'info');
  }

  setupGameListeners() {
    if (!this.currentGame) return;

    this.currentGame.subscribe((summary) => {
      this.renderGame(summary);
    });

    this.currentGame.onHintUsed(() => {
      this.jessy.showAjudaUsada();
    });

    this.currentGame.onWordSolved(() => {
      this.jessy.showWordSolved();
    });

    this.currentGame.onComplete((result) => {
      this.jessy.setState('comemorando', 'PARABÉNS! Você conseguiu!');
      this.renderVictoryModal(result);
    });
  }

  renderGame(summary) {
    const { puzzle, userGrid, revealedGrid, completedWords, hintsLeft, score, formattedTime, selectedCell, currentDirection, activeWord } = summary;

    // Stats bar update
    document.getElementById('val-score').innerText = score.toLocaleString();
    document.getElementById('val-timer').innerText = formattedTime;
    document.getElementById('val-hints').innerText = `${hintsLeft} DICAS`;

    // Active Clue Banner update
    const bannerBadge = document.getElementById('clue-badge');
    const bannerText = document.getElementById('clue-text');

    if (activeWord) {
      const dirLabel = activeWord.direction === 'across' ? 'HORIZONTAL' : 'VERTICAL';
      bannerBadge.innerText = `${activeWord.number}. ${dirLabel}`;
      bannerText.innerText = activeWord.clue;
    } else {
      bannerBadge.innerText = 'DICA';
      bannerText.innerText = 'Selecione uma célula da cruzadinha...';
    }

    // Render Matrix Grid DOM
    this.renderGridMatrix(puzzle, userGrid, revealedGrid, completedWords, selectedCell, activeWord);

    // Render Across & Down Clue Lists
    this.renderClueLists(puzzle, completedWords, activeWord);
  }

  renderGridMatrix(puzzle, userGrid, revealedGrid, completedWords, selectedCell, activeWord) {
    const container = document.getElementById('crossword-grid');
    const viewport = document.getElementById('grid-viewport');

    let cellSize = 54;
    if (viewport && window.innerWidth > 768) {
      const availHeight = viewport.clientHeight - 40;
      const availWidth = viewport.clientWidth - 40;
      if (availHeight > 0 && availWidth > 0) {
        const maxH = Math.floor((availHeight - (puzzle.rows * 4)) / puzzle.rows);
        const maxW = Math.floor((availWidth - (puzzle.cols * 4)) / puzzle.cols);
        cellSize = Math.max(42, Math.min(68, maxH, maxW));
      }
    }

    container.style.setProperty('--cell-size', `${cellSize}px`);
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${puzzle.cols}, var(--cell-size, ${cellSize}px))`;

    const completedSet = new Set(completedWords);

    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const cellData = puzzle.cells[r][c];
        const cellEl = document.createElement('div');

        if (cellData.isBlack) {
          cellEl.className = 'grid-cell cell-black';
        } else {
          cellEl.className = 'grid-cell';

          // Check if cell is in active word
          if (activeWord) {
            const inActiveAcross = activeWord.direction === 'across' && cellData.acrossWordId === activeWord.id;
            const inActiveDown = activeWord.direction === 'down' && cellData.downWordId === activeWord.id;
            if (inActiveAcross || inActiveDown) {
              cellEl.classList.add('cell-in-word');
            }
          }

          // Check if cell is currently selected
          if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
            cellEl.classList.add('cell-selected');
          }

          // Check if hint revealed
          if (revealedGrid[r][c]) {
            cellEl.classList.add('cell-hint-revealed');
          }

          // Check if word completed
          const acrossDone = cellData.acrossWordId && completedSet.has(cellData.acrossWordId);
          const downDone = cellData.downWordId && completedSet.has(cellData.downWordId);
          if (acrossDone || downDone) {
            cellEl.classList.add('cell-completed');
          }

          // Number badge
          if (cellData.number) {
            const numEl = document.createElement('span');
            numEl.className = 'cell-number';
            numEl.innerText = cellData.number;
            cellEl.appendChild(numEl);
          }

          // User typed or revealed letter
          const letterVal = userGrid[r][c] || '';
          if (letterVal) {
            const letterEl = document.createElement('span');
            letterEl.className = 'cell-letter';
            letterEl.innerText = letterVal;
            cellEl.appendChild(letterEl);
          }

          // Click handler
          cellEl.addEventListener('click', () => {
            if (this.currentGame) {
              this.currentGame.selectCell(r, c);
            }
          });
        }

        container.appendChild(cellEl);
      }
    }
  }

  renderClueLists(puzzle, completedWords, activeWord) {
    const acrossContainer = document.getElementById('list-across-clues');
    const downContainer = document.getElementById('list-down-clues');

    acrossContainer.innerHTML = '';
    downContainer.innerHTML = '';

    const completedSet = new Set(completedWords);

    // Across Clues
    puzzle.acrossClues.forEach(clue => {
      const item = document.createElement('div');
      item.className = 'clue-item';
      if (completedSet.has(clue.id)) item.classList.add('completed');
      if (activeWord && activeWord.id === clue.id && activeWord.direction === 'across') {
        item.classList.add('active');
        setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      }

      item.innerHTML = `
        <span class="clue-item-num">${clue.number}.</span>
        <span>${clue.clue}</span>
      `;

      item.addEventListener('click', () => {
        if (this.currentGame) {
          this.currentGame.currentDirection = 'across';
          this.currentGame.selectCell(clue.startRow, clue.startCol);
        }
      });

      acrossContainer.appendChild(item);
    });

    // Down Clues
    puzzle.downClues.forEach(clue => {
      const item = document.createElement('div');
      item.className = 'clue-item';
      if (completedSet.has(clue.id)) item.classList.add('completed');
      if (activeWord && activeWord.id === clue.id && activeWord.direction === 'down') {
        item.classList.add('active');
        setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      }

      item.innerHTML = `
        <span class="clue-item-num">${clue.number}.</span>
        <span>${clue.clue}</span>
      `;

      item.addEventListener('click', () => {
        if (this.currentGame) {
          this.currentGame.currentDirection = 'down';
          this.currentGame.selectCell(clue.startRow, clue.startCol);
        }
      });

      downContainer.appendChild(item);
    });
  }

  handlePhysicalKeyDown(e) {
    if (!this.currentGame || document.getElementById('view-game').style.display === 'none') return;

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      this.currentGame.handleBackspace();
    } else if (key.startsWith('Arrow')) {
      e.preventDefault();
      this.currentGame.handleArrowNavigation(key);
    } else if (/^[a-zA-ZáàâãéèêíïóôõöúçÑñ]$/.test(key)) {
      e.preventDefault();
      this.currentGame.inputLetter(key);
    }
  }

  showRecordsModal() {
    const records = LocalStorageManager.getRecords();
    document.getElementById('rec-high-score').innerText = (records.highScore || 0).toLocaleString();
    document.getElementById('rec-best-time').innerText = records.bestTime !== null ? formatTime(records.bestTime) : '--:--';
    document.getElementById('rec-games-completed').innerText = records.gamesCompleted || 0;
    document.getElementById('rec-words-solved').innerText = records.wordsSolved || 0;
    document.getElementById('rec-hints-used').innerText = records.hintsUsed || 0;

    this.openModal('modal-records');
  }

  showSettingsModal() {
    const settings = LocalStorageManager.getSettings();
    const themeContainer = document.getElementById('opt-theme-setting');
    if (themeContainer) {
      themeContainer.querySelectorAll('.option-chip').forEach(chip => {
        if (chip.getAttribute('data-value') === settings.theme) {
          chip.classList.add('selected');
        } else {
          chip.classList.remove('selected');
        }
      });
    }
    this.openModal('modal-settings');
  }

  renderVictoryModal(result) {
    document.getElementById('vic-score').innerText = result.score.toLocaleString();
    document.getElementById('vic-time').innerText = result.formattedTime;
    document.getElementById('vic-words').innerText = `${result.wordsCount}/${result.wordsCount}`;
    document.getElementById('vic-hints').innerText = `${result.hintsCount}/4`;

    this.openModal('modal-victory');
  }
}

// Bootstrap Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
