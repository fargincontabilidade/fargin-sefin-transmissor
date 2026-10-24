// Motor de Duelos — Regulamento v1.0.
// Lógica pura (sem gráficos). Ações secretas, confirmação simultânea e
// resolução em 9 fases (seção 5 do regulamento). Devolve uma lista de eventos
// que a interface anima; a animação nunca altera o resultado lógico.
import { RULES, ceilSafe } from './rules.js';
import { DUEL_CARDS, getCard } from './cards.js';

const PERIODIC = ['poison', 'burn'];
const INCAPACITATE = ['sleep', 'freeze'];
export const CONDITION_NAMES = { poison: 'Veneno', burn: 'Queimadura', paralysis: 'Paralisia', sleep: 'Sono', freeze: 'Congelamento' };

export const DUEL_ITEMS = {
  tonico_duelo: { id: 'tonico_duelo', name: 'Tônico de Duelo', heal: 30, desc: 'Cura 30 PV de um Monstrin seu em campo (PvE).' },
};

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Duel {
  /**
   * @param {object} o
   * @param {string[][]} o.decks  dois baralhos (ids de cartas)
   * @param {string[]} [o.names]
   * @param {function} [o.rng]
   * @param {object} [o.config] { itemsEnabled, shuffle }
   */
  constructor(o) {
    this.rng = o.rng || Math.random;
    this.catalog = o.catalog || DUEL_CARDS;
    this.config = { itemsEnabled: false, shuffle: true, ...(o.config || {}) };
    this.round = 0;
    this.phase = 'setup';
    this.result = null;
    this.iidSeq = 0;
    this.log = [];
    this.players = [0, 1].map((idx) => {
      const deck = o.decks[idx].map((id) => this.makeInst(id, idx));
      if (this.config.shuffle) shuffle(deck, this.rng);
      return {
        idx, name: (o.names && o.names[idx]) || (idx === 0 ? 'Jogador' : 'Adversário'),
        deck, hand: [], main: null, secs: [null, null], grave: [],
        ed: RULES.ED_START, kos: 0, itemUses: 0, timeouts: 0,
        plan: null, setup: null, pendingReplace: false,
      };
    });
    for (const p of this.players) this.refill(p);
  }

  makeInst(cardId, owner) {
    const card = getCard(cardId, this.catalog);
    return {
      iid: `c${++this.iidSeq}`, cardId, card, owner,
      hp: card.hp, maxHp: card.hp, zone: 'deck',
      conditions: [], shields: [], usedOnce: {}, cooldowns: {},
      passiveUsed: false, passiveCooldown: 0, enteredRound: 0,
    };
  }

  // ---------------- Utilidades ----------------
  other(p) { return this.players[1 - p.idx]; }
  field(p) { return [p.main, ...p.secs].filter(Boolean); }
  find(iid) {
    for (const p of this.players) {
      for (const z of [p.hand, p.deck, p.grave, [p.main], p.secs]) {
        const c = z.find((x) => x && x.iid === iid);
        if (c) return c;
      }
    }
    return null;
  }

  refill(p) {
    while (p.hand.length < RULES.HAND_SIZE && p.deck.length) {
      const c = p.deck.shift();
      c.zone = 'hand';
      p.hand.push(c);
    }
  }

  removeFromHand(p, iid) {
    const i = p.hand.findIndex((c) => c.iid === iid);
    if (i < 0) return null;
    return p.hand.splice(i, 1)[0];
  }

  // ---------------- Preparação inicial ----------------
  // Cada jogador escolhe 1 principal e até 2 secundários da mão.
  submitSetup(pIdx, { main, secondaries = [] }) {
    if (this.phase !== 'setup') return { ok: false, error: 'Fora da fase de preparação.' };
    const p = this.players[pIdx];
    const ids = [main, ...secondaries];
    if (!main || !p.hand.some((c) => c.iid === main)) return { ok: false, error: 'Escolha um principal da mão.' };
    if (secondaries.length > RULES.MAX_SECONDARIES) return { ok: false, error: 'No máximo 2 secundários.' };
    if (new Set(ids).size !== ids.length || !ids.every((id) => p.hand.some((c) => c.iid === id))) return { ok: false, error: 'Cartas inválidas.' };
    p.setup = { main, secondaries };
    if (this.players.every((x) => x.setup)) return { ok: true, events: this.applySetup() };
    return { ok: true, events: [] };
  }

  applySetup() {
    const events = [];
    for (const p of this.players) {
      const m = this.removeFromHand(p, p.setup.main);
      this.enterField(p, m, 'main', 0);
      p.setup.secondaries.forEach((iid, i) => this.enterField(p, this.removeFromHand(p, iid), i, 0));
      this.refill(p);
      events.push({ type: 'setup', side: p.idx, main: m.iid, secs: p.secs.map((s) => s && s.iid) });
    }
    // passivas "ao entrar" das cartas iniciais valem a partir da rodada 1
    for (const p of this.players) for (const c of this.field(p)) this.triggerEnter(p, c, 1, events);
    events.push(...this.startRound());
    return events;
  }

  enterField(p, c, slot, round) {
    c.enteredRound = round;
    if (slot === 'main') { p.main = c; c.zone = 'main'; } else { p.secs[slot] = c; c.zone = 'sec'; }
  }

  // ---------------- Rodada ----------------
  startRound() {
    this.round += 1;
    this.phase = 'planning';
    const events = [{ type: 'roundStart', round: this.round }];
    for (const p of this.players) {
      p.ed = Math.min(RULES.ED_MAX, p.ed + RULES.ED_PER_ROUND);
      this.refill(p);
      p.plan = null;
    }
    return events;
  }

  // ---------------- Ações disponíveis ----------------
  abilityBlocked(c, ab, ed) {
    if (ab.oncePerDuel && c.usedOnce[ab.id]) return 'Já utilizada neste duelo.';
    if (c.cooldowns[ab.id] > 0) return `Recarga: ${c.cooldowns[ab.id]} rodada(s).`;
    if ((ab.cost || 0) > ed) return `Energia insuficiente (${ab.cost} ED).`;
    return null;
  }

  legalActions(pIdx) {
    const p = this.players[pIdx];
    const out = [];
    if (p.main) {
      for (const ab of p.main.card.abilities) {
        let reason = this.abilityBlocked(p.main, ab, p.ed);
        if (!reason && ab.kind === 'revive' && !p.grave.length) reason = 'Cemitério vazio.';
        out.push({ type: 'ability', abilityId: ab.id, ability: ab, user: p.main.iid, ok: !reason, reason });
      }
    }
    p.secs.forEach((s, slot) => {
      if (!s || !s.card.special) return;
      const ab = s.card.special;
      let reason = this.abilityBlocked(s, ab, p.ed);
      if (!reason && s.enteredRound >= this.round) reason = 'Só pode ser usada a partir da rodada seguinte à entrada.';
      if (!reason && ab.kind === 'revive' && !p.grave.length) reason = 'Cemitério vazio.';
      out.push({ type: 'special', slot, abilityId: ab.id, ability: ab, user: s.iid, ok: !reason, reason });
    });
    p.secs.forEach((s, slot) => { if (s) out.push({ type: 'switch', slot, ok: true }); });
    for (const c of p.hand) out.push({ type: 'switch', iid: c.iid, ok: true });
    if (this.config.itemsEnabled) {
      for (const it of Object.values(DUEL_ITEMS)) out.push({ type: 'item', itemId: it.id, ok: p.itemUses < RULES.ITEM_USES_PVE, reason: p.itemUses >= RULES.ITEM_USES_PVE ? 'Limite de 2 usos por partida.' : null });
    }
    return out;
  }

  // ---------------- Planejamento secreto ----------------
  validatePlan(p, plan) {
    const a = plan.action;
    if (!a) return 'Escolha uma ação principal.';
    const free = plan.free || {};
    const place = free.place || [];
    const replace = free.replace || null;
    const usedFromHand = new Set();
    if (place.length > RULES.FREE_PLACEMENTS_PER_ROUND) return 'Posicione no máximo 2 secundários por rodada.';
    const occupied = p.secs.map((s) => !!s);
    for (const pl of place) {
      if (!p.hand.some((c) => c.iid === pl.iid) || usedFromHand.has(pl.iid)) return 'Carta de posicionamento inválida.';
      if (![0, 1].includes(pl.slot) || occupied[pl.slot]) return 'Espaço de secundário ocupado.';
      occupied[pl.slot] = true;
      usedFromHand.add(pl.iid);
    }
    if (replace) {
      if (![0, 1].includes(replace.slot) || !p.secs[replace.slot]) return 'Não há secundário para substituir.';
      if (!p.hand.some((c) => c.iid === replace.iid) || usedFromHand.has(replace.iid)) return 'Carta de substituição inválida.';
      usedFromHand.add(replace.iid);
    }
    if (a.type === 'timeout') return null;
    if (a.type === 'ability') {
      if (!p.main) return 'Sem principal.';
      const ab = p.main.card.abilities.find((x) => x.id === a.abilityId);
      if (!ab) return 'Habilidade inexistente.';
      const r = this.abilityBlocked(p.main, ab, p.ed);
      if (r) return r;
      if (ab.kind === 'revive' && !p.grave.length) return 'Cemitério vazio.';
      return null;
    }
    if (a.type === 'special') {
      const s = p.secs[a.slot];
      if (!s || !s.card.special) return 'Secundário inválido.';
      if (replace && replace.slot === a.slot) return 'Este secundário está sendo substituído nesta rodada.';
      if (s.enteredRound >= this.round) return 'O especial só pode ser usado a partir da rodada seguinte à entrada.';
      const r = this.abilityBlocked(s, s.card.special, p.ed);
      if (r) return r;
      if (s.card.special.kind === 'revive' && !p.grave.length) return 'Cemitério vazio.';
      return null;
    }
    if (a.type === 'switch') {
      if (a.slot !== undefined && a.slot !== null) {
        if (!p.secs[a.slot]) return 'Secundário inexistente.';
        if (replace && replace.slot === a.slot) return 'Este secundário está sendo substituído nesta rodada.';
        return null;
      }
      if (!p.hand.some((c) => c.iid === a.iid) || usedFromHand.has(a.iid)) return 'Carta da mão inválida para a troca.';
      return null;
    }
    if (a.type === 'item') {
      if (!this.config.itemsEnabled) return 'Itens desativados nesta partida.';
      if (!DUEL_ITEMS[a.itemId]) return 'Item inexistente.';
      if (p.itemUses >= RULES.ITEM_USES_PVE) return 'Limite de usos de itens atingido.';
      return null;
    }
    return 'Ação desconhecida.';
  }

  submit(pIdx, plan) {
    if (this.phase !== 'planning') return { ok: false, error: 'Não é hora de planejar.' };
    const p = this.players[pIdx];
    const err = this.validatePlan(p, plan);
    if (err) return { ok: false, error: err };
    p.plan = JSON.parse(JSON.stringify(plan));
    return { ok: true };
  }

  bothConfirmed() { return this.players.every((p) => p.plan); }

  // ---------------- Resolução da rodada ----------------
  resolveRound() {
    if (this.phase !== 'planning' || !this.bothConfirmed()) throw new Error('Os dois jogadores precisam confirmar.');
    this.phase = 'resolving';
    const ev = [];
    const R = this.round;

    // Fase 3 — confirmação simultânea: revela, paga custos
    const acts = this.players.map((p) => {
      const a = p.plan.action;
      const act = { p, a, plan: p.plan, failed: false, cancelled: false, user: null, ability: null };
      if (a.type === 'ability') { act.user = p.main; act.ability = p.main.card.abilities.find((x) => x.id === a.abilityId); }
      if (a.type === 'special') { act.user = p.secs[a.slot]; act.ability = act.user.card.special; }
      act.cost = act.ability ? (act.ability.cost || 0) : 0;
      p.ed -= act.cost;
      if (a.type === 'timeout') p.timeouts += 1; else p.timeouts = 0;
      return act;
    });
    ev.push({ type: 'reveal', round: R, actions: acts.map((x) => ({ side: x.p.idx, action: x.a, abilityName: x.ability?.name, user: x.user?.iid, cost: x.cost })) });

    // Fase 4 — preparação defensiva
    const entered = [[], []];
    for (const act of acts) {
      const p = act.p;
      const free = act.plan.free || {};
      if (free.replace) {
        const out = p.secs[free.replace.slot];
        const inc = this.removeFromHand(p, free.replace.iid);
        out.zone = 'hand';
        p.hand.push(out);
        this.enterField(p, inc, free.replace.slot, R);
        entered[p.idx].push(inc);
        ev.push({ type: 'replace', side: p.idx, slot: free.replace.slot, out: out.iid, in: inc.iid });
      }
      for (const pl of free.place || []) {
        const inc = this.removeFromHand(p, pl.iid);
        this.enterField(p, inc, pl.slot, R);
        entered[p.idx].push(inc);
        ev.push({ type: 'place', side: p.idx, slot: pl.slot, iid: inc.iid });
      }
    }
    for (const act of acts) {
      if (act.a.type !== 'switch') continue;
      const p = act.p;
      const old = p.main;
      if (act.a.slot !== undefined && act.a.slot !== null) {
        const inc = p.secs[act.a.slot];
        p.secs[act.a.slot] = old; old.zone = 'sec'; old.enteredRound = R;
        p.main = inc; inc.zone = 'main'; inc.enteredRound = R;
        ev.push({ type: 'switch', side: p.idx, out: old.iid, in: inc.iid, fromSlot: act.a.slot });
      } else {
        const inc = this.removeFromHand(p, act.a.iid);
        old.zone = 'hand';
        p.hand.push(old);
        this.enterField(p, inc, 'main', R);
        entered[p.idx].push(inc);
        ev.push({ type: 'switch', side: p.idx, out: old.iid, in: inc.iid, fromHand: true });
      }
    }
    for (const p of this.players) this.refill(p);
    for (const p of this.players) for (const c of entered[p.idx]) this.triggerEnter(p, c, R, ev);

    // Incapacitação preexistente (paralisia, sono, congelamento)
    for (const act of acts) {
      if (!act.user) continue;
      const block = this.incapacityCheck(act.user, R);
      if (block) {
        act.failed = true;
        act.p.ed += act.cost; // recursos só são gastos se a habilidade for iniciada
        ev.push({ type: 'fail', side: act.p.idx, user: act.user.iid, condition: block, text: `${act.user.card.name} não conseguiu agir (${CONDITION_NAMES[block]}).` });
      }
    }
    // Tempo esgotado: Defesa Básica (-20% do dano de ataques diretos nesta rodada)
    for (const act of acts) {
      if (act.a.type !== 'timeout') continue;
      for (const c of this.field(act.p)) this.addShield(c, { pct: RULES.TIMEOUT_DEFENSE, duration: 1, scope: 'direct' }, R);
      ev.push({ type: 'basicDefense', side: act.p.idx, timeouts: act.p.timeouts });
    }
    // Escudos → curas/itens → purificação → reviver
    const order = ['shield', 'heal', 'purify', 'revive'];
    for (const kind of order) {
      for (const act of acts) {
        if (act.failed) continue;
        if (act.a.type === 'item' && kind === 'heal') {
          const p = act.p;
          const it = DUEL_ITEMS[act.a.itemId];
          const target = this.field(p).find((c) => c.iid === act.a.targetIid) || p.main;
          p.itemUses += 1;
          const healed = this.heal(target, { fixed: it.heal });
          ev.push({ type: 'heal', side: p.idx, target: target.iid, amount: healed, hp: target.hp, source: it.name });
          continue;
        }
        const ab = act.ability;
        if (!ab || ab.kind !== kind) continue;
        this.markUsed(act.user, ab);
        const p = act.p;
        const target = ab.target === 'main' ? p.main : act.user;
        if (kind === 'shield') {
          this.addShield(target, ab.shield, R);
          ev.push({ type: 'shield', side: p.idx, user: act.user.iid, target: target.iid, ability: ab.name, pct: ab.shield.pct, duration: ab.shield.duration, scope: ab.shield.scope });
        } else if (kind === 'heal') {
          const healed = this.heal(target, ab.heal);
          ev.push({ type: 'heal', side: p.idx, user: act.user.iid, target: target.iid, ability: ab.name, amount: healed, hp: target.hp });
        } else if (kind === 'purify') {
          const removed = target.conditions.map((c) => c.type);
          target.conditions = [];
          ev.push({ type: 'purify', side: p.idx, user: act.user.iid, target: target.iid, ability: ab.name, removed });
          if (ab.heal) {
            const healed = this.heal(target, ab.heal);
            ev.push({ type: 'heal', side: p.idx, user: act.user.iid, target: target.iid, ability: ab.name, amount: healed, hp: target.hp });
          }
        } else if (kind === 'revive') {
          ev.push(...this.revive(p, act.plan.reviveTarget, act.plan.sendBackIid, ab));
        }
      }
    }

    // Fase 5 — interrupções imediatas
    const interrupts = acts.filter((x) => !x.failed && x.ability && x.ability.interrupt);
    const toCancel = [];
    for (const act of interrupts) {
      this.markUsed(act.user, act.ability);
      const opp = acts[1 - act.p.idx];
      ev.push({ type: 'interrupt', side: act.p.idx, user: act.user.iid, ability: act.ability.name });
      if (!opp.failed && opp.ability && opp.ability.kind === 'attack') toCancel.push(opp);
    }
    for (const opp of toCancel) {
      opp.cancelled = true;
      opp.p.ed += opp.cost;
      ev.push({ type: 'cancelled', side: opp.p.idx, user: opp.user.iid, ability: opp.ability.name, text: `${opp.ability.name} foi cancelado por Interrupção Imediata!` });
    }

    // Fase 6 — ataques simultâneos (estado congelado na abertura da fase)
    const attacks = acts.filter((x) => !x.failed && !x.cancelled && x.ability && x.ability.kind === 'attack');
    const snapshot = new Map();
    for (const p of this.players) for (const c of this.field(p)) snapshot.set(c.iid, c.hp);
    const results = [];
    for (const act of attacks) {
      this.markUsed(act.user, act.ability);
      results.push(this.computeAttack(act, snapshot, R));
    }
    for (const r of results) {
      ev.push({ type: 'attack', side: r.side, user: r.user.iid, ability: r.ability.name, abilityId: r.ability.id, element: r.ability.element, area: r.ability.target === 'area', targets: r.targets.map((t) => t.iid) });
      for (const h of r.hits) ev.push({ type: 'hit', side: r.side, ...h });
    }

    // Fase 7 — Drenagem Vital (antes de descontar o dano recebido)
    for (const r of results) {
      if (!r.ability.drain || r.totalRemoved <= 0) continue;
      const amount = ceilSafe(r.totalRemoved * r.ability.drain);
      const before = r.user.hp;
      r.user.hp = Math.min(r.user.maxHp, r.user.hp + amount);
      ev.push({ type: 'drain', side: r.side, user: r.user.iid, amount: r.user.hp - before, hp: r.user.hp });
    }

    // Fase 8 — dano simultâneo, retaliação, condições e efeitos periódicos
    const kos = [];
    const pending = new Map(); // iid -> {dmg, sources}
    for (const r of results) {
      for (const h of r.hits) {
        if (h.miss || h.cancelledHit) continue;
        const e = pending.get(h.target) || { dmg: 0, side: r.side };
        e.dmg += h.dmg;
        pending.set(h.target, e);
      }
    }
    for (const [iid, e] of pending) {
      const c = this.find(iid);
      const before = c.hp;
      c.hp = Math.max(0, c.hp - e.dmg);
      ev.push({ type: 'damage', target: iid, amount: before - c.hp, hp: c.hp });
      if (before > 0 && c.hp === 0) kos.push({ iid, by: e.side, cause: 'ataque' });
    }
    // Retaliação (nunca dispara outra retaliação)
    for (const r of results) {
      for (const t of r.targets) {
        const pas = t.card.passive;
        if (!pas || pas.type !== 'retaliate') continue;
        const lost = r.hits.filter((h) => h.target === t.iid && !h.miss && !h.cancelledHit && h.removed >= 1);
        const activations = pas.per === 'hit' ? lost.length : (lost.length ? 1 : 0);
        for (let i = 0; i < activations; i++) {
          const atk = r.user;
          const raw = (pas.damage.fixed || 0) + (pas.damage.pct ? ceilSafe(atk.maxHp * pas.damage.pct) : 0);
          const dmg = this.reduce(raw, atk, { resistancePierce: pas.pierce?.resistance || 0, shieldPierce: pas.pierce?.shield || 0, indirect: true, round: R });
          const before = atk.hp;
          atk.hp = Math.max(0, atk.hp - dmg);
          ev.push({ type: 'retaliate', side: t.owner, bearer: t.iid, target: atk.iid, passive: pas.name, amount: before - atk.hp, raw: dmg, hp: atk.hp });
          if (before > 0 && atk.hp === 0) kos.push({ iid: atk.iid, by: t.owner, cause: 'retaliação' });
          if (atk.hp > 0 && pas.effects) for (const eff of pas.effects) this.tryApplyCondition(atk, eff, t.owner, R, ev, false);
        }
      }
    }
    // Efeitos secundários dos ataques (somente alvos sobreviventes)
    for (const r of results) {
      for (const st of r.statuses) {
        const c = this.find(st.target);
        if (!c || c.hp <= 0) continue;
        this.tryApplyCondition(c, st.effect, r.side, R, ev, r.ability.ignoreImmunity);
      }
    }
    // Dano periódico (veneno/queimadura) — só no campo; condição nova só dá dano na rodada seguinte
    for (const p of this.players) {
      for (const c of this.field(p)) {
        if (c.hp <= 0) continue;
        for (const cond of c.conditions) {
          if (!PERIODIC.includes(cond.type) || cond.appliedRound >= R) continue;
          const raw = (cond.dmg || 0) + (cond.dmgPct ? ceilSafe(c.maxHp * cond.dmgPct) : 0);
          const dmg = this.reduce(raw, c, { indirect: true, periodic: true, round: R });
          const before = c.hp;
          c.hp = Math.max(0, c.hp - dmg);
          ev.push({ type: 'tick', side: p.idx, target: c.iid, condition: cond.type, amount: before - c.hp, hp: c.hp });
          if (before > 0 && c.hp === 0) kos.push({ iid: c.iid, by: cond.source, cause: CONDITION_NAMES[cond.type] });
          if (c.hp === 0) break;
        }
      }
    }
    // Consumo de duração das condições (apenas em campo; fora do campo ficam pausadas)
    for (const p of this.players) {
      for (const c of this.field(p)) {
        for (const cond of c.conditions) if (cond.appliedRound < R) cond.remaining -= 1;
        const expired = c.conditions.filter((x) => x.remaining <= 0);
        c.conditions = c.conditions.filter((x) => x.remaining > 0);
        for (const x of expired) ev.push({ type: 'conditionEnd', target: c.iid, condition: x.type });
      }
    }

    // Fase 9 — encerramento
    for (const k of kos) {
      this.players[k.by].kos += 1;
      ev.push({ type: 'ko', target: k.iid, by: k.by, cause: k.cause, kos: this.players[k.by].kos });
    }
    for (const p of this.players) {
      if (p.main && p.main.hp <= 0) { this.toGrave(p, p.main); p.main = null; }
      p.secs = p.secs.map((s) => { if (s && s.hp <= 0) { this.toGrave(p, s); return null; } return s; });
    }
    for (const p of this.players) {
      for (const c of [...p.hand, ...p.deck, ...this.field(p), ...p.grave]) {
        for (const k of Object.keys(c.cooldowns)) if (c.cooldowns[k] > 0) c.cooldowns[k] -= 1;
        if (c.passiveCooldown > 0) c.passiveCooldown -= 1;
        const before = c.shields.length;
        c.shields = c.shields.filter((s) => s.until > R);
        if (c.shields.length < before) ev.push({ type: 'shieldEnd', target: c.iid });
      }
    }
    const res = this.checkResult();
    if (res) {
      this.result = res;
      this.phase = 'over';
      ev.push({ type: 'end', ...res });
      return ev;
    }
    // substituição do principal derrotado (antes do próximo planejamento)
    for (const p of this.players) {
      if (!p.main) {
        p.pendingReplace = true;
        ev.push({ type: 'needReplace', side: p.idx, options: this.replaceOptions(p).map((c) => c.iid) });
      }
    }
    if (this.players.some((p) => p.pendingReplace)) this.phase = 'replace';
    else ev.push(...this.startRound());
    return ev;
  }

  // ---------------- Cálculos ----------------
  incapacityCheck(c, R) {
    for (const cond of c.conditions) {
      if (cond.appliedRound >= R) continue;
      if (INCAPACITATE.includes(cond.type)) return cond.type;
      if (cond.type === 'paralysis' && this.rng() < (cond.intensity ?? 0.25)) return 'paralysis';
    }
    return null;
  }

  markUsed(c, ab) {
    if (ab.oncePerDuel) c.usedOnce[ab.id] = true;
    if (ab.cooldown) c.cooldowns[ab.id] = ab.cooldown + 1; // +1: a rodada atual também é descontada no encerramento
  }

  addShield(c, sh, round) {
    c.shields.push({ pct: Math.min(sh.pct, RULES.SHIELD_CAP), scope: sh.scope || 'direct', from: round, until: round + (sh.duration || 1) - 1, blocksConditions: !!sh.blocksConditions, immunities: sh.immunities || [] });
  }

  activeShields(c, round) { return c.shields.filter((s) => s.from <= round && s.until >= round); }

  // maior escudo aplicável ao tipo de dano (direto ou indireto)
  shieldFor(c, { indirect, round }) {
    let best = 0;
    for (const s of this.activeShields(c, round)) {
      if (indirect && s.scope !== 'all') continue;
      best = Math.max(best, s.pct);
    }
    return Math.min(best, RULES.SHIELD_CAP);
  }

  // Resistência fixa + escudo percentual (usado por retaliação/periódicos)
  reduce(raw, target, { resistancePierce = 0, shieldPierce = 0, indirect = false, periodic = false, round }) {
    const res = periodic ? 0 : (target.card.resistance || 0) * (1 - resistancePierce);
    const after = Math.max(0, raw - res);
    const sh = this.shieldFor(target, { indirect, round }) * (1 - shieldPierce);
    return Math.max(0, ceilSafe(after * (1 - sh)));
  }

  // Fórmula de dano por golpe (seção 7)
  static hitDamage({ fixed = 0, pct = 0, targetMaxHp, crit = false, critMult = RULES.DEFAULT_CRIT_MULT, elementMod = 1, resistance = 0, resistancePierce = 0, shield = 0, shieldPierce = 0 }) {
    const base = fixed + (pct ? ceilSafe(targetMaxHp * pct) : 0);
    const bruto = base * (crit ? critMult : 1) * elementMod;
    const aposRes = Math.max(0, bruto - resistance * (1 - resistancePierce));
    const escudo = Math.min(shield, RULES.SHIELD_CAP) * (1 - shieldPierce);
    return Math.max(0, ceilSafe(aposRes * (1 - escudo)));
  }

  computeAttack(act, snapshot, R) {
    const ab = act.ability;
    const opp = this.other(act.p);
    const targets = ab.target === 'area' ? this.field(opp).filter((c) => c.hp > 0) : (opp.main ? [opp.main] : []);
    const hits = [];
    const statuses = [];
    let totalRemoved = 0;
    const n = ab.hits || 1;
    for (const t of targets) {
      let remaining = snapshot.get(t.iid) ?? t.hp;
      let landed = false;
      for (let i = 0; i < n; i++) {
        if (remaining <= 0) { hits.push({ target: t.iid, hit: i, cancelledHit: true }); continue; }
        const acc = ab.accuracy ?? 100;
        if (this.rng() * 100 >= acc) { hits.push({ target: t.iid, hit: i, miss: true }); continue; }
        const critChance = ab.crit?.chance ?? RULES.DEFAULT_CRIT_CHANCE;
        const crit = critChance > 0 && this.rng() < critChance;
        const elementMod = (t.card.weaknesses || {})[ab.element] ?? 1;
        const isIndirect = false;
        const dmg = Duel.hitDamage({
          fixed: ab.damage?.fixed || 0, pct: ab.damage?.pct || 0, targetMaxHp: t.maxHp,
          crit, critMult: ab.crit?.mult ?? RULES.DEFAULT_CRIT_MULT, elementMod,
          resistance: t.card.resistance || 0, resistancePierce: ab.pierce?.resistance || 0,
          shield: this.shieldFor(t, { indirect: isIndirect, round: R }), shieldPierce: ab.pierce?.shield || 0,
        });
        const removed = Math.min(dmg, remaining);
        remaining -= removed;
        totalRemoved += removed;
        landed = true;
        hits.push({ target: t.iid, hit: i, dmg, removed, crit, elementMod });
        for (const eff of ab.effects || []) if (eff.perHit) statuses.push({ target: t.iid, effect: eff });
      }
      if (landed) for (const eff of ab.effects || []) if (!eff.perHit) statuses.push({ target: t.iid, effect: eff });
    }
    return { side: act.p.idx, user: act.user, ability: ab, targets, hits, statuses, totalRemoved };
  }

  heal(c, h) {
    const amount = (h.fixed || 0) + (h.pct ? ceilSafe(c.maxHp * h.pct) : 0);
    const before = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + amount);
    return c.hp - before;
  }

  tryApplyCondition(c, eff, sourceSide, R, ev, ignoreImmunity) {
    const type = eff.condition;
    if (!ignoreImmunity) {
      const shieldImm = this.activeShields(c, R).some((s) => s.immunities.includes(type));
      if ((c.card.immunities || []).includes(type) || shieldImm) { ev.push({ type: 'immune', target: c.iid, condition: type }); return; }
    }
    if (this.activeShields(c, R).some((s) => s.blocksConditions)) { ev.push({ type: 'blocked', target: c.iid, condition: type }); return; }
    if (this.rng() >= (eff.chance ?? 1)) return;
    let duration = eff.duration || 1;
    if (INCAPACITATE.includes(type)) duration = Math.min(duration, RULES.INCAPACITATE_MAX_DURATION);
    const next = { type, dmg: eff.dmg || 0, dmgPct: eff.dmgPct || 0, intensity: eff.intensity, remaining: duration, appliedRound: R, source: sourceSide };
    const cur = c.conditions.find((x) => x.type === type);
    if (cur) {
      const power = (x) => (PERIODIC.includes(type) ? (x.dmg || 0) + (x.dmgPct || 0) * c.maxHp : (x.intensity ?? 1));
      const pn = power(next); const pc = power(cur);
      if (pn > pc) { Object.assign(cur, next); ev.push({ type: 'condition', target: c.iid, condition: type, duration, replaced: true }); }
      else if (pn === pc && duration > cur.remaining) { cur.remaining = duration; ev.push({ type: 'condition', target: c.iid, condition: type, duration, refreshed: true }); }
      else ev.push({ type: 'conditionKept', target: c.iid, condition: type });
      return;
    }
    c.conditions.push(next);
    ev.push({ type: 'condition', target: c.iid, condition: type, duration });
  }

  triggerEnter(p, c, round, ev) {
    const pas = c.card.passive;
    if (!pas || pas.type !== 'onEnter') return;
    if (pas.rearm === 'once' && c.passiveUsed) return;
    if (typeof pas.rearm === 'number' && c.passiveCooldown > 0) return;
    c.passiveUsed = true;
    if (typeof pas.rearm === 'number') c.passiveCooldown = pas.rearm;
    if (pas.shield) { this.addShield(c, pas.shield, round); ev.push({ type: 'passive', side: p.idx, target: c.iid, passive: pas.name, shield: pas.shield.pct }); }
    if (pas.heal) { const healed = this.heal(c, pas.heal); ev.push({ type: 'passive', side: p.idx, target: c.iid, passive: pas.name, heal: healed }); }
  }

  toGrave(p, c) {
    c.zone = 'grave';
    c.conditions = [];
    c.shields = [];
    c.hp = 0;
    p.grave.push(c);
  }

  revive(p, targetIid, sendBackIid, ab) {
    const ev = [];
    const idx = targetIid ? p.grave.findIndex((c) => c.iid === targetIid) : -1;
    const gi = idx >= 0 ? idx : p.grave.reduce((best, c, i) => (best < 0 || c.maxHp > p.grave[best].maxHp ? i : best), -1);
    if (gi < 0) { ev.push({ type: 'fail', side: p.idx, text: 'Não havia Monstrin no Cemitério.' }); return ev; }
    const c = p.grave.splice(gi, 1)[0];
    c.hp = c.maxHp; // 100% dos PV; usos únicos continuam gastos
    c.zone = 'hand';
    if (p.hand.length >= RULES.HAND_SIZE) {
      let si = p.hand.findIndex((x) => x.iid === sendBackIid);
      if (si < 0) si = p.hand.reduce((best, x, i) => (best < 0 || x.maxHp < p.hand[best].maxHp ? i : best), -1);
      const back = p.hand.splice(si, 1)[0];
      back.zone = 'deck';
      p.deck.push(back); // fundo do deck, preservando PV, condições e recargas
      ev.push({ type: 'toDeckBottom', side: p.idx, iid: back.iid });
    }
    p.hand.push(c);
    ev.push({ type: 'revive', side: p.idx, iid: c.iid, ability: ab.name });
    return ev;
  }

  replaceOptions(p) {
    const secs = p.secs.filter(Boolean);
    return secs.length ? secs : p.hand.slice();
  }

  hasSubstitute(p) { return !!p.main || p.secs.some(Boolean) || p.hand.length > 0; }

  // Ordem oficial de decisão (seção 4)
  checkResult() {
    const [a, b] = this.players;
    const need = RULES.KOS_TO_WIN;
    // abandono por 3 esgotamentos de tempo consecutivos
    const fa = a.timeouts >= RULES.TIMEOUTS_TO_FORFEIT; const fb = b.timeouts >= RULES.TIMEOUTS_TO_FORFEIT;
    if (fa || fb) {
      if (fa && fb) return { winner: null, reason: 'abandono duplo' };
      return { winner: fa ? 1 : 0, reason: 'abandono' };
    }
    if (a.kos >= need && b.kos >= need) return { winner: null, reason: 'ambos alcançaram 5 KOs' };
    if (a.kos >= need) return { winner: 0, reason: '5 KOs' };
    if (b.kos >= need) return { winner: 1, reason: '5 KOs' };
    const sa = this.hasSubstitute(a); const sb = this.hasSubstitute(b);
    if (!sa && !sb) return { winner: null, reason: 'nenhum jogador tem substituto' };
    if (!sa) return { winner: 1, reason: 'falta de Monstrins disponíveis' };
    if (!sb) return { winner: 0, reason: 'falta de Monstrins disponíveis' };
    return null;
  }

  chooseReplacement(pIdx, iid) {
    const p = this.players[pIdx];
    if (this.phase !== 'replace' || !p.pendingReplace) return { ok: false, error: 'Não há substituição pendente.' };
    const opts = this.replaceOptions(p);
    const c = opts.find((x) => x.iid === iid);
    if (!c) return { ok: false, error: p.secs.some(Boolean) ? 'Escolha um dos secundários.' : 'Escolha uma carta da mão.' };
    const events = [];
    const slot = p.secs.indexOf(c);
    if (slot >= 0) { p.secs[slot] = null; p.main = c; c.zone = 'main'; c.enteredRound = this.round + 1; }
    else {
      this.removeFromHand(p, iid);
      this.enterField(p, c, 'main', this.round + 1);
      this.refill(p);
      this.triggerEnter(p, c, this.round + 1, events);
    }
    p.pendingReplace = false;
    events.unshift({ type: 'replaced', side: pIdx, iid: c.iid, fromSlot: slot >= 0 ? slot : null });
    if (!this.players.some((x) => x.pendingReplace)) events.push(...this.startRound());
    return { ok: true, events };
  }

  // Visão de um jogador (esconde a mão e a ação do adversário)
  view(pIdx) {
    const pub = (c) => c && ({ iid: c.iid, cardId: c.cardId, hp: c.hp, maxHp: c.maxHp, conditions: c.conditions.map((x) => ({ ...x })), shields: this.activeShields(c, Math.max(1, this.round)).map((x) => ({ ...x })), usedOnce: { ...c.usedOnce }, cooldowns: { ...c.cooldowns }, enteredRound: c.enteredRound });
    return {
      round: this.round, phase: this.phase, result: this.result,
      players: this.players.map((p) => ({
        idx: p.idx, name: p.name, ed: p.ed, kos: p.kos, itemUses: p.itemUses,
        main: pub(p.main), secs: p.secs.map(pub), grave: p.grave.map(pub),
        hand: p.idx === pIdx ? p.hand.map(pub) : null, handCount: p.hand.length, deckCount: p.deck.length,
        confirmed: !!p.plan, pendingReplace: p.pendingReplace,
      })),
    };
  }
}
