// Testes do sistema de duelos (Regulamento v1.0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Duel } from '../src/duel/engine.js';
import { RULES } from '../src/duel/rules.js';
import { DUEL_CARDS, PRESET_DECKS, validateDeck } from '../src/duel/cards.js';
import { aiSetup, aiPlan, aiReplacement } from '../src/duel/ai.js';
import { createRng } from '../src/core/rng.js';

// ---------- cartas de teste (números controlados) ----------
const atk = (id, dmg, extra = {}) => ({ id, name: id, kind: 'attack', cost: 0, element: 'neutro', target: 'single', damage: { fixed: dmg }, accuracy: 100, ...extra });
const wait = { id: 'esperar', name: 'Esperar', kind: 'shield', cost: 0, target: 'self', shield: { pct: 0, duration: 1 } };
const base = (id, hp, extra = {}) => ({ id, name: id, element: 'neutro', art: 'cogumi', hp, resistance: 0, weaknesses: {}, immunities: [], abilities: [wait, atk('golpe10', 10)], ...extra });
const T = {
  dummy: base('dummy', 100),
  res8: base('res8', 100, { resistance: 8 }),
  triple: base('triple', 100, { abilities: [wait, atk('tri', 10, { hits: 3 })] }),
  weakA: base('weakA', 100, { abilities: [wait, atk('fraco', 5, { effects: [{ condition: 'poison', chance: 1, dmg: 5, duration: 3 }] })] }),
  miss: base('miss', 100, { abilities: [wait, atk('erra', 30, { accuracy: 0, cost: 1, oncePerDuel: true, effects: [{ condition: 'poison', chance: 1, dmg: 5, duration: 3 }] })] }),
  thorny: base('thorny', 10, { abilities: [wait, atk('golpe10', 10)], passive: { id: 'espinhos', name: 'Espinhos', type: 'retaliate', per: 'attack', damage: { fixed: 10 } } }),
  thorny50: base('thorny50', 50, { abilities: [wait, atk('golpe10', 10)], passive: { id: 'espinhos', name: 'Espinhos', type: 'retaliate', per: 'attack', damage: { fixed: 10 } } }),
  frail: base('frail', 5),
  shielder: base('shielder', 100, { abilities: [{ id: 'escudo', name: 'Escudo', kind: 'shield', cost: 1, target: 'self', shield: { pct: 0.5, duration: 1, scope: 'direct' } }, atk('golpe10', 10)] }),
  healer: base('healer', 100, { abilities: [{ id: 'cura', name: 'Cura', kind: 'heal', cost: 0, target: 'self', heal: { fixed: 50 } }] }),
  hit60: base('hit60', 100, { abilities: [wait, atk('g60', 60)] }),
  poisoner: base('poisoner', 100, { abilities: [wait, atk('veneno', 0, { effects: [{ condition: 'poison', chance: 1, dmg: 5, duration: 3 }] })] }),
  purifier: base('purifier', 100, { abilities: [{ id: 'purificar', name: 'Purificar', kind: 'purify', cost: 0, target: 'self', purify: true }] }),
  drain50: base('drain50', 100, { abilities: [wait, atk('drena', 50, { drain: 0.5 })] }),
  drain3: base('drain3', 100, { abilities: [wait, atk('drena3', 3, { hits: 3, drain: 0.5 })] }),
  drainArea: base('drainArea', 100, { abilities: [wait, atk('drenaArea', 100, { target: 'area', drain: 0.5 })] }),
  area: base('area', 100, { abilities: [wait, atk('area', 100, { target: 'area' })] }),
  hp10: base('hp10', 10), hp20: base('hp20', 20), hp30: base('hp30', 30),
  fire: base('fire', 100, { element: 'fogo', abilities: [wait, atk('chama', 10, { element: 'fogo' })] }),
  leaf: base('leaf', 100, { element: 'planta', weaknesses: { fogo: 2 } }),
  stunner: base('stunner', 100, { abilities: [wait, atk('choque', 1, { effects: [{ condition: 'paralysis', chance: 1, intensity: 1, duration: 2 }] })] }),
  reviver: base('reviver', 100, { special: { id: 'reviver', name: 'Reviver', kind: 'revive', cost: 2, oncePerDuel: true } }),
  interrupter: base('interrupter', 100, { special: { id: 'clarao', name: 'Clarão', kind: 'interrupt', cost: 1, interrupt: true, oncePerDuel: true } }),
};

