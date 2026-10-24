// Tela de duelo da aventura (Regulamento de Duelos v1.0).
// Todas as regras ficam em engine.js; esta tela só permite escolher ações
// válidas, mostra o que foi escolhido e anima os eventos devolvidos pelo motor.
import { h, ui } from '../ui/ui.js';
import { controls } from '../ui/controls.js';
import { sfx } from '../audio/sfx.js';
import { art, lookFor } from '../art/registry.js';
import { ELEMENTS } from '../data/elements.js';
import { RULES } from './rules.js';
import { DUEL_CARDS } from './cards.js';
import { Duel, CONDITION_NAMES, DUEL_ITEMS } from './engine.js';
import { aiSetup, aiPlan, aiReplacement } from './ai.js';
import { cardMini, cardZoom, COND_ICON } from './cardView.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const elc = (id) => (ELEMENTS[id] || ELEMENTS.neutro).color;
const WIDE = () => window.innerWidth >= 980 && window.innerHeight >= 600;

/**
 * Abre um duelo e devolve o resultado quando terminar.
 * @param {object} o
 * @param {string} o.playerName
 * @param {string[]} o.playerDeck  15 ids de cartas
 * @param {object} o.duelist      adversário (src/data/duelists.js)
 * @param {number} o.tonics       tônicos disponíveis no inventário (itens PvE)
 * @param {function} [o.rng]
 */
export function runDuel(o) {
  return new Promise((resolve) => new DuelScreen(o, resolve).start());
}

export class DuelScreen {
  constructor(o, resolve) {
    this.o = o;
    this.resolve = resolve;
    this.duel = new Duel({
      decks: [o.playerDeck, o.duelist.deck],
      names: [o.playerName || 'Você', o.duelist.name],
      rng: o.rng,
      config: { itemsEnabled: true },
    });
    this.tonics = o.tonics || 0;
    this.itemsUsed = 0;
    this.phase = 'setup';
    this.setupSel = { main: null, secs: [] };
    this.plan = this.emptyPlan();
    this.pending = null;
    this.focusIid = null;
    this.log = [];
    this.speed = 1;
    try { this.speed = localStorage.getItem('mw-duel-speed') === 'fast' ? 0.5 : 1; } catch { /* ignora */ }
  }

  emptyPlan() { return { action: null, free: { place: [], replace: null } }; }
  t(ms) { return wait(ms * this.speed); }

  // ---------------- Montagem ----------------
  start() {
    window.__duel = this;
    ui.blockingFlag = true;
    controls.setTouchVisible(false);
    this.keyOff = controls.onAction((a) => {
      if (a === 'menu' || a === 'b') { this.closeSheet(); this.cancelPending(); }
      return true; // nenhuma tecla move o personagem durante o duelo
    });
    this.prevMusic = sfx.track;
    sfx.music('battle');
    sfx.play('encounter');
    this.root = h('div', { class: 'dz' });
    this.board = h('div', { class: 'dz-board' });
    this.side = h('aside', { class: 'dz-side' });
    this.planBar = h('div', { class: 'dz-plan' });
    this.fx = h('div', { class: 'dz-fx' });
    this.root.append(this.board, this.side, this.planBar, this.fx);
    document.getElementById('ui').append(this.root);
    this.onResize = () => this.render();
    window.addEventListener('resize', this.onResize);
    this.dm = this.snapshot();
    this.render();
    this.banner(`${this.o.duelist.name} desafia você para um duelo!`, 1400);
  }

  finish(result) {
    window.removeEventListener('resize', this.onResize);
    this.keyOff?.();
    this.root.remove();
    ui.blockingFlag = false;
    ui.setTouchVisible(ui.touchVisible);
    sfx.music(this.prevMusic || 'village');
    window.__duel = null;
    this.resolve(result);
  }

  // ---------------- Modelo de exibição ----------------
  pub(c) {
    if (!c) return null;
    return { iid: c.iid, cardId: c.cardId, hp: c.hp, maxHp: c.maxHp, conditions: c.conditions.map((x) => ({ ...x })), shields: c.shields.map((x) => ({ ...x })), usedOnce: { ...c.usedOnce }, enteredRound: c.enteredRound };
  }

  snapshot() {
    const d = this.duel;
    const all = d.players.flatMap((p) => [p.main, ...p.secs, ...p.hand, ...p.grave, ...p.deck]).filter(Boolean);
    return {
      round: d.round,
      players: d.players.map((p) => ({ name: p.name, ed: p.ed, kos: p.kos, itemUses: p.itemUses, main: this.pub(p.main), secs: p.secs.map((s) => this.pub(s)), hand: p.hand.map((c) => this.pub(c)), deck: p.deck.length, grave: p.grave.map((c) => this.pub(c)) })),
      cards: new Map(all.map((c) => [c.iid, this.pub(c)])),
    };
  }

  dmCard(iid) {
    for (const p of this.dm.players) for (const c of [p.main, ...p.secs, ...p.hand]) if (c && c.iid === iid) return c;
    return this.dm.cards.get(iid);
  }

  nameOf(iid) { const c = this.dmCard(iid) || this.duel.find(iid); return c ? DUEL_CARDS[c.cardId].name : '?'; }

  // Onde está uma carta minha (no estado real do motor)
  where(iid) {
    const me = this.duel.players[0];
    if (me.main && me.main.iid === iid) return { zone: 'main' };
    const s = me.secs.findIndex((x) => x && x.iid === iid);
    if (s >= 0) return { zone: 'sec', slot: s };
    if (me.hand.some((x) => x.iid === iid)) return { zone: 'hand' };
    if (me.grave.some((x) => x.iid === iid)) return { zone: 'grave' };
    return { zone: 'opp' };
  }

