// Deck de duelo do personagem (Regulamento de Duelos v1.0).
// Fica no salvamento em game.s.duel:
//   collection: { cartaId: quantidade }  -> cartas de Monstrin que o jogador possui
//   deck:       [cartaId, ...]           -> exatamente 15 cartas, até 2 cópias
//   record:     { wins, losses, draws }
//   rewards:    { duelistaId: true }     -> recompensas já recebidas (uma única vez)
import { RULES } from '../duel/rules.js';
import { DUEL_CARDS, validateDeck as validateRules } from '../duel/cards.js';
import { STARTERS } from '../data/species.js';

// Deck inicial de acordo com o Monstrin escolhido na criação do personagem.
// Cada um tem 15 cartas e no máximo 2 cópias (valores provisórios das cartas).
export const STARTER_DECKS = {
  brasito: ['brasito', 'brasito', 'brasador', 'fagulino', 'fagulino', 'pedrolho', 'pedrolho', 'rochedonte', 'cristalume', 'cristalume', 'faiscol', 'faiscol', 'voltrino', 'voltrino', 'bolhuga'],
  gotinho: ['gotinho', 'gotinho', 'marolho', 'bolhuga', 'bolhuga', 'cogumi', 'cogumi', 'brotim', 'brotim', 'faiscol', 'faiscol', 'voltrino', 'voltrino', 'pedrolho', 'pedrolho'],
  brotim: ['brotim', 'brotim', 'ramalhao', 'cogumi', 'cogumi', 'gotinho', 'gotinho', 'bolhuga', 'bolhuga', 'pedrolho', 'pedrolho', 'cristalume', 'cristalume', 'faiscol', 'faiscol'],
};

export function countOf(list) {
  const m = {};
  for (const id of list) m[id] = (m[id] || 0) + 1;
  return m;
}

export function hasDuelDeck(game) {
  return !!(game.s.duel && game.s.duel.deck && game.s.duel.deck.length);
}

// Cria o deck e a coleção iniciais a partir do Monstrin inicial.
export function grantStarterDeck(game, starterId) {
  const deck = (STARTER_DECKS[starterId] || STARTER_DECKS.brasito).slice();
  game.s.duel = {
    starter: starterId,
    collection: countOf(deck),
    deck,
    record: { wins: 0, losses: 0, draws: 0 },
    rewards: {},
  };
  return game.s.duel;
}

// Migração de salvamentos antigos: quem já tinha escolhido o inicial recebe o
// deck correspondente. Cartas de Monstrin da coleção antiga também entram.
export function migrateDuelData(state) {
  if (state.duel) {
    state.duel.collection = state.duel.collection || {};
    state.duel.deck = state.duel.deck || [];
    state.duel.record = state.duel.record || { wins: 0, losses: 0, draws: 0 };
    state.duel.rewards = state.duel.rewards || {};
    return false;
  }
  if (!state.flags || !state.flags.starterChosen) return false;
  const party = (state.party || []).map((u) => state.monstrins?.[u]).filter(Boolean);
  const starter = party.map((m) => m.speciesId).find((s) => STARTERS.includes(s))
    || Object.values(state.monstrins || {}).map((m) => m.speciesId).find((s) => STARTERS.includes(s))
    || 'brasito';
  const fake = { s: state };
  grantStarterDeck(fake, starter);
  for (const [cid, n] of Object.entries(state.cards || {})) {
    if (!cid.startsWith('m_')) continue;
    const sp = cid.slice(2);
    if (DUEL_CARDS[sp]) state.duel.collection[sp] = Math.max(state.duel.collection[sp] || 0, Math.min(n, RULES.MAX_COPIES));
  }
  return true;
}

// Valida um deck contra o regulamento E a coleção do jogador.
export function validatePlayerDeck(game, deck) {
  const base = validateRules(deck, RULES);
  const errors = [...base.errors];
  const coll = game.s.duel?.collection || {};
  for (const [id, n] of Object.entries(countOf(deck))) {
    if (DUEL_CARDS[id] && n > (coll[id] || 0)) errors.push(`${DUEL_CARDS[id].name}: você só tem ${coll[id] || 0} cópia(s).`);
  }
  return { ok: errors.length === 0, errors };
}

export function setDeck(game, deck) {
  const v = validatePlayerDeck(game, deck);
  if (!v.ok) return v;
  game.s.duel.deck = deck.slice();
  game.emit('deck');
  return { ok: true, errors: [] };
}

export function addDuelCards(game, cards) {
  if (!game.s.duel) return;
  for (const [id, n] of Object.entries(cards || {})) {
    if (!DUEL_CARDS[id]) continue;
    game.s.duel.collection[id] = (game.s.duel.collection[id] || 0) + n;
  }
  game.emit('deck');
}

// Aplica o resultado de um duelo. Recompensas de vitória só uma vez por duelista.
export function applyDuelResult(game, duelist, winner) {
  const d = game.s.duel;
  const out = { result: winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw', rewards: null };
  if (winner === 0) d.record.wins += 1;
  else if (winner === 1) d.record.losses += 1;
  else d.record.draws += 1;
  if (winner === 0 && duelist) {
    if (!game.s.stats.trainersDefeated.includes(duelist.id)) game.s.stats.trainersDefeated.push(duelist.id);
    if (!d.rewards[duelist.id] && duelist.reward) {
      d.rewards[duelist.id] = true;
      const r = duelist.reward;
      if (r.coins) game.addCoins(r.coins);
      if (r.cards) addDuelCards(game, r.cards);
      for (const [it, n] of Object.entries(r.items || {})) game.addItem(it, n);
      out.rewards = r;
    }
    game.checkQuests();
  }
  return out;
}