const neverRng = () => 0.5; // acerta tudo (precisão 100), sem crítico com chance 0, status com chance 1 aplicam

// Monta um duelo com o campo já definido.
function arrange({ a, b, round = 1, rng = neverRng }) {
  const fill = Array(15).fill('dummy');
  const d = new Duel({ decks: [fill, fill], rng, catalog: T, config: { shuffle: false } });
  const sides = [a, b];
  for (const i of [0, 1]) {
    const p = d.players[i];
    const s = sides[i];
    p.hand = (s.hand || []).map((id) => { const c = d.makeInst(id, i); c.zone = 'hand'; return c; });
    p.deck = (s.deck ?? []).map((id) => d.makeInst(id, i));
    p.main = d.makeInst(s.main, i); p.main.zone = 'main';
    p.secs = (s.secs || [null, null]).map((id) => { if (!id) return null; const c = d.makeInst(id, i); c.zone = 'sec'; return c; });
    while (p.secs.length < 2) p.secs.push(null);
    p.ed = s.ed ?? 6;
    p.kos = s.kos ?? 0;
  }
  d.round = round;
  d.phase = 'planning';
  return d;
}
const act = (abilityId) => ({ action: { type: 'ability', abilityId } });
function play(d, planA, planB) {
  assert.deepEqual(d.submit(0, planA), { ok: true });
  assert.deepEqual(d.submit(1, planB), { ok: true });
  return d.resolveRound();
}

// =============== Casos obrigatórios (seção 14) ===============
test('14.1 Ambos têm 4 KOs e derrotam um Monstrin na mesma rodada → empate', () => {
  const d = arrange({ a: { main: 'hp10', kos: 4, hand: ['dummy'] }, b: { main: 'hp10', kos: 4, hand: ['dummy'] } });
  const ev = play(d, act('golpe10'), act('golpe10'));
  assert.equal(d.players[0].kos, 5);
  assert.equal(d.players[1].kos, 5);
  assert.equal(d.result.winner, null);
  assert.ok(ev.some((e) => e.type === 'end'));
});

test('14.2 Golpe em área causa 3 KOs e leva o atacante de 3 para 6 KOs → vitória', () => {
  const d = arrange({ a: { main: 'area', kos: 3 }, b: { main: 'hp10', secs: ['hp20', 'hp30'], hand: ['dummy'] } });
  play(d, act('area'), act('esperar'));
  assert.equal(d.players[0].kos, 6);
  assert.deepEqual(d.result, { winner: 0, reason: '5 KOs' });
});

test('14.3 Ataque acerta e a resistência bloqueia todo o dano → 0 PV, status ainda pode ocorrer', () => {
  const d = arrange({ a: { main: 'weakA' }, b: { main: 'res8' } });
  play(d, act('fraco'), act('esperar'));
  assert.equal(d.players[1].main.hp, 100);
  assert.ok(d.players[1].main.conditions.some((c) => c.type === 'poison'));
});

test('14.4 Ataque erra → sem dano e sem status; ação e recursos consumidos', () => {
  const d = arrange({ a: { main: 'miss', ed: 4 }, b: { main: 'dummy' } });
  play(d, act('erra'), act('esperar'));
  assert.equal(d.players[1].main.hp, 100);
  assert.equal(d.players[1].main.conditions.length, 0);
  assert.equal(d.players[0].ed, 3 + RULES.ED_PER_ROUND, 'pagou 1 ED (e recebeu +2 na nova rodada)');
  assert.equal(d.players[0].main.usedOnce.erra, true);
});

test('14.5 Três golpes de 10 contra resistência 8 → 6 de dano (2 por golpe)', () => {
  const d = arrange({ a: { main: 'triple' }, b: { main: 'res8' } });
  const ev = play(d, act('tri'), act('esperar'));
  assert.deepEqual(ev.filter((e) => e.type === 'hit').map((e) => e.dmg), [2, 2, 2]);
  assert.equal(d.players[1].main.hp, 94);
});

