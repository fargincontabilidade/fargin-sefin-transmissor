// Motor de batalha por turnos — sem gráficos.
// Recebe ações e devolve uma lista de eventos que a parte visual anima.
// Foi separado da parte visual para permitir, no futuro, um modo em tempo
// real reaproveitando criaturas, ataques, dano e efeitos.
import { getMove } from '../data/moves.js';
import { getSpecies } from '../data/species.js';
import { getItem } from '../data/items.js';
import { effectiveness } from '../data/elements.js';
import { getStats, isFainted, maxHp, gainXp, xpReward, applyHealItem, canUseHealItem, displayName } from './monstrin.js';
import { captureChance, rollCapture } from './capture.js';

const PRIORITY_ACTIONS = new Set(['switch', 'item', 'capture', 'flee', 'surrender', 'wait']);

export function stageMult(stage) {
  return 1 + 0.25 * stage; // -2..+2 => 0,5x..1,5x
}

// Dano entre criaturas
export function calcDamage(attacker, defender, move, opts = {}) {
  const rng = opts.rng || Math.random;
  const aStats = getStats(attacker);
  const dStats = getStats(defender);
  const atk = aStats.atk * stageMult(opts.atkStage || 0);
  const def = dStats.def * stageMult(opts.defStage || 0);
  const L = attacker.level;
  const base = Math.floor((((2 * L) / 5 + 2) * move.power * (atk / def)) / 50) + 2;
  const atkSp = getSpecies(attacker.speciesId);
  const defSp = getSpecies(defender.speciesId);
  const stab = move.element === atkSp.element ? 1.25 : 1;
  const eff = effectiveness(move.element, defSp.element);
  const crit = (opts.forceCrit ?? rng() < 1 / 16) ? 1.5 : 1;
  const roll = opts.noRandom ? 1 : 0.85 + rng() * 0.15;
  const burnPenalty = attacker.status === 'burn' ? 0.85 : 1;
  const dmg = Math.max(1, Math.floor(base * stab * eff * crit * roll * burnPenalty));
  return { damage: dmg, eff, crit: crit > 1 };
}

export class Battle {
  /**
   * @param {object} o
   * @param {'wild'|'trainer'} o.kind
   * @param {object[]} o.playerTeam Monstrins do jogador (objetos reais da equipe)
   * @param {object[]} o.enemyTeam Monstrins adversários
   *
   * Regras: só os Monstrins têm PV. Treinadores e Monstrins selvagens não
   * recebem ataques diretos. A batalha termina quando um dos lados fica sem
   * Monstrins aptos. O PV dos Monstrins do jogador é o PV real deles (não é
   * restaurado ao fim da batalha).
   */
  constructor(o) {
    this.kind = o.kind;
    this.rng = o.rng || Math.random;
    this.sides = [
      { id: 0, name: o.playerName || 'Você', team: o.playerTeam, active: null },
      { id: 1, name: o.enemyName || 'Selvagem', team: o.enemyTeam, active: null, isTrainer: o.kind === 'trainer' },
    ];
    this.endReason = null;
    this.stages = new Map();
    this.participants = new Set();
    this.over = false;
    this.result = null;
    this.turn = 0;
    this.fleeAttempts = 0;
    this.rewardMult = o.kind === 'trainer' ? 1.5 : 1;

    // O primeiro a entrar precisa estar apto; desmaiados nunca começam a batalha.
    let lead = o.playerLeadIndex ?? -1;
    if (lead < 0 || !this.sides[0].team[lead] || isFainted(this.sides[0].team[lead])) lead = this.sides[0].team.findIndex((m) => !isFainted(m));
    if (lead >= 0) this.setActive(0, lead);
    const elead = this.sides[1].team.findIndex((m) => !isFainted(m));
    if (elead >= 0) this.setActive(1, elead);
  }

  setActive(sideIdx, index) {
    const side = this.sides[sideIdx];
    side.active = index;
    if (index !== null) {
      const mon = side.team[index];
      this.stages.set(mon.uid, { atk: 0, def: 0, spd: 0 });
      if (sideIdx === 0) this.participants.add(mon.uid);
    }
  }

  activeMon(sideIdx) {
    const s = this.sides[sideIdx];
    return s.active === null ? null : s.team[s.active];
  }

  healthyIndexes(sideIdx) {
    return this.sides[sideIdx].team.map((m, i) => (isFainted(m) ? -1 : i)).filter((i) => i >= 0);
  }

