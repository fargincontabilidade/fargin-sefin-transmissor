// Monstrin individual: cada exemplar capturado é único (identificador,
// variações de atributos, temperamento, ataques aprendidos e histórico).
import { CONFIG } from '../config.js';
import { getSpecies } from '../data/species.js';
import { getMove } from '../data/moves.js';
import { getItem } from '../data/items.js';
import { randInt, pick, uid } from './rng.js';

export const STAT_NAMES = { hp: 'PV', atk: 'Ataque', def: 'Defesa', spd: 'Velocidade' };

// Temperamento: pequena variação (+5% / -5%) para manter o equilíbrio.
export const TEMPERAMENTS = {
  equilibrado: { id: 'equilibrado', name: 'Equilibrado', up: null, down: null },
  corajoso: { id: 'corajoso', name: 'Corajoso', up: 'atk', down: 'spd' },
  cauteloso: { id: 'cauteloso', name: 'Cauteloso', up: 'def', down: 'atk' },
  agil: { id: 'agil', name: 'Ágil', up: 'spd', down: 'def' },
  robusto: { id: 'robusto', name: 'Robusto', up: 'hp', down: 'spd' },
  impetuoso: { id: 'impetuoso', name: 'Impetuoso', up: 'atk', down: 'def' },
  travesso: { id: 'travesso', name: 'Travesso', up: 'spd', down: 'atk' },
  sereno: { id: 'sereno', name: 'Sereno', up: 'hp', down: 'atk' },
  teimoso: { id: 'teimoso', name: 'Teimoso', up: 'def', down: 'spd' },
};

const TRAIT_LABELS = { hp: 'Resistente', atk: 'Forte', def: 'Firme', spd: 'Veloz' };

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(0.8 * level ** 3);
}

export function displayName(mon) {
  return mon.nickname || getSpecies(mon.speciesId).name;
}

export function calcStat(base, trait, level, statKey, temperamentId) {
  let v;
  if (statKey === 'hp') v = Math.floor(((2 * base + trait) * level) / 100) + level + 10;
  else v = Math.floor(((2 * base + trait) * level) / 100) + 5;
  const t = TEMPERAMENTS[temperamentId] || TEMPERAMENTS.equilibrado;
  if (t.up === statKey) v = Math.round(v * (1 + CONFIG.TEMPERAMENT_PCT));
  if (t.down === statKey) v = Math.round(v * (1 - CONFIG.TEMPERAMENT_PCT));
  return Math.max(1, v);
}

export function getStats(mon) {
  const sp = getSpecies(mon.speciesId);
  const out = {};
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    out[k] = calcStat(sp.base[k], mon.traits[k], mon.level, k, mon.temperament);
  }
  return out;
}

export function maxHp(mon) {
  return getStats(mon).hp;
}

// Característica marcante: atributo com maior variação individual.
export function signatureTrait(mon) {
  let best = 'hp';
  for (const k of ['atk', 'def', 'spd']) if (mon.traits[k] > mon.traits[best]) best = k;
  return { stat: best, label: TRAIT_LABELS[best], value: mon.traits[best] };
}

// Ataques que a espécie conhece até determinado nível.
export function movesUpToLevel(speciesId, level) {
  const sp = getSpecies(speciesId);
  const list = [];
  for (const e of sp.learnset) if (e.level <= level && !list.includes(e.move)) list.push(e.move);
  return list;
}