test('14.6 Golpe fatal contra Espinhos → retaliação válida pode derrotar o atacante', () => {
  const d = arrange({ a: { main: 'hp10', hand: ['dummy'] }, b: { main: 'thorny', hand: ['dummy'] } });
  const ev = play(d, act('golpe10'), act('esperar'));
  assert.ok(ev.some((e) => e.type === 'retaliate' && e.amount === 10));
  assert.equal(d.players[0].kos, 1, 'atacante derrubou o portador');
  assert.equal(d.players[1].kos, 1, 'retaliação derrubou o atacante');
});

test('14.7 Espinhos causa dano em outro Espinhos → não desencadeia nova retaliação', () => {
  const d = arrange({ a: { main: 'thorny50' }, b: { main: 'thorny50' } });
  const ev = play(d, act('golpe10'), act('esperar'));
  assert.equal(ev.filter((e) => e.type === 'retaliate').length, 1);
  assert.equal(d.players[0].main.hp, 40);
  assert.equal(d.players[1].main.hp, 40);
});

test('14.8 Ataque e troca voluntária no mesmo planejamento → o novo principal recebe o ataque', () => {
  const d = arrange({ a: { main: 'dummy' }, b: { main: 'hp10', secs: ['dummy', null] } });
  const oldMain = d.players[1].main;
  const incoming = d.players[1].secs[0];
  play(d, act('golpe10'), { action: { type: 'switch', slot: 0 } });
  assert.equal(d.players[1].main, incoming);
  assert.equal(incoming.hp, 90);
  assert.equal(oldMain.hp, 10, 'quem saiu ficou protegido');
});

test('14.9 Escudo recém-ativado e ataque inimigo → escudo protege já nesta rodada', () => {
  const d = arrange({ a: { main: 'dummy' }, b: { main: 'shielder' } });
  play(d, act('golpe10'), act('escudo'));
  assert.equal(d.players[1].main.hp, 95);
});

test('14.10 Cura de 50 em alvo com 30 PV que recebe 60 → termina com 20 PV', () => {
  const d = arrange({ a: { main: 'hit60' }, b: { main: 'healer' } });
  d.players[1].main.hp = 30;
  play(d, act('g60'), act('cura'));
  assert.equal(d.players[1].main.hp, 20);
});

test('14.11 Veneno aplicado na rodada 3 → primeiro dano ao fim da rodada 4', () => {
  const d = arrange({ a: { main: 'poisoner' }, b: { main: 'dummy' }, round: 3 });
  let ev = play(d, act('veneno'), act('esperar'));
  assert.ok(!ev.some((e) => e.type === 'tick'));
  assert.equal(d.players[1].main.hp, 100);
  ev = play(d, act('esperar'), act('esperar'));
  assert.equal(d.round, 5);
  const tick = ev.find((e) => e.type === 'tick');
  assert.ok(tick && tick.amount === 5);
  assert.equal(d.players[1].main.hp, 95);
});

test('14.12 Purificação e novo veneno na mesma rodada → remove os antigos; o novo veneno entra', () => {
  const d = arrange({ a: { main: 'poisoner' }, b: { main: 'purifier' } });
  d.players[1].main.conditions.push({ type: 'burn', dmg: 3, remaining: 3, appliedRound: 0, source: 0 });
  const ev = play(d, act('veneno'), act('purificar'));
  const conds = d.players[1].main.conditions.map((c) => c.type);
  assert.deepEqual(conds, ['poison']);
  assert.ok(ev.find((e) => e.type === 'purify').removed.includes('burn'));
  assert.ok(!ev.some((e) => e.type === 'tick'), 'queimadura removida antes de causar dano');
});

test('14.13 Drenagem de 50% causa 50 contra alvo com só 10 PV → recupera 5', () => {
  const d = arrange({ a: { main: 'drain50' }, b: { main: 'hp10', hand: ['dummy'] } });
  d.players[0].main.hp = 50;
  const ev = play(d, act('drena'), act('esperar'));
  assert.equal(ev.find((e) => e.type === 'drain').amount, 5);
  assert.equal(d.players[0].main.hp, 55);
});

test('14.14 Drenagem de 50% em 3 golpes que retiram 3 PV cada → recupera 5 (soma e arredondamento único)', () => {
  const d = arrange({ a: { main: 'drain3' }, b: { main: 'dummy' } });
  d.players[0].main.hp = 50;
  play(d, act('drena3'), act('esperar'));
  assert.equal(d.players[0].main.hp, 55);
});

