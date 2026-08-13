/**
 * Helper utility functions for Jessy Lexi Cross Puzzle
 */

/**
 * Normalizes text: converts to uppercase, strips accents/diacritics, removes non-alphabetic chars
 * @param {string} str 
 * @returns {string}
 */
export function normalizeString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Formats elapsed seconds into mm:ss display (e.g., 522 -> "08:42")
 * @param {number} totalSeconds 
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(remainingSecs)}`;
}

/**
 * Generates a unique puzzle ID like "puzzle_20260812_482"
 * @returns {string}
 */
export function generateId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `puzzle_${dateStr}_${rand}`;
}

/**
 * Fisher-Yates array shuffle (in-place clone)
 * @param {Array} arr 
 * @returns {Array}
 */
export function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Displays a non-intrusive floating toast message
 * @param {string} message 
 * @param {'success'|'info'|'warning'|'error'} type 
 * @param {number} durationMs 
 */
export function showToast(message, type = 'info', durationMs = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-toast-in`;
  toast.innerHTML = `
    <span class="toast-icon">
      ${type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}
    </span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('animate-toast-in');
    toast.classList.add('animate-toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, durationMs);
}
