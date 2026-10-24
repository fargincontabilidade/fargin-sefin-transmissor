// Telas de Coleção e Decks (visual PROVISÓRIO).
// A carta é desenhada por cardTile(). Quando chegarem as molduras, versos e
// acabamentos aprovados, basta preencher card.visual (ver data/cards.js) e o
// CSS das classes .card-tile — o restante do sistema não muda.
import { h, ui } from './ui.js';
import { app } from '../app.js';
import { CONFIG } from '../config.js';
import { ELEMENTS } from '../data/elements.js';
import { CARD_TYPES, CARD_RARITIES, RARITY_ORDER, cardList, getCard } from '../data/cards.js';
import {
  cardCount, deckTotal, validateDeck, canAdd, createDeck, saveDeck, deleteDeck, setActiveDeck, getDeck,
} from '../core/decks.js';
import { art } from '../art/registry.js';
import { sfx } from '../audio/sfx.js';

// ---------- Componentes ----------
function cardArt(card) {
  if (card.visual?.artOverride) return h('img', { src: card.visual.artOverride, alt: '' });
  if (card.art.kind === 'monstrin') return h('img', { src: art.monUrl(card.art.ref), alt: '' });
  if (card.art.kind === 'item') return h('img', { src: art.itemUrl(card.art.ref), alt: '' });
  const el = ELEMENTS[card.art.ref] || ELEMENTS.neutro;
  return h('span', { class: 'ct-icon', style: { background: `radial-gradient(circle at 50% 40%, ${el.light}, ${el.color})` } }, el.icon);
}

function elementBadge(id) {
  if (!id) return null;
  const e = ELEMENTS[id];
  return h('span', { class: 'badge', style: { background: e.color } }, `${e.icon} ${e.name}`);
}

export function cardTile(card, { count = 0, locked = false, onclick, extra } = {}) {
  const t = CARD_TYPES[card.type];
  const r = CARD_RARITIES[card.rarity];
  const el = card.element ? ELEMENTS[card.element] : null;
  const tile = h('button', {
    class: `card-tile ${locked ? 'locked' : ''}`,
    'data-type': card.type, 'data-rarity': card.rarity, 'data-element': card.element || 'none',
    onclick,
  },
  h('span', { class: 'ct-top' }, h('span', { class: 'ct-type' }, `${t.icon} ${t.name}`), count > 0 ? h('span', { class: 'ct-count' }, `×${count}`) : null),
  h('span', { class: 'ct-art' }, locked ? h('span', { class: 'ct-lock' }, '?') : cardArt(card)),
  h('span', { class: 'ct-name' }, locked ? '???' : card.name),
  h('span', { class: 'ct-meta' }, h('span', { class: 'ct-rar' }, r ? r.name : ''), card.stage ? h('span', {}, `Estágio ${card.stage}`) : null),
  extra || null);
  tile.style.setProperty('--el', el ? el.color : '#9aa4b8');
  tile.style.setProperty('--rar', r ? r.color : '#9fb0c3');
  if (card.visual?.frame) tile.style.backgroundImage = `url(${card.visual.frame})`;
  return tile;
}

function filterBar(state, onChange, { showLocked = true } = {}) {
  const sel = (key, label, options) => {
    const s = h('select', { class: 'f-select', 'aria-label': label, onchange: (e) => { state[key] = e.target.value; onChange(); } },
      h('option', { value: '' }, label), ...options.map(([v, t]) => h('option', { value: v }, t)));
    s.value = state[key] || '';
    return s;
  };
  const bar = h('div', { class: 'filter-bar' },
    sel('type', 'Todos os tipos', Object.values(CARD_TYPES).map((t) => [t.id, `${t.icon} ${t.name}`])),
    sel('element', 'Todos os elementos', Object.values(ELEMENTS).map((e) => [e.id, `${e.icon} ${e.name}`])),
    sel('rarity', 'Todas as raridades', RARITY_ORDER.map((r) => [r, CARD_RARITIES[r].name])));
  if (showLocked) {
    const cb = h('input', { type: 'checkbox', id: 'f-locked', onchange: (e) => { state.showLocked = e.target.checked; onChange(); } });
    cb.checked = !!state.showLocked;
    bar.append(h('label', { class: 'f-check', for: 'f-locked' }, cb, 'Mostrar bloqueadas'));
  }
  return bar;
}

const passes = (c, f) => (!f.type || c.type === f.type) && (!f.element || c.element === f.element) && (!f.rarity || c.rarity === f.rarity);

// ---------- Coleção ----------
const colFilter = { showLocked: true };

