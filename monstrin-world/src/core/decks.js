// Coleção de cartas e decks do jogador (regras sem interface).
// Os dados ficam no salvamento: game.s.cards = { idCarta: quantidade },
// game.s.decks = [{ id, name, cards: { idCarta: n }, updatedAt }], game.s.activeDeckId.
import { CONFIG } from '../config.js';
import { getCard, monstrinCardId, techniqueCardId, itemCardId } from '../data/cards.js';

// ---------- Coleção ----------
export function cardCount(game, id) {
  return game.s.cards[id] || 0;
}

export function addCard(game, id, n = 1) {
  if (!getCard(id) || n <= 0) return 0;
  game.s.cards[id] = (game.s.cards[id] || 0) + n;
  game.emit('cards', { id, n });
  return game.s.cards[id];
}

// Cartas ganhas ao obter um Monstrin (inicial, recompensa, captura...):
// a carta do próprio Monstrin e uma de cada técnica que ele conhece.
export function grantMonstrinCards(game, mon) {
  addCard(game, monstrinCardId(mon.speciesId), 1);
  for (const mv of mon.learnedMoves || []) addCard(game, techniqueCardId(mv), 1);
}

// Coleção inicial PROVISÓRIA (o método definitivo de obter cartas será
// definido depois). Roda uma única vez por salvamento.
export const STARTER_CARDS = { [techniqueCardId('investida')]: 2, [itemCardId('tonico')]: 3, [itemCardId('super_tonico')]: 2 };

export function ensureStarterCards(game) {
  if (game.s.flags.cardsStarterGiven) return false;
  for (const [id, n] of Object.entries(STARTER_CARDS)) addCard(game, id, n);
  for (const m of game.allMons()) grantMonstrinCards(game, m);
  game.s.flags.cardsStarterGiven = true;
  return true;
}

// ---------- Decks ----------
const newId = () => `deck_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function deckTotal(deck) {
  return Object.values(deck.cards).reduce((s, n) => s + n, 0);
}

export function getDeck(game, id) {
  return game.s.decks.find((d) => d.id === id) || null;
}

export function activeDeck(game) {
  return getDeck(game, game.s.activeDeckId);
}

// Verifica o deck contra as regras configuráveis e a coleção do jogador.
export function validateDeck(game, deck) {
  const errors = [];
  const total = deckTotal(deck);
  if (total < CONFIG.DECK_MIN_CARDS) errors.push(`Faltam ${CONFIG.DECK_MIN_CARDS - total} carta(s) para o mínimo de ${CONFIG.DECK_MIN_CARDS}.`);
  if (total > CONFIG.DECK_MAX_CARDS) errors.push(`Passou do máximo de ${CONFIG.DECK_MAX_CARDS} cartas.`);
  for (const [id, n] of Object.entries(deck.cards)) {
    const c = getCard(id);
    if (!c) { errors.push('Carta desconhecida no deck.'); continue; }
    if (n > CONFIG.DECK_MAX_COPIES) errors.push(`${c.name}: no máximo ${CONFIG.DECK_MAX_COPIES} cópias.`);
    if (n > cardCount(game, id)) errors.push(`${c.name}: você só tem ${cardCount(game, id)} cópia(s).`);
  }
  return { ok: errors.length === 0, errors, total };
}

// Quantas cópias desta carta ainda dá para colocar no deck.
export function canAdd(game, deck, id) {
  const inDeck = deck.cards[id] || 0;
  if (inDeck >= CONFIG.DECK_MAX_COPIES) return { ok: false, reason: `Máximo de ${CONFIG.DECK_MAX_COPIES} cópias por deck.` };
  if (inDeck >= cardCount(game, id)) return { ok: false, reason: 'Você não tem mais cópias desta carta.' };
  if (deckTotal(deck) >= CONFIG.DECK_MAX_CARDS) return { ok: false, reason: `O deck já tem ${CONFIG.DECK_MAX_CARDS} cartas.` };
  return { ok: true };
}

export function createDeck(game, name) {
  if (game.s.decks.length >= CONFIG.DECK_MAX_DECKS) return { ok: false, reason: `Você pode ter até ${CONFIG.DECK_MAX_DECKS} decks.` };
  const deck = { id: newId(), name: (name || `Deck ${game.s.decks.length + 1}`).slice(0, 24), cards: {}, updatedAt: new Date().toISOString() };
  game.s.decks.push(deck);
  game.emit('decks');
  return { ok: true, deck };
}

// Salva o conteúdo editado (cópia de trabalho) de volta no deck.
export function saveDeck(game, deckId, cards, name) {
  const deck = getDeck(game, deckId);
  if (!deck) return { ok: false, reason: 'Deck não encontrado.' };
  deck.cards = Object.fromEntries(Object.entries(cards).filter(([, n]) => n > 0));
  if (name) deck.name = name.slice(0, 24);
  deck.updatedAt = new Date().toISOString();
  if (game.s.activeDeckId === deckId && !validateDeck(game, deck).ok) game.s.activeDeckId = null;
  game.emit('decks');
  return { ok: true, deck };
}

export function deleteDeck(game, deckId) {
  game.s.decks = game.s.decks.filter((d) => d.id !== deckId);
  if (game.s.activeDeckId === deckId) game.s.activeDeckId = null;
  game.emit('decks');
}

export function setActiveDeck(game, deckId) {
  const deck = getDeck(game, deckId);
  if (!deck) return { ok: false, reason: 'Deck não encontrado.' };
  const v = validateDeck(game, deck);
  if (!v.ok) return { ok: false, reason: v.errors[0] };
  game.s.activeDeckId = deckId;
  game.emit('decks');
  return { ok: true };
}

// ---------- Preparação para os duelos (regras ainda não definidas) ----------
// Lista de cartas (uma entrada por cópia) do deck ativo, pronta para ser
// embaralhada pelo futuro sistema de duelo iniciado por desafios de NPCs.
export function deckForDuel(game) {
  const deck = activeDeck(game);
  if (!deck || !validateDeck(game, deck).ok) return null;
  const list = [];
  for (const [id, n] of Object.entries(deck.cards)) for (let i = 0; i < n; i++) list.push(getCard(id));
  return { deckId: deck.id, name: deck.name, cards: list };
}
