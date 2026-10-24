// Adversário controlado pelo computador (usa apenas informações públicas:
// não lê a ação secreta do jogador).
import { RULES } from './rules.js';

function expectedDamage(duel, user, ab, target) {
  if (!ab || ab.kind !== 'attack' || !target) return 0;
  const hits = ab.hits || 1;
  const elementMod = (target.card.weaknesses || {})[ab.element] ?? 1;
  const crit = ab.crit?.chance || 0;
  const per = (ab.damage?.fixed || 0) + Math.ceil(target.maxHp * (ab.damage?.pct || 0));
  const raw = per * elementMod * (1 + crit * ((ab.crit?.mult ?? RULES.DEFAULT_CRIT_MULT) - 1));
  const after = Math.max(0, raw - (target.card.resistance || 0) * (1 - (ab.pierce?.resistance || 0)));
  const shield = duel.shieldFor(target, { indirect: false, round: duel.round }) * (1 - (ab.pierce?.shield || 0));
  return after * (1 - shield) * hits * ((ab.accuracy ?? 100) / 100);
}

function scoreAttack(duel, p, user, ab) {
  const opp = duel.other(p);
  const targets = ab.target === 'area' ? duel.field(opp) : [opp.main].filter(Boolean);
  let score = 0;
  for (const t of targets) {
    const d = expectedDamage(duel, user, ab, t);
    score += Math.min(d, t.hp);
    if (d >= t.hp) score += 25; // chance de KO
  }
  for (const eff of ab.effects || []) score += 4 * (eff.chance ?? 1) * targets.length;
  if (ab.drain) score += 3;
  return score - (ab.cost || 0) * 2.2;
}

export function aiSetup(duel, pIdx, rng = Math.random) {
  const p = duel.players[pIdx];
  const sorted = [...p.hand].sort((a, b) => b.maxHp - a.maxHp);
  const main = sorted[0];
  const secs = sorted.slice(1).filter((c) => c.card.special).slice(0, 2);
  void rng;
  return { main: main.iid, secondaries: secs.map((c) => c.iid) };
}

export function aiPlan(duel, pIdx, rng = Math.random) {
  const p = duel.players[pIdx];
  const opp = duel.other(p);
  const free = { place: [], replace: null };
  // posiciona secundários nos espaços vazios (cartas com especial útil)
  const empty = p.secs.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  const handSorted = [...p.hand].sort((a, b) => b.maxHp - a.maxHp);
  const reserve = handSorted[0]; // guarda a carta mais forte para substituir o principal
  for (const slot of empty) {
    const c = handSorted.find((x) => x !== reserve && !free.place.some((pl) => pl.iid === x.iid));
    if (c && free.place.length < RULES.FREE_PLACEMENTS_PER_ROUND) free.place.push({ iid: c.iid, slot });
  }
  const candidates = [];
  const main = p.main;
  for (const ab of main.card.abilities) {
    if (duel.abilityBlocked(main, ab, p.ed)) continue;
    let s = 0;
    if (ab.kind === 'attack') s = scoreAttack(duel, p, main, ab);
    else if (ab.kind === 'heal') { const lost = main.maxHp - main.hp; s = lost > main.maxHp * 0.35 ? 18 + lost * 0.3 : -10; }
    else if (ab.kind === 'shield') s = main.hp < main.maxHp * 0.5 && !duel.activeShields(main, duel.round).length ? 14 : -5;
    else if (ab.kind === 'purify') s = main.conditions.length ? 16 : -10;
    else if (ab.kind === 'revive') s = p.grave.length ? 12 : -99;
    candidates.push({ s: s + rng() * 4, action: { type: 'ability', abilityId: ab.id } });
  }
  p.secs.forEach((sec, slot) => {
    if (!sec || !sec.card.special) return;
    const ab = sec.card.special;
    if (duel.abilityBlocked(sec, ab, p.ed) || sec.enteredRound >= duel.round) return;
    let s = -2;
    if (ab.kind === 'attack') s = scoreAttack(duel, p, sec, ab) - 3;
    else if (ab.kind === 'heal') s = main.maxHp - main.hp > 25 ? 20 : -5;
    else if (ab.kind === 'shield') s = main.hp < main.maxHp * 0.6 ? 12 : -2;
    else if (ab.kind === 'purify') s = main.conditions.length ? 15 : -8;
    else if (ab.kind === 'revive') s = p.grave.length ? 16 : -99;
    else if (ab.kind === 'interrupt') s = opp.ed >= 2 ? 10 : 0;
    candidates.push({ s: s + rng() * 4, action: { type: 'special', slot } });
  });
  // troca voluntária se o principal está quase derrotado e há secundário saudável
  const healthySec = p.secs.map((s, i) => ({ s, i })).filter((x) => x.s && x.s.hp > x.s.maxHp * 0.6).sort((a, b) => b.s.hp - a.s.hp)[0];
  if (healthySec && main.hp < main.maxHp * 0.2 && rng() < 0.5) candidates.push({ s: 15, action: { type: 'switch', slot: healthySec.i } });
  if (duel.config.itemsEnabled && p.itemUses < RULES.ITEM_USES_PVE && main.hp < main.maxHp * 0.35) candidates.push({ s: 17, action: { type: 'item', itemId: 'tonico_duelo', targetIid: main.iid } });
  candidates.sort((a, b) => b.s - a.s);
  const plan = { action: candidates[0]?.action || { type: 'ability', abilityId: main.card.abilities[0].id }, free };
  // não usar especial de um slot que acabou de ser preenchido
  if (duel.validatePlan(p, plan)) plan.free = { place: [], replace: null };
  if (duel.validatePlan(p, plan)) plan.action = { type: 'ability', abilityId: main.card.abilities.find((a) => !a.cost).id };
  return plan;
}

export function aiReplacement(duel, pIdx) {
  const p = duel.players[pIdx];
  const opts = duel.replaceOptions(p);
  return [...opts].sort((a, b) => b.hp - a.hp)[0].iid;
}