test('14.15 Drenagem em área tira 30 + 20 + 10 PV, taxa 50% → recupera 30 (até o máximo)', () => {
  const d = arrange({ a: { main: 'drainArea' }, b: { main: 'hp30', secs: ['hp20', 'hp10'], hand: ['dummy'] } });
  d.players[0].main.hp = 60;
  const ev = play(d, act('drenaArea'), act('esperar'));
  assert.equal(ev.find((e) => e.type === 'drain').amount, 30);
  assert.equal(d.players[0].main.hp, 90);
  const d2 = arrange({ a: { main: 'drainArea' }, b: { main: 'hp30', secs: ['hp20', 'hp10'], hand: ['dummy'] } });
  d2.players[0].main.hp = 85;
  play(d2, act('drenaArea'), act('esperar'));
  assert.equal(d2.players[0].main.hp, 100, 'respeita o PV máximo');
});

test('14.16 Principal morre sem secundário nem mão, mas com cartas no deck → derrota por falta de substituto', () => {
  // Pela reposição imediata da mão este estado não ocorre em jogo normal (ver docs/DUELOS.md);
  // aqui ele é construído diretamente para validar a regra de decisão: o deck não conta como substituto.
  const d = arrange({ a: { main: 'dummy', hand: ['dummy'] }, b: { main: 'hp10', hand: [], deck: ['dummy', 'dummy'] } });
  d.players[1].main = null;
  d.players[1].hand = [];
  assert.deepEqual(d.checkResult(), { winner: 0, reason: 'falta de Monstrins disponíveis' });
  // ...a menos que já tenha vencido por 5 KOs
  d.players[1].kos = 5;
  assert.equal(d.checkResult().winner, 1, 'vitória por 5 KOs tem prioridade sobre falta de substituto');
  // e, com deck vazio, a derrota por falta de substituto acontece pelo fluxo normal da rodada
  const d2 = arrange({ a: { main: 'dummy', hand: ['dummy'] }, b: { main: 'hp10', hand: [], deck: [] } });
  play(d2, act('golpe10'), act('esperar'));
  assert.deepEqual(d2.result, { winner: 0, reason: 'falta de Monstrins disponíveis' });
});

test('14.17 Mesmo Monstrin revivido morre novamente → cada nova morte contabiliza novo KO', () => {
  const d = arrange({ a: { main: 'dummy', hand: ['dummy'] }, b: { main: 'hp10', secs: ['reviver', null], hand: ['dummy', 'dummy'] } });
  const victim = d.players[1].main;
  play(d, act('golpe10'), act('esperar'));
  assert.equal(d.players[0].kos, 1);
  assert.equal(d.phase, 'replace');
  d.chooseReplacement(1, d.players[1].secs[0].iid); // reviver assume como principal
  // novo secundário com o especial de reviver
  d.players[1].secs[0] = d.makeInst('reviver', 1); d.players[1].secs[0].zone = 'sec';
  play(d, act('esperar'), { action: { type: 'special', slot: 0 }, reviveTarget: victim.iid });
  assert.ok(d.players[1].hand.includes(victim));
  assert.equal(victim.hp, 10, 'volta com 100% dos PV');
  // coloca o revivido como principal e derruba de novo
  play(d, act('esperar'), { action: { type: 'switch', iid: victim.iid } });
  play(d, act('golpe10'), act('esperar'));
  assert.equal(d.players[0].kos, 2);
});

// =============== Outras regras ===============
test('fórmula: crítico → fraqueza → resistência → escudo, arredondando para cima', () => {
  // 10 × 1,5 × 2 = 30; − 3 = 27; escudo 30% → 18,9 → 19
  assert.equal(Duel.hitDamage({ fixed: 10, crit: true, elementMod: 2, resistance: 3, shield: 0.3, targetMaxHp: 100 }), 19);
  // componente percentual arredondado para cima: ceil(55 × 0,15) = 9; 5 + 9 = 14
  assert.equal(Duel.hitDamage({ fixed: 5, pct: 0.15, targetMaxHp: 55 }), 14);
  // resistência nunca deixa negativo e não há dano mínimo
  assert.equal(Duel.hitDamage({ fixed: 3, resistance: 8, targetMaxHp: 100 }), 0);
  // perfurações independentes
  assert.equal(Duel.hitDamage({ fixed: 10, resistance: 8, resistancePierce: 1, targetMaxHp: 100 }), 10);
  assert.equal(Duel.hitDamage({ fixed: 10, shield: 0.5, shieldPierce: 0.5, targetMaxHp: 100 }), 8);
  // limite de 75% para escudos comuns
  assert.equal(Duel.hitDamage({ fixed: 100, shield: 0.9, targetMaxHp: 100 }), 25);
});