  // ---------------- Renderização ----------------
  render() {
    const dm = this.dm;
    const [me, opp] = dm.players;
    const wide = WIDE();
    this.root.classList.toggle('wide', wide);

    // marcações do plano (apenas as MINHAS escolhas)
    const marks = this.planMarks();

    const slot = (p, side, i) => {
      const c = p.secs[i];
      const ghost = side === 0 && this.phase === 'planning' && this.plan.free.place.find((x) => x.slot === i);
      const setupGhost = side === 0 && this.phase === 'setup' && this.setupSel.secs[i];
      const drop = side === 0 ? `sec${i}` : null;
      if (c) return h('div', { class: 'dz-slot sec', 'data-drop': drop }, this.mini(c, side, marks, 'field sec'), h('span', { class: 'dz-slot-lbl' }, `Secundário ${i + 1}`));
      if (ghost || setupGhost) {
        const iid = ghost ? ghost.iid : setupGhost;
        return h('div', { class: 'dz-slot sec', 'data-drop': drop }, this.mini(this.dmCard(iid), side, marks, 'field sec incoming', ghost ? 'Entra nesta rodada' : 'Secundário'), h('span', { class: 'dz-slot-lbl' }, `Secundário ${i + 1}`));
      }
      return h('div', { class: 'dz-slot sec empty', 'data-drop': drop }, h('span', { class: 'dz-empty' }, side === 0 ? 'Vaga livre' : 'Vazio'), h('span', { class: 'dz-slot-lbl' }, `Secundário ${i + 1}`));
    };
    const mainSlot = (p, side) => {
      let c = p.main;
      let extraCls = '';
      let badge = null;
      if (side === 0 && this.phase === 'setup' && this.setupSel.main) { c = this.dmCard(this.setupSel.main); extraCls = 'incoming'; badge = 'Principal'; }
      return h('div', { class: 'dz-slot main', 'data-drop': side === 0 ? 'main' : null },
        c ? this.mini(c, side, marks, `field main ${extraCls}`, badge) : h('span', { class: 'dz-empty' }, side === 0 && this.phase === 'setup' ? 'Escolha o principal' : 'Sem principal'),
        h('span', { class: 'dz-slot-lbl main' }, 'Principal'));
    };
    const field = (p, side) => h('div', { class: `dz-field ${side === 0 ? 'me' : 'opp'}` }, slot(p, side, 0), mainSlot(p, side), slot(p, side, 1));

    const info = (p, side) => {
      const look = side === 0 ? lookFor(this.o.look ?? 0) : lookFor(this.o.duelist.look);
      return h('div', { class: `dz-info ${side === 0 ? 'me' : 'opp'}` },
        h('img', { class: 'dz-avatar', src: art.lookUrl(look), alt: '' }),
        h('span', { class: 'dz-who' }, side === 0 ? (this.o.playerName || 'Você') : p.name),
        h('span', { class: 'dz-kos', title: 'KOs feitos' }, Array.from({ length: RULES.KOS_TO_WIN }, (_, i) => h('i', { class: i < p.kos ? 'on' : '' })), h('small', {}, `${p.kos}/5 KOs`)),
        h('span', { class: 'dz-ed', title: 'Energia de Duelo' }, Array.from({ length: RULES.ED_MAX }, (_, i) => h('i', { class: i < p.ed ? 'on' : '' })), h('small', {}, `${p.ed} ED`)),
        h('span', { class: 'dz-sp' }),
        side === 0 && this.phase === 'planning' ? h('button', { class: `dz-pill btn-l ${this.pending?.kind === 'item' || this.plan.action?.type === 'item' ? 'on' : ''}`, type: 'button', onclick: () => (this.plan.action?.type === 'item' ? (this.plan.action = null, this.render()) : this.useItem()), title: 'Tônico de Duelo: cura 30 PV, usa a ação da rodada' }, `🧪 Tônico ${Math.max(0, Math.min(this.tonics - this.itemsUsed, RULES.ITEM_USES_PVE - p.itemUses))}`) : null,
        side === 1 ? h('span', { class: 'dz-backs', title: 'Cartas na mão do adversário' }, `🂠 ${p.hand.length}`) : null,
        h('span', { class: 'dz-pill', title: 'Cartas no deck' }, `Deck ${p.deck}`),
        h('button', { class: 'dz-pill btn-l', type: 'button', onclick: () => this.showGrave(side) }, `⚰ ${p.grave.length}`),
        side === 1 ? h('button', { class: 'dz-pill btn-l', type: 'button', onclick: () => this.showLog() }, '📜 Histórico') : null,
        side === 1 ? h('button', { class: 'dz-pill btn-l', type: 'button', onclick: () => this.toggleSpeed(), title: 'Velocidade das animações' }, this.speed < 1 ? '⏩ Rápido' : '▶ Normal') : null,
        side === 1 ? h('button', { class: 'dz-pill btn-l danger', type: 'button', onclick: () => this.confirmSurrender() }, 'Desistir') : null);
    };

    const mid = h('div', { class: 'dz-mid' },
      h('span', { class: 'dz-round' }, dm.round ? `Rodada ${dm.round}` : 'Preparação'),
      h('span', { class: 'dz-status' }, this.statusText()));

    const hand = h('div', { class: 'dz-hand', 'aria-label': 'Sua mão' }, me.hand.map((c) => this.handCard(c)));
    this.board.replaceChildren(info(opp, 1), field(opp, 1), mid, field(me, 0), info(me, 0), hand);
    this.renderPlanBar();
    this.renderFocus();
  }

  mini(c, side, marks, cls, badgeOverride) {
    const m = marks.get(c.iid) || {};
    const classes = [cls, side === 0 ? 'mine' : 'theirs', m.actor ? 'actor' : '', m.target ? 'target' : '', m.ally ? 'target-ally' : '', m.pick ? 'pickable' : '', this.focusIid === c.iid ? 'focused' : ''].join(' ');
    return cardMini(c, { cls: classes, round: this.dm.round, badge: badgeOverride || m.badge, onclick: () => this.onCardTap(c.iid, side) });
  }

  handCard(c) {
    const planned = this.phase === 'planning' && ([...this.plan.free.place.map((x) => x.iid), this.plan.free.replace?.iid, this.plan.action?.type === 'switch' ? this.plan.action.iid : null].includes(c.iid));
    const inSetup = this.phase === 'setup' && (this.setupSel.main === c.iid || this.setupSel.secs.includes(c.iid));
    const pick = (this.phase === 'replace' && !this.duel.players[0].secs.some(Boolean)) || this.pending?.kind === 'sendBack';
    const node = cardMini(c, { cls: `hand mine ${planned || inSetup ? 'planned' : ''} ${pick ? 'pickable' : ''} ${this.focusIid === c.iid ? 'focused' : ''}`, round: this.dm.round, badge: planned ? 'Planejada' : inSetup ? 'No campo' : null, onclick: () => this.onCardTap(c.iid, 0) });
    this.enableDrag(node, c.iid);
    return node;
  }

