/**
 * GridNumbering process grid and placed words for Palavra Cruzada Direta.
 * Maps clue cells directly into the grid matrix preceding each word start.
 */

export class GridNumbering {
  /**
   * Numbers grid cells and builds Direct Crossword (Cruzada Direta) cell matrix & clues
   * @param {Array<Array<string|null>>} grid Matrix of solution letters or null
   * @param {Array<Object>} placedWords List of placed word objects
   * @returns {Object} { cellMatrix, acrossClues, downClues, numberedWords }
   */
  static numberGrid(grid, placedWords) {
    const rows = grid.length;
    const cols = grid[0].length;

    // Create initial cell object matrix
    const cellMatrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        isBlack: grid[r][c] === null,
        isClueCell: false,
        clues: [],
        solutionLetter: grid[r][c],
        number: null,
        acrossWordId: null,
        downWordId: null
      }))
    );

    let currentNumber = 1;
    const acrossClues = [];
    const downClues = [];
    const numberedWords = [];

    // Assign word IDs and place clue cells
    placedWords.forEach(w => {
      const number = currentNumber++;
      const wordLength = w.normalizedWord ? w.normalizedWord.length : (w.word ? w.word.length : 0);
      
      const wordObj = {
        ...w,
        number,
        length: wordLength
      };

      numberedWords.push(wordObj);

      // Tag solution letter cells
      for (let i = 0; i < wordLength; i++) {
        const r = w.direction === 'across' ? w.startRow : w.startRow + i;
        const c = w.direction === 'across' ? w.startCol + i : w.startCol;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (w.direction === 'across') {
            cellMatrix[r][c].acrossWordId = wordObj.id;
          } else {
            cellMatrix[r][c].downWordId = wordObj.id;
          }
        }
      }

      // Assign Clue Cell preceding word start
      const clueRow = w.direction === 'across' ? w.startRow : w.startRow - 1;
      const clueCol = w.direction === 'across' ? w.startCol - 1 : w.startCol;

      if (clueRow >= 0 && clueRow < rows && clueCol >= 0 && clueCol < cols) {
        const clueCell = cellMatrix[clueRow][clueCol];
        clueCell.isClueCell = true;
        clueCell.isBlack = false;

        clueCell.clues.push({
          wordId: wordObj.id,
          number: number,
          direction: w.direction,
          arrowSymbol: w.direction === 'across' ? '►' : '▼',
          clue: w.clue,
          word: w.normalizedWord || w.word,
          startRow: w.startRow,
          startCol: w.startCol
        });
      }

      const clueData = {
        id: wordObj.id,
        number: number,
        word: wordObj.normalizedWord || wordObj.word,
        clue: wordObj.clue,
        description: wordObj.description || '',
        category: wordObj.category || 'geral',
        difficulty: wordObj.difficulty || 'medium',
        direction: w.direction,
        startRow: w.startRow,
        startCol: w.startCol,
        length: wordLength
      };

      if (w.direction === 'across') {
        acrossClues.push(clueData);
      } else {
        downClues.push(clueData);
      }
    });

    acrossClues.sort((a, b) => a.number - b.number);
    downClues.sort((a, b) => a.number - b.number);

    return {
      cellMatrix,
      acrossClues,
      downClues,
      numberedWords
    };
  }
}