test('fraqueza elemental 2× na ficha', () => {
  const d = arrange({ a: { main: 'fire' }, b: { main: 'leaf' } });
  play(d, act('chama'), act('esperar'));
  assert.equal(d.players[1].main.hp, 80);
});

test('Energia de Duelo: início 2, +2 por rodada (inclusive a 1ª), máximo 6; sem ED não confirma', () => {
  const fill = PRESET_DECKS.chamas.cards;
  const d = new Duel({ decks: [fill, PRESET_DECKS.mare.cards], rng: createRng(1) });
  for (const i of [0, 1]) d.submitSetup(i, aiSetup(d, i));
  assert.equal(d.round, 1);
  assert.equal(d.players[0].ed, 4);
  const d2 = arrange({ a: { main: 'shielder', ed: 0 }, b: { main: 'dummy' } });
  assert.equal(d2.submit(0, act('escudo')).ok, false);
  const d3 = arrange({ a: { main: 'dummy', ed: 6 }, b: { main: 'dummy' } });
  play(d3, act('esperar'), act('esperar'));
  assert.equal(d3.players[0].ed, 6);
});

test('mão: 5 cartas e reposição imediata; secundários e posicionamento gratuito', () => {
  const d = new Duel({ decks: [PRESET_DECKS.chamas.cards, PRESET_DECKS.mare.cards], rng: createRng(2) });
  assert.equal(d.players[0].hand.length, 5);
  const h = d.players[0].hand;
  d.submitSetup(0, { main: h[0].iid, secondaries: [h[1].iid, h[2].iid] });
  d.submitSetup(1, aiSetup(d, 1));
  assert.equal(d.players[0].hand.length, 5);
  assert.equal(d.players[0].deck.length, 15 - 8);
  assert.equal(d.submitSetup(0, { main: 'x' }).ok, false);
});

test('especial do secundário: só na rodada seguinte à entrada, 1× por duelo, consome a ação', () => {
  const d = arrange({ a: { main: 'dummy', hand: ['reviver'] }, b: { main: 'dummy' } });
  const r = d.players[0].hand[0];
  play(d, { action: { type: 'ability', abilityId: 'esperar' }, free: { place: [{ iid: r.iid, slot: 0 }] } }, act('esperar'));
  assert.equal(d.players[0].secs[0], r);
  // ainda sem cemitério, mas a regra de entrada já liberou; testa uso único com interrupção
  const d2 = arrange({ a: { main: 'dummy', secs: ['interrupter', null] }, b: { main: 'hit60' } });
  d2.players[0].secs[0].enteredRound = 1;
  assert.equal(d2.submit(0, { action: { type: 'special', slot: 0 } }).ok, false, 'entrou nesta rodada');
  d2.players[0].secs[0].enteredRound = 0;
  const ev = play(d2, { action: { type: 'special', slot: 0 } }, act('g60'));
  assert.ok(ev.some((e) => e.type === 'cancelled'));
  assert.equal(d2.players[0].main.hp, 100, 'Interrupção Imediata cancelou o ataque');
  assert.equal(d2.submit(0, { action: { type: 'special', slot: 0 } }).ok, false, 'uso único');
});

test('secundários são protegidos de ataques de alvo único, mas não de área', () => {
  const d = arrange({ a: { main: 'dummy' }, b: { main: 'dummy', secs: ['dummy', null] } });
  play(d, act('golpe10'), act('esperar'));
  assert.equal(d.players[1].secs[0].hp, 100);
  const d2 = arrange({ a: { main: 'area' }, b: { main: 'dummy', secs: ['dummy', 'dummy'] } });
  play(d2, act('area'), act('esperar'));
  assert.ok(d2.players[1].secs.every((s) => s === null), 'ambos derrotados pela área');
});