  // Quem age e quem é alvo, conforme a MINHA escolha atual
  planMarks() {
    const marks = new Map();
    const set = (iid, k) => { if (!iid) return; const m = marks.get(iid) || {}; Object.assign(m, k); marks.set(iid, m); };
    if (this.phase === 'replace') {
      for (const c of this.duel.replaceOptions(this.duel.players[0])) set(c.iid, { pick: true });
      return marks;
    }
    if (this.phase !== 'planning') return marks;
    const d = this.duel;
    const [me, opp] = d.players;
    if (this.pending?.kind === 'item') for (const c of d.field(me)) set(c.iid, { pick: true });
    const a = this.plan.action;
    if (!a) return marks;
    let user = null; let ab = null;
    if (a.type === 'ability') { user = me.main; ab = me.main.card.abilities.find((x) => x.id === a.abilityId); }
    if (a.type === 'special') { user = me.secs[a.slot]; ab = user?.card.special; }
    if (user && ab) {
      set(user.iid, { actor: true, badge: `🎯 ${ab.name}` });
      if (ab.kind === 'attack') {
        if (ab.target === 'area') for (const c of d.field(opp)) set(c.iid, { target: true });
        else if (opp.main) set(opp.main.iid, { target: true });
      } else if (ab.kind === 'interrupt') {
        if (opp.main) set(opp.main.iid, { target: true });
      } else if (ab.kind !== 'revive') {
        set(ab.target === 'main' ? me.main?.iid : user.iid, { ally: true });
      }
    }
    if (a.type === 'switch') {
      set(me.main.iid, { badge: '↺ Sai do principal' });
      const inc = a.slot !== undefined && a.slot !== null ? me.secs[a.slot]?.iid : a.iid;
      set(inc, { badge: '↺ Vira principal' });
    }
    if (a.type === 'item') set(a.targetIid, { ally: true, badge: '🧪 Tônico' });
    if (this.plan.free.replace) set(me.secs[this.plan.free.replace.slot]?.iid, { badge: `↺ Sai: entra ${this.nameOf(this.plan.free.replace.iid)}` });
    return marks;
  }

  statusText() {
    if (this.phase === 'setup') return this.setupSel.main ? 'Escolha até 2 secundários (opcional) e confirme' : 'Escolha seu Monstrin principal na mão';
    if (this.phase === 'planning') {
      if (this.pending?.kind === 'item') return 'Toque no Monstrin que vai receber o Tônico';
      if (this.pending?.kind === 'sendBack') return 'Mão cheia: escolha a carta que vai para o fundo do deck';
      return this.plan.action ? 'Revise e confirme a rodada' : 'Escolha a ação da rodada: toque no seu principal ou num secundário';
    }
    if (this.phase === 'replace') return 'Seu principal caiu! Toque em quem assume';
    return this.status || '';
  }

  // ---------------- Barra do plano (revisar / desfazer / confirmar) ----------------
  renderPlanBar() {
    const items = [];
    let canConfirm = false;
    let error = null;
    if (this.phase === 'setup') {
      const s = this.setupSel;
      items.push(this.chip(s.main ? `Principal: ${this.nameOf(s.main)}` : 'Falta: principal', !s.main, s.main ? () => { s.main = null; this.render(); } : null));
      s.secs.forEach((iid) => items.push(this.chip(`Secundário: ${this.nameOf(iid)}`, false, () => { s.secs = s.secs.filter((x) => x !== iid); this.render(); })));
      canConfirm = !!s.main;
    } else if (this.phase === 'planning') {
      const me = this.duel.players[0];
      const a = this.plan.action;
      let txt = 'Falta: ação da rodada';
      if (a?.type === 'ability') txt = `${me.main.card.name}: ${me.main.card.abilities.find((x) => x.id === a.abilityId).name}`;
      if (a?.type === 'special') txt = `${me.secs[a.slot].card.name}: ${me.secs[a.slot].card.special.name}`;
      if (a?.type === 'switch') txt = `Troca: ${this.nameOf(a.slot !== undefined && a.slot !== null ? me.secs[a.slot].iid : a.iid)} vira principal`;
      if (a?.type === 'item') txt = `Tônico em ${this.nameOf(a.targetIid)}`;
      if (this.plan.reviveTarget) txt += ` → revive ${this.nameOf(this.plan.reviveTarget)}`;
      items.push(this.chip(`🎯 ${txt}`, !a, a ? () => { this.plan.action = null; delete this.plan.reviveTarget; delete this.plan.sendBackIid; this.render(); } : null));
      for (const pl of this.plan.free.place) items.push(this.chip(`Grátis: ${this.nameOf(pl.iid)} entra (vaga ${pl.slot + 1})`, false, () => { this.plan.free.place = this.plan.free.place.filter((x) => x !== pl); this.render(); }));
      if (this.plan.free.replace) items.push(this.chip(`Grátis: ${this.nameOf(this.plan.free.replace.iid)} substitui ${this.nameOf(me.secs[this.plan.free.replace.slot].iid)}`, false, () => { this.plan.free.replace = null; this.render(); }));
      if (a) { error = this.duel.validatePlan(me, this.plan); canConfirm = !error && !this.pending; }
    } else if (this.phase === 'waiting') {
      items.push(this.chip('Ação confirmada. Aguardando o adversário...', false, null));
    } else {
      items.push(h('span', { class: 'dz-plan-note' }, this.log.slice(-1)[0] || ''));
    }
    const confirm = h('button', { class: 'btn gold dz-confirm', type: 'button', disabled: canConfirm ? null : true, onclick: () => (this.phase === 'setup' ? this.confirmSetup() : this.confirmRound()) },
      this.phase === 'setup' ? 'Confirmar campo' : 'Confirmar rodada');
    const show = this.phase === 'setup' || this.phase === 'planning';
    this.planBar.replaceChildren(...[
      h('div', { class: 'dz-plan-items' }, items, error ? h('span', { class: 'dz-plan-err' }, `⛔ ${error}`) : null),
      show ? confirm : null].filter(Boolean));
  }

  chip(text, missing, onUndo) {
    return h('span', { class: `dz-chip ${missing ? 'missing' : ''}` }, text, onUndo ? h('button', { type: 'button', class: 'dz-undo', 'aria-label': 'Desfazer', onclick: onUndo }, '✕') : null);
  }