export function openCollection() {
  const g = app.game;
  ui.openScreen('Coleção', (body, entry) => {
    const all = cardList();
    const owned = all.filter((c) => cardCount(g, c.id) > 0);
    const copies = owned.reduce((s, c) => s + cardCount(g, c.id), 0);
    body.append(h('p', { class: 'muted', style: { marginTop: 0, fontWeight: 700 } }, `${owned.length} de ${all.length} cartas desbloqueadas · ${copies} cópias no total`));
    body.append(filterBar(colFilter, () => entry.render()));
    const list = all.filter((c) => passes(c, colFilter) && (colFilter.showLocked || cardCount(g, c.id) > 0));
    if (!list.length) body.append(h('p', { class: 'muted' }, 'Nenhuma carta com esses filtros.'));
    body.append(h('div', { class: 'card-grid' }, list.map((c) => {
      const n = cardCount(g, c.id);
      return cardTile(c, { count: n, locked: n === 0, onclick: () => openCardDetail(c.id) });
    })));
  });
}

export function openCardDetail(id) {
  const g = app.game;
  const c = getCard(id);
  const n = cardCount(g, id);
  ui.openScreen(n ? c.name : 'Carta bloqueada', (body) => {
    const info = h('div', { class: 'card-info' });
    const kv = (k, v) => (v === null || v === undefined || v === '' ? null : h('div', { class: 'kv-row' }, h('span', { class: 'muted' }, k), h('b', {}, v)));
    if (!n) {
      info.append(h('p', {}, 'Você ainda não tem esta carta. Ela pode ser obtida em missões, desafios e descobertas pelo mundo.'));
    } else {
      info.append(h('p', { style: { marginTop: 0 } }, c.desc || ''),
        kv('Tipo', `${CARD_TYPES[c.type].icon} ${CARD_TYPES[c.type].name}`),
        c.element ? h('div', { class: 'kv-row' }, h('span', { class: 'muted' }, 'Elemento'), elementBadge(c.element)) : null,
        kv('Raridade', CARD_RARITIES[c.rarity]?.name),
        c.stage ? kv('Estágio evolutivo', `${c.stage} de ${c.stages}`) : null,
        c.evolvesFrom ? kv('Evolui de', getCard(c.evolvesFrom).name) : null,
        c.evolvesTo ? kv('Evolui para', getCard(c.evolvesTo).name) : null,
        c.type === 'monstrin' ? kv('Atributos base', `PV ${c.data.base.hp} · Atq ${c.data.base.atk} · Def ${c.data.base.def} · Vel ${c.data.base.spd}`) : null,
        c.type === 'tecnica' ? kv('Categoria', c.data.category === 'dano' ? `Dano · Poder ${c.data.power} · Precisão ${c.data.accuracy}%` : c.data.category === 'cura' ? 'Cura' : 'Suporte') : null,
        c.type === 'item' && c.data.heal ? kv('Efeito', `Recupera ${c.data.heal} PV`) : null,
        kv('Cópias na coleção', String(n)));
    }
    body.append(h('div', { class: 'card-detail' }, cardTile(c, { count: n, locked: !n }), info));
  });
}

// ---------- Decks ----------
export function openDecks() {
  const g = app.game;
  ui.openScreen('Decks', (body, entry) => {
    body.append(h('p', { class: 'muted', style: { marginTop: 0, fontWeight: 700 } },
      `Regras provisórias: de ${CONFIG.DECK_MIN_CARDS} a ${CONFIG.DECK_MAX_CARDS} cartas, até ${CONFIG.DECK_MAX_COPIES} cópias de cada. Até ${CONFIG.DECK_MAX_DECKS} decks.`));
    if (!g.s.decks.length) body.append(h('p', { class: 'muted' }, 'Você ainda não montou nenhum deck.'));
    for (const d of g.s.decks) {
      const v = validateDeck(g, d);
      const active = g.s.activeDeckId === d.id;
      body.append(h('div', { class: `deck-row ${active ? 'active' : ''}` },
        h('div', { class: 'deck-info' }, h('b', {}, `${active ? '⭐ ' : ''}${d.name}`),
          h('span', { class: v.ok ? 'ok-txt' : 'warn-txt' }, `${v.total} cartas · ${v.ok ? 'pronto para usar' : 'incompleto'}`)),
        h('div', { class: 'deck-actions' },
          h('button', { class: 'btn gold small', onclick: () => openDeckEditor(d.id, () => entry.render()) }, '✏️ Editar'),
          active ? null : h('button', { class: 'btn green small', onclick: () => { const r = setActiveDeck(g, d.id); ui.toast(r.ok ? `${d.name} agora é o deck ativo!` : r.reason); if (r.ok) { sfx.play('select'); app.save(); } entry.render(); } }, '⭐ Usar este'),
          h('button', { class: 'btn ghost small', onclick: async () => { const n = await ui.input('Nome do deck', d.name, { placeholder: 'Meu deck' }); if (n && n.trim()) { saveDeck(g, d.id, d.cards, n.trim()); app.save(); entry.render(); } } }, 'Renomear'),
          h('button', { class: 'btn ghost small', onclick: async () => { const r = await ui.ask(`Excluir o deck "${d.name}"? As cartas continuam na sua Coleção.`, ['Excluir', 'Cancelar']); if (r === 0) { deleteDeck(g, d.id); app.save(); entry.render(); } } }, 'Excluir'))));
    }
    body.append(h('div', { class: 'actions', style: { marginTop: '12px' } },
      h('button', { class: 'btn gold', onclick: () => { const r = createDeck(g); if (!r.ok) { ui.toast(r.reason); return; } app.save(); entry.render(); openDeckEditor(r.deck.id, () => entry.render()); } }, '➕ Novo deck'),
      h('button', { class: 'btn ghost', onclick: () => openCollection() }, '🃏 Ver Coleção')));
  });
}

