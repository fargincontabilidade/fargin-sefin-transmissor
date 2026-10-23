// Gerenciador da interface (HTML sobre o jogo): diálogos, avisos, telas.
import { controls } from './controls.js';
import { sfx } from '../audio/sfx.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

class UI {
  constructor() {
    this.root = document.getElementById('ui');
    this.stack = []; // telas abertas
    this.dialogOpen = false;
    this.toastBox = h('div', { class: 'toasts passthrough' });
    this.fadeEl = h('div', { class: 'fade' });
    this.root.append(this.toastBox, this.fadeEl);
    this.settings = { textSpeed: 'normal' };
    controls.onAction((a) => {
      if (a === 'menu' && this.stack.length) {
        const top = this.stack[this.stack.length - 1];
        if (top.closable !== false) { this.closeTop(); return true; }
      }
      return this.isBlocking() && (a === 'a' || a === 'menu' || a === 'b');
    });
  }

  isBlocking() { return this.dialogOpen || this.stack.length > 0 || !!this.blockingFlag; }

  // ---------------- Diálogo ----------------
  say(text, opts = {}) {
    return new Promise((resolve) => {
      this.dialogOpen = true;
      const box = h('div', { class: 'dialog panel' });
      if (opts.name) box.append(h('div', { class: 'name' }, opts.name));
      if (opts.portrait) box.append(h('img', { class: `portrait ${opts.mon ? 'mon' : ''}`, src: opts.portrait, alt: '' }));
      const txt = h('div', { class: 'text' });
      const next = h('div', { class: 'next' }, '▼');
      next.style.visibility = 'hidden';
      box.append(txt, next);
      this.root.append(box);
      controls.setTouchVisible(false);
      const speed = this.settings.textSpeed === 'fast' ? 8 : 22;
      let i = 0;
      let done = false;
      const full = String(text);
      const timer = setInterval(() => {
        i += 1;
        txt.textContent = full.slice(0, i);
        if (i % 3 === 0) sfx.play('blip');
        if (i >= full.length) finishTyping();
      }, speed);
      const finishTyping = () => {
        clearInterval(timer);
        txt.textContent = full;
        done = true;
        next.style.visibility = 'visible';
      };
      const advance = () => {
        if (!done) { finishTyping(); return; }
        cleanup();
        resolve();
      };
      const off = controls.onAction((a) => { if (a === 'a' || a === 'b') { advance(); return true; } return false; });
      box.addEventListener('click', advance);
      const cleanup = () => {
        off();
        box.remove();
        this.dialogOpen = false;
        if (!this.stack.length) controls.setTouchVisible(this.touchVisible);
      };
    });
  }

  async ask(text, options, opts = {}) {
    // mostra o texto e depois as opções
    return new Promise((resolve) => {
      this.dialogOpen = true;
      const box = h('div', { class: 'dialog panel' });
      if (opts.name) box.append(h('div', { class: 'name' }, opts.name));
      if (opts.portrait) box.append(h('img', { class: 'portrait', src: opts.portrait, alt: '' }));
      box.append(h('div', { class: 'text' }, text));
      const ch = h('div', { class: 'choices' });
      let sel = 0;
      const btns = options.map((o, idx) => h('button', { class: `btn ${idx === 0 ? 'gold' : 'ghost'}`, onclick: (e) => { e.stopPropagation(); pick(idx); } }, o));
      ch.append(...btns);
      this.root.append(box, ch);
      controls.setTouchVisible(false);
      const highlight = () => btns.forEach((b, k) => { b.className = `btn ${k === sel ? 'gold' : 'ghost'}`; });
      const off = controls.onAction((a) => {
        if (a === 'dir:up') { sel = (sel + options.length - 1) % options.length; highlight(); sfx.play('cursor'); }
        if (a === 'dir:down') { sel = (sel + 1) % options.length; highlight(); sfx.play('cursor'); }
        if (a === 'a') pick(sel);
        if (a === 'b') pick(options.length - 1);
        return true;
      });
      const pick = (idx) => {
        off(); box.remove(); ch.remove();
        this.dialogOpen = false;
        if (!this.stack.length) controls.setTouchVisible(this.touchVisible);
        sfx.play('select');
        resolve(idx);
      };
    });
  }

  // Caixa de texto (substitui o prompt() do navegador)
  input(title, value = '', { maxLength = 14, placeholder = '' } = {}) {
    return new Promise((resolve) => {
      let result = null;
      this.openScreen(title, (body, entry) => {
        const inp = h('input', { class: 'text-input', maxlength: maxLength, placeholder, value, autocomplete: 'off' });
        const ok = () => { result = inp.value; this.close(entry); };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
        body.append(inp, h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
          h('button', { class: 'btn ghost', onclick: () => this.close(entry) }, 'Cancelar'),
          h('button', { class: 'btn gold', onclick: ok }, 'Confirmar')));
        setTimeout(() => { try { inp.focus(); } catch { /* ignora */ } }, 50);
      }, { onClose: () => resolve(result) });
    });
  }

  // ---------------- Avisos ----------------
  toast(text, icon) {
    const t = h('div', { class: 'toast panel' }, icon ? h('img', { src: icon, alt: '' }) : null, h('span', {}, text));
    this.toastBox.append(t);
    setTimeout(() => t.remove(), 3500);
  }

  banner(title, sub) {
    const b = h('div', { class: 'banner panel passthrough' }, title, sub ? h('small', {}, sub) : null);
    this.root.append(b);
    setTimeout(() => b.remove(), 2700);
  }

  flash() {
    const f = h('div', { class: 'flash' });
    this.root.append(f);
    setTimeout(() => f.remove(), 520);
  }

  fade(on) {
    return new Promise((r) => {
      this.fadeEl.classList.toggle('on', on);
      setTimeout(r, 300);
    });
  }

  // ---------------- Telas ----------------
  openScreen(title, buildBody, opts = {}) {
    const screen = h('div', { class: 'screen' });
    const sheet = h('div', { class: 'sheet panel' });
    const head = h('div', { class: 'sheet-head' }, h('h2', {}, title));
    const entry = { el: screen, closable: opts.closable !== false, onClose: opts.onClose };
    if (opts.closable !== false) head.append(h('button', { class: 'close', 'aria-label': 'Fechar', onclick: () => this.close(entry) }, '✕'));
    const body = h('div', { class: 'sheet-body' });
    sheet.append(head, body);
    screen.append(sheet);
    if (opts.closable !== false) screen.addEventListener('click', (e) => { if (e.target === screen) this.close(entry); });
    this.root.append(screen);
    this.stack.push(entry);
    controls.setTouchVisible(false);
    entry.body = body;
    entry.setTitle = (t) => { head.querySelector('h2').textContent = t; };
    entry.render = () => { body.innerHTML = ''; buildBody(body, entry); };
    entry.render();
    sfx.play('open');
    return entry;
  }

  close(entry) {
    const i = this.stack.indexOf(entry);
    if (i < 0) return;
    this.stack.splice(i, 1);
    entry.el.remove();
    if (entry.onClose) entry.onClose();
    if (!this.stack.length && !this.dialogOpen) controls.setTouchVisible(this.touchVisible);
    sfx.play('close');
  }

  closeTop() { if (this.stack.length) this.close(this.stack[this.stack.length - 1]); }
  closeAll() { while (this.stack.length) this.closeTop(); }

  setTouchVisible(v) {
    this.touchVisible = v;
    if (!this.isBlocking()) controls.setTouchVisible(v);
  }
}

export let ui = null;
export function initUI() {
  ui = new UI();
  return ui;
}
