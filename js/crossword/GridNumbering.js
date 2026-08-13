/**
 * GridNumbering scans the grid top-to-bottom, left-to-right to assign clue numbers
 * and build Across & Down clue lists.
 */

export class GridNumbering {
  /**
   * Numbers the crossword grid cells and organizes clues
   * @param {Array<Array<string|null>>} grid Matrix of solution letters or null
   * @param {Array<Object>} placedWords List of placed word objects
   * @returns {Object} { cellMatrix, acrossClues, downClues, numberedWords }
   */
  static numberGrid(grid, placedWords) {
    const rows = grid.length;
    const cols = grid[0].length;

    // Create detailed cell object matrix
    const cellMatrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        isBlack: grid[r][c] === null,
        solutionLetter: grid[r][c],
        number: null,
        acrossWordId: null,
        downWordId: null
      }))
    );

    // Map starting positions to words
    const startMap = new Map(); // "r,c" -> { across: wordObj, down: wordObj }

    placedWords.forEach(w => {
      const key = `${w.startRow},${w.startCol}`;
      if (!startMap.has(key)) {
        startMap.set(key, {});
      }
      if (w.direction === 'across') {
        startMap.get(key).across = w;
      } else {
        startMap.get(key).down = w;
      }
    });

    let currentNumber = 1;
    const acrossClues = [];
    const downClues = [];
    const numberedWords = [];

    // Scan top-to-bottom, left-to-right
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cellMatrix[r][c].isBlack) continue;

        const key = `${r},${c}`;
        const starting = startMap.get(key);

        if (starting && (starting.across || starting.down)) {
          const number = currentNumber++;
          cellMatrix[r][c].number = number;

          if (starting.across) {
            const wordLength = starting.across.normalizedWord ? starting.across.normalizedWord.length : (starting.across.word ? starting.across.word.length : 0);
            const wordObj = {
              ...starting.across,
              number,
              length: wordLength
            };
            acrossClues.push({
              id: wordObj.id,
              number: number,
              word: wordObj.normalizedWord,
              clue: wordObj.clue,
              description: wordObj.description || '',
              category: wordObj.category || 'geral',
              difficulty: wordObj.difficulty || 'medium',
              direction: 'across',
              startRow: r,
              startCol: c,
              length: wordLength
            });
            numberedWords.push(wordObj);

            // Tag cells belonging to this across word
            for (let i = 0; i < wordLength; i++) {
              cellMatrix[r][c + i].acrossWordId = wordObj.id;
            }
          }

          if (starting.down) {
            const wordLength = starting.down.normalizedWord ? starting.down.normalizedWord.length : (starting.down.word ? starting.down.word.length : 0);
            const wordObj = {
              ...starting.down,
              number,
              length: wordLength
            };
            downClues.push({
              id: wordObj.id,
              number: number,
              word: wordObj.normalizedWord,
              clue: wordObj.clue,
              description: wordObj.description || '',
              category: wordObj.category || 'geral',
              difficulty: wordObj.difficulty || 'medium',
              direction: 'down',
              startRow: r,
              startCol: c,
              length: wordLength
            });
            numberedWords.push(wordObj);

            // Tag cells belonging to this down word
            for (let i = 0; i < wordLength; i++) {
              cellMatrix[r + i][c].downWordId = wordObj.id;
            }
          }
        }
      }
    }

    // Sort clues by clue number ascending
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
