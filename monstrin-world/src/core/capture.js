// Cálculo de captura. Considera PV restantes, raridade (taxa da espécie),
// nível, item utilizado e modificadores (ex.: queimadura).
import { getSpecies } from '../data/species.js';
import { getItem } from '../data/items.js';
import { maxHp } from './monstrin.js';

export function captureChance(mon, itemId, modifiers = {}) {
  const sp = getSpecies(mon.speciesId);
  const item = getItem(itemId);
  const hpRatio = Math.max(0, mon.hp) / maxHp(mon);
  const hpFactor = 1 - (2 / 3) * hpRatio; // PV cheio = 0,33 / quase zero = ~1
  const levelFactor = Math.max(0.5, Math.min(1.05, 1.1 - mon.level * 0.02));
  const statusFactor = mon.status ? 1.25 : 1;
  const extra = modifiers.mult ?? 1;
  const chance = sp.catchRate * (item.catchMult || 1) * hpFactor * levelFactor * statusFactor * extra;
  return Math.max(0.02, Math.min(0.97, chance));
}

// Retorna quantas "balançadas" o selo dá (0..3) e se a captura teve sucesso.
export function rollCapture(chance, rng = Math.random) {
  const perShake = Math.pow(chance, 1 / 3);
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (rng() < perShake) shakes++;
    else break;
  }
  return { shakes, success: shakes === 3 };
}
