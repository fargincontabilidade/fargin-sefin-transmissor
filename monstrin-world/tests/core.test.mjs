import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { SPECIES, evolutionLine } from '../src/data/species.js';
import { MOVES } from '../src/data/moves.js';
import { ITEMS } from '../src/data/items.js';
import { createRng } from '../src/core/rng.js';
import {
  createMonstrin, getStats, maxHp, gainXp, xpForLevel, evolve, pendingEvolution,
  equipMove, unequipMove, learnMove, applyRune, canUseRune, applyHealItem,
} from '../src/core/monstrin.js';
import { Battle, calcDamage } from '../src/core/battleEngine.js';
import { captureChance, rollCapture } from '../src/core/capture.js';
import { Game, newGameState, migrate } from '../src/core/gameState.js';
import { LocalStorageAdapter } from '../src/core/storage.js';

test('dados: todas as referências de ataques, evoluções e runas existem', () => {
  for (const s of Object.values(SPECIES)) {
    for (const e of s.learnset) assert.ok(MOVES[e.move], `${s.id}: ataque ${e.move}`);
    if (s.evolution) assert.ok(SPECIES[s.evolution.to], `${s.id}: evolução`);
  }
  for (const it of Object.values(ITEMS)) if (it.teaches) assert.ok(MOVES[it.teaches], it.id);
  assert.deepEqual(evolutionLine('brasador'), ['brasito', 'brasador', 'vulcarion']);
});

test('cada Monstrin é individual mesmo sendo da mesma espécie', () => {
  const rng = createRng(42);
  const a = createMonstrin('cogumi', 5, { rng });
  const b = createMonstrin('cogumi', 5, { rng });
  assert.notEqual(a.uid, b.uid);
  assert.notDeepEqual(a.traits, b.traits);
  const uids = new Set(Array.from({ length: 500 }, () => createMonstrin('cogumi', 3).uid));
  assert.equal(uids.size, 500);
});

test('variações individuais são equilibradas (diferença pequena)', () => {
  const lo = createMonstrin('brasito', 50, { traits: { hp: 0, atk: 0, def: 0, spd: 0 }, temperament: 'equilibrado' });
  const hi = createMonstrin('brasito', 50, { traits: { hp: 15, atk: 15, def: 15, spd: 15 }, temperament: 'equilibrado' });
  const a = getStats(lo); const b = getStats(hi);
  for (const k of ['atk', 'def', 'spd']) assert.ok(b[k] / a[k] < 1.15, `${k} ${a[k]} -> ${b[k]}`);
});

test('XP, níveis e aprendizado de ataques por nível', () => {
  const m = createMonstrin('brasito', 5, { rng: createRng(1) });
  assert.deepEqual(m.learnedMoves, ['investida', 'brasa']);
  const evs = gainXp(m, xpForLevel(9) - m.xp);
  assert.equal(m.level, 9);
  assert.ok(evs.some((e) => e.type === 'learned' && e.move === 'rugido'));
  assert.ok(evs.some((e) => e.type === 'learned' && e.move === 'bola_fogo'));
  assert.ok(m.equippedMoves.length <= CONFIG.MAX_EQUIPPED_MOVES);
});

test('nível máximo respeitado', () => {
  const m = createMonstrin('pedrolho', 49);
  gainXp(m, 1e9);
  assert.equal(m.level, CONFIG.MAX_LEVEL);
});

test('evolução preserva identidade, nível, traços e ataques', () => {
  const m = createMonstrin('brotim', 15, { rng: createRng(3) });
  const { uid, traits, learnedMoves } = structuredClone(m);
  gainXp(m, xpForLevel(16) - m.xp);
  assert.equal(pendingEvolution(m), 'ramalhao');
  const r = evolve(m);
  assert.equal(r.to, 'ramalhao');
  assert.equal(m.uid, uid);
  assert.deepEqual(m.traits, traits);
  for (const mv of learnedMoves) assert.ok(m.learnedMoves.includes(mv));
  assert.equal(m.level, 16);
  assert.ok(m.history.some((h) => h.type === 'evolved'));
});

