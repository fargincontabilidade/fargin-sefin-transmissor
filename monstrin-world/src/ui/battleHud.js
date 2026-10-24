// Interface de batalha (HTML). Mostra as criaturas ativas e seus PV,
// ataques, itens, troca, captura e fuga. Treinadores não têm PV.
import { h } from './ui.js';
import { controls } from './controls.js';
import { sfx } from '../audio/sfx.js';
import { ELEMENTS, effectiveness } from '../data/elements.js';
import { getMove } from '../data/moves.js';
import { getSpecies } from '../data/species.js';
import { getItem, ITEMS } from '../data/items.js';
import { displayName, maxHp, xpForLevel, isFainted, canUseHealItem } from '../core/monstrin.js';
import { art } from '../art/registry.js';

function hpColor(r) { return r > 0.5 ? 'var(--hp-hi)' : r > 0.2 ? 'var(--hp-mid)' : 'var(--hp-lo)'; }

export class BattleHud {
  constructor(root) { this.root = root; this.keyOff = null; }

  open(battle, game) {
    this.battle = battle;
    this.game = game;
    this.top = h('div', { class: 'battle-top' });
    this.bottom = h('div', { class: 'battle-bottom' });
    this.logEl = h('div', { class: 'battle-log panel' }, '');
    this.menuEl = h('div', {});
    this.bottom.append(this.logEl, this.menuEl);
    this.enemyPanel = this.fighterPanel(1);
    this.playerPanel = this.fighterPanel(0);
    this.top.append(this.enemyPanel.el, this.playerPanel.el);
    this.root.append(this.top, this.bottom);
    for (const side of [0, 1]) {
      const m = battle.activeMon(side);
      if (m) this.setMon(side, m, m.hp, maxHp(m));
      else this.setMon(side, null);
    }
  }

  fighterPanel(side) {
    const el = h('div', { class: 'fighter panel' });
    const nm = h('span', { class: 'nm' });
    const badge = h('span', { class: 'badge' });
    const status = h('span', { class: 'status', style: { display: 'none' } }, 'QUEIMADO');
    const lv = h('span', { class: 'lv' });
    const hpBar = h('div', { class: 'bar hp big' }, h('i'));
    const hpn = h('div', { class: 'hpn' });
    const xpBar = side === 0 ? h('div', { class: 'bar xp', style: { marginTop: '5px' } }, h('i')) : null;
    el.append(h('div', { class: 'row' }, h('span', { style: { display: 'flex', gap: '6px', alignItems: 'center', minWidth: 0 } }, nm, badge, status), lv), hpBar, hpn);
    if (xpBar) el.append(xpBar);
    if (side === 0) el.style.alignSelf = 'flex-start';
    return { el, nm, badge, status, lv, hpBar, hpn, xpBar };
  }

  setMon(side, mon, hp, max) {
    const p = side === 0 ? this.playerPanel : this.enemyPanel;
    if (!mon) {
      p.nm.textContent = side === 0 ? 'Escolha um Monstrin' : 'Trocando de Monstrin...';
      p.badge.style.display = 'none';
      p.lv.textContent = '';
      p.hpBar.firstChild.style.width = '0%';
      p.hpn.textContent = '';
      p.status.style.display = 'none';
      return;
    }
    const sp = getSpecies(mon.speciesId);
    const el = ELEMENTS[sp.element];
    p.nm.textContent = displayName(mon);
    p.badge.style.display = '';
    p.badge.style.background = el.color;
    p.badge.textContent = window.innerWidth < 560 ? el.icon : `${el.icon} ${el.name}`;
    p.lv.textContent = `Nv.${mon.level}`;
    p.status.style.display = mon.status === 'burn' ? '' : 'none';
    this.setHp(side, hp ?? mon.hp, max ?? maxHp(mon));
    if (p.xpBar) this.setXp(mon);
    p.uid = mon.uid;
  }

  setHp(side, hp, max) {
    const p = side === 0 ? this.playerPanel : this.enemyPanel;
    const r = Math.max(0, hp) / max;
    const bar = p.hpBar.firstChild;
    bar.style.width = `${r * 100}%`;
    bar.style.background = hpColor(r);
    p.hpn.textContent = `${Math.max(0, hp)} / ${max} PV`;
  }

