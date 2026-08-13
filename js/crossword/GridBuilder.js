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
   * @param {number} options.minWords Minimum required placed words (default 8)
   * @param {number} options.maxWords Maximum placed words (default 15)
   * @param {number} options.maxAttempts Maximum grid creation attempts (default 40)
   * @returns {Object|null} { grid, placedWords, rows, cols } or null if failed
   */
  static buildGrid(wordCandidates, options = {}) {
    const {
      minWords = 8,
      maxWords = 15,
      maxAttempts = 40
    } = options;

    if (!wordCandidates || wordCandidates.length === 0) return null;

    let bestResult = null;
    let maxPlacedCount = 0;

    // Perform multiple layout generation attempts
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const workingSize = 40; // Working 40x40 canvas
      const grid = Array.from({ length: workingSize }, () => Array(workingSize).fill(null));
      const placedWords = [];

      // Rotate candidate list slightly or pick a different first anchor word
      const candidates = [...wordCandidates];
      if (attempt > 0) {
        // Shift or swap starting word to explore different puzzle geometries
        const startIdx = attempt % candidates.length;
        const anchor = candidates.splice(startIdx, 1)[0];
        candidates.unshift(anchor);
      }

      // Place first word in center of working grid horizontally
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

        // Find potential intersection matches with letters already on the grid
        for (let r = 0; r < workingSize; r++) {
          for (let c = 0; c < workingSize; c++) {
            const gridChar = grid[r][c];
            if (!gridChar) continue;

            // Check where gridChar appears in candidateNorm
            for (let charIdx = 0; charIdx < candidateNorm.length; charIdx++) {
              if (candidateNorm[charIdx] === gridChar) {
                // Try ACROSS placement: startCol = c - charIdx, startRow = r
                const acrossStartCol = c - charIdx;
                if (PlacementValidator.isValidPlacement(grid, candidateNorm, r, acrossStartCol, 'across', false)) {
                  possiblePlacements.push({
                    startRow: r,
                    startCol: acrossStartCol,
                    direction: 'across',
                    intersections: this.countIntersections(grid, candidateNorm, r, acrossStartCol, 'across')
                  });
                }

                // Try DOWN placement: startRow = r - charIdx, startCol = c
                const downStartRow = r - charIdx;
                if (PlacementValidator.isValidPlacement(grid, candidateNorm, downStartRow, c, 'down', false)) {
                  possiblePlacements.push({
                    startRow: downStartRow,
                    startCol: c,
                    direction: 'down',
                    intersections: this.countIntersections(grid, candidateNorm, downStartRow, c, 'down')
                  });
                }
              }
            }
          }
        }

        // If valid placements found, select the best placement (highest intersections)
        if (possiblePlacements.length > 0) {
          // Sort by intersections descending
          possiblePlacements.sort((a, b) => b.intersections - a.intersections);
          // Pick top placement
          const bestPlacement = possiblePlacements[0];

          // Place on grid
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

      // Check if current attempt placed enough words
      if (placedWords.length > maxPlacedCount) {
        maxPlacedCount = placedWords.length;
        bestResult = { grid, placedWords };
      }

      if (maxPlacedCount >= minWords) {
        // Sufficient layout generated!
        break;
      }
    }

    if (!bestResult || bestResult.placedWords.length < Math.min(minWords, wordCandidates.length)) {
      // If we couldn't meet minWords, return whatever best result we got as long as placedWords >= 3
      if (!bestResult || bestResult.placedWords.length < 3) {
        return null;
      }
    }

    // Crop grid to tight bounding box
    return this.cropGrid(bestResult.grid, bestResult.placedWords);
  }

  /**
   * Helper to count letter intersections for a candidate placement
   */
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

  /**
   * Crops working grid to smallest bounding box containing all placed letters
   */
  static cropGrid(workingGrid, placedWords) {
    let minRow = workingGrid.length;
    let maxRow = -1;
    let minCol = workingGrid[0].length;
    let maxCol = -1;

    for (let r = 0; r < workingGrid.length; r++) {
      for (let c = 0; c < workingGrid[0].length; c++) {
        if (workingGrid[r][c] !== null) {
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
        }
      }
    }

    // Add 1 cell margin around puzzle for aesthetic spacing
    minRow = Math.max(0, minRow - 1);
    minCol = Math.max(0, minCol - 1);
    maxRow = Math.min(workingGrid.length - 1, maxRow + 1);
    maxCol = Math.min(workingGrid[0].length - 1, maxCol + 1);

    const croppedRows = maxRow - minRow + 1;
    const croppedCols = maxCol - minCol + 1;

    const croppedGrid = Array.from({ length: croppedRows }, () => Array(croppedCols).fill(null));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        croppedGrid[r - minRow][c - minCol] = workingGrid[r][c];
      }
    }

    // Adjust word coordinates to new cropped grid offset
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