test('ataques equipados x aprendidos: trocar não apaga o aprendido', () => {
  const m = createMonstrin('brasito', 20, { rng: createRng(4) });
  assert.equal(m.equippedMoves.length, 4);
  const extra = m.learnedMoves.find((x) => !m.equippedMoves.includes(x));
  assert.ok(extra);
  assert.equal(equipMove(m, extra).ok, false); // limite
  const out = m.equippedMoves[0];
  assert.ok(unequipMove(m, out).ok);
  assert.ok(equipMove(m, extra).ok);
  assert.ok(m.learnedMoves.includes(out));
  // não pode ficar sem ataques
  const one = createMonstrin('cogumi', 1);
  one.equippedMoves = ['investida'];
  assert.equal(unequipMove(one, 'investida').ok, false);
  assert.equal(learnMove(one, 'investida').learned, false);
});

test('Runas de Técnica: compatibilidade e aprendizado permanente', () => {
  const fire = createMonstrin('brasito', 6);
  const grass = createMonstrin('brotim', 6);
  assert.equal(canUseRune(grass, 'runa_fogo').ok, false);
  const r = applyRune(fire, 'runa_fogo');
  assert.ok(r.ok);
  assert.ok(fire.learnedMoves.includes('labareda'));
  assert.equal(canUseRune(fire, 'runa_fogo').ok, false); // já conhece
  assert.ok(applyRune(grass, 'runa_protecao').ok);
});

test('dano considera vantagem elemental', () => {
  const fire = createMonstrin('brasito', 10, { traits: { hp: 8, atk: 8, def: 8, spd: 8 }, temperament: 'equilibrado' });
  const grass = createMonstrin('brotim', 10, { traits: { hp: 8, atk: 8, def: 8, spd: 8 }, temperament: 'equilibrado' });
  const water = createMonstrin('gotinho', 10, { traits: { hp: 8, atk: 8, def: 8, spd: 8 }, temperament: 'equilibrado' });
  const vsGrass = calcDamage(fire, grass, MOVES.brasa, { noRandom: true, forceCrit: false });
  const vsWater = calcDamage(fire, water, MOVES.brasa, { noRandom: true, forceCrit: false });
  assert.ok(vsGrass.eff > 1);
  assert.ok(vsWater.eff < 1);
  assert.ok(vsGrass.damage > vsWater.damage * 1.8);
});

test('batalha selvagem completa até vitória com XP', () => {
  const rng = createRng(7);
  const mine = createMonstrin('brasito', 8, { rng });
  const wild = createMonstrin('cogumi', 3, { rng });
  const b = new Battle({ kind: 'wild', playerTeam: [mine], enemyTeam: [wild], rng });
  let guard = 0;
  const all = [];
  while (!b.over && guard++ < 50) all.push(...b.playTurn({ type: 'move', moveId: 'brasa' }));
  assert.equal(b.result, 'win');
  assert.ok(all.some((e) => e.type === 'xp' && e.uid === mine.uid));
});

test('captura: chance maior com PV baixo e selo melhor', () => {
  const w = createMonstrin('cogumi', 4);
  const full = captureChance(w, 'selo_vinculo');
  w.hp = 1;
  const low = captureChance(w, 'selo_vinculo');
  const better = captureChance(w, 'selo_aurora');
  assert.ok(low > full * 2);
  assert.ok(better > low);
  const rng = createRng(9);
  let ok = 0;
  for (let i = 0; i < 2000; i++) if (rollCapture(0.5, rng).success) ok++;
  assert.ok(ok > 850 && ok < 1150, String(ok));
});

test('batalha selvagem: captura encerra a batalha', () => {
  const rng = createRng(11);
  const mine = createMonstrin('brotim', 6, { rng });
  const wild = createMonstrin('cogumi', 2, { rng });
  wild.hp = 1;
  const b = new Battle({ kind: 'wild', playerTeam: [mine], enemyTeam: [wild], rng });
  let tries = 0;
  while (!b.over && tries++ < 30) b.playTurn({ type: 'capture', itemId: 'selo_aurora' });
  assert.equal(b.result, 'caught');
  assert.equal(b.caughtMon, wild);
});

