// Arena de Duelos — interface (HTML/CSS) para o motor de duelos.
// A interface só mostra e anima: todas as regras ficam em engine.js.
import { h, ui } from '../ui/ui.js';
import { controls } from '../ui/controls.js';
import { sfx } from '../audio/sfx.js';
import { art } from '../art/registry.js';
import { ELEMENTS } from '../data/elements.js';
import { RULES } from './rules.js';
import { DUEL_CARDS, PRESET_DECKS } from './cards.js';
import { Duel, CONDITION_NAMES, DUEL_ITEMS } from './engine.js';
import { aiSetup, aiPlan, aiReplacement } from './ai.js';
import { validateDeck } from './cards.js';
import { app } from '../app.js';
import { activeDeck } from '../core/decks.js';

// Converte o deck ativo do editor de decks (Coleção) para o duelo, se ele
// cumprir o Regulamento v1.0: 15 cartas, somente Monstrins, até 2 cópias.
export function playerDuelDeck(game) {
  if (!game) return { ok: false, reason: 'Disponível dentro de uma aventura.' };
  const deck = activeDeck(game);
  if (!deck) return { ok: false, reason: 'Nenhum deck ativo (menu Decks).' };
  const ids = [];
  for (const [cid, n] of Object.entries(deck.cards)) {
    if (!cid.startsWith('m_')) return { ok: false, name: deck.name, reason: 'Pelo regulamento, o deck de duelo tem somente cartas de Monstrins.' };
    const sp = cid.slice(2);
    if (!DUEL_CARDS[sp]) return { ok: false, name: deck.name, reason: `${sp} ainda não tem ficha de duelo.` };
    for (let i = 0; i < n; i++) ids.push(sp);
  }
  const v = validateDeck(ids, RULES);
  if (!v.ok) return { ok: false, name: deck.name, reason: v.errors[0] };
  return { ok: true, name: deck.name, cards: ids };
}