  setXp(mon, level, xp) {
    const p = this.playerPanel;
    if (!p.xpBar) return;
    const L = level ?? mon.level;
    const X = xp ?? mon.xp;
    const a = xpForLevel(L); const b = xpForLevel(L + 1);
    p.xpBar.firstChild.style.width = `${Math.min(100, ((X - a) / Math.max(1, b - a)) * 100)}%`;
    p.lv.textContent = `Nv.${L}`;
  }

  setStatus(side, status) {
    const p = side === 0 ? this.playerPanel : this.enemyPanel;
    p.status.style.display = status === 'burn' ? '' : 'none';
  }

  log(text, ms) {
    this.logEl.textContent = text;
    const dur = ms ?? Math.min(2200, 650 + text.length * 22);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; off(); this.logEl.removeEventListener('click', finish); resolve(); };
      const off = controls.onAction((a) => { if (a === 'a') { finish(); return true; } return false; });
      this.logEl.addEventListener('click', finish);
      setTimeout(finish, dur);
    });
  }

  // ---------------- Menus ----------------
  setButtons(buttons) {
    this.menuEl.innerHTML = '';
    this.focusables = [];
    const wrap = buttons.wrapClass ? h('div', { class: buttons.wrapClass }) : this.menuEl;
    for (const b of buttons.list) {
      wrap.append(b);
      if (!b.disabled) this.focusables.push(b);
    }
    if (wrap !== this.menuEl) this.menuEl.append(wrap);
    if (buttons.extra) this.menuEl.append(buttons.extra);
    this.focusIdx = 0;
    this.highlight();
  }

  highlight() {
    (this.focusables || []).forEach((b, i) => { b.style.outline = i === this.focusIdx && this.keyboardUsed ? '3px solid #fff' : ''; });
  }

  bindKeys(onBack) {
    if (this.keyOff) this.keyOff();
    this.keyOff = controls.onAction((a) => {
      if (!this.focusables || !this.focusables.length) return false;
      if (a.startsWith('dir:')) {
        this.keyboardUsed = true;
        const d = a.slice(4);
        const n = this.focusables.length;
        this.focusIdx = (this.focusIdx + (d === 'left' || d === 'up' ? n - 1 : 1)) % n;
        this.highlight();
        sfx.play('cursor');
        return true;
      }
      if (a === 'a') { this.focusables[this.focusIdx]?.click(); return true; }
      if ((a === 'b' || a === 'menu') && onBack) { onBack(); return true; }
      return true;
    });
  }

  clearMenu() {
    this.menuEl.innerHTML = '';
    this.focusables = [];
    if (this.keyOff) { this.keyOff(); this.keyOff = null; }
  }

  chooseAction() {
    return new Promise((resolve) => {
      const b = this.battle;
      const g = this.game;
      const active = b.activeMon(0);
      const wild = b.kind === 'wild';
      const done = (action) => { sfx.play('select'); this.clearMenu(); resolve(action); };
      const main = () => {
        const list = [];
        const btn = (ico, label, cls, onclick, disabled = false) => {
          const el = h('button', { class: `btn ${cls}`, onclick: () => { if (!disabled) onclick(); } }, h('span', { class: 'ico' }, ico), label);
          if (disabled) el.disabled = true;
          return el;
        };
        if (active) list.push(btn('⚔️', 'Atacar', 'red', moves));
        if (wild) {
          const seals = Object.values(ITEMS).filter((it) => it.category === 'captura' && g.count(it.id) > 0);
          const total = seals.reduce((s, it) => s + g.count(it.id), 0);
          list.push(btn('💠', `Capturar (${total})`, 'gold', () => { if (seals.length === 1) done({ type: 'capture', itemId: seals[0].id }); else captureMenu(seals); }, total === 0 || !active));
        }
        list.push(btn('🎒', 'Itens', 'ghost', itemsMenu));
        const canSwitch = b.healthyIndexes(0).some((i) => i !== b.sides[0].active);
        list.push(btn('🔄', active ? 'Trocar' : 'Convocar', active ? 'ghost' : 'green', switchMenu, !canSwitch));
        if (wild) list.push(btn('🏃', 'Fugir', 'ghost', () => done({ type: 'flee' })));
        else list.push(btn('🏳️', 'Render-se', 'ghost', async () => { done({ type: 'surrender' }); }));
        this.setButtons({ list, wrapClass: 'battle-actions' });
        this.bindKeys(null);
        this.logEl.textContent = active ? `O que ${displayName(active)} vai fazer?` : 'Escolha quem vai entrar na batalha!';
      };
      const back = () => { sfx.play('close'); main(); };
      const backBtn = () => h('div', { class: 'back-row' }, h('button', { class: 'btn ghost small', onclick: back }, '← Voltar'));
      const moves = () => {
        const foe = b.activeMon(1);
        const list = active.equippedMoves.map((id) => {
          const mv = getMove(id);
          const el = ELEMENTS[mv.element];
          let effTxt = '';
          if (foe && mv.category === 'dano') {
            const e = effectiveness(mv.element, getSpecies(foe.speciesId).element);
            if (e > 1) effTxt = '▲ Super'; else if (e < 1) effTxt = '▼ Fraco';
          }
          const sub = mv.category === 'dano' ? `Poder ${mv.power} · Precisão ${mv.accuracy}` : mv.category === 'cura' ? 'Cura' : 'Suporte';
          return h('button', { class: 'move-btn', style: { background: `linear-gradient(180deg, ${el.color}, ${el.dark})` }, onclick: () => done({ type: 'move', moveId: id }) },
            `${el.icon} ${mv.name}`, h('small', {}, sub), effTxt ? h('span', { class: 'eff' }, effTxt) : null);
        });
        this.setButtons({ list, wrapClass: 'move-grid', extra: backBtn() });
        this.bindKeys(back);
        this.logEl.textContent = 'Escolha um ataque.';
      };
      const captureMenu = (seals) => {
        const list = seals.map((it) => h('button', { class: 'btn ghost', onclick: () => done({ type: 'capture', itemId: it.id }) }, h('img', { src: art.itemUrl(it.id), style: { width: '30px' } }), `${it.name} ×${g.count(it.id)}`));
        this.setButtons({ list, wrapClass: 'move-grid', extra: backBtn() });
        this.bindKeys(back);
        this.logEl.textContent = 'Qual selo usar?';
      };
      const itemsMenu = () => {
        const items = Object.values(ITEMS).filter((it) => it.category === 'recuperacao' && g.count(it.id) > 0);
        if (!items.length) { this.logEl.textContent = 'Você não tem itens de recuperação.'; return; }
        const list = items.map((it) => h('button', { class: 'btn ghost', onclick: () => targetMenu(it) }, h('img', { src: art.itemUrl(it.id), style: { width: '30px' } }), `${it.name} ×${g.count(it.id)}`));
        this.setButtons({ list, wrapClass: 'move-grid', extra: backBtn() });
        this.bindKeys(back);
        this.logEl.textContent = 'Escolha um item.';
      };
      const targetMenu = (it) => {
        const list = b.sides[0].team.map((m) => {
          const ok = canUseHealItem(m, it.id).ok;
          const el = h('button', { class: 'btn ghost', onclick: () => { if (ok) done({ type: 'item', itemId: it.id, targetUid: m.uid }); } }, h('img', { src: art.monUrl(m.speciesId), style: { width: '34px' } }), `${displayName(m)} ${m.hp}/${maxHp(m)}`);
          if (!ok) el.disabled = true;
          return el;
        });
        this.setButtons({ list, wrapClass: 'move-grid', extra: backBtn() });
        this.bindKeys(itemsMenu);
        this.logEl.textContent = `Usar ${it.name} em qual Monstrin?`;
      };
      const switchMenu = () => {
        const list = b.sides[0].team.map((m, i) => {
          const disabled = isFainted(m) || i === b.sides[0].active;
          const el = h('button', { class: 'btn ghost', onclick: () => { if (!disabled) done({ type: 'switch', index: i }); } }, h('img', { src: art.monUrl(m.speciesId), style: { width: '34px' } }), `${displayName(m)} Nv.${m.level} · ${m.hp}/${maxHp(m)}`);
          if (disabled) el.disabled = true;
          return el;
        });
        this.setButtons({ list, wrapClass: 'move-grid', extra: active ? backBtn() : null });
        this.bindKeys(active ? back : null);
        this.logEl.textContent = active ? 'Trocar por qual Monstrin?' : 'Escolha quem vai entrar na batalha!';
      };
      if (b.mustSummon()) switchMenu();
      else main();
      void g;
    });
  }

  close() {
    this.clearMenu();
    this.top?.remove();
    this.bottom?.remove();
  }
}

export function itemName(id) { return getItem(id).name; }