export function createMonstrin(speciesId, level, opts = {}) {
  const rng = opts.rng || Math.random;
  const sp = getSpecies(speciesId);
  level = Math.max(1, Math.min(CONFIG.MAX_LEVEL, level));
  const traits = opts.traits || {
    hp: randInt(rng, 0, CONFIG.TRAIT_MAX),
    atk: randInt(rng, 0, CONFIG.TRAIT_MAX),
    def: randInt(rng, 0, CONFIG.TRAIT_MAX),
    spd: randInt(rng, 0, CONFIG.TRAIT_MAX),
  };
  const temperament = opts.temperament || pick(rng, Object.keys(TEMPERAMENTS));
  const learned = movesUpToLevel(speciesId, level);
  const mon = {
    uid: uid('mon', rng),
    speciesId: sp.id,
    nickname: null,
    level,
    xp: xpForLevel(level),
    traits,
    temperament,
    learnedMoves: learned,
    equippedMoves: learned.slice(-CONFIG.MAX_EQUIPPED_MOVES),
    hp: 0,
    status: null,
    bond: 0,
    origin: { how: opts.how || 'wild', mapId: opts.mapId || null, level, date: opts.date || new Date().toISOString() },
    history: [],
    ot: opts.ot || null,
  };
  mon.hp = maxHp(mon);
  return mon;
}

export function isFainted(mon) {
  return mon.hp <= 0;
}

export function healFull(mon) {
  mon.hp = maxHp(mon);
  mon.status = null;
}

// Aprende um ataque (guardado para sempre). Equipa automaticamente se houver espaço.
export function learnMove(mon, moveId, source = 'level') {
  getMove(moveId);
  if (mon.learnedMoves.includes(moveId)) return { learned: false, equipped: false, reason: 'ja_conhece' };
  mon.learnedMoves.push(moveId);
  let equipped = false;
  if (mon.equippedMoves.length < CONFIG.MAX_EQUIPPED_MOVES) {
    mon.equippedMoves.push(moveId);
    equipped = true;
  }
  mon.history.push({ type: 'learned', move: moveId, source, level: mon.level, date: new Date().toISOString() });
  return { learned: true, equipped };
}

export function equipMove(mon, moveId) {
  if (!mon.learnedMoves.includes(moveId)) return { ok: false, reason: 'Ataque não aprendido.' };
  if (mon.equippedMoves.includes(moveId)) return { ok: false, reason: 'Já equipado.' };
  if (mon.equippedMoves.length >= CONFIG.MAX_EQUIPPED_MOVES) return { ok: false, reason: `Limite de ${CONFIG.MAX_EQUIPPED_MOVES} ataques equipados.` };
  mon.equippedMoves.push(moveId);
  return { ok: true };
}

export function unequipMove(mon, moveId) {
  if (!mon.equippedMoves.includes(moveId)) return { ok: false, reason: 'Não está equipado.' };
  if (mon.equippedMoves.length <= 1) return { ok: false, reason: 'O Monstrin precisa ter pelo menos 1 ataque equipado.' };
  mon.equippedMoves = mon.equippedMoves.filter((m) => m !== moveId);
  return { ok: true };
}

// Troca um ataque equipado por outro aprendido, mantendo a posição.
export function swapEquipped(mon, outId, inId) {
  const i = mon.equippedMoves.indexOf(outId);
  if (i < 0 || !mon.learnedMoves.includes(inId) || mon.equippedMoves.includes(inId)) return { ok: false };
  mon.equippedMoves[i] = inId;
  return { ok: true };
}

// Ganha experiência. Retorna os eventos (níveis, ataques novos, evolução pendente).
export function gainXp(mon, amount) {
  const events = [];
  if (mon.level >= CONFIG.MAX_LEVEL) return events;
  mon.xp += Math.max(0, Math.round(amount));
  while (mon.level < CONFIG.MAX_LEVEL && mon.xp >= xpForLevel(mon.level + 1)) {
    const before = getStats(mon);
    mon.level += 1;
    const after = getStats(mon);
    if (!isFainted(mon)) mon.hp = Math.min(after.hp, mon.hp + (after.hp - before.hp));
    events.push({ type: 'levelup', level: mon.level, before, after });
    const sp = getSpecies(mon.speciesId);
    for (const e of sp.learnset) {
      if (e.level === mon.level) {
        const r = learnMove(mon, e.move, 'level');
        if (r.learned) events.push({ type: 'learned', move: e.move, equipped: r.equipped });
      }
    }
  }
  if (mon.level >= CONFIG.MAX_LEVEL) mon.xp = xpForLevel(CONFIG.MAX_LEVEL);
  const evo = pendingEvolution(mon);
  if (evo) events.push({ type: 'canEvolve', to: evo });
  return events;
}

