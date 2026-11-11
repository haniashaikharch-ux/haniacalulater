/**
 * Hania's Scientific Calculator - Application Logic
 * Supports comprehensive scientific operations, stateful memory, history,
 * Night Vision HUD mode, and Web Audio API synthesis.
 */

(() => {
  'use strict';

  // --- State ---
  const state = {
    currentInput: '0',
    expression: '',
    previewResult: '',
    memory: 0,
    angleMode: 'DEG', // 'DEG' or 'RAD'
    isShift: false,
    isHyp: false,
    isNightVision: false,
    soundEnabled: true,
    history: []
  };

  // --- DOM Elements ---
  const displayInput = document.getElementById('display-input');
  const displayExpr = document.getElementById('display-expression');
  const displayPreview = document.getElementById('display-preview');
  const angleBadge = document.getElementById('angle-mode-badge');
  const shiftBadge = document.getElementById('shift-badge');
  const hypBadge = document.getElementById('hyp-badge');
  const memoryBadge = document.getElementById('memory-badge');
  const nvHudTag = document.getElementById('nv-hud-tag');
  const angleBtnText = document.getElementById('angle-btn-text');

  const nvToggleBtn = document.getElementById('nv-toggle-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const historyToggleBtn = document.getElementById('history-toggle-btn');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const historyDrawer = document.getElementById('history-drawer');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const copyBtn = document.getElementById('copy-btn');
  const toast = document.getElementById('toast');

  // --- Web Audio Synthesizer (Zero external dependencies) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type = 'click') {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(state.isNightVision ? 880 : 620, now);
        osc.frequency.exponentialRampToValueAtTime(state.isNightVision ? 440 : 200, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'equals') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'nv-toggle') {
        // High-tech Night Vision power hum
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'clear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // --- Display Updates ---
  function updateDisplay() {
    displayInput.value = state.currentInput;
    displayExpr.textContent = state.expression;

    // Auto-scroll input to the right so latest digits are visible
    displayInput.scrollLeft = displayInput.scrollWidth;

    // Badges
    angleBadge.textContent = state.angleMode;
    angleBtnText.textContent = state.angleMode;

    if (state.isShift) {
      shiftBadge.classList.remove('badge-inactive');
    } else {
      shiftBadge.classList.add('badge-inactive');
    }

    if (state.isHyp) {
      hypBadge.classList.remove('badge-inactive');
    } else {
      hypBadge.classList.add('badge-inactive');
    }

    if (state.memory !== 0) {
      memoryBadge.classList.remove('badge-inactive');
    } else {
      memoryBadge.classList.add('badge-inactive');
    }

    // Live preview evaluation
    updateLivePreview();
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  // --- Mathematical Core & Scientific Parser ---
  function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // JS Number limit
    if (!Number.isInteger(n)) return gamma(n + 1); // Approximation for non-integers
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  // Lanczos approximation for Gamma function
  function gamma(z) {
    const g = 7;
    const C = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.138571095836524,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let base = C[0];
    for (let i = 1; i < g + 2; i++) {
      base += C[i] / (z + i);
    }
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * base;
  }

  // Trigonometry helpers with angle mode conversion
  function toRad(val) {
    return state.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
  }

  function fromRad(val) {
    return state.angleMode === 'DEG' ? (val * 180) / Math.PI : val;
  }

  // Parse and evaluate mathematical strings cleanly
  function evaluateExpression(exprStr) {
    if (!exprStr || exprStr.trim() === '') return 0;

    let parsed = exprStr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, `(${Math.PI})`)
      .replace(/\be\b/g, `(${Math.E})`);

    // Handle percentage (e.g., 50% -> (50*0.01))
    parsed = parsed.replace(/(\d+(\.\d+)?)%/g, '($1*0.01)');

    // Handle powers: a^b -> Math.pow(a, b)
    parsed = handlePowers(parsed);

    // Sanitize valid math tokens
    const validMathRegex = /^[0-9+\-*/().,MathPIEpowsqrtsincostanlogexpabs\s]+$/;
    if (!validMathRegex.test(parsed)) {
      throw new Error('Invalid Syntax');
    }

    // Safe Function evaluation
    const evaluator = new Function('Math', 'fact', `
      "use strict";
      return (${parsed});
    `);

    const result = evaluator(Math, factorial);

    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Math Error');
    }
    if (!isFinite(result)) {
      throw new Error('Division by zero');
    }

    // Format precision
    return formatResult(result);
  }

  function handlePowers(expr) {
    let powerIndex = expr.lastIndexOf('^');
    while (powerIndex !== -1) {
      // Find left operand
      let left = getLeftOperand(expr, powerIndex);
      // Find right operand
      let right = getRightOperand(expr, powerIndex);

      if (left && right) {
        const replacement = `Math.pow(${left.expr},${right.expr})`;
        expr = expr.substring(0, left.start) + replacement + expr.substring(right.end);
        powerIndex = expr.lastIndexOf('^');
      } else {
        break;
      }
    }
    return expr;
  }

  function getLeftOperand(expr, index) {
    let i = index - 1;
    while (i >= 0 && expr[i] === ' ') i--;
    if (i < 0) return null;

    if (expr[i] === ')') {
      let depth = 1;
      let end = i + 1;
      i--;
      while (i >= 0 && depth > 0) {
        if (expr[i] === ')') depth++;
        if (expr[i] === '(') depth--;
        i--;
      }
      return { start: i + 1, expr: expr.substring(i + 1, end) };
    } else {
      let end = i + 1;
      while (i >= 0 && /[0-9.a-zA-Z_]/.test(expr[i])) {
        i--;
      }
      return { start: i + 1, expr: expr.substring(i + 1, end) };
    }
  }

  function getRightOperand(expr, index) {
    let i = index + 1;
    while (i < expr.length && expr[i] === ' ') i++;
    if (i >= expr.length) return null;

    if (expr[i] === '(') {
      let depth = 1;
      let start = i;
      i++;
      while (i < expr.length && depth > 0) {
        if (expr[i] === '(') depth++;
        if (expr[i] === ')') depth--;
        i++;
      }
      return { end: i, expr: expr.substring(start, i) };
    } else {
      let start = i;
      if (expr[i] === '-' || expr[i] === '+') i++;
      while (i < expr.length && /[0-9.a-zA-Z_]/.test(expr[i])) {
        i++;
      }
      return { end: i, expr: expr.substring(start, i) };
    }
  }

  function formatResult(num) {
    if (Math.abs(num) < 1e-12 && num !== 0) {
      return num.toExponential(8);
    }
    if (Math.abs(num) >= 1e14) {
      return num.toExponential(8);
    }
    // Round to max 10 decimal digits to eliminate floating point 0.0000000000000004
    const rounded = Math.round(num * 1e10) / 1e10;
    return rounded.toString();
  }

  function updateLivePreview() {
    if (!state.expression && state.currentInput === '0') {
      displayPreview.textContent = '';
      return;
    }

    try {
      let fullExpr = state.expression + (state.currentInput !== '0' ? state.currentInput : '');
      if (!fullExpr || /[+\-×÷^(\[]$/.test(fullExpr.trim())) {
        displayPreview.textContent = '';
        return;
      }
      const val = evaluateExpression(fullExpr);
      displayPreview.textContent = `= ${val}`;
    } catch {
      displayPreview.textContent = '';
    }
  }

  // --- Input Handlers ---
  function inputDigit(digit) {
    playSound('click');
    if (state.currentInput === '0' || state.currentInput === 'Error') {
      state.currentInput = digit;
    } else {
      state.currentInput += digit;
    }
    updateDisplay();
  }

  function inputDecimal() {
    playSound('click');
    if (state.currentInput === 'Error') state.currentInput = '0';
    if (!state.currentInput.includes('.')) {
      state.currentInput += '.';
    }
    updateDisplay();
  }

  function inputOperator(op) {
    playSound('click');
    if (state.currentInput === 'Error') state.currentInput = '0';

    if (state.currentInput !== '') {
      state.expression += ` ${state.currentInput} ${op} `;
      state.currentInput = '0';
    } else if (state.expression !== '') {
      // Replace trailing operator
      state.expression = state.expression.trim().replace(/[+\-×÷%^]$/, op) + ' ';
    }
    updateDisplay();
  }

  function insertToken(token) {
    playSound('click');
    if (state.currentInput === '0' || state.currentInput === 'Error') {
      state.currentInput = token;
    } else {
      state.currentInput += token;
    }
    updateDisplay();
  }

  function toggleSign() {
    playSound('click');
    if (state.currentInput === '0' || state.currentInput === 'Error') return;
    if (state.currentInput.startsWith('-')) {
      state.currentInput = state.currentInput.substring(1);
    } else {
      state.currentInput = '-' + state.currentInput;
    }
    updateDisplay();
  }

  function backspace() {
    playSound('click');
    if (state.currentInput === 'Error') {
      state.currentInput = '0';
    } else if (state.currentInput.length > 1) {
      state.currentInput = state.currentInput.slice(0, -1);
    } else {
      state.currentInput = '0';
    }
    updateDisplay();
  }

  function clearAll() {
    playSound('clear');
    state.currentInput = '0';
    state.expression = '';
    state.previewResult = '';
    displayPreview.textContent = '';
    updateDisplay();
  }

  // Apply single-operand scientific function immediately to currentInput
  function applyFunction(funcName) {
    playSound('click');
    let val = parseFloat(state.currentInput);
    if (isNaN(val)) val = 0;
    let res = 0;

    const useShift = state.isShift;
    const useHyp = state.isHyp;

    try {
      switch (funcName) {
        case 'sin':
          if (useHyp) {
            res = useShift ? Math.asinh(val) : Math.sinh(val);
          } else if (useShift) {
            if (val < -1 || val > 1) throw new Error('Domain Error');
            res = fromRad(Math.asin(val));
          } else {
            res = Math.sin(toRad(val));
          }
          break;

        case 'cos':
          if (useHyp) {
            res = useShift ? Math.acosh(val) : Math.cosh(val);
          } else if (useShift) {
            if (val < -1 || val > 1) throw new Error('Domain Error');
            res = fromRad(Math.acos(val));
          } else {
            res = Math.cos(toRad(val));
          }
          break;

        case 'tan':
          if (useHyp) {
            res = useShift ? Math.atanh(val) : Math.tanh(val);
          } else if (useShift) {
            res = fromRad(Math.atan(val));
          } else {
            res = Math.tan(toRad(val));
          }
          break;

        case 'ln':
          if (useShift) {
            res = Math.exp(val); // e^x
          } else {
            if (val <= 0) throw new Error('Domain Error');
            res = Math.log(val);
          }
          break;

        case 'log':
          if (useShift) {
            res = Math.pow(10, val); // 10^x
          } else {
            if (val <= 0) throw new Error('Domain Error');
            res = Math.log10(val);
          }
          break;

        case 'sqrt':
          if (useShift) {
            res = Math.cbrt(val); // cube root
          } else {
            if (val < 0) throw new Error('Domain Error');
            res = Math.sqrt(val);
          }
          break;

        case 'sqr':
          if (useShift) {
            res = Math.pow(val, 3); // x^3
          } else {
            res = Math.pow(val, 2); // x^2
          }
          break;

        case 'fact':
          if (val < 0) throw new Error('Domain Error');
          res = factorial(val);
          break;

        case 'inv':
          if (val === 0) throw new Error('Cannot divide by zero');
          res = 1 / val;
          break;

        default:
          return;
      }

      state.currentInput = formatResult(res);
      // Reset temporary Shift mode after operation
      if (state.isShift) {
        state.isShift = false;
        updateShiftKeyLabels();
      }
    } catch (err) {
      state.currentInput = err.message || 'Error';
    }

    updateDisplay();
  }

  // Calculate Expression
  function calculate() {
    playSound('equals');
    try {
      const fullExpr = state.expression + state.currentInput;
      if (!fullExpr || fullExpr.trim() === '') return;

      const result = evaluateExpression(fullExpr);

      // Save to History
      addHistoryItem(fullExpr, result);

      state.expression = `${fullExpr} =`;
      state.currentInput = result.toString();
      displayPreview.textContent = '';
    } catch (err) {
      state.currentInput = err.message || 'Error';
    }
    updateDisplay();
  }

  // --- Memory Operations ---
  function memClear() {
    playSound('click');
    state.memory = 0;
    showToast('Memory Cleared (0)');
    updateDisplay();
  }

  function memRecall() {
    playSound('click');
    state.currentInput = formatResult(state.memory);
    showToast(`Memory Recalled (${state.memory})`);
    updateDisplay();
  }

  function memAdd() {
    playSound('click');
    const val = parseFloat(state.currentInput) || 0;
    state.memory += val;
    showToast(`Memory: ${formatResult(state.memory)}`);
    updateDisplay();
  }

  // --- Angle & Shift Modifiers ---
  function toggleAngleMode() {
    playSound('click');
    state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
    showToast(`Angle Mode: ${state.angleMode}`);
    updateDisplay();
  }

  function toggleShift() {
    playSound('click');
    state.isShift = !state.isShift;
    updateShiftKeyLabels();
    updateDisplay();
  }

  function toggleHyp() {
    playSound('click');
    state.isHyp = !state.isHyp;
    showToast(`Hyperbolic: ${state.isHyp ? 'ON' : 'OFF'}`);
    updateDisplay();
  }

  function updateShiftKeyLabels() {
    const shiftKeys = document.querySelectorAll('[data-shift-func]');
    shiftKeys.forEach(btn => {
      const primary = btn.querySelector('.primary-label');
      const sub = btn.querySelector('.sub-label');
      if (!primary || !sub) return;

      if (state.isShift) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const shiftBtn = document.querySelector('.key-shift');
    if (shiftBtn) {
      if (state.isShift) shiftBtn.classList.add('active');
      else shiftBtn.classList.remove('active');
    }
  }

  // --- Night Vision Mode Toggle ---
  function toggleNightVision() {
    state.isNightVision = !state.isNightVision;
    playSound('nv-toggle');

    if (state.isNightVision) {
      document.body.classList.remove('theme-standard');
      document.body.classList.add('theme-night-vision');
      nvHudTag.textContent = 'NVG: ACTIVE [NV-G9]';
      showToast('Night Vision Activated 🌙');
    } else {
      document.body.classList.remove('theme-night-vision');
      document.body.classList.add('theme-standard');
      nvHudTag.textContent = 'NVG: OFF';
      showToast('Standard High-Contrast Mode ☀️');
    }

    localStorage.setItem('hania_calc_nv', state.isNightVision ? '1' : '0');
  }

  // --- Sound FX Toggle ---
  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    showToast(`Sound FX ${state.soundEnabled ? 'Enabled' : 'Muted'}`);
  }

  // --- History Drawer & Storage ---
  function addHistoryItem(expr, res) {
    const item = { expr, res, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    state.history.unshift(item);
    if (state.history.length > 30) state.history.pop();
    renderHistory();
    try {
      localStorage.setItem('hania_calc_history', JSON.stringify(state.history));
    } catch {}
  }

  function renderHistory() {
    if (!historyList) return;
    if (state.history.length === 0) {
      historyList.innerHTML = '<p class="empty-history">No calculations recorded yet.</p>';
      return;
    }

    historyList.innerHTML = state.history.map((item, idx) => `
      <div class="history-item" data-index="${idx}" title="Click to insert result">
        <div class="history-expr">${escapeHtml(item.expr)} =</div>
        <div class="history-result">${escapeHtml(item.res.toString())}</div>
      </div>
    `).join('');

    // Attach click listeners to reload items
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        playSound('click');
        const idx = el.getAttribute('data-index');
        const hist = state.history[idx];
        if (hist) {
          state.currentInput = hist.res.toString();
          state.expression = '';
          updateDisplay();
          showToast(`Loaded: ${hist.res}`);
        }
      });
    });
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  function clearHistory() {
    playSound('clear');
    state.history = [];
    localStorage.removeItem('hania_calc_history');
    renderHistory();
    showToast('History Cleared');
  }

  // --- Copy to Clipboard ---
  function copyResult() {
    playSound('click');
    const textToCopy = state.currentInput;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Copied "${textToCopy}" to clipboard!`);
      }).catch(() => {
        fallbackCopy(textToCopy);
      });
    } else {
      fallbackCopy(textToCopy);
    }
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`Copied "${text}" to clipboard!`);
  }

  // --- Event Bindings ---
  function setupEventListeners() {
    // Button Clicks
    document.querySelector('.keypad-container').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const num = btn.dataset.num;
      const op = btn.dataset.op;
      const insert = btn.dataset.insert;
      const action = btn.dataset.action;
      const func = btn.dataset.func;

      if (num !== undefined) {
        inputDigit(num);
      } else if (op !== undefined) {
        inputOperator(op);
      } else if (insert !== undefined) {
        if (insert === '.') inputDecimal();
        else insertToken(insert);
      } else if (func !== undefined) {
        applyFunction(func);
      } else if (action !== undefined) {
        switch (action) {
          case 'calculate': calculate(); break;
          case 'clear-all': clearAll(); break;
          case 'backspace': backspace(); break;
          case 'toggle-sign': toggleSign(); break;
          case 'toggle-shift': toggleShift(); break;
          case 'toggle-angle': toggleAngleMode(); break;
          case 'toggle-hyp': toggleHyp(); break;
          case 'mem-clear': memClear(); break;
          case 'mem-recall': memRecall(); break;
          case 'mem-add': memAdd(); break;
        }
      }
    });

    // Header Controls
    nvToggleBtn.addEventListener('click', toggleNightVision);
    soundToggleBtn.addEventListener('click', toggleSound);

    historyToggleBtn.addEventListener('click', () => {
      playSound('click');
      historyDrawer.classList.toggle('active');
    });

    closeHistoryBtn.addEventListener('click', () => {
      playSound('click');
      historyDrawer.classList.remove('active');
    });

    clearHistoryBtn.addEventListener('click', clearHistory);
    copyBtn.addEventListener('click', copyResult);

    // Keyboard support
    window.addEventListener('keydown', handleKeyboardInput);
  }

  function handleKeyboardInput(e) {
    if (e.target.tagName === 'INPUT' && e.target.id !== 'display-input') return;

    const key = e.key;

    if (/[0-9]/.test(key)) {
      e.preventDefault();
      inputDigit(key);
    } else if (key === '.') {
      e.preventDefault();
      inputDecimal();
    } else if (key === '+' || key === '-') {
      e.preventDefault();
      inputOperator(key === '-' ? '−' : '+');
    } else if (key === '*') {
      e.preventDefault();
      inputOperator('×');
    } else if (key === '/') {
      e.preventDefault();
      inputOperator('÷');
    } else if (key === '^') {
      e.preventDefault();
      inputOperator('^');
    } else if (key === '%' || key === '(' || key === ')') {
      e.preventDefault();
      insertToken(key);
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calculate();
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (key === 'Escape') {
      e.preventDefault();
      clearAll();
    }
  }

  // --- Initializer ---
  function init() {
    // Restore Saved NV Preference
    const savedNV = localStorage.getItem('hania_calc_nv');
    if (savedNV === '1') {
      state.isNightVision = true;
      document.body.classList.remove('theme-standard');
      document.body.classList.add('theme-night-vision');
      nvHudTag.textContent = 'NVG: ACTIVE [NV-G9]';
    }

    // Restore History
    try {
      const savedHist = localStorage.getItem('hania_calc_history');
      if (savedHist) {
        state.history = JSON.parse(savedHist);
      }
    } catch {}

    renderHistory();
    setupEventListeners();
    updateDisplay();
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