  // ---------------- Carta em foco (painel lateral ou ampliação no celular) ----------------
  onCardTap(iid, side) {
    if (this.phase === 'anim' || this.phase === 'waiting' || this.phase === 'over') { this.focusIid = iid; this.renderFocus(true); return; }
    // seleção de alvo pendente
    if (this.pending?.kind === 'item' && side === 0 && this.duel.field(this.duel.players[0]).some((c) => c.iid === iid)) {
      this.plan.action = { type: 'item', itemId: 'tonico_duelo', targetIid: iid };
      this.pending = null; sfx.play('select'); this.render(); return;
    }
    if (this.pending?.kind === 'sendBack' && this.where(iid).zone === 'hand') {
      this.plan.sendBackIid = iid; this.pending = null; sfx.play('select'); this.render(); return;
    }
    this.focusIid = iid;
    sfx.play('cursor');
    this.render();
    if (!WIDE()) this.openSheet();
  }

  focusContent() {
    const iid = this.focusIid;
    if (!iid) return null;
    const d = this.duel;
    const me = d.players[0];
    const c = d.find(iid);
    if (!c) return null;
    const vis = this.dmCard(iid) || this.pub(c);
    const w = c.owner === 1 ? { zone: 'opp' } : this.where(iid);
    const R = this.dm.round;
    const abilities = [];
    const footer = [];
    let role = '';
    let note = null;
    const card = c.card;
    const planning = this.phase === 'planning' && !this.pending;
    const legal = planning ? d.legalActions(0) : [];
    const isSel = (a) => JSON.stringify(this.plan.action) === JSON.stringify(a);
    const btn = (label, fn, cls = 'ghost') => h('button', { type: 'button', class: `btn small ${cls}`, onclick: () => { fn(); this.closeSheet(); this.render(); } }, label);

    if (w.zone === 'opp') {
      role = d.players[1].main === c ? 'Principal do adversário' : d.players[1].secs.includes(c) ? 'Secundário do adversário' : 'Adversário';
      for (const ab of card.abilities) abilities.push({ ab, state: 'info' });
      if (card.special) abilities.push({ ab: card.special, state: 'info', label: 'Especial' });
    } else if (w.zone === 'main') {
      role = 'Seu principal';
      for (const ab of card.abilities) {
        const la = legal.find((x) => x.type === 'ability' && x.abilityId === ab.id);
        const action = { type: 'ability', abilityId: ab.id };
        let state = 'info'; let reason = null;
        if (planning) { state = isSel(action) ? 'selected' : la?.ok ? 'ok' : 'disabled'; reason = la && !la.ok ? la.reason : null; }
        else if (this.phase === 'setup') reason = null;
        abilities.push({ ab, state, reason, onclick: planning ? () => this.selectAbility(action, ab) : null });
      }
      if (card.special) abilities.push({ ab: card.special, state: planning ? 'disabled' : 'info', reason: planning ? 'Especial só pode ser usado por um secundário' : null, label: 'Especial' });
      if (planning && this.plan.action?.type === 'switch') footer.push(btn('Cancelar troca', () => { this.plan.action = null; }));
    } else if (w.zone === 'sec') {
      role = `Seu secundário (vaga ${w.slot + 1})`;
      for (const ab of card.abilities) abilities.push({ ab, state: planning ? 'disabled' : 'info', reason: planning ? 'Só o principal usa estas habilidades' : null });
      if (card.special) {
        const la = legal.find((x) => x.type === 'special' && x.slot === w.slot);
        const action = { type: 'special', slot: w.slot };
        let state = 'info'; let reason = null;
        if (planning) {
          state = isSel(action) ? 'selected' : la?.ok ? 'ok' : 'disabled';
          reason = la && !la.ok ? la.reason : null;
          if (this.plan.free.replace?.slot === w.slot) { state = 'disabled'; reason = 'Este secundário será substituído nesta rodada'; }
        }
        abilities.push({ ab: card.special, state, reason, label: 'Especial', onclick: planning ? () => this.selectAbility(action, card.special) : null });
      }
      if (planning) {
        const sw = { type: 'switch', slot: w.slot };
        footer.push(isSel(sw) ? btn('Cancelar troca', () => { this.plan.action = null; }) : btn('↺ Trocar com o principal (usa a ação)', () => { this.plan.action = sw; sfx.play('select'); }));
      }
      if (this.phase === 'replace') footer.push(btn('Assumir como principal', () => this.chooseReplacement(iid), 'gold'));
    } else if (w.zone === 'hand') {
      role = 'Na sua mão';
      note = 'Cartas na mão não usam habilidades. Coloque em campo para usar.';
      for (const ab of card.abilities) abilities.push({ ab, state: this.phase === 'planning' ? 'disabled' : 'info', reason: this.phase === 'planning' ? 'Só em campo, como principal' : null });
      if (card.special) abilities.push({ ab: card.special, state: this.phase === 'planning' ? 'disabled' : 'info', reason: this.phase === 'planning' ? 'Só em campo, como secundário (a partir da rodada seguinte à entrada)' : null, label: 'Especial' });
      if (this.phase === 'setup') {
        const s = this.setupSel;
        if (s.main === iid) footer.push(btn('Tirar do principal', () => { s.main = null; }));
        else if (s.secs.includes(iid)) footer.push(btn('Tirar do campo', () => { s.secs = s.secs.filter((x) => x !== iid); }));
        else {
          footer.push(btn('Escolher como principal', () => { s.main = iid; sfx.play('select'); }, 'gold'));
          if (s.main && s.secs.length < RULES.MAX_SECONDARIES) footer.push(btn('Colocar como secundário', () => { s.secs.push(iid); sfx.play('select'); }));
        }
      } else if (planning) footer.push(...this.handActions(iid, btn));
      else if (this.phase === 'replace' && !me.secs.some(Boolean)) footer.push(btn('Assumir como principal', () => this.chooseReplacement(iid), 'gold'));
    } else if (w.zone === 'grave') {
      role = 'No Cemitério';
      for (const ab of card.abilities) abilities.push({ ab, state: 'info' });
      if (this.pending?.kind === 'revive') footer.push(btn('Reviver esta carta', () => this.pickRevive(iid), 'gold'));
    }
    return cardZoom(vis, { role, round: R, abilities, footer, note });
  }

