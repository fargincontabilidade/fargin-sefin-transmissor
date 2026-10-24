// Deck de duelo do personagem, migração de salvamentos e recompensas únicas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/duel/rules.js';
import { validateDeck, DUEL_CARDS } from '../src/duel/cards.js';
import { Duel } from '../src/duel/engine.js';
import { aiSetup, aiPlan, aiReplacement } from '../src/duel/ai.js';
import { createRng } from '../src/core/rng.js';
import { Game, newGameState, migrate } from '../src/core/gameState.js';
import { createMonstrin } from '../src/core/monstrin.js';
import { STARTER_DECKS, grantStarterDeck, validatePlayerDeck, setDeck, applyDuelResult, migrateDuelData } from '../src/core/duelDeck.js';
import { DUELISTS } from '../src/data/duelists.js';
import { QUESTS } from '../src/data/quests.js';

function newGame(starter = 'gotinho') {
  const g = new Game(newGameState({ name: 'Ana', look: 0 }));
  const mon = createMonstrin(starter, 5, { how: 'inicial' });
  g.addMonstrin(mon);
  grantStarterDeck(g, starter);
  g.setFlag('starterChosen');
  return g;
}

test('decks iniciais e dos duelistas seguem o regulamento (15 cartas, até 2 cópias, só Monstrins)', () => {
  for (const [id, deck] of Object.entries(STARTER_DECKS)) {
    const v = validateDeck(deck, RULES);
    assert.ok(v.ok, `${id}: ${v.errors.join(' ')}`);
    assert.equal(deck.length, 15);
    assert.ok(deck.includes(id), 'o deck contém o Monstrin escolhido');
  }
  for (const d of Object.values(DUELISTS)) assert.ok(validateDeck(d.deck, RULES).ok, d.id);
});

test('criação do personagem entrega um deck válido do parceiro escolhido', () => {
  for (const sp of Object.keys(STARTER_DECKS)) {
    const g = newGame(sp);
    assert.equal(g.s.duel.starter, sp);
    assert.deepEqual(g.s.duel.deck, STARTER_DECKS[sp]);
    assert.ok(validatePlayerDeck(g, g.s.duel.deck).ok);
    assert.equal(g.party()[0].speciesId, sp);
    assert.equal(g.questStatus('inicio'), 'active', 'a missão inicial agora é falar com a Íris');
  }
});

test('o deck só aceita cartas que o jogador possui, até 2 cópias e exatamente 15', () => {
  const g = newGame('gotinho');
  const deck = g.s.duel.deck.slice();
  assert.ok(!setDeck(g, deck.slice(0, 14)).ok, '14 cartas');
  const tooMany = deck.slice(0, 13).concat(['brasito', 'brasito']);
  assert.ok(!validatePlayerDeck(g, tooMany).ok, 'carta que não possui');
  const three = deck.slice(0, 12).concat(['gotinho', 'gotinho', 'gotinho']);
  assert.ok(!validatePlayerDeck(g, three).ok, '3 cópias');
  // ao obter um Monstrin com ficha de duelo, ganha a carta
  g.addMonstrin(createMonstrin('brasito', 3));
  assert.equal(g.s.duel.collection.brasito, 1);
  const swapped = deck.slice(0, 14).concat(['brasito']);
  assert.ok(setDeck(g, swapped).ok);
  assert.deepEqual(g.s.duel.deck, swapped);
});

test('recompensa de duelo é entregue uma única vez; derrota e empate só contam no histórico', () => {
  const g = newGame('brotim');
  g.setFlag('metIris');
  g.startQuest('treino_duda');
  const coins0 = g.s.player.coins;
  let r = applyDuelResult(g, DUELISTS.duda, 1);
  assert.equal(r.result, 'lose');
  assert.equal(g.s.player.coins, coins0);
  r = applyDuelResult(g, DUELISTS.duda, null);
  assert.equal(r.result, 'draw');
  r = applyDuelResult(g, DUELISTS.duda, 0);
  assert.equal(r.result, 'win');
  assert.ok(r.rewards);
  assert.equal(g.s.duel.collection.marolho, 1);
  assert.equal(g.questStatus('treino_duda'), 'done');
  const coins1 = g.s.player.coins;
  assert.equal(coins1, coins0 + DUELISTS.duda.reward.coins + QUESTS.treino_duda.rewards.coins);
  r = applyDuelResult(g, DUELISTS.duda, 0);
  assert.equal(r.rewards, null);
  assert.equal(g.s.player.coins, coins1);
  assert.equal(g.s.duel.collection.marolho, 1);
  assert.deepEqual(g.s.duel.record, { wins: 2, losses: 1, draws: 1 });
});

test('migração: salvamento antigo com inicial recebe o deck; sem inicial não recebe', () => {
  const old = newGameState({ name: 'Leo', look: 0 });
  delete old.duel;
  const g0 = new Game(old);
  g0.addMonstrin(createMonstrin('brasito', 5));
  g0.setFlag('starterChosen');
  const saved = JSON.parse(JSON.stringify(g0.s));
  delete saved.duel;
  saved.cards = { m_brasito: 3, m_cogumi: 1, t_qualquer: 2 };
  const g = new Game(migrate(saved));
  assert.equal(g.s.duel.starter, 'brasito');
  assert.ok(validatePlayerDeck(g, g.s.duel.deck).ok);
  assert.equal(g.s.duel.collection.cogumi, Math.max(1, 0));
  assert.ok(g.s.duel.collection.brasito >= 2);
  const fresh = newGameState({ name: 'Bia', look: 0 });
  assert.equal(migrateDuelData(fresh), false);
  assert.equal(fresh.duel, undefined);
});

test('duelo completo com o deck inicial contra a Duda termina com resultado válido', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed);
    const d = new Duel({ decks: [STARTER_DECKS.gotinho, DUELISTS.duda.deck], rng, config: { itemsEnabled: true } });
    d.submitSetup(0, aiSetup(d, 0)); d.submitSetup(1, aiSetup(d, 1));
    let guard = 0;
    while (!d.result && guard++ < 60) {
      if (d.phase === 'replace') { for (const i of [0, 1]) if (d.players[i].pendingReplace) d.chooseReplacement(i, aiReplacement(d, i)); continue; }
      for (const i of [0, 1]) assert.ok(d.submit(i, aiPlan(d, i)).ok);
      d.resolveRound();
    }
    assert.ok(d.result, `seed ${seed}`);
    assert.ok(d.result.winner === 0 || d.result.winner === 1 || d.result.winner === null);
  }
  assert.ok(Object.keys(DUEL_CARDS).length >= 14);
});