const COND_ICON = { poison: '☠️', burn: '🔥', paralysis: '⚡', sleep: '💤', freeze: '❄️' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (id) => ELEMENTS[id] || ELEMENTS.neutro;

function pct(x) { return `${Math.round(x * 100)}%`; }

export function abilityText(ab) {
  if (!ab) return '';
  const parts = [];
  if (ab.kind === 'attack') {
    const d = ab.damage || {};
    let dmg = `${d.fixed || 0}`;
    if (d.pct) dmg += ` + ${pct(d.pct)} PV máx.`;
    parts.push(`${ab.hits > 1 ? `${ab.hits}× ` : ''}${dmg} dano`);
    if (ab.target === 'area') parts.push('em área');
    parts.push(`precisão ${ab.accuracy ?? 100}%`);
    if (ab.crit?.chance) parts.push(`crítico ${pct(ab.crit.chance)} ×${ab.crit.mult ?? RULES.DEFAULT_CRIT_MULT}`);
    if (ab.drain) parts.push(`dreno ${pct(ab.drain)}`);
    if (ab.pierce?.resistance) parts.push(`perfura ${pct(ab.pierce.resistance)} da resistência`);
    if (ab.pierce?.shield) parts.push(`perfura ${pct(ab.pierce.shield)} dos escudos`);
    for (const e of ab.effects || []) parts.push(`${CONDITION_NAMES[e.condition]} ${pct(e.chance ?? 1)}${e.dmg ? ` (${e.dmg}/rodada)` : ''}${e.intensity ? ` (${pct(e.intensity)} de perder a ação)` : ''}, ${e.duration} rod.`);
  }
  if (ab.shield) parts.push(`escudo ${pct(ab.shield.pct)} · ${ab.shield.duration} rod.${ab.shield.scope === 'all' ? ' (direto e indireto)' : ''}${ab.shield.blocksConditions ? ' · bloqueia condições' : ''}`);
  if (ab.purify) parts.push('remove condições');
  if (ab.heal) parts.push(`cura ${ab.heal.fixed || ''}${ab.heal.pct ? pct(ab.heal.pct) + ' PV máx.' : ''}`);
  if (ab.kind === 'revive') parts.push('revive do Cemitério para a mão');
  if (ab.interrupt) parts.push('Interrupção Imediata');
  if (ab.target === 'main') parts.push('no principal');
  if (ab.oncePerDuel) parts.push('1× por duelo');
  return parts.join(' · ');
}

export class Arena {
  constructor() {
    this.root = null;
    this.duel = null;
    this.busy = false;
    this.settings = { timer: false, items: true };
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('mw-duel-settings') || '{}')); } catch { /* ignora */ }
  }

  open({ onExit } = {}) {
    this.onExit = onExit;
    this.prevMusic = sfx.track;
    ui.blockingFlag = true;
    controls.setTouchVisible(false);
    this.root = h('div', { class: 'duel-root' });
    document.getElementById('ui').append(this.root);
    this.keyOff = controls.onAction(() => true); // a arena usa toque/clique; teclas não movem o mundo
    sfx.music('battle');
    this.deckScreen();
    window.__arena = this;
  }

  close() {
    clearInterval(this.timerId);
    this.keyOff?.();
    this.root?.remove();
    this.root = null;
    ui.blockingFlag = false;
    ui.setTouchVisible(ui.touchVisible);
    sfx.music(this.prevMusic || 'title');
    this.onExit?.();
  }

  saveSettings() { try { localStorage.setItem('mw-duel-settings', JSON.stringify(this.settings)); } catch { /* ignora */ } }

  // ---------------- Escolha de baralho ----------------
  deckScreen() {
    let pick = 'chamas';
    const draw = () => {
      this.root.innerHTML = '';
      const box = h('div', { style: { margin: 'auto', width: 'min(760px, 100%)', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', padding: '8px' } });
      box.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        h('h2', { style: { margin: 0, flex: 1, fontSize: '26px' } }, '⚔️ Arena de Duelos'),
        h('button', { class: 'btn ghost small', onclick: () => this.close() }, 'Sair')));
      box.append(h('p', { style: { margin: 0, color: '#cfd6ff', fontWeight: 700 } }, `Regulamento v${RULES.VERSION}: escolhas secretas e simultâneas, vence quem fizer 5 KOs. Cartas e valores provisórios.`));
      const own = playerDuelDeck(app.game);
      const decks = [...Object.values(PRESET_DECKS)];
      if (own.ok) decks.push({ id: 'player', name: `Seu deck: ${own.name}`, desc: 'Seu deck ativo da Coleção.', cards: own.cards });
      this.presets = Object.fromEntries(decks.map((d) => [d.id, d]));
      box.append(h('div', { class: 'd-deckpick' }, decks.map((d) => {
        const uniq = [...new Set(d.cards)];
        return h('button', { class: `d-deck ${pick === d.id ? 'on' : ''}`, onclick: () => { pick = d.id; sfx.play('cursor'); draw(); } },
          h('b', { style: { fontSize: '18px' } }, d.name),
          h('div', { class: 'imgs' }, uniq.map((id) => h('img', { src: art.monUrl(DUEL_CARDS[id].art), alt: DUEL_CARDS[id].name }))),
          h('small', { style: { color: '#cfd6ff', fontWeight: 700 } }, d.desc));
      })));
      if (!own.ok) box.append(h('p', { style: { margin: 0, color: '#aab2d6', fontWeight: 700, fontSize: '14px' } }, `Seu deck${own.name ? ` "${own.name}"` : ''}: ${own.reason}`));
      const opt = (label, key, desc) => h('label', { style: { display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 800 } },
        h('input', { type: 'checkbox', checked: this.settings[key] ? true : null, onchange: (e) => { this.settings[key] = e.target.checked; this.saveSettings(); } }), h('span', {}, label, h('small', { style: { display: 'block', color: '#aab2d6' } }, desc)));
      box.append(opt(`⏱ Tempo de escolha (${RULES.TURN_SECONDS}s)`, 'timer', 'Ao esgotar, você faz Defesa Básica. 3 esgotamentos seguidos = derrota.'));
      box.append(opt(`🧪 Itens de PvE (${RULES.ITEM_USES_PVE} usos)`, 'items', 'Tônico de Duelo: cura 30 PV, consome a ação principal.'));
      box.append(h('button', { class: 'btn gold', style: { minHeight: '56px', fontSize: '19px' }, onclick: () => this.startMatch(pick) }, `Duelar com ${this.presets[pick].name}`));
      this.root.append(box);
    };
    draw();
  }

  // ---------------- Partida ----------------
  startMatch(deckId) {
    sfx.play('encounter');
    const other = deckId === 'chamas' ? 'mare' : 'chamas';
    this.deckId = deckId;
    const mine = (this.presets && this.presets[deckId]) || PRESET_DECKS[deckId];
    this.duel = new Duel({
      decks: [mine.cards, PRESET_DECKS[other].cards],
      names: ['Você', 'Rival Caio'],
      config: { itemsEnabled: this.settings.items },
    });
    this.logLines = [];
    this.setupSel = { main: null, secs: [] };
    this.buildLayout();
    this.renderSetup();
  }

  buildLayout() {
    this.root.innerHTML = '';
    this.oppBar = h('div', { class: 'd-bar' });
    this.oppField = h('div', { class: 'd-field opp' });
    this.center = h('div', { class: 'd-center' });
    this.myField = h('div', { class: 'd-field me' });
    this.myBar = h('div', { class: 'd-bar' });
    this.handEl = h('div', { class: 'd-hand' });
    this.actionsEl = h('div', {});
    this.fxLayer = h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 } });
    this.root.append(this.oppBar, this.oppField, this.center, this.myField, this.myBar, h('div', { class: 'd-bottom' }, this.handEl, this.actionsEl), this.fxLayer);
  }

  // Modelo de exibição (permite animar os eventos passo a passo)
  pub(c) {
    if (!c) return null;
    return { iid: c.iid, cardId: c.cardId, hp: c.hp, maxHp: c.maxHp, conditions: c.conditions.map((x) => ({ ...x })), shields: c.shields.map((x) => ({ ...x })), usedOnce: { ...c.usedOnce }, enteredRound: c.enteredRound };
  }

  snapshot() {
    const d = this.duel;
    return {
      round: d.round,
      players: d.players.map((p) => ({ name: p.name, ed: p.ed, kos: p.kos, itemUses: p.itemUses, main: this.pub(p.main), secs: p.secs.map((s) => this.pub(s)), hand: p.hand.map((c) => this.pub(c)), deckCount: p.deck.length, graveCount: p.grave.length })),
      cards: new Map([...d.players.flatMap((p) => [p.main, ...p.secs, ...p.hand, ...p.grave, ...p.deck])].filter(Boolean).map((c) => [c.iid, this.pub(c)])),
    };
  }

  dmCard(iid) {
    const dm = this.dm;
    for (const p of dm.players) for (const c of [p.main, ...p.secs, ...p.hand]) if (c && c.iid === iid) return c;
    return dm.cards.get(iid);
  }

  // ---------------- Renderização ----------------
  cardEl(c, { big = false, onclick, cls = '' } = {}) {
    const card = DUEL_CARDS[c.cardId];
    const e = el(card.element);
    const r = Math.max(0, c.hp) / c.maxHp;
    const tags = [];
    if (card.resistance) tags.push(h('span', { class: 'tag res', title: 'Resistência fixa' }, `🛡${card.resistance}`));
    for (const [we, m] of Object.entries(card.weaknesses || {})) tags.push(h('span', { class: 'tag weak', title: `Fraqueza a ${el(we).name}` }, `${el(we).icon}×${m}`));
    const round = this.dm?.round ?? this.duel.round;
    for (const s of c.shields || []) if (s.from <= Math.max(round, 1) && s.until >= round) tags.push(h('span', { class: 'tag sh' }, `◈${pct(s.pct)}·${s.until - round + 1}`));
    for (const cd of c.conditions || []) tags.push(h('span', { class: 'tag cond', title: CONDITION_NAMES[cd.type] }, `${COND_ICON[cd.type]}${cd.remaining}`));
    if (card.passive) tags.push(h('span', { class: 'tag pas', title: card.passive.name }, '✦'));
    const node = h('div', { class: `dcard ${big ? 'big' : ''} ${c.hp <= 0 || c.ko ? 'ko' : ''} ${cls}`, 'data-iid': c.iid, style: { '--el': e.color, '--el-dark': e.dark, '--el-light': e.light }, onclick: onclick || (() => this.cardDetails(c)) },
      h('div', { class: 'inner' },
        h('div', { class: 'top' }, h('span', { class: 'n' }, card.name), h('span', {}, e.icon)),
        h('div', { class: 'art' }, h('img', { src: art.monUrl(card.art), alt: '' })),
        h('div', { class: 'hpbar' }, h('i', { style: { width: `${r * 100}%`, background: r > 0.5 ? '#5ad06a' : r > 0.2 ? '#ffc53d' : '#ff5a5a' } })),
        h('div', { class: 'hpn' }, `${Math.max(0, c.hp)}/${c.maxHp} PV`),
        h('div', { class: 'tags' }, tags)));
    return node;
  }

  barEl(p, side) {
    const pips = h('span', { class: 'd-pips', title: 'KOs' }, Array.from({ length: RULES.KOS_TO_WIN }, (_, i) => h('span', { class: `d-pip ${i < p.kos ? 'on' : ''}` })), h('span', { style: { marginLeft: '4px' } }, `${p.kos}/${RULES.KOS_TO_WIN} KOs`));
    const ed = h('span', { class: 'd-ed', title: 'Energia de Duelo' }, Array.from({ length: RULES.ED_MAX }, (_, i) => h('i', { class: i < p.ed ? 'on' : '' })), h('span', { style: { marginLeft: '4px' } }, `${p.ed} ED`));
    const items = [h('span', { class: 'nm' }, side === 0 ? '🧑 Você' : `🤖 ${p.name}`), pips, ed, h('span', { class: 'd-spacer' }),
      h('span', { class: 'd-meta' }, `✋ ${p.hand.length} · 🂠 ${p.deckCount} · ⚰ ${p.graveCount}`)];
    if (side === 1) items.push(h('button', { class: 'btn ghost d-exit', onclick: () => this.confirmExit() }, 'Sair'));
    return items;
  }

  fieldEl(p, side, pending) {
    const nodes = [];
    const slot = (i) => {
      const s = p.secs[i];
      if (s) return h('div', { class: 'd-slot' }, this.cardEl(s, { cls: this.selClass(s.iid) }));
      const pl = pending && pending.place.find((x) => x.slot === i);
      if (pl) return h('div', { class: 'd-slot empty pending' }, `Entrará: ${DUEL_CARDS[this.dmCard(pl.iid).cardId].name}`);
      return h('div', { class: 'd-slot empty' }, `Secundário ${i + 1}`);
    };
    nodes.push(slot(0));
    nodes.push(h('div', { class: 'd-mainslot' }, p.main ? this.cardEl(p.main, { big: true, cls: this.selClass(p.main.iid) }) : h('div', { class: 'd-slot empty', style: { width: '100%', height: '180px' } }, 'Sem principal')));
    nodes.push(slot(1));
    void side;
    return nodes;
  }

  selClass(iid) {
    if (this.phaseUI === 'setup') return this.setupSel.main === iid ? 'sel' : this.setupSel.secs.includes(iid) ? 'sel2' : '';
    return '';
  }

  render() {
    const dm = this.dm;
    const [me, opp] = dm.players;
    this.oppBar.replaceChildren(...this.barEl(opp, 1));
    this.myBar.replaceChildren(...this.barEl(me, 0));
    this.oppField.replaceChildren(...this.fieldEl(opp, 1));
    this.myField.replaceChildren(...this.fieldEl(me, 0, this.phaseUI === 'planning' ? this.plan.free : null));
    const planned = new Set(this.phaseUI === 'planning' ? [...this.plan.free.place.map((x) => x.iid), this.plan.free.replace?.iid, this.plan.action?.type === 'switch' ? this.plan.action.iid : null].filter(Boolean) : []);
    this.handEl.replaceChildren(...me.hand.map((c) => this.cardEl(c, { cls: `${planned.has(c.iid) ? 'planned' : ''} ${this.selClass(c.iid)}`, onclick: () => this.onHandCard(c) })));
    this.center.replaceChildren(
      h('div', { class: 'd-round' }, dm.round ? `Rodada ${dm.round}` : 'Preparação'),
      h('div', { class: 'd-status' }, this.status || ''),
      this.timerEl = h('div', { class: 'd-timer' }, ''),
      h('div', { class: 'd-log' }, this.logLines.slice(-2).join(' • ')));
  }

  log(t) { this.logLines.push(t); if (this.logLines.length > 30) this.logLines.shift(); }

  // ---------------- Preparação ----------------
  renderSetup() {
    this.phaseUI = 'setup';
    this.dm = this.snapshot();
    this.status = 'Escolha 1 principal e até 2 secundários da sua mão';
    this.render();
    const sel = this.setupSel;
    const txt = sel.main ? `Principal: ${this.nameOf(sel.main)}${sel.secs.length ? ` · Secundários: ${sel.secs.map((x) => this.nameOf(x)).join(', ')}` : ''}` : 'Toque numa carta para escolher o principal; depois toque em até 2 para secundários.';
    this.actionsEl.replaceChildren(h('div', { class: 'd-confirm' },
      h('div', { class: 'd-plan' }, txt),
      h('button', { class: 'btn ghost small', onclick: () => { this.setupSel = { main: null, secs: [] }; this.renderSetup(); } }, 'Limpar'),
      h('button', { class: 'btn gold', disabled: sel.main ? null : true, onclick: () => this.confirmSetup() }, 'Confirmar')));
  }

  nameOf(iid) { const c = this.dmCard(iid) || this.duel.find(iid); return c ? DUEL_CARDS[c.cardId].name : '?'; }

  async confirmSetup() {
    const d = this.duel;
    const r = d.submitSetup(0, { main: this.setupSel.main, secondaries: this.setupSel.secs });
    if (!r.ok) { this.toast(r.error); return; }
    const r2 = d.submitSetup(1, aiSetup(d, 1));
    sfx.play('select');
    this.phaseUI = 'anim';
    this.dm = this.snapshot();
    this.status = 'Os Monstrins entram em campo!';
    this.render();
    for (const n of this.root.querySelectorAll('.d-field .dcard')) n.classList.add('enter');
    await wait(700);
    void r2;
    this.beginPlanning();
  }

  // ---------------- Planejamento ----------------
  beginPlanning() {
    const d = this.duel;
    if (d.result) { this.showEnd(); return; }
    this.phaseUI = 'planning';
    this.plan = { action: null, free: { place: [], replace: null } };
    this.dm = this.snapshot();
    this.status = 'Planeje em segredo e confirme';
    this.renderPlanning();
    this.startTimer();
  }

  startTimer() {
    clearInterval(this.timerId);
    if (!this.settings.timer) return;
    this.timeLeft = RULES.TURN_SECONDS;
    this.timerId = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timerEl) { this.timerEl.textContent = `⏱ ${this.timeLeft}s`; this.timerEl.classList.toggle('low', this.timeLeft <= 10); }
      if (this.timeLeft <= 0) { clearInterval(this.timerId); this.confirmPlan(true); }
    }, 1000);
  }

  renderPlanning() {
    this.render();
    if (this.settings.timer && this.timerEl) this.timerEl.textContent = `⏱ ${this.timeLeft ?? RULES.TURN_SECONDS}s`;
    const d = this.duel;
    const me = d.players[0];
    const legal = d.legalActions(0);
    const btns = [];
    const isSel = (a) => JSON.stringify(this.plan.action) === JSON.stringify(a);
    for (const la of legal.filter((x) => x.type === 'ability' || x.type === 'special')) {
      const ab = la.ability;
      const e = el(ab.element || (ab.kind === 'attack' ? 'neutro' : 'agua'));
      const action = la.type === 'ability' ? { type: 'ability', abilityId: ab.id } : { type: 'special', slot: la.slot };
      const who = la.type === 'special' ? `Especial de ${DUEL_CARDS[me.secs[la.slot].cardId].name}: ` : '';
      const b = h('button', { class: `d-act ${isSel(action) ? 'on' : ''}`, style: { '--el': e.color, '--el-dark': e.dark }, title: la.reason || '', onclick: () => this.pickAction(action, ab) },
        `${who}${ab.name}`, h('span', { class: 'cost' }, `${ab.cost || 0} ED`), h('small', {}, la.ok ? abilityText(ab) : `⛔ ${la.reason}`));
      if (!la.ok) b.disabled = true;
      btns.push(b);
    }
    btns.push(h('button', { class: `d-act ghost ${this.plan.action?.type === 'switch' ? 'on' : ''}`, onclick: () => this.switchMenu() }, '🔄 Trocar principal', h('small', {}, this.plan.action?.type === 'switch' ? `Entra: ${this.nameOf(this.plan.action.slot !== undefined ? me.secs[this.plan.action.slot].iid : this.plan.action.iid)}` : 'Consome a ação; o novo principal recebe os ataques.')));
    if (d.config.itemsEnabled) {
      const left = RULES.ITEM_USES_PVE - me.itemUses;
      const it = DUEL_ITEMS.tonico_duelo;
      const b = h('button', { class: `d-act ghost ${this.plan.action?.type === 'item' ? 'on' : ''}`, onclick: () => this.pickAction({ type: 'item', itemId: it.id, targetIid: me.main.iid }) }, `🧪 ${it.name}`, h('small', {}, `${it.desc} Restam ${left}.`));
      if (left <= 0) b.disabled = true;
      btns.push(b);
    }
    const free = this.plan.free;
    const freeTxt = [...free.place.map((x) => `posicionar ${this.nameOf(x.iid)}`), free.replace ? `substituir por ${this.nameOf(free.replace.iid)}` : null].filter(Boolean).join(', ');
    const a = this.plan.action;
    let actTxt = 'Nenhuma ação escolhida';
    if (a?.type === 'ability') actTxt = `Ação: ${me.main.card.abilities.find((x) => x.id === a.abilityId).name}`;
    if (a?.type === 'special') actTxt = `Ação: especial de ${DUEL_CARDS[me.secs[a.slot].cardId].name}`;
    if (a?.type === 'switch') actTxt = 'Ação: trocar principal';
    if (a?.type === 'item') actTxt = 'Ação: usar item';
    this.actionsEl.replaceChildren(
      h('div', { class: 'd-actions' }, btns),
      h('div', { class: 'd-confirm' },
        h('div', { class: 'd-plan' }, actTxt, freeTxt ? h('div', { style: { color: '#ffd23f' } }, `Grátis: ${freeTxt}`) : h('div', { class: 'hint', style: { color: '#aab2d6' } }, 'Toque numa carta da mão para posicionar/substituir secundários (grátis).')),
        h('button', { class: 'btn gold', disabled: a ? null : true, onclick: () => this.confirmPlan(false) }, '✔ Confirmar')));
  }

  async pickAction(action, ab) {
    sfx.play('cursor');
    this.plan.action = action;
    delete this.plan.reviveTarget; delete this.plan.sendBackIid;
    if (ab && ab.kind === 'revive') {
      const me = this.duel.players[0];
      const t = await this.chooseCards('Reviver qual Monstrin do Cemitério?', me.grave);
      if (!t) { this.plan.action = null; this.renderPlanning(); return; }
      this.plan.reviveTarget = t;
      if (me.hand.length >= RULES.HAND_SIZE) {
        const back = await this.chooseCards('Sua mão está cheia: qual carta vai para o fundo do deck?', me.hand);
        if (!back) { this.plan.action = null; this.renderPlanning(); return; }
        this.plan.sendBackIid = back;
      }
    }
    this.renderPlanning();
  }

  async switchMenu() {
    const me = this.duel.players[0];
    const used = new Set([...this.plan.free.place.map((x) => x.iid), this.plan.free.replace?.iid].filter(Boolean));
    const opts = [...me.secs.filter(Boolean).filter((s, i) => !(this.plan.free.replace && this.plan.free.replace.slot === me.secs.indexOf(s)) && i >= 0), ...me.hand.filter((c) => !used.has(c.iid))];
    const iid = await this.chooseCards('Quem entra como principal? (consome a ação)', opts);
    if (!iid) return;
    const slot = me.secs.findIndex((s) => s && s.iid === iid);
    this.plan.action = slot >= 0 ? { type: 'switch', slot } : { type: 'switch', iid };
    sfx.play('cursor');
    this.renderPlanning();
  }

  async onHandCard(c) {
    if (this.phaseUI === 'setup') {
      const sel = this.setupSel;
      if (sel.main === c.iid) sel.main = null;
      else if (sel.secs.includes(c.iid)) sel.secs = sel.secs.filter((x) => x !== c.iid);
      else if (!sel.main) sel.main = c.iid;
      else if (sel.secs.length < RULES.MAX_SECONDARIES) sel.secs.push(c.iid);
      sfx.play('cursor');
      this.renderSetup();
      return;
    }
    if (this.phaseUI !== 'planning') { this.cardDetails(c); return; }
    const me = this.duel.players[0];
    const free = this.plan.free;
    const opts = [];
    const placedIdx = free.place.findIndex((x) => x.iid === c.iid);
    if (placedIdx >= 0) opts.push(['Cancelar posicionamento', () => free.place.splice(placedIdx, 1)]);
    else if (free.replace?.iid === c.iid) opts.push(['Cancelar substituição', () => { free.replace = null; }]);
    else {
      for (const i of [0, 1]) {
        if (!me.secs[i] && !free.place.some((x) => x.slot === i) && free.place.length < RULES.FREE_PLACEMENTS_PER_ROUND) opts.push([`Posicionar como secundário ${i + 1} (grátis)`, () => free.place.push({ iid: c.iid, slot: i })]);
        if (me.secs[i] && !free.replace) opts.push([`Substituir ${DUEL_CARDS[me.secs[i].cardId].name} (grátis, 1 por rodada)`, () => { free.replace = { slot: i, iid: c.iid }; }]);
      }
    }
    opts.push(['Ver detalhes da carta', () => this.cardDetails(c)]);
    const box = this.modal(DUEL_CARDS[c.cardId].name, (b, close) => {
      b.append(h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } }, h('div', { style: { width: '110px', flex: 'none' } }, this.cardEl(c, { onclick: () => {} })),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 } }, opts.map(([t, fn]) => h('button', { class: 'btn ghost small', style: { justifyContent: 'flex-start' }, onclick: () => { close(); fn(); const err = this.duel.validatePlan(me, this.plan.action ? this.plan : { ...this.plan, action: { type: 'timeout' } }); if (err) { this.toast(err); } this.renderPlanning(); } }, t)))));
    });
    void box;
  }

  async confirmPlan(timedOut) {
    const d = this.duel;
    if (this.phaseUI !== 'planning') return;
    let plan = this.plan;
    if (timedOut) plan = { action: { type: 'timeout' } };
    const r = d.submit(0, plan);
    if (!r.ok) { this.toast(r.error); return; }
    clearInterval(this.timerId);
    sfx.play('select');
    this.phaseUI = 'waiting';
    this.status = timedOut ? 'Tempo esgotado: Defesa Básica!' : 'Ação confirmada. Rival escolhendo...';
    this.actionsEl.replaceChildren();
    this.render();
    await wait(500 + Math.random() * 600);
    const ai = aiPlan(d, 1);
    const r2 = d.submit(1, ai);
    if (!r2.ok) d.submit(1, { action: { type: 'ability', abilityId: d.players[1].main.card.abilities[0].id } });
    const pre = this.snapshot();
    const events = d.resolveRound();
    await this.playEvents(pre, events);
  }

  // ---------------- Animação dos eventos ----------------
  rectOf(iid) {
    const n = this.root.querySelector(`.dcard[data-iid="${iid}"]`);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height * 0.4, w: r.width, h: r.height, node: n };
  }

  float(iid, text, color = '#fff', size = 26) {
    const r = this.rectOf(iid);
    if (!r) return;
    const f = h('div', { class: 'd-float', style: { left: `${r.x}px`, top: `${r.y}px`, color, fontSize: `${size}px` } }, text);
    this.fxLayer.append(f);
    setTimeout(() => f.remove(), 1200);
  }

  burst(iid, color, n = 12) {
    const r = this.rectOf(iid);
    if (!r) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = h('div', { class: 'd-particle', style: { left: `${r.x}px`, top: `${r.y}px`, background: color, boxShadow: `0 0 8px ${color}`, '--dx': `${Math.cos(a) * (40 + Math.random() * 40)}px`, '--dy': `${Math.sin(a) * (40 + Math.random() * 40)}px` } });
      this.fxLayer.append(p);
      setTimeout(() => p.remove(), 650);
    }
  }

  flashCard(iid, color) {
    const r = this.rectOf(iid);
    if (!r) return;
    const fx = h('div', { class: 'd-fx', style: { background: `radial-gradient(circle, ${color}cc, transparent 70%)` } });
    r.node.append(fx);
    setTimeout(() => fx.remove(), 520);
  }

  addClass(iid, cls, ms = 450) {
    const r = this.rectOf(iid);
    if (!r) return;
    r.node.classList.remove(cls);
    void r.node.offsetWidth;
    r.node.classList.add(cls);
    setTimeout(() => r.node.classList.remove(cls), ms);
  }

  banner(content, ms = 1400) {
    const b = h('div', { class: 'd-banner' }, content);
    this.root.append(b);
    return wait(ms).then(() => b.remove());
  }

  sideOf(iid) {
    for (const [i, p] of this.dm.players.entries()) for (const c of [p.main, ...p.secs, ...p.hand]) if (c && c.iid === iid) return i;
    return this.duel.find(iid)?.owner ?? 0;
  }

  async playEvents(pre, events) {
    this.phaseUI = 'anim';
    this.dm = pre;
    const dm = this.dm;
    const R = this.duel.round;
    const nm = (iid) => this.nameOf(iid);
    const findIn = (iid) => dm.cards.get(iid);
    for (const e of events) {
      const P = e.side !== undefined ? dm.players[e.side] : null;
      switch (e.type) {
        case 'reveal': {
          for (const a of e.actions) dm.players[a.side].ed -= a.cost;
          const desc = (a) => {
            const x = a.action;
            if (x.type === 'ability' || x.type === 'special') return [a.abilityName, `${nm(a.user)}${x.type === 'special' ? ' (especial)' : ''} · ${a.cost} ED`];
            if (x.type === 'switch') return ['Troca de principal', ''];
            if (x.type === 'item') return [DUEL_ITEMS[x.itemId].name, 'Item'];
            return ['Defesa Básica', 'tempo esgotado'];
          };
          const [m, o] = [e.actions.find((a) => a.side === 0), e.actions.find((a) => a.side === 1)];
          this.status = 'Ações reveladas!';
          this.render();
          sfx.play('alert');
          await this.banner(h('div', { class: 'd-reveal' },
            h('div', {}, h('small', {}, 'Você'), desc(m)[0], h('small', {}, desc(m)[1])),
            h('div', { style: { alignSelf: 'center', color: '#ffd23f' } }, 'VS'),
            h('div', {}, h('small', {}, 'Rival'), desc(o)[0], h('small', {}, desc(o)[1]))), 1500);
          break;
        }
        case 'replace': {
          const inc = findIn(e.in); const out = P.secs[e.slot];
          P.secs[e.slot] = inc;
          P.hand = P.hand.filter((c) => c.iid !== e.in);
          if (out) P.hand.push(out);
          this.log(`${P.name}: ${nm(e.in)} substitui ${nm(e.out)}.`);
          this.render(); this.addClass(e.in, 'enter'); sfx.play('select'); await wait(500);
          break;
        }
        case 'place': {
          P.secs[e.slot] = findIn(e.iid);
          P.hand = P.hand.filter((c) => c.iid !== e.iid);
          this.log(`${P.name} posicionou ${nm(e.iid)}.`);
          this.render(); this.addClass(e.iid, 'enter'); sfx.play('select'); await wait(450);
          break;
        }
        case 'switch': {
          const inc = e.fromHand ? findIn(e.in) : P.secs[e.fromSlot];
          const out = P.main;
          if (e.fromHand) { P.hand = P.hand.filter((c) => c.iid !== e.in); P.hand.push(out); } else P.secs[e.fromSlot] = out;
          P.main = inc;
          this.log(`${P.name} trocou o principal: entra ${nm(e.in)}.`);
          this.render(); this.addClass(e.in, 'enter'); sfx.play('select'); await wait(600);
          break;
        }
        case 'passive': {
          const c = this.dmCard(e.target);
          if (e.shield && c) c.shields.push({ pct: e.shield, from: R, until: R, scope: 'direct' });
          this.render(); this.addShieldFx(e.target);
          this.float(e.target, `✦ ${e.passive}`, '#7dffb0', 16); await wait(600);
          break;
        }
        case 'basicDefense': {
          for (const c of [P.main, ...P.secs].filter(Boolean)) c.shields.push({ pct: RULES.TIMEOUT_DEFENSE, from: R, until: R, scope: 'direct' });
          this.log(`${P.name}: Defesa Básica (${e.timeouts}/${RULES.TIMEOUTS_TO_FORFEIT} esgotamentos).`);
          this.render(); await wait(500);
          break;
        }
        case 'fail': case 'cancelled': {
          this.log(e.text);
          this.status = e.text; this.render(); sfx.play('miss');
          if (e.user) this.float(e.user, e.type === 'fail' ? `${COND_ICON[e.condition] || ''} Falhou!` : 'Cancelado!', '#ff9a9a', 20);
          await wait(900);
          break;
        }
        case 'interrupt': {
          this.log(`${P.name} usou ${e.ability} (Interrupção Imediata)!`);
          this.status = `${e.ability}!`; this.render(); sfx.play('zap');
          this.flashCard(e.user, '#fff6a8'); this.burst(e.user, '#fff6a8');
          await wait(700);
          break;
        }
        case 'shield': {
          const c = this.dmCard(e.target);
          if (c) c.shields.push({ pct: e.pct, from: R, until: R + e.duration - 1, scope: e.scope });
          this.log(`${nm(e.user)} usou ${e.ability}: escudo de ${pct(e.pct)}.`);
          this.status = `${e.ability}!`; this.render(); this.addShieldFx(e.target); sfx.play('stat');
          await wait(700);
          break;
        }
        case 'heal': case 'drain': {
          const c = this.dmCard(e.target || e.user);
          if (c) c.hp = e.hp;
          this.render();
          this.float(e.target || e.user, `+${e.amount}`, '#7dff9a', 26); this.burst(e.target || e.user, '#7dff9a', 8); sfx.play('heal');
          this.log(e.type === 'drain' ? `${nm(e.user)} drenou ${e.amount} PV.` : `${nm(e.target)} recuperou ${e.amount} PV${e.ability ? ` (${e.ability})` : e.source ? ` (${e.source})` : ''}.`);
          await wait(650);
          break;
        }
        case 'purify': {
          const c = this.dmCard(e.target);
          if (c) c.conditions = [];
          this.log(`${nm(e.target)} foi purificado.`);
          this.render(); this.burst(e.target, '#ffffff', 10); sfx.play('heal');
          await wait(550);
          break;
        }
        case 'revive': {
          this.log(`${P.name} reviveu ${nm(e.iid)} (volta à mão com 100% dos PV)!`);
          this.status = `${e.ability}: ${nm(e.iid)} voltou!`; this.render(); sfx.play('levelup');
          await wait(900);
          break;
        }
        case 'attack': {
          const color = el(e.element || 'neutro').color;
          this.status = `${nm(e.user)} usou ${e.ability}!`;
          this.log(this.status);
          this.render();
          this.addClass(e.user, e.side === 0 ? 'lunge-up' : 'lunge-down', 420);
          sfx.play({ fogo: 'fire', agua: 'water', planta: 'leaf', eletrico: 'zap', pedra: 'rock' }[e.element] || 'hit');
          await wait(280);
          for (const t of e.targets) { this.flashCard(t, color); this.burst(t, color, 14); }
          await wait(260);
          break;
        }
        case 'hit': {
          if (e.cancelledHit) break;
          if (e.miss) { this.float(e.target, 'Errou!', '#c8d0e0', 22); sfx.play('miss'); await wait(380); break; }
          this.addClass(e.target, 'shake', 360);
          let t = `-${e.dmg}`;
          if (e.crit) t += ' CRÍTICO!';
          if (e.elementMod > 1) t += ` ×${e.elementMod}`;
          this.float(e.target, t, e.crit ? '#ffe14a' : e.elementMod > 1 ? '#ffb36b' : e.dmg === 0 ? '#aab2d6' : '#ffffff', e.crit || e.elementMod > 1 ? 30 : 26);
          sfx.play(e.crit || e.elementMod > 1 ? 'superhit' : e.dmg ? 'hit' : 'weakhit');
          await wait(380);
          break;
        }
        case 'damage': {
          const c = this.dmCard(e.target);
          if (c) c.hp = e.hp;
          this.render();
          await wait(250);
          break;
        }
        case 'retaliate': {
          const c = this.dmCard(e.target);
          if (c) c.hp = e.hp;
          this.log(`${e.passive} de ${nm(e.bearer)} causou ${e.amount} de dano em ${nm(e.target)}!`);
          this.render(); this.addClass(e.target, 'shake', 360);
          this.float(e.target, `✦-${e.amount}`, '#7dffb0', 24); sfx.play('hit');
          await wait(600);
          break;
        }
        case 'condition': {
          const c = this.dmCard(e.target);
          if (c) { c.conditions = c.conditions.filter((x) => x.type !== e.condition); c.conditions.push({ type: e.condition, remaining: e.duration }); }
          this.log(`${nm(e.target)}: ${CONDITION_NAMES[e.condition]}${e.replaced ? ' (mais forte)' : ''}!`);
          this.render(); this.float(e.target, `${COND_ICON[e.condition]} ${CONDITION_NAMES[e.condition]}`, '#d9a8ff', 18); sfx.play('statdown');
          await wait(550);
          break;
        }
        case 'immune': case 'blocked': {
          this.float(e.target, e.type === 'immune' ? 'Imune!' : 'Bloqueado!', '#bfe9ff', 18);
          this.log(`${nm(e.target)} ${e.type === 'immune' ? 'é imune a' : 'bloqueou'} ${CONDITION_NAMES[e.condition]}.`);
          await wait(450);
          break;
        }
        case 'tick': {
          const c = this.dmCard(e.target);
          if (c) c.hp = e.hp;
          this.render(); this.addClass(e.target, 'shake', 360);
          this.float(e.target, `${COND_ICON[e.condition]} -${e.amount}`, '#d9a8ff', 24); sfx.play('weakhit');
          this.log(`${nm(e.target)} sofreu ${e.amount} de ${CONDITION_NAMES[e.condition]}.`);
          await wait(550);
          break;
        }
        case 'conditionEnd': {
          const c = this.dmCard(e.target);
          if (c) c.conditions = c.conditions.filter((x) => x.type !== e.condition);
          break;
        }
        case 'ko': {
          const c = this.dmCard(e.target);
          if (c) { c.ko = true; c.hp = 0; }
          dm.players[e.by].kos = e.kos;
          this.log(`KO! ${nm(e.target)} foi derrotado (${e.cause}). ${dm.players[e.by].name}: ${e.kos} KO(s).`);
          this.status = `KO em ${nm(e.target)}!`;
          this.render(); sfx.play('faint');
          await wait(900);
          break;
        }
        case 'end': {
          this.dm = this.snapshot(); this.render();
          await wait(500);
          this.showEnd();
          return;
        }
        case 'needReplace': {
          this.dm = this.snapshot();
          this.render();
          break;
        }
        default: break;
      }
    }
    await this.handleReplacements();
  }

  addShieldFx(iid) {
    const r = this.rectOf(iid);
    if (!r) return;
    const s = h('div', { class: 'shieldfx' });
    r.node.append(s);
    setTimeout(() => s.remove(), 900);
  }

  async handleReplacements() {
    const d = this.duel;
    while (d.phase === 'replace') {
      if (d.players[1].pendingReplace) {
        const res = d.chooseReplacement(1, aiReplacement(d, 1));
        this.log(`Rival: ${this.nameOf(res.events[0].iid)} assume como principal.`);
      }
      if (d.players[0].pendingReplace) {
        const p = d.players[0];
        const opts = d.replaceOptions(p);
        this.dm = this.snapshot(); this.status = 'Seu principal caiu! Escolha o substituto.'; this.render();
        let iid = null;
        while (!iid) iid = await this.chooseCards(p.secs.some(Boolean) ? 'Qual secundário assume como principal?' : 'Escolha um Monstrin da mão para ser o principal', opts, false);
        d.chooseReplacement(0, iid);
        sfx.play('select');
      }
    }
    this.dm = this.snapshot();
    this.render();
    for (const n of this.root.querySelectorAll('.d-mainslot .dcard')) n.classList.add('enter');
    await wait(400);
    this.beginPlanning();
  }

  showEnd() {
    clearInterval(this.timerId);
    const r = this.duel.result;
    const title = r.winner === 0 ? '🏆 Vitória!' : r.winner === 1 ? 'Derrota...' : '🤝 Empate!';
    sfx.play(r.winner === 0 ? 'victory' : r.winner === 1 ? 'defeat' : 'select');
    const [me, opp] = this.duel.players;
    this.modal(title, (b, close) => {
      b.append(h('p', { style: { fontWeight: 800, fontSize: '17px' } }, `Motivo: ${r.reason}.`),
        h('p', { style: { color: '#cfd6ff', fontWeight: 700 } }, `Placar de KOs — Você ${me.kos} × ${opp.kos} Rival · ${this.duel.round} rodada(s).`),
        h('div', { class: 'actions' },
          h('button', { class: 'btn gold', onclick: () => { close(); this.startMatch(this.deckId); } }, 'Jogar de novo'),
          h('button', { class: 'btn ghost', onclick: () => { close(); this.deckScreen(); } }, 'Trocar baralho'),
          h('button', { class: 'btn ghost', onclick: () => { close(); this.close(); } }, 'Sair da arena')));
    }, false);
  }

  // ---------------- Janelas auxiliares ----------------
  modal(title, build, closable = true) {
    const wrap = h('div', { class: 'd-modal' });
    const box = h('div', { class: 'box' }, h('h3', {}, title));
    const close = () => wrap.remove();
    build(box, close);
    if (closable) { box.append(h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button', { class: 'btn ghost small', onclick: close }, 'Fechar'))); wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); }); }
    wrap.append(box);
    this.root.append(wrap);
    return { close };
  }

  chooseCards(title, cards, cancellable = true) {
    return new Promise((resolve) => {
      let done = false;
      const m = this.modal(title, (b, close) => {
        b.append(h('div', { class: 'grid' }, cards.map((c) => this.cardEl(this.pub(c) || c, { onclick: () => { done = true; close(); resolve(c.iid); } }))));
        if (cancellable) b.append(h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button', { class: 'btn ghost small', onclick: () => { done = true; close(); resolve(null); } }, 'Cancelar')));
      }, false);
      void m; void done;
    });
  }

  cardDetails(c) {
    const card = DUEL_CARDS[c.cardId];
    const e = el(card.element);
    this.modal(`${card.name} — ${e.icon} ${e.name}`, (b) => {
      b.append(h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' } },
        h('div', { style: { width: '130px', flex: 'none' } }, this.cardEl(c, { big: true, onclick: () => {} })),
        h('div', { style: { flex: 1, minWidth: '200px', fontWeight: 700, fontSize: '14px', lineHeight: 1.6 } },
          h('div', {}, `PV: ${c.hp}/${c.maxHp} · Resistência fixa: ${card.resistance || 0}`),
          h('div', {}, `Fraquezas: ${Object.entries(card.weaknesses || {}).map(([k, v]) => `${el(k).name} ×${v}`).join(', ') || 'nenhuma'}`),
          h('div', {}, `Imunidades: ${(card.immunities || []).map((x) => CONDITION_NAMES[x]).join(', ') || 'nenhuma'}`),
          (c.conditions || []).length ? h('div', {}, `Condições: ${c.conditions.map((x) => `${CONDITION_NAMES[x.type]} (${x.remaining} rod.)`).join(', ')}`) : null,
          (c.shields || []).length ? h('div', {}, `Escudos: ${c.shields.map((x) => `${pct(x.pct)}${x.scope === 'all' ? ' (todos os danos)' : ''}`).join(', ')}`) : null)));
      b.append(h('div', { class: 'section-title' }, 'Habilidades (como principal)'));
      for (const ab of card.abilities) b.append(h('div', { class: 'd-abl' }, h('b', {}, `${ab.name} · ${ab.cost || 0} ED`), h('small', {}, abilityText(ab)), ab.desc ? h('small', {}, ab.desc) : null));
      if (card.special) b.append(h('div', { class: 'section-title' }, 'Especial (como secundário)'), h('div', { class: 'd-abl' }, h('b', {}, `${card.special.name} · ${card.special.cost || 0} ED${c.usedOnce?.[card.special.id] ? ' · JÁ USADO' : ''}`), h('small', {}, abilityText(card.special)), card.special.desc ? h('small', {}, card.special.desc) : null));
      if (card.passive) b.append(h('div', { class: 'section-title' }, 'Passiva'), h('div', { class: 'd-abl' }, h('b', {}, card.passive.name), h('small', {}, card.passive.desc || '')));
    });
  }

  toast(text) {
    const t = h('div', { class: 'd-banner', style: { borderColor: '#ff7a7a', fontSize: '16px', top: '20%' } }, text);
    this.root.append(t);
    setTimeout(() => t.remove(), 1800);
    sfx.play('bump');
  }

  async confirmExit() {
    if (this.duel?.result) { this.close(); return; }
    this.modal('Sair do duelo?', (b, close) => {
      b.append(h('p', { style: { fontWeight: 700 } }, 'A partida atual será abandonada.'),
        h('div', { class: 'actions' }, h('button', { class: 'btn red', onclick: () => { close(); this.close(); } }, 'Sair'), h('button', { class: 'btn ghost', onclick: close }, 'Continuar duelando')));
    }, false);
  }
}

export const arena = new Arena();
