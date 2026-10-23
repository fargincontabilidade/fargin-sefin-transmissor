// Estado completo de uma aventura (o que é salvo).
import { CONFIG } from '../config.js';
import { QUESTS } from '../data/quests.js';
import { getItem } from '../data/items.js';
import { isFainted, healFull, maxHp } from './monstrin.js';

export const SAVE_VERSION = 1;

export function newGameState({ name, look }) {
  const now = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    savedAt: now,
    player: { name: name || 'Aventureiro', look: look ?? 0, mapId: 'casa_jogador', x: 4.5, y: 4.5, dir: 'down', coins: 500 },
    monstrins: {},
    party: [],
    box: [],
    followerUid: null,
    inventory: { tonico: 2 },
    dex: {},
    quests: { inicio: { status: 'active', progress: {} } },
    flags: {},
    regions: ['vila_aurora'],
    stats: { battles: 0, captures: 0, wins: 0, playMs: 0, trainersDefeated: [] },
    lastHeal: { mapId: 'centro_monstrin', x: 6.5, y: 7.5 },
  };
}

// Migração de salvamentos antigos (para versões futuras).
export function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  data.version = data.version || 1;
  data.flags = data.flags || {};
  data.stats = data.stats || { battles: 0, captures: 0, wins: 0, playMs: 0, trainersDefeated: [] };
  data.stats.trainersDefeated = data.stats.trainersDefeated || [];
  data.regions = data.regions || ['vila_aurora'];
  data.box = data.box || [];
  return data;
}

export class Game {
  constructor(state) {
    this.s = state;
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, payload) { for (const fn of this.listeners) fn(type, payload); }

  // ---------- Monstrins ----------
  getMon(uid) { return this.s.monstrins[uid] || null; }
  party() { return this.s.party.map((u) => this.s.monstrins[u]).filter(Boolean); }
  box() { return this.s.box.map((u) => this.s.monstrins[u]).filter(Boolean); }
  allMons() { return [...this.party(), ...this.box()]; }

  addMonstrin(mon) {
    mon.ot = mon.ot || this.s.player.name;
    this.s.monstrins[mon.uid] = mon;
    let where;
    if (this.s.party.length < CONFIG.PARTY_SIZE) { this.s.party.push(mon.uid); where = 'party'; }
    else { this.s.box.push(mon.uid); where = 'box'; }
    if (!this.s.followerUid) this.s.followerUid = mon.uid;
    this.markDex(mon.speciesId, 'caught');
    this.emit('team');
    return where;
  }

  follower() {
    const m = this.getMon(this.s.followerUid);
    if (m && this.s.party.includes(m.uid)) return m;
    return this.party()[0] || null;
  }

  setFollower(uid) {
    if (!this.s.party.includes(uid)) return false;
    this.s.followerUid = uid;
    this.emit('team');
    return true;
  }

  // Monstrin que entra primeiro na batalha: o acompanhante, se estiver bem.
  leadIndex() {
    const party = this.party();
    const f = this.follower();
    if (f && !isFainted(f)) return party.indexOf(f);
    return party.findIndex((m) => !isFainted(m));
  }

  hasHealthy() { return this.party().some((m) => !isFainted(m)); }

