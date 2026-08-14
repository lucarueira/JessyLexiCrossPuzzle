/**
 * PlacementValidator validates candidate word placements on a 2D grid matrix
 * according to crossword rules (matching intersections, no adjacent word collisions, bounds).
 */

import { normalizeString } from '../utils/helpers.js';

export class PlacementValidator {
  /**
   * Validates if word can be placed at (row, col) in specified direction
   * @param {Array<Array<string|null>>} grid 2D array of char letters or null
   * @param {string} word Word string (uppercase normalized)
   * @param {number} startRow 
   * @param {number} startCol 
   * @param {'across'|'down'} direction 
   * @param {boolean} isFirstWord True if grid is currently empty
   * @returns {boolean} True if placement is valid
   */
  static isValidPlacement(grid, word, startRow, startCol, direction, isFirstWord = false) {
    const gridRows = grid.length;
    const gridCols = grid[0].length;
    const wordLen = word.length;
    const normalizedWord = normalizeString(word);

    // 1. Boundary check (must leave space for clue cell preceding start)
    if (startRow < 0 || startCol < 0) return false;
    if (direction === 'across') {
      if (startCol < 1 || startCol + wordLen > gridCols) return false;
    } else {
      if (startRow < 1 || startRow + wordLen > gridRows) return false;
    }

    // 2. Cell directly BEFORE word start must be empty (will host Clue Cell)
    if (direction === 'across') {
      if (grid[startRow][startCol - 1] !== null) return false;
    } else {
      if (grid[startRow - 1][startCol] !== null) return false;
    }

    // 3. Cell directly AFTER word end must be empty
    if (direction === 'across') {
      if (startCol + wordLen < gridCols && grid[startRow][startCol + wordLen] !== null) return false;
    } else {
      if (startRow + wordLen < gridRows && grid[startRow + wordLen][startCol] !== null) return false;
    }

    let intersectionsCount = 0;

    // 4. Inspect each letter cell
    for (let i = 0; i < wordLen; i++) {
      const r = direction === 'across' ? startRow : startRow + i;
      const c = direction === 'across' ? startCol + i : startCol;
      const letter = normalizedWord[i];
      const existingCell = grid[r][c];

      if (existingCell !== null) {
        // Must match existing letter on intersection
        if (existingCell !== letter) {
          return false;
        }
        intersectionsCount++;
      } else {
        // If cell is empty, check perpendicular adjacent neighbors to prevent illegal word touching
        if (direction === 'across') {
          // Check above and below
          const above = r > 0 ? grid[r - 1][c] : null;
          const below = r < gridRows - 1 ? grid[r + 1][c] : null;
          if (above !== null || below !== null) {
            return false;
          }
        } else {
          // Check left and right
          const left = c > 0 ? grid[r][c - 1] : null;
          const right = c < gridCols - 1 ? grid[r][c + 1] : null;
          if (left !== null || right !== null) {
            return false;
          }
        }
      }
    }

    // If grid is not empty, word must intersect at least one placed word
    if (!isFirstWord && intersectionsCount === 0) {
      return false;
    }

    return true;
  }
}