test('PV do treinador: sem criatura ativa, recebe dano direto e pode perder', () => {
  const rng = createRng(5);
  const mine = createMonstrin('cogumi', 2, { rng });
  const foe = createMonstrin('brasito', 20, { rng });
  const b = new Battle({ kind: 'trainer', playerTeam: [mine], enemyTeam: [foe], enemyName: 'Caio', rng });
  assert.equal(b.sides[0].trainerHp, CONFIG.TRAINER_MAX_HP);
  // criatura do jogador vai desmaiar
  let guard = 0;
  while (!b.over && b.activeMon(0) && guard++ < 20) b.playTurn({ type: 'move', moveId: 'investida' });
  assert.equal(b.activeMon(0), null);
  assert.ok(b.isExposed(0));
  const hpBefore = b.sides[0].trainerHp;
  const evs = b.playTurn({ type: 'wait' });
  assert.ok(evs.some((e) => e.type === 'damage' && e.target === 'trainer' && e.side === 0));
  assert.ok(b.sides[0].trainerHp < hpBefore);
  guard = 0;
  while (!b.over && guard++ < 30) b.playTurn({ type: 'wait' });
  assert.equal(b.result, 'lose');
  assert.equal(b.sides[0].trainerHp, 0);
});

test('PV do treinador: criatura na equipe (não ativa) não protege; convocar protege', () => {
  const rng = createRng(6);
  const a = createMonstrin('cogumi', 2, { rng });
  const reserve = createMonstrin('pedrolho', 30, { rng });
  const foe = createMonstrin('brasito', 20, { rng });
  const b = new Battle({ kind: 'trainer', playerTeam: [a, reserve], enemyTeam: [foe], rng, playerLeadIndex: 0 });
  let guard = 0;
  while (b.activeMon(0) && guard++ < 20) b.playTurn({ type: 'move', moveId: 'investida' });
  assert.ok(b.isExposed(0), 'reserva na equipe não deve contar como ativa');
  const evs = b.playTurn({ type: 'switch', index: 1 });
  assert.ok(evs.some((e) => e.type === 'switch'));
  assert.ok(!evs.some((e) => e.type === 'damage' && e.target === 'trainer' && e.side === 0));
});

test('PV do treinador: vencer derrubando o adversário exposto', () => {
  const rng = createRng(8);
  const mine = createMonstrin('vulcarion', 40, { rng });
  const foe = createMonstrin('brotim', 3, { rng });
  const b = new Battle({ kind: 'trainer', playerTeam: [mine], enemyTeam: [foe], rng });
  let guard = 0;
  while (!b.over && guard++ < 30) b.playTurn({ type: 'move', moveId: mine.equippedMoves[0] });
  assert.equal(b.result, 'win');
  assert.equal(b.sides[1].trainerHp, 0);
});

test('jogo: equipe, coleção, inventário, missões e salvamento', () => {
  const store = new Map();
  const fakeLs = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const storage = new LocalStorageAdapter(fakeLs);
  const g = new Game(newGameState({ name: 'Ana', look: 1 }));
  for (let i = 0; i < 7; i++) g.addMonstrin(createMonstrin('cogumi', 3));
  assert.equal(g.party().length, CONFIG.PARTY_SIZE);
  assert.equal(g.box().length, 1);
  g.setFlag('starterChosen');
  assert.equal(g.questStatus('inicio'), 'done');
  assert.ok(g.count('selo_vinculo') >= 5);
  g.startQuest('primeira_captura');
  g.questEvent('capture');
  assert.equal(g.questStatus('primeira_captura'), 'done');
  g.startQuest('cogumi_flora');
  assert.equal(g.questStatus('cogumi_flora'), 'ready');
  // tônico
  const m = g.party()[0];
  m.hp = 1;
  assert.ok(applyHealItem(m, 'tonico').ok);
  storage.save(g.toJSON());
  storage.save(g.toJSON());
  const loaded = new Game(migrate(storage.load()));
  assert.equal(loaded.party().length, 6);
  assert.equal(loaded.s.player.name, 'Ana');
  assert.equal(loaded.getMon(m.uid).hp, m.hp);
  assert.ok(store.has(CONFIG.BACKUP_KEY));
  // derrota: volta ao centro e cura
  for (const x of loaded.party()) x.hp = 0;
  loaded.recoverFromDefeat();
  assert.ok(loaded.party().every((x) => x.hp === maxHp(x)));
  assert.equal(loaded.s.player.mapId, 'centro_monstrin');
});
