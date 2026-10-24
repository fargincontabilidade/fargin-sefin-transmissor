// Tela inicial: Continuar / Nova aventura / Configurações.
import { h, ui } from './ui.js';
import { app } from '../app.js';
import { CONFIG } from '../config.js';
import { PLAYER_LOOKS } from '../art/characters.js';
import { art } from '../art/registry.js';
import { sfx } from '../audio/sfx.js';
import { menus } from './menus.js';
import { cardMini } from '../duel/cardView.js';
import { showCardZoom } from './deckScreen.js';
import { STARTER_DECKS } from '../core/duelDeck.js';
import { DUEL_CARDS } from '../duel/cards.js';
import { getSpecies } from '../data/species.js';

export function showTitle({ onContinue, onNewGame }) {
  app.inTitle = true;
  const saved = app.storage.load();
  const el = h('div', { class: 'title' });
  const mons = h('div', { class: 'title-mons' }, ['brasito', 'gotinho', 'brotim'].map((id) => h('img', { src: art.monUrl(id), alt: getSpecies(id).name })));
  const logo = h('div', { class: 'logo' }, h('div', { class: 'l1' }, 'MONSTRIN'), h('div', { class: 'l2' }, 'WORLD'), h('div', { class: 'tag' }, 'Explore · Capture · Evolua'));
  const buttons = h('div', { class: 'title-buttons' });
  if (saved && saved.player) {
    buttons.append(h('button', { class: 'btn gold', onclick: () => { sfx.play('select'); close(); onContinue(saved); } }, `▶ Continuar — ${saved.player.name}`));
  }
  buttons.append(h('button', { class: `btn ${saved ? '' : 'gold'}`, onclick: async () => {
    sfx.play('select');
    if (saved) {
      const r = await ui.ask('Começar uma nova aventura vai substituir o progresso salvo neste aparelho. Continuar?', ['Voltar', 'Nova aventura']);
      if (r !== 1) return;
    }
    newGameForm((data) => { close(); onNewGame(data); });
  } }, '✨ Nova aventura'));
  buttons.append(h('button', { class: 'btn ghost', onclick: () => menus.openSettings() }, '⚙️ Configurações'));
  el.append(mons, logo, buttons, h('div', { class: 'version' }, `v${CONFIG.VERSION} · demonstração`));
  ui.root.append(el);
  sfx.music('title');
  function close() { el.remove(); app.inTitle = false; }
}

const STARTER_INFO = {
  brasito: 'Fogo. Deck "Brasa e Rocha": ataques fortes e Monstrins de Pedra resistentes.',
  gotinho: 'Água. Deck "Correnteza": curas, escudos e condições que desgastam o adversário.',
  brotim: 'Planta. Deck "Raízes": resistência, cura e controle do campo.',
};

function newGameForm(onDone) {
  let look = 0;
  let name = '';
  let starter = null;
  ui.openScreen('Nova aventura', (body, entry) => {
    body.append(h('div', { style: { fontWeight: 900, marginBottom: '6px' } }, '1. Como você se chama?'));
    const inp = h('input', { class: 'text-input', maxlength: 14, placeholder: 'Seu nome', value: name, autocomplete: 'off' });
    inp.addEventListener('input', () => { name = inp.value; });
    body.append(inp);
    body.append(h('div', { style: { fontWeight: 900, margin: '16px 0 0' } }, '2. Escolha sua aparência'));
    body.append(h('div', { class: 'looks' }, PLAYER_LOOKS.map((l, i) => h('button', { class: `look ${look === i ? 'on' : ''}`, onclick: () => { look = i; name = inp.value; sfx.play('cursor'); entry.render(); } }, h('img', { src: art.lookUrl(l), alt: l.name })))));
    body.append(h('div', { style: { fontWeight: 900, margin: '16px 0 4px' } }, '3. Escolha seu Monstrin parceiro'));
    body.append(h('p', { class: 'muted', style: { fontSize: '14px', fontWeight: 700, margin: '0 0 10px' } }, 'Ele acompanha você no mapa e define o seu deck inicial de 15 cartas. Toque duas vezes para ver as habilidades.'));
    body.append(h('div', { class: 'starter-pick' }, Object.keys(STARTER_DECKS).map((id) => cardMini({ cardId: id }, {
      cls: starter === id ? 'sel' : '', showHp: false,
      onclick: () => { if (starter === id) { showCardZoom(id); return; } starter = id; name = inp.value; sfx.play('cursor'); entry.render(); },
    }))));
    if (starter) {
      const uniq = [...new Set(STARTER_DECKS[starter])].map((id) => DUEL_CARDS[id].name);
      body.append(h('p', { style: { fontSize: '14px', margin: '10px 0 0' } }, h('b', {}, `${DUEL_CARDS[starter].name}: `), STARTER_INFO[starter], h('br'), h('span', { class: 'muted' }, `Cartas do deck: ${uniq.join(', ')}.`)));
    }
    body.append(h('div', { class: 'actions', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn gold', onclick: () => {
      const n = (inp.value || '').trim();
      if (!n) { ui.toast('Digite um nome para começar!'); inp.focus(); return; }
      if (!starter) { ui.toast('Escolha seu Monstrin parceiro!'); return; }
      ui.close(entry);
      onDone({ name: n.slice(0, 14), look, starter });
    } }, 'Começar aventura →')));
    if (!name) setTimeout(() => { try { inp.focus(); } catch { /* ignora */ } }, 50);
  });
}
