/**
 * GridBuilder constructs the 2D crossword matrix, attempting multiple layout passes
 * to maximize word intersections, density, and compactness.
 */

import { PlacementValidator } from './PlacementValidator.js';
import { normalizeString } from '../utils/helpers.js';

export class GridBuilder {
  /**
   * Builds a crossword grid layout from a candidate list of word objects
   * @param {Array<Object>} wordCandidates List of word items from WordSelector
   * @param {Object} options
   * @param {number} options.minWords Minimum required placed words (default 6)
   * @param {number} options.maxWords Maximum placed words (default 10)
   * @param {number} options.maxAttempts Maximum grid creation attempts (default 50)
   * @returns {Object|null} { grid, placedWords, rows, cols } or null if failed
   */
  static buildGrid(wordCandidates, options = {}) {
    const {
      minWords = 6,
      maxWords = 10,
      maxAttempts = 50
    } = options;

    if (!wordCandidates || wordCandidates.length === 0) return null;

    let bestResult = null;
    let maxPlacedCount = 0;
    let minBoundingArea = Infinity;

    // Perform multiple layout generation attempts
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const workingSize = 30; // Compact 30x30 working grid
      const grid = Array.from({ length: workingSize }, () => Array(workingSize).fill(null));
      const placedWords = [];

      // Shuffle candidates or shift anchor
      const candidates = [...wordCandidates];
      if (attempt > 0) {
        const startIdx = attempt % candidates.length;
        const anchor = candidates.splice(startIdx, 1)[0];
        candidates.unshift(anchor);
      }

      // Place first word in center of working grid
      const firstWordObj = candidates[0];
      const firstWordNorm = normalizeString(firstWordObj.word);
      const startR = Math.floor(workingSize / 2);
      const startC = Math.floor((workingSize - firstWordNorm.length) / 2);

      if (PlacementValidator.isValidPlacement(grid, firstWordNorm, startR, startC, 'across', true)) {
        for (let i = 0; i < firstWordNorm.length; i++) {
          grid[startR][startC + i] = firstWordNorm[i];
        }
        placedWords.push({
          ...firstWordObj,
          normalizedWord: firstWordNorm,
          startRow: startR,
          startCol: startC,
          direction: 'across'
        });
      }

      // Try placing remaining candidate words
      for (let w = 1; w < candidates.length; w++) {
        if (placedWords.length >= maxWords) break;

        const candidateObj = candidates[w];
        const candidateNorm = normalizeString(candidateObj.word);

        const possiblePlacements = [];

        for (let r = 0; r < workingSize; r++) {
          for (let c = 0; c < workingSize; c++) {
            const gridChar = grid[r][c];
            if (!gridChar) continue;

            for (let charIdx = 0; charIdx < candidateNorm.length; charIdx++) {
              if (candidateNorm[charIdx] === gridChar) {
                // Try ACROSS placement
                const acrossStartCol = c - charIdx;
                if (PlacementValidator.isValidPlacement(grid, candidateNorm, r, acrossStartCol, 'across', false)) {
                  const intersections = this.countIntersections(grid, candidateNorm, r, acrossStartCol, 'across');
                  possiblePlacements.push({
                    startRow: r,
                    startCol: acrossStartCol,
                    direction: 'across',
                    intersections
                  });
                }

                // Try DOWN placement
                const downStartRow = r - charIdx;
                if (PlacementValidator.isValidPlacement(grid, candidateNorm, downStartRow, c, 'down', false)) {
                  const intersections = this.countIntersections(grid, candidateNorm, downStartRow, c, 'down');
                  possiblePlacements.push({
                    startRow: downStartRow,
                    startCol: c,
                    direction: 'down',
                    intersections
                  });
                }
              }
            }
          }
        }

        // Select placement that maximizes intersections while keeping layout compact
        if (possiblePlacements.length > 0) {
          possiblePlacements.sort((a, b) => b.intersections - a.intersections);
          const bestPlacement = possiblePlacements[0];

          const { startRow, startCol, direction } = bestPlacement;
          for (let i = 0; i < candidateNorm.length; i++) {
            const currR = direction === 'across' ? startRow : startRow + i;
            const currC = direction === 'across' ? startCol + i : startCol;
            grid[currR][currC] = candidateNorm[i];
          }

          placedWords.push({
            ...candidateObj,
            normalizedWord: candidateNorm,
            startRow,
            startCol,
            direction
          });
        }
      }

      const currentArea = this.calculateArea(placedWords);

      // Keep layout with maximum placed words & smallest bounding area
      if (placedWords.length > maxPlacedCount || (placedWords.length === maxPlacedCount && currentArea < minBoundingArea)) {
        maxPlacedCount = placedWords.length;
        minBoundingArea = currentArea;
        bestResult = { grid, placedWords };
      }

      if (maxPlacedCount >= minWords && maxPlacedCount >= Math.min(wordCandidates.length, 8)) {
        break;
      }
    }