const edFilter = {};

export function openDeckEditor(deckId, onDone) {
  const g = app.game;
  const deck = getDeck(g, deckId);
  if (!deck) return;
  const work = { ...deck.cards }; // cópia de trabalho: só vai para o deck ao salvar
  let dirty = false;
  const draft = () => ({ ...deck, cards: work });
  ui.openScreen(`Editar: ${deck.name}`, (body, entry) => {
    const v = validateDeck(g, draft());
    body.append(h('div', { class: `deck-status ${v.ok ? 'ok' : 'warn'}` },
      h('b', {}, `${v.total} / ${CONFIG.DECK_MAX_CARDS} cartas`), h('span', {}, v.ok ? 'Deck válido' : v.errors[0])));
    body.append(h('div', { class: 'actions' },
      h('button', { class: 'btn gold', onclick: () => { saveDeck(g, deckId, work); dirty = false; app.save(); sfx.play('select'); ui.toast(`Deck "${deck.name}" salvo!`); entry.render(); } }, '💾 Salvar deck'),
      h('button', { class: 'btn ghost', onclick: () => { for (const k of Object.keys(work)) delete work[k]; dirty = true; entry.render(); } }, 'Esvaziar')));

    // Cartas no deck
    const ids = Object.keys(work).filter((id) => work[id] > 0).sort((a, b) => getCard(a).order - getCard(b).order);
    body.append(h('div', { class: 'section-title' }, `No deck (${v.total})`));
    if (!ids.length) body.append(h('p', { class: 'muted' }, 'Toque em ➕ nas cartas abaixo para adicioná-las.'));
    body.append(h('div', { class: 'deck-list' }, ids.map((id) => {
      const c = getCard(id);
      return h('div', { class: 'deck-line' }, h('span', {}, `${CARD_TYPES[c.type].icon} ${c.name}`), h('b', {}, `×${work[id]}`),
        h('button', { class: 'btn ghost small', 'aria-label': `Remover ${c.name}`, onclick: () => { work[id] -= 1; if (work[id] <= 0) delete work[id]; dirty = true; entry.render(); } }, '➖'),
        h('button', { class: 'btn ghost small', 'aria-label': `Adicionar ${c.name}`, onclick: () => add(id) }, '➕'));
    })));

    // Coleção disponível
    body.append(h('div', { class: 'section-title' }, 'Sua coleção'));
    body.append(filterBar(edFilter, () => entry.render(), { showLocked: false }));
    const avail = cardList().filter((c) => cardCount(g, c.id) > 0 && passes(c, edFilter));
    body.append(h('div', { class: 'card-grid' }, avail.map((c) => {
      const inDeck = work[c.id] || 0;
      return cardTile(c, {
        count: cardCount(g, c.id),
        onclick: () => add(c.id),
        extra: h('span', { class: 'ct-indeck' }, inDeck ? `${inDeck} no deck · ➕` : '➕ Adicionar'),
      });
    })));

    function add(id) {
      const r = canAdd(g, draft(), id);
      if (!r.ok) { ui.toast(r.reason); sfx.play('bump'); return; }
      work[id] = (work[id] || 0) + 1; dirty = true; sfx.play('cursor'); entry.render();
    }
  }, { onClose: () => { if (dirty) ui.toast('Alterações não salvas foram descartadas.'); onDone?.(); } });
}

export const cardsUi = { openCollection, openDecks, openDeckEditor, openCardDetail };
void deckTotal;