  handActions(iid, btn) {
    const me = this.duel.players[0];
    const free = this.plan.free;
    const out = [];
    const placed = free.place.find((x) => x.iid === iid);
    if (placed) return [btn('Cancelar entrada em campo', () => { free.place = free.place.filter((x) => x !== placed); })];
    if (free.replace?.iid === iid) return [btn('Cancelar substituição', () => { free.replace = null; })];
    if (this.plan.action?.type === 'switch' && this.plan.action.iid === iid) return [btn('Cancelar troca', () => { this.plan.action = null; })];
    for (const i of [0, 1]) {
      const busy = me.secs[i] || free.place.some((x) => x.slot === i);
      if (!busy && free.place.length < RULES.FREE_PLACEMENTS_PER_ROUND) out.push(btn(`Entrar como secundário ${i + 1} (grátis)`, () => { free.place.push({ iid, slot: i }); sfx.play('select'); }, 'green'));
    }
    for (const i of [0, 1]) {
      if (me.secs[i] && !free.replace) out.push(btn(`Substituir ${me.secs[i].card.name} (grátis, 1 por rodada)`, () => { free.replace = { slot: i, iid }; sfx.play('select'); }));
    }
    out.push(btn('↺ Trocar pelo principal (usa a ação)', () => { this.plan.action = { type: 'switch', iid }; sfx.play('select'); }));
    return out;
  }

  renderFocus(forceSheet) {
    const content = this.focusContent();
    if (WIDE()) {
      this.side.replaceChildren(content || h('div', { class: 'dz-side-empty' }, h('b', {}, 'Toque numa carta'), h('p', {}, 'A carta aparece aqui ampliada, com as habilidades. Toque numa habilidade para escolhê-la.')));
      this.closeSheet();
    } else {
      this.side.replaceChildren();
      if (this.sheet) { if (content) this.sheet.querySelector('.dz-sheet-card').replaceChildren(content); else this.closeSheet(); }
      else if (forceSheet && content) this.openSheet();
    }
  }

  openSheet() {
    this.closeSheet();
    const content = this.focusContent();
    if (!content) return;
    this.sheet = h('div', { class: 'dz-sheet', onclick: (e) => { if (e.target === this.sheet) this.closeSheet(); } },
      h('div', { class: 'dz-sheet-card' }, content),
      h('button', { class: 'btn ghost dz-sheet-close', type: 'button', onclick: () => this.closeSheet() }, 'Fechar'));
    this.root.append(this.sheet);
  }

  closeSheet() { if (this.sheet) { this.sheet.remove(); this.sheet = null; } }

  async selectAbility(action, ab) {
    if (JSON.stringify(this.plan.action) === JSON.stringify(action)) {
      this.plan.action = null; delete this.plan.reviveTarget; delete this.plan.sendBackIid;
      sfx.play('close');
      this.render();
      return;
    }
    this.plan.action = action;
    delete this.plan.reviveTarget; delete this.plan.sendBackIid;
    sfx.play('select');
    if (ab.kind === 'revive') {
      this.pending = { kind: 'revive' };
      this.closeSheet();
      this.render();
      this.showGrave(0, true);
      return;
    }
    this.closeSheet();
    this.render();
  }

  pickRevive(iid) {
    this.plan.reviveTarget = iid;
    this.pending = null;
    this.closeModal();
    const me = this.duel.players[0];
    if (me.hand.length >= RULES.HAND_SIZE) this.pending = { kind: 'sendBack' };
    this.render();
  }

  cancelPending() {
    if (!this.pending) return;
    if (this.pending.kind !== 'item') { this.plan.action = null; delete this.plan.reviveTarget; }
    this.pending = null;
    this.closeModal();
    this.render();
  }

  useItem() {
    if (this.phase !== 'planning') return;
    if (this.tonics - this.itemsUsed <= 0) { this.toast('Você não tem Tônicos de Frutas no inventário.'); return; }
    if (this.duel.players[0].itemUses >= RULES.ITEM_USES_PVE) { this.toast(`Limite de ${RULES.ITEM_USES_PVE} itens por partida atingido.`); return; }
    this.pending = { kind: 'item' };
    sfx.play('cursor');
    this.render();
  }