  moveInParty(uid, delta) {
    const i = this.s.party.indexOf(uid);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= this.s.party.length) return false;
    [this.s.party[i], this.s.party[j]] = [this.s.party[j], this.s.party[i]];
    this.emit('team');
    return true;
  }

  sendToBox(uid) {
    if (!this.s.party.includes(uid)) return { ok: false, reason: 'Não está na equipe.' };
    if (this.s.party.length <= 1) return { ok: false, reason: 'A equipe precisa ter pelo menos 1 Monstrin.' };
    const rest = this.s.party.filter((u) => u !== uid).map((u) => this.s.monstrins[u]);
    if (!rest.some((m) => !isFainted(m))) return { ok: false, reason: 'Deixe pelo menos 1 Monstrin apto na equipe.' };
    this.s.party = this.s.party.filter((u) => u !== uid);
    this.s.box.push(uid);
    if (this.s.followerUid === uid) this.s.followerUid = this.s.party[0];
    this.emit('team');
    return { ok: true };
  }

  takeFromBox(uid) {
    if (!this.s.box.includes(uid)) return { ok: false, reason: 'Não está na coleção.' };
    if (this.s.party.length >= CONFIG.PARTY_SIZE) return { ok: false, reason: `A equipe já tem ${CONFIG.PARTY_SIZE} Monstrins.` };
    this.s.box = this.s.box.filter((u) => u !== uid);
    this.s.party.push(uid);
    this.emit('team');
    return { ok: true };
  }

  healAll() {
    for (const m of this.allMons()) healFull(m);
    this.emit('team');
  }

  // ---------- Inventário ----------
  count(itemId) { return this.s.inventory[itemId] || 0; }
  addItem(itemId, qty = 1) {
    getItem(itemId);
    this.s.inventory[itemId] = this.count(itemId) + qty;
    this.emit('inventory');
  }
  removeItem(itemId, qty = 1) {
    if (this.count(itemId) < qty) return false;
    this.s.inventory[itemId] -= qty;
    if (this.s.inventory[itemId] <= 0) delete this.s.inventory[itemId];
    this.emit('inventory');
    return true;
  }
  addCoins(n) { this.s.player.coins = Math.max(0, this.s.player.coins + n); this.emit('coins'); }

  // ---------- Criaturário ----------
  markDex(speciesId, level) {
    const cur = this.s.dex[speciesId];
    if (cur === 'caught') return;
    if (level === 'caught' || !cur) this.s.dex[speciesId] = level;
  }
  dexStatus(speciesId) { return this.s.dex[speciesId] || null; }

  // ---------- Flags e missões ----------
  flag(k) { return !!this.s.flags[k]; }
  setFlag(k, v = true) {
    this.s.flags[k] = v;
    this.checkQuests();
  }

  startQuest(id) {
    if (this.s.quests[id]) return false;
    this.s.quests[id] = { status: 'active', progress: {} };
    this.emit('quest', { id, status: 'active' });
    this.checkQuests();
    return true;
  }

  questStatus(id) { return this.s.quests[id]?.status || null; }

  objectiveDone(q, obj, prog) {
    switch (obj.type) {
      case 'flag': return this.flag(obj.flag);
      case 'capture': return (prog.captures || 0) >= obj.count;
      case 'own': return this.allMons().some((m) => m.speciesId === obj.species);
      case 'defeat': return this.s.stats.trainersDefeated.includes(obj.trainer);
      case 'visit': return !!(prog.visited || {})[obj.zone] || this.flag(`visited_${obj.zone}`);
      default: return false;
    }
  }

  questProgressText(id) {
    const q = QUESTS[id];
    const st = this.s.quests[id];
    if (!q || !st) return [];
    return q.objectives.map((o) => {
      let extra = '';
      if (o.type === 'capture') extra = ` (${Math.min(o.count, st.progress.captures || 0)}/${o.count})`;
      return { text: o.text + extra, done: st.status === 'done' || this.objectiveDone(q, o, st.progress) };
    });
  }

  // Registra acontecimentos que podem avançar missões.
  questEvent(type, data = {}) {
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      if (type === 'capture') st.progress.captures = (st.progress.captures || 0) + 1;
      if (type === 'visit') { st.progress.visited = st.progress.visited || {}; st.progress.visited[data.zone] = true; }
      void id;
    }
    if (type === 'visit') this.s.flags[`visited_${data.zone}`] = true;
    this.checkQuests();
  }

  checkQuests() {
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const q = QUESTS[id];
      if (!q) continue;
      const done = q.objectives.every((o) => this.objectiveDone(q, o, st.progress));
      if (!done) continue;
      if (q.turnIn) {
        st.status = 'ready';
        this.emit('quest', { id, status: 'ready' });
      } else {
        this.completeQuest(id);
      }
    }
  }

  completeQuest(id) {
    const q = QUESTS[id];
    const st = this.s.quests[id];
    if (!q || !st || st.status === 'done') return null;
    st.status = 'done';
    st.doneAt = new Date().toISOString();
    for (const [it, n] of Object.entries(q.rewards.items || {})) this.addItem(it, n);
    if (q.rewards.coins) this.addCoins(q.rewards.coins);
    this.emit('quest', { id, status: 'done', rewards: q.rewards });
    return q.rewards;
  }

  // ---------- Derrota ----------
  // O jogador volta ao Centro Monstrin com a equipe curada. Nada é perdido
  // (a penalidade de moedas é configurável em CONFIG.DEFEAT_COIN_PENALTY).
  recoverFromDefeat() {
    const lost = Math.floor(this.s.player.coins * CONFIG.DEFEAT_COIN_PENALTY);
    this.s.player.coins -= lost;
    this.healAll();
    const h = this.s.lastHeal;
    this.s.player.mapId = h.mapId;
    this.s.player.x = h.x;
    this.s.player.y = h.y;
    this.s.player.dir = 'up';
    return { lost };
  }

  partySummary() {
    return this.party().map((m) => ({ uid: m.uid, hp: m.hp, max: maxHp(m) }));
  }

  toJSON() {
    this.s.savedAt = new Date().toISOString();
    return this.s;
  }
}
