// Tela "Deck": organiza o deck de duelo do personagem (Regulamento v1.0:
// exatamente 15 cartas de Monstrin, no máximo 2 cópias de cada).
import { h, ui } from './ui.js';
import { app } from '../app.js';
import { sfx } from '../audio/sfx.js';
import { RULES } from '../duel/rules.js';
import { DUEL_CARDS } from '../duel/cards.js';
import { cardMini, cardZoom } from '../duel/cardView.js';
import { countOf, validatePlayerDeck, setDeck } from '../core/duelDeck.js';

const ORDER = Object.keys(DUEL_CARDS);
const byOrder = (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b);

export function showCardZoom(cardId) {
  const box = h('div', { class: 'deck-zoom', onclick: (e) => { if (e.target === box) box.remove(); } },
    cardZoom({ cardId }, { role: 'Carta de Monstrin', abilities: [...DUEL_CARDS[cardId].abilities.map((ab) => ({ ab, state: 'info' })), ...(DUEL_CARDS[cardId].special ? [{ ab: DUEL_CARDS[cardId].special, state: 'info', label: 'Especial' }] : [])] }),
    h('button', { class: 'btn ghost', type: 'button', style: { minWidth: '160px' }, onclick: () => box.remove() }, 'Fechar'));
  document.getElementById('ui').append(box);
}

export function openDeck() {
  const g = app.game;
  const duel = g.s.duel;
  if (!duel) { ui.say('Você ainda não tem um deck. Ele é entregue junto com o seu primeiro Monstrin.'); return; }
  let draft = duel.deck.slice();
  ui.openScreen('Deck de duelo', (body, entry) => {
    const counts = countOf(draft);
    const v = validatePlayerDeck(g, draft);
    const changed = draft.slice().sort().join() !== duel.deck.slice().sort().join();
    const rec = duel.record;
    body.append(h('div', { class: 'deck-scr' },
      h('div', { class: 'deck-head' },
        h('span', { class: `deck-count ${draft.length === RULES.DECK_SIZE ? 'ok' : 'bad'}` }, `${draft.length}/${RULES.DECK_SIZE} cartas`),
        h('span', { class: 'muted' }, `Máx. ${RULES.MAX_COPIES} cópias · só Monstrins · Duelos: ${rec.wins}V ${rec.losses}D ${rec.draws}E`),
        h('span', { style: { flex: 1 } }),
        changed ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => { draft = duel.deck.slice(); entry.render(); } }, 'Desfazer mudanças') : null,
        h('button', { class: 'btn gold small', type: 'button', disabled: !v.ok || !changed ? true : null, onclick: () => {
          const r = setDeck(g, draft);
          if (!r.ok) { ui.toast(r.errors[0]); return; }
          app.save(); sfx.play('select'); ui.toast('Deck salvo!'); entry.render();
        } }, 'Salvar deck')),
      !v.ok ? h('div', { class: 'deck-errs' }, v.errors.map((e) => h('div', {}, `⛔ ${e}`))) : h('div', { class: 'muted', style: { fontSize: '13px' } }, changed ? 'Deck válido. Toque em "Salvar deck" para usar nos próximos duelos.' : 'Este é o deck usado nos duelos. Toque numa carta para ver as habilidades.'),
      section('No deck', Object.keys(counts).sort(byOrder).map((id) => cell(id, counts[id], false))),
      section('Fora do deck (sua coleção)', Object.keys(duel.collection).filter((id) => DUEL_CARDS[id] && duel.collection[id] - (counts[id] || 0) > 0).sort(byOrder)
        .map((id) => cell(id, duel.collection[id] - (counts[id] || 0), true)))));

    function section(title, cells) {
      return h('div', { class: 'deck-section' }, h('h3', {}, title), cells.length ? h('div', { class: 'deck-grid' }, cells) : h('p', { class: 'muted' }, 'Nenhuma carta.'));
    }
    function cell(id, n, outside) {
      const inDeck = counts[id] || 0;
      const canAdd = inDeck < RULES.MAX_COPIES && inDeck < (duel.collection[id] || 0) && draft.length < RULES.DECK_SIZE;
      const whyNot = inDeck >= RULES.MAX_COPIES ? `Máx. ${RULES.MAX_COPIES}` : draft.length >= RULES.DECK_SIZE ? 'Deck cheio' : '';
      return h('div', { class: 'deck-cell' },
        cardMini({ cardId: id }, { cls: outside ? 'out' : '', count: n, showHp: false, onclick: () => showCardZoom(id) }),
        h('div', { class: 'deck-ctr' },
          h('button', { type: 'button', 'aria-label': 'Tirar do deck', disabled: inDeck ? null : true, onclick: () => { draft.splice(draft.lastIndexOf(id), 1); sfx.play('cursor'); entry.render(); } }, '−'),
          h('span', {}, `${inDeck}`),
          h('button', { type: 'button', 'aria-label': 'Colocar no deck', disabled: canAdd ? null : true, title: whyNot, onclick: () => { draft.push(id); sfx.play('cursor'); entry.render(); } }, '+')));
    }
  }, {
    onClose: () => {
      const changed = draft.slice().sort().join() !== duel.deck.slice().sort().join();
      if (changed) ui.toast(validatePlayerDeck(g, draft).ok ? 'Mudanças não salvas foram descartadas.' : 'Deck incompleto: o deck salvo anterior continua valendo.');
    },
  });
}
