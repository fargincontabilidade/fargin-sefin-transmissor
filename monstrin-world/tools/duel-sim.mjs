import { Duel } from '../src/duel/engine.js';
import { PRESET_DECKS } from '../src/duel/cards.js';
import { aiSetup, aiPlan, aiReplacement } from '../src/duel/ai.js';
import { createRng } from '../src/core/rng.js';
export function playAI(seed, decks = [PRESET_DECKS.chamas.cards, PRESET_DECKS.mare.cards]) {
  const rng = createRng(seed);
  const d = new Duel({ decks, rng });
  for (const i of [0, 1]) d.submitSetup(i, aiSetup(d, i, rng));
  let guard = 0;
  while (!d.result && guard++ < 200) {
    if (d.phase === 'replace') { for (const i of [0, 1]) if (d.players[i].pendingReplace) d.chooseReplacement(i, aiReplacement(d, i)); continue; }
    for (const i of [0, 1]) { const r = d.submit(i, aiPlan(d, i, rng)); if (!r.ok) throw new Error(`plano inválido r${d.round} p${i}: ${r.error}`); }
    d.resolveRound();
  }
  return { rounds: d.round, result: d.result, kos: d.players.map((p) => p.kos) };
}
if (process.argv[1].endsWith('duel-sim.mjs')) {
  const N = +process.argv[2] || 500;
  const stats = { rounds: [], w: { 0: 0, 1: 0, null: 0 }, reasons: {} };
  for (let s = 1; s <= N; s++) { const r = playAI(s); stats.rounds.push(r.rounds); stats.w[r.result.winner]++; stats.reasons[r.result.reason] = (stats.reasons[r.result.reason] || 0) + 1; }
  stats.rounds.sort((a, b) => a - b);
  const avg = stats.rounds.reduce((a, b) => a + b, 0) / N;
  console.log('partidas', N, 'média de rodadas', avg.toFixed(1), 'mediana', stats.rounds[N >> 1], 'min', stats.rounds[0], 'max', stats.rounds[N - 1]);
  console.log('vitórias Chamas', stats.w[0], 'Maré', stats.w[1], 'empates', stats.w.null, JSON.stringify(stats.reasons));
}