  hasHealthy(sideIdx) {
    return this.healthyIndexes(sideIdx).length > 0;
  }

  // O jogador precisa escolher outro Monstrin (o ativo desmaiou e ainda há aptos)
  mustSummon() {
    return !this.over && this.activeMon(0) === null && this.hasHealthy(0);
  }

  // O adversário convoca o próximo Monstrin apto assim que o anterior desmaia.
  autoReplaceEnemy(events) {
    if (this.over || this.activeMon(1) !== null) return;
    const healthy = this.healthyIndexes(1);
    if (!healthy.length) return;
    const side = this.sides[1];
    this.setActive(1, healthy[0]);
    const mon = this.activeMon(1);
    events.push({ type: 'switch', side: 1, fromUid: null, toUid: mon.uid, index: healthy[0], hp: mon.hp, maxHp: maxHp(mon), level: mon.level, text: `${side.name} convocou ${displayName(mon)}!` });
  }

  stagesOf(mon) {
    return this.stages.get(mon.uid) || { atk: 0, def: 0, spd: 0 };
  }

  speedOf(sideIdx) {
    const mon = this.activeMon(sideIdx);
    if (!mon) return 0;
    return getStats(mon).spd * stageMult(this.stagesOf(mon).spd);
  }

  // ---------------- IA do adversário ----------------
  chooseEnemyAction() {
    const side = this.sides[1];
    const me = this.activeMon(1);
    if (!me) {
      const healthy = this.healthyIndexes(1);
      if (healthy.length) return { type: 'switch', index: healthy[0] };
      return { type: 'wait' };
    }
    const foe = this.activeMon(0);
    const moves = me.equippedMoves.map(getMove);
    const damaging = moves.filter((m) => m.category === 'dano');
    const support = moves.filter((m) => m.category !== 'dano');
    const hpRatio = me.hp / maxHp(me);
    const healMove = support.find((m) => m.effect?.type === 'heal');
    if (healMove && hpRatio < 0.35 && this.rng() < 0.6) return { type: 'move', moveId: healMove.id };
    if (foe && support.length && hpRatio > 0.6 && this.rng() < 0.18) {
      const s = support.find((m) => m.effect?.type === 'stat');
      if (s) return { type: 'move', moveId: s.id };
    }
    if (!damaging.length) return { type: 'move', moveId: moves[0].id };
    if (this.rng() < 0.3) return { type: 'move', moveId: damaging[Math.floor(this.rng() * damaging.length)].id };
    let best = damaging[0];
    let bestScore = -1;
    for (const m of damaging) {
      let score = m.power * (m.accuracy / 100);
      if (foe) {
        score *= effectiveness(m.element, getSpecies(foe.speciesId).element);
        if (m.element === getSpecies(me.speciesId).element) score *= 1.25;
      }
      if (score > bestScore) { bestScore = score; best = m; }
    }
    void side;
    return { type: 'move', moveId: best.id };
  }

  // ---------------- Turno ----------------
  playTurn(playerAction) {
    if (this.over) return [];
    this.turn += 1;
    const events = [];
    const enemyAction = this.chooseEnemyAction();
    const actions = [
      { side: 0, action: playerAction },
      { side: 1, action: enemyAction },
    ];
    actions.sort((a, b) => {
      const pa = PRIORITY_ACTIONS.has(a.action.type) ? 1 : 0;
      const pb = PRIORITY_ACTIONS.has(b.action.type) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      if (pa && pb) return a.side - b.side;
      const sa = this.speedOf(a.side);
      const sb = this.speedOf(b.side);
      if (sa !== sb) return sb - sa;
      return this.rng() < 0.5 ? -1 : 1;
    });

    for (const { side, action } of actions) {
      if (this.over) break;
      this.executeAction(side, action, events);
      this.checkEnd(events);
    }
    if (!this.over) this.endOfTurn(events);
    this.checkEnd(events);
    this.autoReplaceEnemy(events);
    return events;
  }