    if (!bestResult || bestResult.placedWords.length < 3) {
      return null;
    }

    return this.cropGrid(bestResult.grid, bestResult.placedWords);
  }

  static countIntersections(grid, wordNorm, startRow, startCol, direction) {
    let count = 0;
    for (let i = 0; i < wordNorm.length; i++) {
      const r = direction === 'across' ? startRow : startRow + i;
      const c = direction === 'across' ? startCol + i : startCol;
      if (grid[r][c] !== null) {
        count++;
      }
    }
    return count;
  }

  static calculateArea(placedWords) {
    if (!placedWords || placedWords.length === 0) return Infinity;
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    placedWords.forEach(w => {
      const len = w.normalizedWord.length;
      for (let i = 0; i < len; i++) {
        const r = w.direction === 'across' ? w.startRow : w.startRow + i;
        const c = w.direction === 'across' ? w.startCol + i : w.startCol;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    });
    return (maxR - minR + 1) * (maxC - minC + 1);
  }

  /**
   * Tight crop of working grid to strictly contain placed words and clue cells
   */
  static cropGrid(workingGrid, placedWords) {
    let minRow = workingGrid.length;
    let maxRow = -1;
    let minCol = workingGrid[0].length;
    let maxCol = -1;

    placedWords.forEach(w => {
      const len = w.normalizedWord.length;
      for (let i = 0; i < len; i++) {
        const r = w.direction === 'across' ? w.startRow : w.startRow + i;
        const c = w.direction === 'across' ? w.startCol + i : w.startCol;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }

      // Clue Cell coordinate
      const clueR = w.direction === 'across' ? w.startRow : w.startRow - 1;
      const clueC = w.direction === 'across' ? w.startCol - 1 : w.startCol;
      if (clueR < minRow) minRow = clueR;
      if (clueR > maxRow) maxRow = clueR;
      if (clueC < minCol) minCol = clueC;
      if (clueC > maxCol) maxCol = clueC;
    });

    minRow = Math.max(0, minRow);
    minCol = Math.max(0, minCol);
    maxRow = Math.min(workingGrid.length - 1, maxRow);
    maxCol = Math.min(workingGrid[0].length - 1, maxCol);

    const croppedRows = maxRow - minRow + 1;
    const croppedCols = maxCol - minCol + 1;

    const croppedGrid = Array.from({ length: croppedRows }, () => Array(croppedCols).fill(null));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        croppedGrid[r - minRow][c - minCol] = workingGrid[r][c];
      }
    }

    const adjustedWords = placedWords.map(w => ({
      ...w,
      startRow: w.startRow - minRow,
      startCol: w.startCol - minCol
    }));

    return {
      grid: croppedGrid,
      placedWords: adjustedWords,
      rows: croppedRows,
      cols: croppedCols
    };
  }
}