export function pendingEvolution(mon) {
  const sp = getSpecies(mon.speciesId);
  if (sp.evolution && mon.level >= sp.evolution.level) return sp.evolution.to;
  return null;
}

// Evolui preservando nível, XP, traços, temperamento, ataques e histórico.
export function evolve(mon) {
  const to = pendingEvolution(mon);
  if (!to) return null;
  const from = mon.speciesId;
  const before = getStats(mon);
  mon.speciesId = to;
  const after = getStats(mon);
  if (!isFainted(mon)) mon.hp = Math.min(after.hp, mon.hp + (after.hp - before.hp));
  mon.history.push({ type: 'evolved', from, to, level: mon.level, date: new Date().toISOString() });
  const learned = [];
  for (const m of movesUpToLevel(to, mon.level)) {
    if (!mon.learnedMoves.includes(m)) {
      const r = learnMove(mon, m, 'evolution');
      if (r.learned) learned.push(m);
    }
  }
  return { from, to, before, after, learned };
}

export function xpReward(defeated, { trainer = false } = {}) {
  const sp = getSpecies(defeated.speciesId);
  return Math.max(1, Math.round((sp.baseXp * defeated.level) / 4 * (trainer ? 1.5 : 1) * CONFIG.XP_MULT));
}

// Runas de Técnica
export function canUseRune(mon, itemId) {
  const item = getItem(itemId);
  if (item.category !== 'runa') return { ok: false, reason: 'Este item não é uma Runa de Técnica.' };
  const sp = getSpecies(mon.speciesId);
  const compat = item.compatible || {};
  const byElement = compat.elements ? compat.elements.includes(sp.element) : false;
  const bySpecies = compat.species ? compat.species.includes(sp.id) : false;
  if (!byElement && !bySpecies) return { ok: false, reason: `${displayName(mon)} não é compatível com esta runa.` };
  if (mon.level < (item.minLevel || 1)) return { ok: false, reason: `Requer nível ${item.minLevel}.` };
  if (mon.learnedMoves.includes(item.teaches)) return { ok: false, reason: `${displayName(mon)} já conhece ${getMove(item.teaches).name}.` };
  return { ok: true };
}

export function applyRune(mon, itemId) {
  const check = canUseRune(mon, itemId);
  if (!check.ok) return check;
  const item = getItem(itemId);
  const r = learnMove(mon, item.teaches, 'runa');
  return { ok: true, move: item.teaches, equipped: r.equipped };
}

// Uso de itens de recuperação fora/dentro de batalha.
// Itens comuns curam só Monstrins conscientes. Monstrins desmaiados se
// recuperam apenas no Centro Monstrin (itens de reviver ficam para o futuro).
export function canUseHealItem(mon, itemId) {
  const item = getItem(itemId);
  if (item.revive) return { ok: false, reason: 'Ainda não funciona. Monstrins desmaiados se recuperam no Centro Monstrin.' };
  if (item.heal) {
    if (isFainted(mon)) return { ok: false, reason: 'Está desmaiado. Leve ao Centro Monstrin para recuperar.' };
    if (mon.hp >= maxHp(mon)) return { ok: false, reason: 'Os PV já estão cheios.' };
    return { ok: true };
  }
  return { ok: false, reason: 'Não pode ser usado aqui.' };
}

export function applyHealItem(mon, itemId) {
  const check = canUseHealItem(mon, itemId);
  if (!check.ok) return check;
  const item = getItem(itemId);
  const mx = maxHp(mon);
  const before = mon.hp;
  if (item.revive) mon.hp = Math.max(1, Math.floor(mx * item.revive));
  else mon.hp = Math.min(mx, mon.hp + item.heal);
  return { ok: true, healed: mon.hp - before };
}