  executeAction(sideIdx, action, events) {
    const side = this.sides[sideIdx];
    switch (action.type) {
      case 'move': return this.doMove(sideIdx, action.moveId, events);
      case 'switch': {
        const target = side.team[action.index];
        if (!target || isFainted(target) || side.active === action.index) return;
        const prev = this.activeMon(sideIdx);
        this.setActive(sideIdx, action.index);
        events.push({ type: 'switch', side: sideIdx, fromUid: prev ? prev.uid : null, toUid: target.uid, index: action.index, hp: target.hp, maxHp: maxHp(target), level: target.level, text: `${side.isTrainer || sideIdx === 0 ? side.name + ' convocou ' : ''}${displayName(target)}!` });
        return;
      }
      case 'item': {
        const mon = side.team.find((m) => m.uid === action.targetUid);
        const item = getItem(action.itemId);
        if (!mon) return;
        const check = canUseHealItem(mon, action.itemId);
        if (!check.ok) { events.push({ type: 'message', text: check.reason }); return; }
        const r = applyHealItem(mon, action.itemId);
        events.push({ type: 'item', side: sideIdx, itemId: action.itemId, targetUid: mon.uid, healed: r.healed, hp: mon.hp, maxHp: maxHp(mon), text: `${side.name} usou ${item.name} em ${displayName(mon)}.` });
        return;
      }
      case 'capture': {
        const target = this.activeMon(1);
        if (this.kind !== 'wild' || !target) { events.push({ type: 'message', text: 'Não é possível capturar aqui!' }); return; }
        const chance = captureChance(target, action.itemId);
        const r = rollCapture(chance, this.rng);
        events.push({ type: 'capture', itemId: action.itemId, targetUid: target.uid, chance, shakes: r.shakes, success: r.success });
        if (r.success) {
          this.over = true;
          this.result = 'caught';
          this.caughtMon = target;
          events.push({ type: 'end', result: 'caught' });
        }
        return;
      }
      case 'flee': {
        if (this.kind !== 'wild') { events.push({ type: 'message', text: 'Não dá para fugir de uma batalha entre treinadores!' }); return; }
        this.fleeAttempts += 1;
        const mine = this.speedOf(0);
        const theirs = this.speedOf(1) || 1;
        const chance = mine >= theirs ? 0.95 : Math.min(0.95, 0.55 + 0.2 * (this.fleeAttempts - 1) + 0.3 * (mine / theirs));
        if (this.rng() < chance) {
          this.over = true;
          this.result = 'fled';
          events.push({ type: 'flee', success: true });
          events.push({ type: 'end', result: 'fled' });
        } else {
          events.push({ type: 'flee', success: false });
        }
        return;
      }
      case 'surrender': {
        this.over = true;
        this.endReason = 'surrender';
        this.result = sideIdx === 0 ? 'lose' : 'win';
        events.push({ type: 'message', text: `${side.name} se rendeu.` });
        events.push({ type: 'end', result: this.result, reason: 'surrender' });
        return;
      }
      case 'wait':
      default:
    }
  }

  doMove(sideIdx, moveId, events) {
    const attacker = this.activeMon(sideIdx);
    if (!attacker || isFainted(attacker)) return;
    if (!attacker.equippedMoves.includes(moveId)) moveId = attacker.equippedMoves[0];
    const move = getMove(moveId);
    const foeIdx = 1 - sideIdx;
    const defender = this.activeMon(foeIdx);
    const aSt = this.stagesOf(attacker);
    events.push({ type: 'move', side: sideIdx, uid: attacker.uid, moveId, text: `${displayName(attacker)} usou ${move.name}!` });

    if (move.category === 'cura') {
      const mx = maxHp(attacker);
      const before = attacker.hp;
      attacker.hp = Math.min(mx, attacker.hp + Math.floor(mx * (move.effect?.ratio || 0.4)));
      events.push({ type: 'heal', side: sideIdx, uid: attacker.uid, amount: attacker.hp - before, hp: attacker.hp, maxHp: mx });
      return;
    }

    if (move.category === 'suporte') {
      const eff = move.effect;
      if (eff?.type === 'stat') {
        const targetMon = eff.target === 'self' ? attacker : defender;
        if (!targetMon) { events.push({ type: 'miss', side: sideIdx, text: 'Mas não havia alvo!' }); return; }
        this.applyStage(targetMon, eff.target === 'self' ? sideIdx : foeIdx, eff.stat, eff.stages, events);
      }
      return;
    }

    // Ataque de dano (treinadores e jogadores nunca são alvo)
    if (!defender) {
      events.push({ type: 'miss', side: sideIdx, text: 'Mas não havia alvo!' });
      return;
    }

    if (this.rng() * 100 >= move.accuracy) {
      events.push({ type: 'miss', side: sideIdx, uid: attacker.uid, text: `${displayName(attacker)} errou!` });
      return;
    }
    const dSt = this.stagesOf(defender);
    const r = calcDamage(attacker, defender, move, { rng: this.rng, atkStage: aSt.atk, defStage: dSt.def });
    defender.hp = Math.max(0, defender.hp - r.damage);
    events.push({ type: 'damage', side: foeIdx, target: 'mon', uid: defender.uid, amount: r.damage, eff: r.eff, crit: r.crit, hp: defender.hp, maxHp: maxHp(defender) });

    const eff = move.effect;
    if (eff && !isFainted(defender) && this.rng() < (eff.chance ?? 1)) {
      if (eff.type === 'burn' && !defender.status && getSpecies(defender.speciesId).element !== 'fogo') {
        defender.status = 'burn';
        events.push({ type: 'status', side: foeIdx, uid: defender.uid, status: 'burn', text: `${displayName(defender)} ficou queimado!` });
      } else if (eff.type === 'stat') {
        const t = eff.target === 'self' ? attacker : defender;
        this.applyStage(t, eff.target === 'self' ? sideIdx : foeIdx, eff.stat, eff.stages, events);
      }
    }
    if (eff?.type === 'drain' && r.damage > 0) {
      const mx = maxHp(attacker);
      const before = attacker.hp;
      attacker.hp = Math.min(mx, attacker.hp + Math.max(1, Math.floor(r.damage * eff.ratio)));
      if (attacker.hp > before) events.push({ type: 'heal', side: sideIdx, uid: attacker.uid, amount: attacker.hp - before, hp: attacker.hp, maxHp: mx, text: `${displayName(attacker)} drenou energia!` });
    }
    if (isFainted(defender)) this.handleFaint(foeIdx, defender, events);
  }

