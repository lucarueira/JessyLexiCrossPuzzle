/**
 * JESSY LEXI CROSS PUZZLE - JESSY ASSISTANT MANAGER
 * Manages the virtual assistant Jessy, controlling character expressions,
 * preloading images, speech messages, transitions, and automatic state reverts.
 */

export const JESSY_STATES = {
  feliz: {
    key: 'feliz',
    candidates: ['img/imgfeliz.jpg.png', 'img/feliz.jpg.png', 'img/feliz.jpg', 'img/feliz.png'],
    img: 'img/imgfeliz.jpg.png',
    defaultMsg: 'Olá! Pronto para resolver algumas palavras?'
  },
  esperando: {
    key: 'esperando',
    candidates: ['img/esperando.jpg', 'img/esperando.jpg.png', 'img/esperando.png'],
    img: 'img/esperando.jpg',
    defaultMsg: 'Só um momento... estou preparando seu desafio!'
  },
  escrevendo: {
    key: 'escrevendo',
    candidates: ['img/escrevendo.jpg.png', 'img/escrevendo.jpg', 'img/escrevendo.png'],
    img: 'img/escrevendo.jpg.png',
    defaultMsg: 'Hmm... vamos descobrir essa palavra!'
  },
  pedindoAjuda: {
    key: 'pedindoAjuda',
    candidates: ['img/pedindo-ajuda.jpg.png', 'img/pedindo-ajuda.jpg', 'img/pedindo-ajuda.png'],
    img: 'img/pedindo-ajuda.jpg.png',
    defaultMsg: 'Precisa de uma ajudinha?'
  },
  ajudaUsada: {
    key: 'ajudaUsada',
    candidates: ['img/ajuda-usada.jpg.png', 'img/ajuda-usada.jpg', 'img/ajuda-usada.png', 'img/pedindo-ajuda.jpg.png'],
    img: 'img/pedindo-ajuda.jpg.png',
    defaultMsg: 'Pronto! Revelei uma letra para você.'
  },
  comemorando: {
    key: 'comemorando',
    candidates: ['img/comemorando.jpg.png', 'img/comemorando.jpg', 'img/comemorando.png'],
    img: 'img/comemorando.jpg.png',
    defaultMsg: 'PARABÉNS! Você conseguiu!'
  }
};

export class JessyManager {
  constructor() {
    this.currentState = 'feliz';
    this.preloadedImages = {};
    this.revertTimeout = null;
    this.subscribers = [];

    // Registered DOM targets (e.g. hub card, game card, modal card)
    this.targets = [];

    this.preloadAllImages();
  }

  /**
   * Preloads all character expression images with dynamic candidate fallback resolution
   */
  preloadAllImages() {
    Object.values(JESSY_STATES).forEach(state => {
      this.resolveImageCandidate(state);
    });
  }

  resolveImageCandidate(state) {
    const candidates = state.candidates || [state.img];
    let candidateIndex = 0;

    const tryNext = () => {
      if (candidateIndex >= candidates.length) return;
      const src = candidates[candidateIndex++];
      const img = new Image();
      img.onload = () => {
        state.img = src;
        this.preloadedImages[state.key] = img;
        if (this.currentState === state.key) {
          this.targets.forEach(target => {
            if (target.imgEl) target.imgEl.src = src;
          });
        }
      };
      img.onerror = () => {
        tryNext();
      };
      img.src = src;
    };

    tryNext();
  }

  /**
   * Registers DOM elements to be updated when Jessy changes state
   * @param {Object} target { imgEl: HTMLImageElement, textEl: HTMLElement }
   */
  registerTarget(target) {
    if (target && target.imgEl && target.textEl) {
      this.targets.push(target);
      // Immediately render current state on new target
      this.applyToTarget(target, JESSY_STATES[this.currentState].img, JESSY_STATES[this.currentState].defaultMsg);
    }
  }

  /**
   * Updates Jessy's current state with smooth transition and optional message override
   * @param {string} stateKey One of JESSY_STATES keys (feliz, esperando, escrevendo, pedindoAjuda, ajudaUsada, comemorando)
   * @param {string|null} customMsg Optional custom speech bubble message
   * @param {number} durationMs Optional duration in ms for temporary states (e.g. 3000ms for ajudaUsada)
   * @param {string} revertStateKey State to revert to after durationMs expires (default 'escrevendo')
   */
  setState(stateKey, customMsg = null, durationMs = 0, revertStateKey = 'escrevendo') {
    const config = JESSY_STATES[stateKey] || JESSY_STATES.feliz;
    this.currentState = stateKey;

    // Clear any existing revert timer
    if (this.revertTimeout) {
      clearTimeout(this.revertTimeout);
      this.revertTimeout = null;
    }

    const message = customMsg || config.defaultMsg;

    // Update registered DOM elements with smooth fade transition
    this.targets.forEach(target => {
      this.animateTransition(target, config.img, message);
    });

    // Notify external subscribers if any
    this.subscribers.forEach(cb => cb(this.currentState, message));

    // Handle temporary state auto-revert
    if (durationMs > 0) {
      this.revertTimeout = setTimeout(() => {
        this.setState(revertStateKey);
      }, durationMs);
    }
  }

  /**
   * Performs smooth fade-out / fade-in animation during image change
   */
  animateTransition(target, newImgSrc, newMsgText) {
    const { imgEl, textEl } = target;
    if (!imgEl || !textEl) return;

    imgEl.classList.add('fade-out');
    textEl.classList.add('fade-out');

    setTimeout(() => {
      imgEl.src = newImgSrc;
      textEl.innerText = newMsgText;

      imgEl.classList.remove('fade-out');
      textEl.classList.remove('fade-out');
      imgEl.classList.add('fade-in');
      textEl.classList.add('fade-in');

      setTimeout(() => {
        imgEl.classList.remove('fade-in');
        textEl.classList.remove('fade-in');
      }, 300);
    }, 150);
  }

  applyToTarget(target, imgSrc, msgText) {
    if (target.imgEl) target.imgEl.src = imgSrc;
    if (target.textEl) target.textEl.innerText = msgText;
  }

  /**
   * Helper method specifically formatted for hint request prompt
   * @param {number} hintsLeft Number of hints remaining
   */
  showPedindoAjuda(hintsLeft) {
    const msg = `Precisa de uma ajudinha?\n💡 Você ainda tem ${hintsLeft} ${hintsLeft === 1 ? 'dica' : 'dicas'}.`;
    this.setState('pedindoAjuda', msg);
  }

  /**
   * Helper method specifically formatted when hint is used
   */
  showAjudaUsada() {
    const msg = `Pronto! Revelei uma letra para você.\n-50 pontos`;
    this.setState('ajudaUsada', msg, 3000, 'escrevendo');
  }

  /**
   * Helper method when word is solved
   */
  showWordSolved() {
    this.setState('comemorando', 'Muito bem! Palavra correta!', 2500, 'escrevendo');
  }

  /**
   * Subscribe to state change notifications
   */
  subscribe(callback) {
    this.subscribers.push(callback);
  }
}