test('paralisia: recém-aplicada não afeta a rodada; falha por paralisia devolve ED e uso único', () => {
  const d = arrange({ a: { main: 'stunner' }, b: { main: 'miss', ed: 4 } });
  play(d, act('choque'), act('esperar'));
  assert.ok(d.players[1].main.conditions.some((c) => c.type === 'paralysis'));
  const ev = play(d, act('esperar'), act('erra'));
  assert.ok(ev.some((e) => e.type === 'fail' && e.condition === 'paralysis'));
  assert.ok(!d.players[1].main.usedOnce.erra, 'uso único não foi gasto');
});

test('reaplicação da mesma condição: prevalece a de maior dano; mais fraca não substitui', () => {
  const d = arrange({ a: { main: 'poisoner' }, b: { main: 'dummy' } });
  d.players[1].main.conditions.push({ type: 'poison', dmg: 8, remaining: 1, appliedRound: 0, source: 0 });
  play(d, act('veneno'), act('esperar'));
  const p = d.players[1].main.conditions.filter((c) => c.type === 'poison');
  assert.equal(p.length, 0, 'o veneno forte (8) expirou; o fraco (5) não o substituiu');
});

test('condições ficam pausadas fora do campo', () => {
  const d = arrange({ a: { main: 'dummy' }, b: { main: 'dummy', hand: ['dummy'] } });
  const m = d.players[1].main;
  m.conditions.push({ type: 'poison', dmg: 5, remaining: 2, appliedRound: 0, source: 0 });
  play(d, act('esperar'), { action: { type: 'switch', iid: d.players[1].hand[0].iid } });
  // o envenenado foi para a mão antes do fim da rodada → não sofre tick
  assert.equal(m.hp, 100);
  assert.equal(m.conditions[0].remaining, 2);
});

test('tempo esgotado: Defesa Básica reduz 20% e 3 esgotamentos seguidos = abandono', () => {
  const d = arrange({ a: { main: 'dummy' }, b: { main: 'dummy' } });
  play(d, act('golpe10'), { action: { type: 'timeout' } });
  assert.equal(d.players[1].main.hp, 92);
  play(d, act('esperar'), { action: { type: 'timeout' } });
  play(d, act('esperar'), { action: { type: 'timeout' } });
  assert.deepEqual(d.result, { winner: 0, reason: 'abandono' });
});

test('baralhos prontos são válidos e o regulamento rejeita baralhos inválidos', () => {
  for (const deck of Object.values(PRESET_DECKS)) assert.ok(validateDeck(deck.cards, RULES).ok, deck.name);
  assert.equal(validateDeck(Array(15).fill('brasito'), RULES).ok, false);
  assert.equal(validateDeck(['brasito'], RULES).ok, false);
  for (const c of Object.values(DUEL_CARDS)) assert.ok(c.abilities.length <= 4 && c.abilities.some((a) => a.kind === 'attack' && !a.cost), `${c.id} precisa de um ataque básico`);
});

test('partidas completas IA × IA terminam sem erros, com duração média entre 5 e 9 rodadas', () => {
  let total = 0;
  const N = 150;
  for (let s = 1; s <= N; s++) {
    const rng = createRng(s);
    const d = new Duel({ decks: [PRESET_DECKS.chamas.cards, PRESET_DECKS.mare.cards], rng });
    for (const i of [0, 1]) d.submitSetup(i, aiSetup(d, i, rng));
    let guard = 0;
    while (!d.result && guard++ < 100) {
      if (d.phase === 'replace') { for (const i of [0, 1]) if (d.players[i].pendingReplace) assert.ok(d.chooseReplacement(i, aiReplacement(d, i)).ok); continue; }
      for (const i of [0, 1]) assert.deepEqual(d.submit(i, aiPlan(d, i, rng)), { ok: true });
      d.resolveRound();
      for (const p of d.players) for (const c of [p.main, ...p.secs].filter(Boolean)) assert.ok(c.hp > 0 && c.hp <= c.maxHp);
    }
    assert.ok(d.result, `partida ${s} terminou`);
    total += d.round;
  }
  const avg = total / N;
  assert.ok(avg >= 5 && avg <= 9, `média ${avg}`);
});