  applyStage(mon, sideIdx, stat, delta, events) {
    const st = this.stagesOf(mon);
    const before = st[stat];
    st[stat] = Math.max(-2, Math.min(2, st[stat] + delta));
    this.stages.set(mon.uid, st);
    const names = { atk: 'ataque', def: 'defesa', spd: 'velocidade' };
    let text;
    if (st[stat] === before) text = `O ${names[stat]} de ${displayName(mon)} não muda mais!`;
    else text = `O ${names[stat]} de ${displayName(mon)} ${delta > 0 ? 'aumentou' : 'diminuiu'}!`;
    events.push({ type: 'stat', side: sideIdx, uid: mon.uid, stat, delta: st[stat] - before, text });
  }

  handleFaint(sideIdx, mon, events) {
    events.push({ type: 'faint', side: sideIdx, uid: mon.uid, text: `${displayName(mon)} desmaiou!` });
    this.sides[sideIdx].active = null;
    if (sideIdx === 1) {
      // Experiência para quem participou e continua de pé
      const amount = xpReward(mon, { trainer: this.kind === 'trainer' });
      for (const m of this.sides[0].team) {
        if (this.participants.has(m.uid) && !isFainted(m)) {
          const evs = gainXp(m, amount);
          m.bond = Math.min(255, (m.bond || 0) + 2);
          events.push({ type: 'xp', uid: m.uid, amount, results: evs, level: m.level, xp: m.xp, hp: m.hp, maxHp: maxHp(m), text: `${displayName(m)} ganhou ${amount} XP!` });
        }
      }
      const cur = this.activeMon(0);
      this.participants = new Set(cur ? [cur.uid] : []);
    }
  }

  endOfTurn(events) {
    for (const sideIdx of [0, 1]) {
      const mon = this.activeMon(sideIdx);
      if (mon && mon.status === 'burn' && !isFainted(mon)) {
        const dmg = Math.max(1, Math.floor(maxHp(mon) / 12));
        mon.hp = Math.max(0, mon.hp - dmg);
        events.push({ type: 'damage', side: sideIdx, target: 'mon', uid: mon.uid, amount: dmg, eff: 1, crit: false, hp: mon.hp, maxHp: maxHp(mon), source: 'burn', text: `${displayName(mon)} sofre com a queimadura.` });
        if (isFainted(mon)) this.handleFaint(sideIdx, mon, events);
      }
    }
  }

  checkEnd(events) {
    if (this.over) return;
    // Vence quem derrotar todos os Monstrins do adversário.
    let result = null;
    if (!this.hasHealthy(1)) result = 'win';
    else if (!this.hasHealthy(0)) result = 'lose';
    if (result) {
      this.over = true;
      this.result = result;
      events.push({ type: 'end', result });
    }
  }
}