  // ---------------- Arrastar (opcional; tocar sempre funciona) ----------------
  enableDrag(node, iid) {
    let start = null; let ghost = null; let moved = false;
    node.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'planning' && this.phase !== 'setup') return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = false;
    });
    node.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14) {
        moved = true;
        node.setPointerCapture(e.pointerId);
        ghost = node.cloneNode(true);
        ghost.classList.add('drag-ghost');
        document.body.append(ghost);
      }
      if (moved && ghost) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
    });
    const end = (e) => {
      if (!start) return;
      const wasMoved = moved;
      start = null;
      if (ghost) { ghost.remove(); ghost = null; }
      if (!wasMoved) return;
      node.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { once: true, capture: true });
      const target = document.elementsFromPoint(e.clientX, e.clientY).map((x) => x.closest?.('[data-drop]')).find(Boolean);
      if (target) this.dropOn(iid, target.getAttribute('data-drop'));
    };
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', () => { start = null; if (ghost) { ghost.remove(); ghost = null; } });
  }

  dropOn(iid, zone) {
    const me = this.duel.players[0];
    if (this.phase === 'setup') {
      const s = this.setupSel;
      s.secs = s.secs.filter((x) => x !== iid);
      if (s.main === iid) s.main = null;
      if (zone === 'main') s.main = iid;
      else if (s.main && s.secs.length < RULES.MAX_SECONDARIES) s.secs.push(iid);
      sfx.play('select');
      this.render();
      return;
    }
    const free = this.plan.free;
    free.place = free.place.filter((x) => x.iid !== iid);
    if (free.replace?.iid === iid) free.replace = null;
    if (zone === 'main') this.plan.action = { type: 'switch', iid };
    else {
      const i = zone === 'sec0' ? 0 : 1;
      if (me.secs[i]) { if (!free.replace) free.replace = { slot: i, iid }; else { this.toast('Só 1 substituição de secundário por rodada.'); return; } }
      else if (!free.place.some((x) => x.slot === i) && free.place.length < RULES.FREE_PLACEMENTS_PER_ROUND) free.place.push({ iid, slot: i });
    }
    sfx.play('select');
    this.render();
  }

  // ---------------- Modais simples (cemitério, histórico) ----------------
  modal(title, build) {
    this.closeModal();
    this.mod = h('div', { class: 'dz-modal', onclick: (e) => { if (e.target === this.mod) this.closeModal(); } });
    const box = h('div', { class: 'dz-modal-box' }, h('h3', {}, title));
    build(box);
    box.append(h('div', { class: 'dz-modal-actions' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (this.pending?.kind === 'revive') this.cancelPending(); this.closeModal(); } }, this.pending?.kind === 'revive' ? 'Cancelar' : 'Fechar')));
    this.mod.append(box);
    this.root.append(this.mod);
  }

  closeModal() { if (this.mod) { this.mod.remove(); this.mod = null; } }

  showGrave(side, picking = false) {
    const p = this.duel.players[side];
    this.modal(picking ? 'Escolha quem reviver' : `Cemitério — ${side === 0 ? 'seu' : 'do adversário'}`, (box) => {
      if (!p.grave.length) box.append(h('p', {}, 'Nenhum Monstrin derrotado ainda.'));
      box.append(h('div', { class: 'dz-grid' }, p.grave.map((c) => cardMini({ ...this.pub(c), hp: c.maxHp }, { cls: `hand ${picking ? 'pickable' : ''}`, onclick: () => (picking ? this.pickRevive(c.iid) : null), badge: picking ? 'Reviver' : null }))));
    });
  }

  showLog() {
    this.modal('Histórico do duelo', (box) => {
      box.append(h('ol', { class: 'dz-log' }, this.log.slice().reverse().map((t) => h('li', {}, t))));
    });
  }

  toggleSpeed() {
    this.speed = this.speed < 1 ? 1 : 0.5;
    try { localStorage.setItem('mw-duel-speed', this.speed < 1 ? 'fast' : 'normal'); } catch { /* ignora */ }
    this.render();
  }

  confirmSurrender() {
    if (this.phase === 'over') return;
    this.modal('Desistir do duelo?', (box) => {
      box.append(h('p', {}, 'O duelo conta como derrota. Sua posição no mapa e seu deck não mudam.'),
        h('button', { class: 'btn red', type: 'button', onclick: () => { this.closeModal(); this.endWith({ winner: 1, reason: 'desistência' }); } }, 'Desistir'));
    });
  }

  toast(text) {
    const t = h('div', { class: 'dz-toast' }, text);
    this.root.append(t);
    setTimeout(() => t.remove(), 2000);
    sfx.play('bump');
  }

  banner(content, ms = 1200) {
    const b = h('div', { class: 'dz-banner' }, content);
    this.root.append(b);
    return this.t(ms).then(() => b.remove());
  }

  // ---------------- Preparação inicial ----------------
  async confirmSetup() {
    const d = this.duel;
    const r = d.submitSetup(0, { main: this.setupSel.main, secondaries: this.setupSel.secs });
    if (!r.ok) { this.toast(r.error); return; }
    d.submitSetup(1, aiSetup(d, 1));
    sfx.play('select');
    this.phase = 'anim';
    this.focusIid = d.players[0].main.iid;
    this.dm = this.snapshot();
    this.status = 'Monstrins em campo!';
    this.render();
    for (const n of this.board.querySelectorAll('.dz-field .mc')) n.classList.add('enter');
    await this.t(650);
    this.beginPlanning();
  }

  // ---------------- Planejamento e resolução ----------------
  beginPlanning() {
    if (this.duel.result) { this.showEnd(); return; }
    this.phase = 'planning';
    this.plan = this.emptyPlan();
    this.pending = null;
    this.dm = this.snapshot();
    if (!this.focusIid || !this.duel.find(this.focusIid) || this.duel.find(this.focusIid).zone === 'grave') this.focusIid = this.duel.players[0].main?.iid;
    this.render();
  }

  async confirmRound() {
    const d = this.duel;
    const me = d.players[0];
    if (this.phase !== 'planning' || !this.plan.action) return;
    const err = d.validatePlan(me, this.plan);
    if (err) { this.toast(err); return; }
    const r = d.submit(0, this.plan);
    if (!r.ok) { this.toast(r.error); return; }
    if (this.plan.action.type === 'item') this.itemsUsed += 1;
    sfx.play('select');
    this.closeSheet();
    this.phase = 'waiting';
    this.render();
    await this.t(450);
    // o adversário decide sem ver a sua escolha (usa só informações públicas)
    const r2 = d.submit(1, aiPlan(d, 1));
    if (!r2.ok) d.submit(1, { action: { type: 'ability', abilityId: d.players[1].main.card.abilities.find((x) => !x.cost).id } });
    const pre = this.snapshot();
    const events = d.resolveRound();
    await this.playEvents(pre, events);
  }

  rectOf(iid) {
    const n = this.board.querySelector(`.mc[data-iid="${iid}"]`);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height * 0.42, node: n };
  }

  float(iid, text, color = '#fff', size = 24) {
    const r = this.rectOf(iid);
    if (!r) return;
    const f = h('div', { class: 'dz-float', style: { left: `${r.x}px`, top: `${r.y}px`, color, fontSize: `${size}px` } }, text);
    this.fx.append(f);
    setTimeout(() => f.remove(), 1100);
  }

  burst(iid, color, n = 10) {
    const r = this.rectOf(iid);
    if (!r) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = h('div', { class: 'dz-part', style: { left: `${r.x}px`, top: `${r.y}px`, background: color, boxShadow: `0 0 8px ${color}`, '--dx': `${Math.cos(a) * (36 + Math.random() * 30)}px`, '--dy': `${Math.sin(a) * (36 + Math.random() * 30)}px` } });
      this.fx.append(p);
      setTimeout(() => p.remove(), 600);
    }
  }

  beam(fromIid, toIid, color) {
    const a = this.rectOf(fromIid); const b = this.rectOf(toIid);
    if (!a || !b) return;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const l = h('div', { class: 'dz-beam', style: { left: `${a.x}px`, top: `${a.y}px`, width: `${len}px`, transform: `rotate(${ang}rad)`, background: `linear-gradient(90deg, transparent, ${color}, #fff)` } });
    this.fx.append(l);
    setTimeout(() => l.remove(), 450);
  }

  cls(iid, c, ms = 420) {
    const r = this.rectOf(iid);
    if (!r) return;
    r.node.classList.remove(c); void r.node.offsetWidth; r.node.classList.add(c);
    setTimeout(() => r.node.classList.remove(c), ms);
  }

  say(text) { this.status = text; this.log.push(text); }

  async playEvents(pre, events) {
    this.phase = 'anim';
    this.dm = pre;
    const dm = this.dm;
    const R = pre.round;
    const nm = (iid) => this.nameOf(iid);
    for (const e of events) {
      const P = e.side !== undefined ? dm.players[e.side] : null;
      switch (e.type) {
        case 'reveal': {
          for (const a of e.actions) dm.players[a.side].ed -= a.cost;
          const desc = (a) => {
            const x = a.action;
            if (x.type === 'ability' || x.type === 'special') return { t: a.abilityName, s: `${nm(a.user)} · ${a.cost} ED`, img: a.user };
            if (x.type === 'switch') return { t: 'Troca de principal', s: '', img: null };
            if (x.type === 'item') return { t: DUEL_ITEMS[x.itemId].name, s: 'Item', img: null };
            return { t: 'Defesa Básica', s: 'tempo esgotado', img: null };
          };
          const m = desc(e.actions.find((a) => a.side === 0));
          const o = desc(e.actions.find((a) => a.side === 1));
          this.log.push(`— Rodada ${e.round}: você → ${m.t}; ${dm.players[1].name} → ${o.t}`);
          this.status = 'Ações reveladas!';
          this.render();
          sfx.play('alert');
          const side = (x, who) => h('div', { class: 'dz-rev' }, x.img ? h('img', { src: art.monUrl(DUEL_CARDS[this.dmCard(x.img).cardId].art), alt: '' }) : null, h('small', {}, who), h('b', {}, x.t), h('small', {}, x.s));
          await this.banner(h('div', { class: 'dz-reveal' }, side(m, 'Você'), h('span', { class: 'dz-vs' }, 'VS'), side(o, dm.players[1].name)), 1300);
          break;
        }
        case 'replace': {
          const inc = dm.cards.get(e.in); const out = P.secs[e.slot];
          P.secs[e.slot] = inc; P.hand = P.hand.filter((c) => c.iid !== e.in); if (out) P.hand.push(out);
          this.say(`${P.name}: ${nm(e.in)} substitui ${nm(e.out)}.`);
          this.render(); this.cls(e.in, 'enter', 450); sfx.play('select'); await this.t(450);
          break;
        }
        case 'place': {
          P.secs[e.slot] = dm.cards.get(e.iid); P.hand = P.hand.filter((c) => c.iid !== e.iid);
          this.say(`${P.name} colocou ${nm(e.iid)} em campo.`);
          this.render(); this.cls(e.iid, 'enter', 450); sfx.play('select'); await this.t(420);
          break;
        }
        case 'switch': {
          const inc = e.fromHand ? dm.cards.get(e.in) : P.secs[e.fromSlot];
          const out = P.main;
          if (e.fromHand) { P.hand = P.hand.filter((c) => c.iid !== e.in); P.hand.push(out); } else P.secs[e.fromSlot] = out;
          P.main = inc;
          this.say(`${P.name}: ${nm(e.in)} assume como principal.`);
          this.render(); this.cls(e.in, 'enter', 450); sfx.play('select'); await this.t(550);
          break;
        }
        case 'passive': {
          const c = this.dmCard(e.target);
          if (e.shield && c) c.shields.push({ pct: e.shield, from: R, until: R, scope: 'direct' });
          if (e.heal && c) c.hp = Math.min(c.maxHp, c.hp + e.heal);
          this.say(`${nm(e.target)}: ${e.passive}.`);
          this.render(); this.cls(e.target, 'shielded', 700); this.float(e.target, `✦ ${e.passive}`, '#7dffb0', 15); await this.t(550);
          break;
        }
        case 'basicDefense': {
          for (const c of [P.main, ...P.secs].filter(Boolean)) c.shields.push({ pct: RULES.TIMEOUT_DEFENSE, from: R, until: R, scope: 'direct' });
          this.say(`${P.name}: Defesa Básica.`); this.render(); await this.t(450);
          break;
        }
        case 'fail': case 'cancelled': {
          this.say(e.text); this.render(); sfx.play('miss');
          if (e.user) { this.cls(e.user, 'acting', 600); this.float(e.user, e.type === 'fail' ? `${COND_ICON[e.condition] || ''} Falhou` : 'Cancelado', '#ff9a9a', 18); }
          await this.t(800);
          break;
        }
        case 'interrupt': {
          this.say(`${nm(e.user)} usou ${e.ability} (Interrupção Imediata)!`); this.render();
          this.cls(e.user, 'acting', 600); this.burst(e.user, '#fff6a8'); sfx.play('zap'); await this.t(650);
          break;
        }
        case 'shield': {
          const c = this.dmCard(e.target);
          if (c) c.shields.push({ pct: e.pct, from: R, until: R + e.duration - 1, scope: e.scope });
          this.say(`${nm(e.user)} usou ${e.ability}: escudo de ${Math.round(e.pct * 100)}% em ${nm(e.target)}.`);
          this.render(); this.cls(e.user, 'acting', 600); this.cls(e.target, 'shielded', 800); sfx.play('stat'); await this.t(650);
          break;
        }
        case 'heal': case 'drain': {
          const who = e.target || e.user;
          const c = this.dmCard(who);
          if (c) c.hp = e.hp;
          this.say(e.type === 'drain' ? `${nm(e.user)} drenou ${e.amount} PV.` : `${nm(who)} recuperou ${e.amount} PV${e.ability ? ` (${e.ability})` : e.source ? ` (${e.source})` : ''}.`);
          this.render(); if (e.user) this.cls(e.user, 'acting', 500); this.cls(who, 'healed', 700);
          this.float(who, `+${e.amount}`, '#7dff9a', 24); this.burst(who, '#7dff9a', 8); sfx.play('heal'); await this.t(600);
          break;
        }
        case 'purify': {
          const c = this.dmCard(e.target); if (c) c.conditions = [];
          this.say(`${nm(e.target)} foi purificado.`); this.render(); this.burst(e.target, '#ffffff', 10); sfx.play('heal'); await this.t(500);
          break;
        }
        case 'revive': {
          this.say(`${P.name} reviveu ${nm(e.iid)} (volta à mão com 100% dos PV).`); this.render(); sfx.play('levelup'); await this.t(800);
          break;
        }
        case 'attack': {
          const color = elc(e.element || 'neutro');
          this.say(`${nm(e.user)} usou ${e.ability}!`);
          this.render();
          this.cls(e.user, 'acting', 700);
          for (const t of e.targets) this.cls(t, 'targeted', 900);
          sfx.play({ fogo: 'fire', agua: 'water', planta: 'leaf', eletrico: 'zap', pedra: 'rock' }[e.element] || 'hit');
          await this.t(260);
          for (const t of e.targets) { this.beam(e.user, t, color); this.burst(t, color, 12); }
          await this.t(260);
          break;
        }
        case 'hit': {
          if (e.cancelledHit) break;
          if (e.miss) { this.float(e.target, 'Errou!', '#c8d0e0', 20); this.log.push(`${nm(e.target)}: o golpe errou.`); sfx.play('miss'); await this.t(330); break; }
          this.cls(e.target, 'shake', 360);
          let t = `-${e.dmg}`;
          if (e.crit) t += ' CRÍTICO';
          if (e.elementMod > 1) t += ` ×${e.elementMod}`;
          this.float(e.target, t, e.crit ? '#ffe14a' : e.elementMod > 1 ? '#ffb36b' : e.dmg === 0 ? '#aab2d6' : '#fff', e.crit || e.elementMod > 1 ? 28 : 24);
          this.log.push(`${nm(e.target)} sofreu ${e.dmg}${e.crit ? ' (crítico)' : ''}${e.elementMod > 1 ? ' (fraqueza)' : ''}.`);
          sfx.play(e.crit || e.elementMod > 1 ? 'superhit' : e.dmg ? 'hit' : 'weakhit');
          await this.t(330);
          break;
        }
        case 'damage': {
          const c = this.dmCard(e.target); if (c) c.hp = e.hp;
          this.render(); await this.t(200);
          break;
        }
        case 'retaliate': {
          const c = this.dmCard(e.target); if (c) c.hp = e.hp;
          this.say(`${e.passive} de ${nm(e.bearer)} causou ${e.amount} em ${nm(e.target)}!`);
          this.render(); this.cls(e.bearer, 'acting', 500); this.cls(e.target, 'shake', 360); this.float(e.target, `✦-${e.amount}`, '#7dffb0', 22); sfx.play('hit'); await this.t(550);
          break;
        }
        case 'condition': {
          const c = this.dmCard(e.target);
          if (c) { c.conditions = c.conditions.filter((x) => x.type !== e.condition); c.conditions.push({ type: e.condition, remaining: e.duration }); }
          this.say(`${nm(e.target)}: ${CONDITION_NAMES[e.condition]}!`);
          this.render(); this.float(e.target, `${COND_ICON[e.condition]} ${CONDITION_NAMES[e.condition]}`, '#d9a8ff', 17); sfx.play('statdown'); await this.t(500);
          break;
        }
        case 'immune': case 'blocked': {
          this.float(e.target, e.type === 'immune' ? 'Imune' : 'Bloqueado', '#bfe9ff', 17);
          this.log.push(`${nm(e.target)} ${e.type === 'immune' ? 'é imune a' : 'bloqueou'} ${CONDITION_NAMES[e.condition]}.`);
          await this.t(380);
          break;
        }
        case 'tick': {
          const c = this.dmCard(e.target); if (c) c.hp = e.hp;
          this.say(`${nm(e.target)} sofreu ${e.amount} de ${CONDITION_NAMES[e.condition]}.`);
          this.render(); this.cls(e.target, 'shake', 360); this.float(e.target, `${COND_ICON[e.condition]} -${e.amount}`, '#d9a8ff', 22); sfx.play('weakhit'); await this.t(500);
          break;
        }
        case 'conditionEnd': {
          const c = this.dmCard(e.target); if (c) c.conditions = c.conditions.filter((x) => x.type !== e.condition);
          break;
        }
        case 'ko': {
          const c = this.dmCard(e.target); if (c) { c.ko = true; c.hp = 0; }
          dm.players[e.by].kos = e.kos;
          this.say(`KO! ${nm(e.target)} foi derrotado (${e.cause}). ${dm.players[e.by].name}: ${e.kos} KO(s).`);
          this.render(); sfx.play('faint'); await this.t(850);
          break;
        }
        case 'roundStart': {
          dm.round = e.round;
          break;
        }
        case 'end': {
          this.dm = this.snapshot(); this.render();
          await this.t(400);
          this.showEnd();
          return;
        }
        default: break;
      }
    }
    await this.handleReplacements();
  }

  async handleReplacements() {
    const d = this.duel;
    this.dm = this.snapshot();
    if (d.phase === 'replace' && d.players[1].pendingReplace) {
      const res = d.chooseReplacement(1, aiReplacement(d, 1));
      this.say(`${d.players[1].name}: ${this.nameOf(res.events[0].iid)} assume como principal.`);
    }
    if (d.phase === 'replace' && d.players[0].pendingReplace) {
      this.phase = 'replace';
      this.focusIid = null;
      this.dm = this.snapshot();
      this.render();
      return; // aguarda o toque do jogador (chooseReplacement)
    }
    this.afterReplace();
  }

  chooseReplacement(iid) {
    const r = this.duel.chooseReplacement(0, iid);
    if (!r.ok) { this.toast(r.error); return; }
    sfx.play('select');
    this.say(`${this.nameOf(iid)} assume como seu principal.`);
    this.focusIid = iid;
    this.afterReplace();
  }

  afterReplace() {
    this.dm = this.snapshot();
    this.render();
    for (const n of this.board.querySelectorAll('.dz-slot.main .mc')) n.classList.add('enter');
    this.beginPlanning();
  }

  // ---------------- Fim ----------------
  showEnd() {
    const r = this.duel.result;
    this.endWith(r);
  }

  endWith(r) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.render();
    const [me, opp] = this.duel.players;
    const title = r.winner === 0 ? 'Vitória!' : r.winner === 1 ? 'Derrota' : 'Empate!';
    sfx.play(r.winner === 0 ? 'victory' : r.winner === 1 ? 'defeat' : 'select');
    const result = { winner: r.winner, reason: r.reason, rounds: this.duel.round, kos: [me.kos, opp.kos], itemsUsed: this.itemsUsed };
    const card = h('div', { class: `dz-end ${r.winner === 0 ? 'win' : r.winner === 1 ? 'lose' : 'draw'}` },
      h('div', { class: 'dz-end-title' }, title),
      h('p', {}, `${r.reason === '5 KOs' ? 'Por 5 KOs' : r.reason.charAt(0).toUpperCase() + r.reason.slice(1)} · KOs ${me.kos} × ${opp.kos} · ${this.duel.round} rodada(s)`),
      h('button', { class: 'btn gold', type: 'button', onclick: () => this.finish(result) }, 'Voltar ao mapa'));
    this.root.append(h('div', { class: 'dz-modal end' }, card));
  }
}
