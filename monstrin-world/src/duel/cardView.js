// Visual das cartas de Monstrin (duelo, mão, campo, deck).
// As habilidades fazem parte da própria carta: na versão ampliada cada
// habilidade é uma área tocável dentro da carta.
import { h } from '../ui/ui.js';
import { art } from '../art/registry.js';
import { ELEMENTS } from '../data/elements.js';
import { RULES } from './rules.js';
import { DUEL_CARDS } from './cards.js';
import { CONDITION_NAMES } from './engine.js';

export const COND_ICON = { poison: '☠️', burn: '🔥', paralysis: '⚡', sleep: '💤', freeze: '❄️' };
const el = (id) => ELEMENTS[id] || ELEMENTS.neutro;
const pct = (x) => `${Math.round(x * 100)}%`;

// Texto curto e compreensível de uma habilidade.
export function abilityText(ab) {
  if (!ab) return '';
  const parts = [];
  if (ab.kind === 'attack') {
    const d = ab.damage || {};
    let dmg = `${d.fixed || 0}`;
    if (d.pct) dmg += ` + ${pct(d.pct)} dos PV máx.`;
    parts.push(`${ab.hits > 1 ? `${ab.hits} golpes de ` : ''}${dmg} de dano${ab.target === 'area' ? ' em TODOS os adversários em campo' : ' no principal adversário'}`);
    parts.push(`precisão ${ab.accuracy ?? 100}%`);
    if (ab.crit?.chance) parts.push(`crítico ${pct(ab.crit.chance)} (×${ab.crit.mult ?? RULES.DEFAULT_CRIT_MULT})`);
    if (ab.drain) parts.push(`recupera ${pct(ab.drain)} do dano causado`);
    if (ab.pierce?.resistance) parts.push(`ignora ${pct(ab.pierce.resistance)} da resistência`);
    if (ab.pierce?.shield) parts.push(`atravessa ${pct(ab.pierce.shield)} dos escudos`);
    for (const e of ab.effects || []) {
      let t = `${pct(e.chance ?? 1)} de ${CONDITION_NAMES[e.condition]}`;
      if (e.dmg) t += ` (${e.dmg} por rodada)`;
      if (e.intensity) t += ` (${pct(e.intensity)} de perder a ação)`;
      parts.push(`${t} por ${e.duration} rodada(s)`);
    }
  }
  if (ab.shield) parts.push(`escudo de ${pct(ab.shield.pct)} por ${ab.shield.duration} rodada(s)${ab.shield.scope === 'all' ? ', também contra dano indireto' : ''}${ab.shield.blocksConditions ? ', bloqueia novas condições' : ''}`);
  if (ab.purify) parts.push('remove todas as condições');
  if (ab.heal) parts.push(`cura ${ab.heal.fixed ? `${ab.heal.fixed} PV` : `${pct(ab.heal.pct)} dos PV máx.`}`);
  if (ab.kind === 'revive') parts.push('traz um Monstrin do Cemitério de volta à mão com 100% dos PV');
  if (ab.interrupt) parts.push('Interrupção Imediata: cancela o ataque confirmado do adversário nesta rodada');
  if (ab.target === 'main' && ab.kind !== 'attack') parts.push('no seu principal');
  if (ab.oncePerDuel) parts.push('1 vez por duelo');
  const s = parts.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

function gems(n) {
  if (!n) return h('span', { class: 'mc-cost free' }, 'Grátis');
  return h('span', { class: 'mc-cost', title: `${n} ED` }, Array.from({ length: n }, () => h('i')));
}

// Linha de habilidade (área interativa dentro da carta).
export function abilityRow(ab, { state = 'info', reason, onclick, label } = {}) {
  const e = el(ab.element || (ab.kind === 'attack' ? 'neutro' : 'agua'));
  const btn = h(onclick ? 'button' : 'div', {
    class: `mc-ab ${state}`, style: { '--ab': e.color },
    type: onclick ? 'button' : null,
    onclick: onclick && state !== 'disabled' ? onclick : null,
    'aria-pressed': state === 'selected' ? 'true' : null,
    'aria-disabled': state === 'disabled' ? 'true' : null,
  },
  h('span', { class: 'mc-ab-head' }, gems(ab.cost || 0), h('b', {}, ab.name), label ? h('span', { class: 'mc-ab-tag' }, label) : null, state === 'selected' ? h('span', { class: 'mc-ab-check' }, '✔') : null),
  h('span', { class: 'mc-ab-txt' }, abilityText(ab)),
  reason ? h('span', { class: 'mc-ab-why' }, `⛔ ${reason}`) : null);
  return btn;
}

// Chips de estado (escudos e condições) de uma carta em jogo.
export function stateChips(c, round) {
  const chips = [];
  for (const s of c.shields || []) {
    if (s.from <= Math.max(round, 1) && s.until >= round) chips.push(h('span', { class: 'mc-chip sh', title: `Escudo ${pct(s.pct)}` }, `🛡${pct(s.pct)}`));
  }
  for (const cd of c.conditions || []) chips.push(h('span', { class: 'mc-chip cond', title: `${CONDITION_NAMES[cd.type]}: ${cd.remaining} rodada(s)` }, `${COND_ICON[cd.type]}${cd.remaining}`));
  return chips;
}

/**
 * Carta compacta (campo, mão, coleção).
 * c: { iid, cardId, hp, maxHp, conditions, shields } ou { cardId } para coleção
 */
export function cardMini(c, { cls = '', round = 1, badge, onclick, count, showHp = true } = {}) {
  const card = DUEL_CARDS[c.cardId];
  const e = el(card.element);
  const hp = c.hp ?? card.hp;
  const max = c.maxHp ?? card.hp;
  const r = Math.max(0, hp) / max;
  const node = h('button', {
    type: 'button',
    class: `mc ${cls} ${hp <= 0 || c.ko ? 'ko' : ''}`,
    'data-iid': c.iid || null,
    style: { '--el': e.color, '--el-dark': e.dark, '--el-light': e.light },
    onclick,
    'aria-label': `${card.name}, ${Math.max(0, hp)} de ${max} PV`,
  },
  h('span', { class: 'mc-frame' },
    h('span', { class: 'mc-top' }, h('span', { class: 'mc-name' }, card.name), h('span', { class: 'mc-el' }, e.icon)),
    h('span', { class: 'mc-art' }, h('img', { src: art.monUrl(card.art), alt: '', draggable: 'false' })),
    showHp ? h('span', { class: 'mc-hp' }, h('i', { style: { width: `${r * 100}%`, background: r > 0.5 ? '#5ad06a' : r > 0.2 ? '#ffc53d' : '#ff5a5a' } })) : null,
    showHp ? h('span', { class: 'mc-hpn' }, `${Math.max(0, hp)}/${max}`) : h('span', { class: 'mc-hpn' }, `${card.hp} PV`),
    h('span', { class: 'mc-chips' }, stateChips(c, round))),
  badge ? h('span', { class: 'mc-badge' }, badge) : null,
  count !== undefined ? h('span', { class: 'mc-count' }, `×${count}`) : null);
  return node;
}

/**
 * Carta ampliada: mostra todos os detalhes e as habilidades como áreas da carta.
 * opts.abilities: [{ ab, state, reason, onclick, label }]
 * opts.footer: elementos extras (ações contextuais) dentro da moldura da carta
 */
export function cardZoom(c, { role, round = 1, abilities = [], footer = [], note } = {}) {
  const card = DUEL_CARDS[c.cardId];
  const e = el(card.element);
  const hp = c.hp ?? card.hp;
  const max = c.maxHp ?? card.hp;
  const r = Math.max(0, hp) / max;
  const weak = Object.entries(card.weaknesses || {}).map(([k, v]) => h('span', { class: 'mc-chip weak' }, `Fraco a ${el(k).icon} ${el(k).name} ×${v}`));
  const imm = (card.immunities || []).map((x) => h('span', { class: 'mc-chip imm' }, `Imune a ${CONDITION_NAMES[x]}`));
  return h('div', { class: 'mc mc-zoom', style: { '--el': e.color, '--el-dark': e.dark, '--el-light': e.light }, 'data-iid': c.iid || null },
    h('div', { class: 'mc-frame' },
      h('div', { class: 'mc-top' }, h('span', { class: 'mc-name' }, card.name), h('span', { class: 'mc-type' }, `${e.icon} ${e.name}`)),
      role ? h('div', { class: 'mc-role' }, role) : null,
      h('div', { class: 'mc-art' }, h('img', { src: art.monUrl(card.art), alt: card.name, draggable: 'false' })),
      h('div', { class: 'mc-hp big' }, h('i', { style: { width: `${r * 100}%`, background: r > 0.5 ? '#5ad06a' : r > 0.2 ? '#ffc53d' : '#ff5a5a' } })),
      h('div', { class: 'mc-stats' }, h('b', {}, `${Math.max(0, hp)}/${max} PV`), card.resistance ? h('span', { class: 'mc-chip res' }, `Resistência ${card.resistance}`) : null, ...weak, ...imm, ...stateChips(c, round)),
      note ? h('div', { class: 'mc-note' }, note) : null,
      abilities.length ? h('div', { class: 'mc-abs' }, abilities.map((a) => abilityRow(a.ab, a))) : null,
      card.passive ? h('div', { class: 'mc-passive' }, h('b', {}, `✦ ${card.passive.name}`), ` — ${card.passive.desc || ''}`) : null,
      footer.length ? h('div', { class: 'mc-foot' }, footer) : null));
}
