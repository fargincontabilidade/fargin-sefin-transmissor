// Controles unificados: teclado (WASD/setas/E/Espaço/Enter/Esc) e toque
// (direcional virtual + botões). O resto do jogo só lê este objeto.
const DIR_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};
const ACTION_KEYS = { KeyE: 'a', Space: 'a', Enter: 'a', KeyZ: 'a', Escape: 'menu', KeyM: 'menu', Tab: 'menu', KeyX: 'b', Backspace: 'b' };

class Controls {
  constructor() {
    this.held = new Set(); // direções pressionadas (ordem = prioridade)
    this.order = [];
    this.pressed = new Set(); // ações pressionadas neste quadro
    this.run = false;
    this.touchDir = null;
    this.touchStrength = 0;
    this.enabled = true;
    this.listeners = new Set();
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => { this.held.clear(); this.order = []; this.run = false; });
  }

  onAction(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  // Ouvintes que retornam true "consomem" a ação (ex.: diálogo aberto),
  // evitando que o mundo também reaja à mesma tecla.
  emitAction(a) {
    let handled = false;
    for (const fn of [...this.listeners]) if (fn(a) === true) handled = true;
    if (!handled) this.pressed.add(a);
  }

  onKey(e, down) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.run = down; return; }
    const d = DIR_KEYS[e.code];
    if (d) {
      e.preventDefault();
      if (down) { if (!this.held.has(d)) { this.held.add(d); this.order.push(d); } }
      else { this.held.delete(d); this.order = this.order.filter((x) => x !== d); }
      if (down) this.emitAction(`dir:${d}`);
      return;
    }
    const a = ACTION_KEYS[e.code];
    if (a && down && !e.repeat) {
      if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      this.emitAction(a);
    }
  }

  // Direção atual (a última tecla pressionada tem prioridade)
  dir() {
    if (!this.enabled) return null;
    if (this.touchDir) return this.touchDir;
    return this.order.length ? this.order[this.order.length - 1] : null;
  }

  isRunning() { return this.run || this.touchStrength > 0.92; }

  consume(a) {
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return had;
  }

  endFrame() { this.pressed.clear(); }

  // ------------- Controles de toque -------------
  mountTouch(root) {
    const pad = document.createElement('div');
    pad.className = 'touch-pad';
    pad.innerHTML = '<div class="pad-base"><div class="pad-knob"></div></div>';
    const btns = document.createElement('div');
    btns.className = 'touch-buttons';
    btns.innerHTML = '<button class="tbtn tbtn-a" aria-label="Interagir">A</button><button class="tbtn tbtn-menu" aria-label="Menu">☰</button>';
    root.append(pad, btns);
    this.touchRoot = [pad, btns];

    const base = pad.querySelector('.pad-base');
    const knob = pad.querySelector('.pad-knob');
    let activeId = null;
    let cx = 0; let cy = 0;
    const R = 46;
    const update = (x, y) => {
      let dx = x - cx; let dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const k = dist > R ? R / dist : 1;
      dx *= k; dy *= k;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.touchStrength = Math.min(1, dist / R);
      if (dist < 12) { this.touchDir = null; return; }
      const prev = this.touchDir;
      this.touchDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (prev !== this.touchDir) this.emitAction(`dir:${this.touchDir}`);
    };
    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      activeId = t.identifier ?? 'mouse';
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      update(t.clientX, t.clientY);
      pad.classList.add('active');
      e.preventDefault();
    };
    const move = (e) => {
      if (activeId === null) return;
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      const t = list.find((tt) => (tt.identifier ?? 'mouse') === activeId);
      if (!t) return;
      update(t.clientX, t.clientY);
      e.preventDefault();
    };
    const end = (e) => {
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      if (!list.some((tt) => (tt.identifier ?? 'mouse') === activeId)) return;
      activeId = null; this.touchDir = null; this.touchStrength = 0;
      knob.style.transform = '';
      pad.classList.remove('active');
    };
    pad.addEventListener('touchstart', start, { passive: false });
    pad.addEventListener('touchmove', move, { passive: false });
    pad.addEventListener('touchend', end);
    pad.addEventListener('touchcancel', end);
    pad.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { start(e); const mm = (ev) => move(ev); const mu = (ev) => { end(ev); window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu); }; window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu); } });

    const press = (sel, action) => {
      const b = btns.querySelector(sel);
      const fire = (e) => { e.preventDefault(); b.classList.add('down'); this.emitAction(action); };
      b.addEventListener('touchstart', fire, { passive: false });
      b.addEventListener('touchend', () => b.classList.remove('down'));
      b.addEventListener('mousedown', fire);
      b.addEventListener('mouseup', () => b.classList.remove('down'));
    };
    press('.tbtn-a', 'a');
    press('.tbtn-menu', 'menu');
  }

  setTouchVisible(v) {
    if (!this.touchRoot) return;
    for (const el of this.touchRoot) el.style.display = v ? '' : 'none';
  }
}

export const controls = new Controls();

export function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
}
