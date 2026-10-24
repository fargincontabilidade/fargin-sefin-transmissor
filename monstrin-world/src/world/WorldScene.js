/* global Phaser */
// Cena de exploração: carrega mapas, movimenta o jogador, NPCs e Monstrins,
// trata interações, passagens entre mapas e o início das batalhas.
import { CONFIG } from '../config.js';
import { app } from '../app.js';
import { getMap } from '../data/maps/index.js';
import { OBJECTS } from '../art/objects.js';
import { artFor } from '../art/worldArt.js';
import { paintGround, isWalkableChar } from '../art/terrain.js';
import { CharacterEntity, Follower, WildEntity, NpcEntity, DIR_VEC } from './entities.js';
import { controls } from '../ui/controls.js';
import { ui } from '../ui/ui.js';
import { menus } from '../ui/menus.js';
import { sfx } from '../audio/sfx.js';
import { SCRIPTS, TRAINERS } from '../data/scripts.js';
import { createMonstrin, displayName, isFainted } from '../core/monstrin.js';
import { burst, ring, glowAt, wait } from '../battle/effects.js';
import { weightedPick, randInt } from '../core/rng.js';
import { getSpecies } from '../data/species.js';
import { getItem } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { art, lookFor } from '../art/registry.js';
import { runBattle } from '../battle/BattleDirector.js';
import { runDuel } from '../duel/DuelScreen.js';
import { DUELISTS } from '../data/duelists.js';
import { applyDuelResult, validatePlayerDeck } from '../core/duelDeck.js';
import { DUEL_CARDS } from '../duel/cards.js';
import { playEvolutions } from '../ui/evolution.js';

const T = CONFIG.TILE;
const CHUNK = 16; // tamanho dos pedaços do chão (em quadrados)

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  create() {
    app.world = this;
    this.locked = false;
    this.mapLayer = [];
    this.ambient = [];
    this.wilds = [];
    this.npcs = [];
    this.bumpT = 0;
    this.cameras.main.setBackgroundColor('#1b2a1a');
    this.vignette = this.add.image(0, 0, 'vignette').setScrollFactor(0).setDepth(1e6).setOrigin(0);
    this.scale.on('resize', () => this.applyZoom());
    const p = app.game.s.player;
    this.loadMap(p.mapId, p.x * T, p.y * T, p.dir, { banner: true });
    this.events.on('shutdown', () => this.clearMap());
  }

  // ---------------- Câmera ----------------
  applyZoom() {
    const cam = this.cameras.main;
    const w = this.scale.width; const h = this.scale.height;
    let zoom = Math.min(w / (T * 9), h / (T * 9));
    zoom = Math.max(zoom, Math.max(w, h) / (T * 20));
    this.baseZoom = zoom;
    cam.setZoom(this.battleZoom ? zoom * this.battleZoom : zoom);
    this.vignette.setDisplaySize(w, h);
    // centraliza mapas menores que a tela
    if (!this.def) return;
    const mw = this.def.width * T; const mh = this.def.height * T;
    const vw = w / zoom; const vh = h / zoom;
    const bx = mw < vw ? -(vw - mw) / 2 : 0; const by = mh < vh ? -(vh - mh) / 2 : 0;
    cam.setBounds(bx, by, Math.max(mw, vw), Math.max(mh, vh));
  }

  // ---------------- Mapa ----------------
  clearMap() {
    for (const o of this.mapLayer) o.destroy();
    for (const o of this.ambient) o.destroy?.();
    for (const w of this.wilds) w.destroy();
    for (const n of this.npcs) n.destroy();
    if (this.player) this.player.destroy();
    if (this.follower) this.follower.destroy();
    if (this.leafEmitter) this.leafEmitter.destroy();
    this.tweens.killAll();
    this.mapLayer = []; this.ambient = []; this.wilds = []; this.npcs = [];
    this.player = null; this.follower = null; this.leafEmitter = null;
    if (this.def && this.groundKeys) for (const k of this.groundKeys) this.textures.remove(k);
    this.groundKeys = [];
  }

  loadMap(mapId, px, py, dir = 'down', opts = {}) {
    this.clearMap();
    const def = getMap(mapId);
    this.def = def;
    app.game.s.player.mapId = mapId;
    app.game.visitCenter(mapId); // lembra o último Centro Monstrin visitado
    this.buildGround(def);
    this.buildObjects(def);
    this.buildCollision(def);
    this.player = new CharacterEntity(this, `chr_p${app.game.s.player.look}`, px, py, dir);
    this.buildNpcs(def);
    this.refreshFollower();
    this.spawnState = {};
    for (const z of def.spawns) { this.spawnState[z.id] = { timer: 0 }; for (let i = 0; i < z.max; i++) this.spawnWild(z, true); }
    this.buildAmbient(def);
    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, false, 0.14, 0.14, 0, 20);
    this.applyZoom();
    cam.centerOn(px, py);
    sfx.music(def.music || (def.ambient === 'interior' ? 'interior' : 'village'));
    if (opts.banner && def.ambient !== 'interior') ui.banner(def.name, def.region ? `Região de ${def.region}` : '');
    this.lastTile = null;
  }

  buildGround(def) {
    const canvas = paintGround(def.ground, T, def.seed || 1);
    const cw = CHUNK * T;
    this.groundKeys = [];
    for (let cy = 0; cy < canvas.height; cy += cw) {
      for (let cx = 0; cx < canvas.width; cx += cw) {
        const w = Math.min(cw, canvas.width - cx); const h = Math.min(cw, canvas.height - cy);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(canvas, cx, cy, w, h, 0, 0, w, h);
        const key = `ground_${def.id}_${cx}_${cy}_${Date.now()}`;
        this.textures.addCanvas(key, c);
        this.groundKeys.push(key);
        this.mapLayer.push(this.add.image(cx, cy, key).setOrigin(0).setDepth(-100000));
      }
    }
    canvas.width = 0; canvas.height = 0;
  }

  buildObjects(def) {
    this.interactables = new Map();
    this.objectSprites = [];
    for (const o of def.objects) {
      const od = OBJECTS[o.type];
      if (!od) continue;
      const [fw, fh] = od.foot;
      let key = `obj_${o.type}`;
      if (o.type === 'chest' && o.id && app.game.flag(`chest_${o.id}`)) key = 'obj_chestOpen';
      // Ilustração do Kit Visual quando existir; senão, o desenho por código
      const art = o.type === 'chest' ? null : artFor(this, o.type, o.x, o.y);
      const tree = art ? art.tree : ['oak', 'oak2', 'pine', 'blossom'].includes(o.type);
      const baseY = { oak: 200, oak2: 200, blossom: 200, pine: 212 }[o.type] ?? od.h;
      const x = (o.x + fw / 2) * T;
      const y = (o.y + fh) * T - (tree ? (art ? 12 : 10) : (art ? 2 : 0));
      const img = art
        ? this.add.image(x, y, art.key).setOrigin(0.5, art.originY).setScale(art.sx, art.sy)
        : this.add.image(x, y, key).setOrigin(0.5, baseY / od.h);
      img.setDepth(od.ground ? -50000 + o.y : (o.y + fh) * T - 4);
      if (tree) {
        img.setAngle(-0.6);
        this.tweens.add({ targets: img, angle: 0.8, duration: 2200 + Math.random() * 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 1500 });
      }
      if (od.sway) {
        img.setAlpha(0.95);
        this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1400 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        o.sprite = img;
      }
      if (od.glow) this.tweens.add({ targets: img, alpha: { from: 1, to: 0.8 }, duration: 1200, yoyo: true, repeat: -1 });
      this.mapLayer.push(img);
      o.sprite = img;
      if (o.text || o.interact || o.type === 'chest') {
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) this.interactables.set(`${o.x + i},${o.y + j}`, o);
      }
      if (o.lockedDoor) this.interactables.set(`${o.lockedDoor.x},${o.lockedDoor.y}`, { lockedDoorOf: o.type });
      if (od.sway) this.objectSprites.push(o);
    }
  }

  buildCollision(def) {
    const W = def.width; const H = def.height;
    this.solid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !isWalkableChar(def.ground[y][x])));
    this.water = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => def.ground[y][x] === 'w'));
    const doorCells = new Set(def.warps.filter((w) => w.door).map((w) => `${w.x},${w.y}`));
    for (const o of def.objects) {
      const od = OBJECTS[o.type];
      if (!od || !od.solid) continue;
      for (let j = 0; j < od.foot[1]; j++) for (let i = 0; i < od.foot[0]; i++) {
        const tx = o.x + i; const ty = o.y + j;
        if (ty < H && tx < W && !doorCells.has(`${tx},${ty}`)) this.solid[ty][tx] = true;
      }
    }
    this.blockerCells = new Map();
    for (const b of def.blockers) {
      if (b.unlessFlag && app.game.flag(b.unlessFlag)) continue;
      for (const [x, y] of b.cells) { this.solid[y][x] = true; this.blockerCells.set(`${x},${y}`, b); }
    }
  }

  buildNpcs(def) {
    for (const n of def.npcs) {
      let { x, y, dir } = n;
      if (n.moveIf && app.game.flag(n.moveIf.flag)) ({ x, y, dir } = n.moveIf);
      const e = new NpcEntity(this, n, (x + 0.5) * T, (y + 0.8) * T, dir);
      this.npcs.push(e);
    }
  }

  refreshFollower() {
    const mon = app.game.follower();
    if (!mon) { if (this.follower) { this.follower.destroy(); this.follower = null; } return; }
    if (this.follower) this.follower.setMon(mon);
    else this.follower = new Follower(this, mon, this.player);
    // Acompanhante desmaiado aparece escurecido até ser recuperado no Centro
    const sp = this.follower.view.sprite;
    if (isFainted(mon)) { sp.setTint(0x8a8a9a); sp.setAlpha(0.75); } else { sp.clearTint(); sp.setAlpha(1); }
  }

  buildAmbient(def) {
    const W = def.width; const H = def.height;
    this.waterTiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (def.ground[y][x] === 'w') this.waterTiles.push([x, y]);
    this.sparkleT = 0;
    if (def.ambient !== 'interior') {
      const colors = [0xffe36b, 0xff9de2, 0xffffff, 0x9fdcff, 0xffb36b];
      for (let i = 0; i < 5; i++) {
        const b = this.add.image(Math.random() * W * T, Math.random() * H * T, 'butterfly').setTint(colors[i % colors.length]).setDepth(5e5).setScale(0.9);
        b.vx = 0; b.vy = 0; b.t = Math.random() * 10;
        this.ambient.push(b);
      }
      if (def.id === 'bosque') {
        this.leafEmitter = this.add.particles(0, 0, 'p_leaf', {
          x: { min: 0, max: this.scale.width }, y: -20, lifespan: 9000, speedY: { min: 40, max: 80 }, speedX: { min: -60, max: 10 },
          rotate: { start: 0, end: 360 }, scale: { min: 0.6, max: 1.1 }, alpha: 0.85, frequency: 450,
          tint: [0x6fd04f, 0xa6e57c, 0xffcf5a, 0xff9d4d],
        }).setScrollFactor(0).setDepth(9e5);
      }
    }
  }

  // ---------------- Colisão ----------------
  tileSolid(tx, ty) {
    if (!this.def || tx < 0 || ty < 0 || tx >= this.def.width || ty >= this.def.height) return true;
    return this.solid[ty][tx];
  }

  npcAt(tx, ty, except) {
    return this.npcs.find((n) => n !== except && n.tile().tx === tx && n.tile().ty === ty) || null;
  }

  pointBlocked(x, y) {
    const tx = Math.floor(x / T); const ty = Math.floor(y / T);
    if (this.tileSolid(tx, ty)) return true;
    return !!this.npcAt(tx, ty);
  }

  canStand(x, y) {
    const hw = 13;
    return !(this.pointBlocked(x - hw, y - 15) || this.pointBlocked(x + hw, y - 15) || this.pointBlocked(x - hw, y - 2) || this.pointBlocked(x + hw, y - 2));
  }

  walkableTile(tx, ty) { return !this.tileSolid(tx, ty) && !this.npcAt(tx, ty); }

  // ---------------- Laço principal ----------------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!this.player) return;
    const blocked = this.locked || ui.isBlocking();
    if (!blocked) {
      if (controls.consume('menu')) { menus.openMainMenu(); }
      else if (controls.consume('a')) { this.tryInteract(); }
      else this.movePlayer(dt);
    } else {
      this.player.animate(dt, false);
    }
    controls.endFrame();
    this.player.sync();
    if (this.follower) this.follower.update(dt);
    const ctx = { player: this.player, walkable: (tx, ty) => this.walkableTile(tx, ty) && !this.water[ty]?.[tx], walkablePx: (x, y) => this.canStandWild(x, y) };
    if (!this.inBattle) for (const w of this.wilds) w.update(dt, ctx);
    else for (const w of this.wilds) w.view.update(dt, false);
    for (const n of this.npcs) n.update(dt, { walkableForNpc: (x, y, self) => this.walkableForNpc(x, y, self) });
    this.updateAmbient(dt);
    if (!blocked) {
      this.updateSpawns(dt);
      this.checkEncounters();
      this.checkTrainerSight();
    }
    this.bumpT = Math.max(0, this.bumpT - dt);
  }

  canStandWild(x, y) {
    const tx = Math.floor(x / T); const ty = Math.floor((y - 6) / T);
    return this.walkableTile(tx, ty) && !this.water[ty]?.[tx] && !this.warpAt(tx, ty);
  }

  walkableForNpc(x, y, self) {
    const tx = Math.floor(x / T); const ty = Math.floor((y - 8) / T);
    if (this.tileSolid(tx, ty) || this.npcAt(tx, ty, self) || this.warpAt(tx, ty)) return false;
    const pt = this.player.tile();
    return !(pt.tx === tx && pt.ty === ty);
  }

  movePlayer(dt) {
    const dir = controls.dir();
    const p = this.player;
    if (!dir) { p.animate(dt, false); return; }
    p.dir = dir;
    const run = controls.isRunning();
    const speed = CONFIG.PLAYER_SPEED * (run ? CONFIG.RUN_MULT : 1);
    const [vx, vy] = DIR_VEC[dir];
    const step = speed * dt;
    const nx = p.x + vx * step; const ny = p.y + vy * step;
    let moved = false;
    if (this.canStand(nx, ny)) { p.x = nx; p.y = ny; moved = true; }
    else {
      // ajuda a passar por corredores: desliza para o lado livre
      for (const k of [6, 12, 18, 24]) {
        for (const s of [1, -1]) {
          const ox = vy !== 0 ? s * k : 0; const oy = vx !== 0 ? s * k : 0;
          if (this.canStand(p.x + ox + vx * step, p.y + oy + vy * step) && this.canStand(p.x + ox, p.y + oy)) {
            const m = Math.min(step, k);
            p.x += Math.sign(ox) * m; p.y += Math.sign(oy) * m;
            moved = true; break;
          }
        }
        if (moved) break;
      }
      if (!moved) {
        if (this.bumpT <= 0) { sfx.play('bump'); this.bumpT = 0.35; }
        // empurrar bloqueio com NPC (ex.: vigia)
        const fx = Math.floor((p.x + vx * 30) / T); const fy = Math.floor((p.y - 8 + vy * 30) / T);
        const b = this.blockerCells.get(`${fx},${fy}`);
        if (b && !this.blockTalkCooldown) { this.blockTalkCooldown = true; this.runScript(b.talk, this.npcs.find((n) => n.def.id === 'bento')).then(() => { this.blockTalkCooldown = false; }); }
      }
    }
    p.animate(dt, moved, run ? 1.5 : 1);
    if (moved) this.onPlayerMoved();
  }

  onPlayerMoved() {
    const t = this.player.tile();
    const key = `${t.tx},${t.ty}`;
    if (key === this.lastTile) return;
    this.lastTile = key;
    // capim alto balança quando passamos
    for (const o of this.objectSprites) {
      if (o.x === t.tx && o.y === t.ty && o.sprite) {
        this.tweens.add({ targets: o.sprite, scaleX: 1.15, scaleY: 0.9, duration: 90, yoyo: true });
      }
    }
    const warp = this.warpAt(t.tx, t.ty);
    if (warp) { this.transition(warp); return; }
    for (const z of this.def.zones) {
      if (t.tx >= z.x && t.tx < z.x + z.w && t.ty >= z.y && t.ty < z.y + z.h && z.visit && !app.game.flag(`visited_${z.visit}`)) {
        app.game.questEvent('visit', { zone: z.visit });
        ui.banner(z.label || 'Novo local descoberto!', 'Local descoberto');
        sfx.play('item');
      }
    }
  }

  warpAt(tx, ty) {
    return this.def.warps.find((w) => tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h) || null;
  }

  async transition(warp) {
    if (this.locked) return;
    this.locked = true;
    sfx.play('door');
    await ui.fade(true);
    const firstVisit = !app.game.flag(`been_${warp.to}`);
    app.game.setFlag(`been_${warp.to}`);
    this.loadMap(warp.to, warp.tx * T, warp.ty * T, warp.dir || 'down', { banner: true || firstVisit });
    if (this.follower) this.follower.resetBehind();
    await ui.fade(false);
    this.locked = false;
    app.save();
  }

  storePlayerPosition() {
    if (!this.player || !this.def) return;
    const p = app.game.s.player;
    p.mapId = this.def.id;
    p.x = this.player.x / T;
    p.y = this.player.y / T;
    p.dir = this.player.dir;
  }

  // ---------------- Interação ----------------
  frontTile() {
    const p = this.player;
    const [vx, vy] = DIR_VEC[p.dir];
    return { tx: Math.floor((p.x + vx * 40) / T), ty: Math.floor((p.y - 8 + vy * 40) / T) };
  }

  async tryInteract() {
    const p = this.player;
    const { tx, ty } = this.frontTile();
    // Monstrin selvagem à frente
    const [vx, vy] = DIR_VEC[p.dir];
    const wild = this.wilds.find((w) => Math.hypot(w.x - (p.x + vx * 44), w.y - (p.y + vy * 44)) < 46);
    if (wild) { this.startWildBattle(wild); return; }
    const npc = this.npcAt(tx, ty);
    if (npc) { await this.talkTo(npc); return; }
    const b = this.blockerCells.get(`${tx},${ty}`);
    if (b) { await this.runScript(b.talk, this.npcs.find((n) => n.def.id === 'bento')); return; }
    const obj = this.interactables.get(`${tx},${ty}`);
    if (obj) { await this.useObject(obj); return; }
    if (this.water[ty]?.[tx]) { this.locked = true; await ui.say('A água está fresquinha e cristalina. Dá para ver peixinhos nadando.'); this.locked = false; }
  }

  async talkTo(npc) {
    this.locked = true;
    npc.busy = true;
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    npc.face(opposite[this.player.dir]);
    try { await this.runScript(npc.def.talk, npc); } finally { npc.busy = false; this.locked = false; }
  }

  async useObject(o) {
    this.locked = true;
    try {
      if (o.lockedDoorOf) { await ui.say(o.lockedDoorOf === 'house_blue' ? 'Casa da Dona Flora. A porta está trancada — ela deve estar no jardim.' : 'A porta está trancada.'); return; }
      if (o.type === 'chest') {
        if (app.game.flag(`chest_${o.id}`)) { await ui.say('O baú está vazio.'); return; }
        app.game.setFlag(`chest_${o.id}`);
        o.sprite.setTexture('obj_chestOpen');
        sfx.play('item');
        await ui.say('Você abriu o baú!');
        for (const [id, n] of Object.entries(o.items || {})) {
          app.game.addItem(id, n);
          ui.toast(`Recebeu ${n}x ${getItem(id).name}`, art.itemUrl(id));
          await ui.say(`Você encontrou ${n}x ${getItem(id).name}!`);
        }
        app.save();
        return;
      }
      if (o.text) { await ui.say(o.text); return; }
      if (o.interact) await this.runScript(o.interact, null);
    } finally { this.locked = false; }
  }

  makeCtx(npc) {
    const game = app.game;
    const speaker = npc ? { name: npc.def.name, portrait: art.lookUrl(lookFor(npc.def.look)) } : {};
    return {
      game,
      npc,
      playerName: game.s.player.name,
      say: (t) => ui.say(t, speaker),
      ask: (t, o) => ui.ask(t, o, speaker),
      flag: (k) => game.flag(k),
      setFlag: (k) => game.setFlag(k),
      give: (id, n = 1) => { game.addItem(id, n); ui.toast(`Recebeu ${n}x ${getItem(id).name}`, art.itemUrl(id)); sfx.play('item'); },
      startQuest: (id) => game.startQuest(id),
      completeQuest: (id) => game.completeQuest(id),
      // Animação da máquina de recuperação do Centro Monstrin + cura completa.
      healParty: async () => {
        const machine = this.def.objects.find((o) => o.type === 'healer');
        const mx = machine ? (machine.x + 1) * T : this.player.x;
        const my = machine ? (machine.y + 1) * T - 60 : this.player.y - 60;
        sfx.play('heal');
        const n = Math.max(1, Math.min(6, game.party().length));
        for (let i = 0; i < n; i++) {
          glowAt(this, mx, my, 0x5ad1ff, 1.6, 420);
          burst(this, mx, my, { tex: 'p_spark', tint: [0x5ad1ff, 0xffffff, 0x9dffb5], count: 10, speed: [40, 140], scale: [0.5, 0] });
          sfx.play('select');
          await wait(280);
        }
        ring(this, mx, my, { tint: 0x9dffb5, to: 1.6, sy: 0.6 });
        ui.flash();
        game.healAll();
        sfx.play('levelup');
        burst(this, this.player.x, this.player.y - 60, { tex: 'p_star', tint: [0xffe14a, 0xffffff, 0x9dffb5], count: 22, speed: [80, 220], scale: [0.6, 0] });
        this.refreshFollower();
        await wait(500);
        menus.refreshHud();
        app.save();
      },
      chooseStarter: () => menus.chooseStarter(),
      giveStarter: async (speciesId) => {
        const mon = createMonstrin(speciesId, 5, { how: 'inicial', mapId: this.def.id, ot: game.s.player.name });
        game.addMonstrin(mon);
        game.setFlag('starterChosen');
        game.s.followerUid = mon.uid;
        this.refreshFollower();
        this.follower?.resetBehind();
        sfx.play('caught');
        ui.toast(`${getSpecies(speciesId).name} entrou para a sua equipe!`, art.monUrl(speciesId));
        menus.refreshHud();
        app.save();
        return displayName(mon);
      },
      trainerBattle: (id) => this.startTrainerBattle(id, npc),
      duel: (id) => this.startDuel(id, npc),
      openShop: (stock) => menus.openShop(stock),
      openBox: () => menus.openTeam({ box: true }),
    };
  }

  async runScript(name, npc) {
    const fn = SCRIPTS[name];
    if (!fn) return;
    const was = this.locked;
    this.locked = true;
    try { await fn(this.makeCtx(npc)); } finally {
      this.locked = was;
      menus.refreshHud();
      // atualiza bloqueios/NPCs que dependem de marcações
      this.buildCollision(this.def);
      for (const n of this.npcs) {
        const d = n.def;
        if (d.moveIf && app.game.flag(d.moveIf.flag) && !n.moved) {
          n.moved = true;
          const tx = (d.moveIf.x + 0.5) * T; const ty = (d.moveIf.y + 0.8) * T;
          this.tweens.add({ targets: n, x: tx, y: ty, duration: 600, onComplete: () => n.face(d.moveIf.dir) });
        }
      }
    }
  }

  // ---------------- Monstrins selvagens ----------------
  spawnWild(zone, initial = false) {
    if (!CONFIG.WILD_MONSTRINS) return; // desativado: Monstrins agora são cartas
    const live = this.wilds.filter((w) => w.zone === zone).length;
    if (live >= zone.max) return;
    const p = this.player;
    for (let i = 0; i < 25; i++) {
      const tx = zone.x + Math.floor(Math.random() * zone.w);
      const ty = zone.y + Math.floor(Math.random() * zone.h);
      if (!this.walkableTile(tx, ty) || this.water[ty]?.[tx] || this.warpAt(tx, ty)) continue;
      const x = (tx + 0.5) * T; const y = (ty + 0.75) * T;
      if (p && Math.hypot(p.x - x, p.y - y) < T * (initial ? 5 : 4)) continue;
      const entry = weightedPick(Math.random, zone.table);
      const mon = createMonstrin(entry.species, randInt(Math.random, entry.min, entry.max), { how: 'selvagem', mapId: this.def.id });
      this.wilds.push(new WildEntity(this, mon, zone, x, y));
      return;
    }
  }

  updateSpawns(dt) {
    for (const z of this.def.spawns) {
      const st = this.spawnState[z.id];
      const live = this.wilds.filter((w) => w.zone === z).length;
      if (live >= z.max) { st.timer = 0; continue; }
      st.timer += dt * 1000;
      if (st.timer >= CONFIG.WILD_RESPAWN_MS) { st.timer = 0; this.spawnWild(z); }
    }
  }

  removeWild(w) {
    this.wilds = this.wilds.filter((x) => x !== w);
    this.tweens.add({ targets: [w.view.sprite, w.view.shadow], alpha: 0, duration: 400, onComplete: () => w.destroy() });
  }

  checkEncounters() {
    const p = this.player;
    for (const w of this.wilds) {
      if (w.cooldown > 0) continue;
      const r = 26 + 18 * getSpecies(w.mon.speciesId).art.size;
      if (Math.hypot(p.x - w.x, (p.y - 10) - (w.y - 10)) < r) { this.startWildBattle(w); return; }
    }
  }

  async startWildBattle(wild) {
    if (this.locked || this.inBattle) return;
    if (!app.game.hasHealthy()) {
      wild.cooldown = 3;
      this.locked = true;
      await ui.say(app.game.party().length ? 'Seus Monstrins estão exaustos! Descanse no Centro Monstrin antes de batalhar.' : 'Você ainda não tem um Monstrin para batalhar!');
      this.locked = false;
      return;
    }
    this.locked = true;
    this.inBattle = true;
    try {
      const res = await runBattle(this, { kind: 'wild', wild });
      await this.afterBattle(res, { wild });
    } finally { this.inBattle = false; this.locked = false; }
  }

  async startTrainerBattle(trainerId, npc) {
    const tr = TRAINERS[trainerId];
    if (!app.game.hasHealthy()) { await ui.say('Seus Monstrins precisam descansar antes de uma batalha!'); return 'none'; }
    this.inBattle = true;
    const team = tr.team.map((t) => createMonstrin(t.species, t.level, { temperament: t.temperament, how: 'treinador' }));
    let res;
    try {
      res = await runBattle(this, { kind: 'trainer', trainer: tr, trainerNpc: npc, team });
      await this.afterBattle(res, { trainer: tr });
    } finally { this.inBattle = false; }
    return res.result;
  }

  // ---------------- Duelos de cartas contra NPCs ----------------
  // O mundo fica parado durante o duelo; ao terminar, o jogador continua
  // exatamente no mesmo lugar do mapa.
  async startDuel(duelistId, npc) {
    const game = app.game;
    const d = DUELISTS[duelistId];
    if (!d || this.inBattle) return null;
    if (!game.s.duel) { await ui.say('Você ainda não tem um deck de cartas.'); return null; }
    const v = validatePlayerDeck(game, game.s.duel.deck);
    if (!v.ok) { await ui.say(`Seu deck não está pronto: ${v.errors[0]} Ajuste em Menu → Deck.`); return null; }
    const pos = { mapId: this.def.id, x: this.player.x, y: this.player.y, dir: this.player.dir };
    this.inBattle = true;
    this.locked = true;
    controls.reset?.();
    menus.showHud(false);
    let res;
    try {
      await ui.fade(true);
      const pending = runDuel({ playerName: game.s.player.name, look: game.s.player.look, playerDeck: game.s.duel.deck, duelist: d, tonics: game.count('tonico') });
      await ui.fade(false);
      res = await pending;
      // Tônicos usados no duelo saem do inventário
      if (res.itemsUsed) game.removeItem('tonico', Math.min(res.itemsUsed, game.count('tonico')));
      game.s.stats.battles += 1;
      const out = applyDuelResult(game, d, res.winner);
      if (res.winner === 0) game.s.stats.wins += 1;
      await ui.fade(true);
      // posição preservada (o duelo não move o personagem)
      this.player.x = pos.x; this.player.y = pos.y; this.player.face(pos.dir);
      this.storePlayerPosition();
      menus.showHud(true);
      menus.refreshHud();
      await ui.fade(false);
      if (out.rewards) {
        const r = out.rewards;
        sfx.play('coin');
        const parts = [];
        if (r.coins) parts.push(`${r.coins} moedas`);
        for (const [id, n] of Object.entries(r.cards || {})) parts.push(`${n}x carta ${DUEL_CARDS[id].name}`);
        for (const [id, n] of Object.entries(r.items || {})) parts.push(`${n}x ${getItem(id).name}`);
        await ui.say(`Recompensa da primeira vitória contra ${d.name}: ${parts.join(', ')}.`);
      }
      app.save();
      return { result: out.result, rewards: out.rewards };
    } finally {
      this.inBattle = false;
      this.locked = false;
      menus.showHud(true);
    }
  }

  async afterBattle(res, { wild, trainer }) {
    const game = app.game;
    game.s.stats.battles += 1;
    if (wild) {
      if (res.result === 'caught' || res.result === 'win') this.removeWild(wild);
      else wild.cooldown = 4;
    }
    if (res.result === 'win' && trainer) {
      game.s.stats.wins += 1;
      if (!game.s.stats.trainersDefeated.includes(trainer.id)) game.s.stats.trainersDefeated.push(trainer.id);
      game.addCoins(trainer.coins);
      ui.toast(`Você ganhou ${trainer.coins} moedas!`);
      sfx.play('coin');
      game.checkQuests();
    } else if (res.result === 'win') game.s.stats.wins += 1;
    // Evoluções
    if (res.evolve && res.evolve.length) await playEvolutions(res.evolve);
    // Derrota por todos os Monstrins desmaiados: volta ao Centro (render-se não teleporta)
    if (res.result === 'lose' && res.reason !== 'surrender') {
      await this.recoverFromDefeat();
    }
    this.refreshFollower();
    menus.refreshHud();
    app.save();
  }

  // Todos os Monstrins desmaiaram: o jogador é levado ao último Centro
  // Monstrin visitado. A equipe continua desmaiada até falar com o atendimento.
  async recoverFromDefeat() {
    await ui.say('Todos os seus Monstrins foram derrotados... Você correu com eles até o Centro Monstrin.');
    await ui.fade(true);
    const r = app.game.recoverFromDefeat();
    const p = app.game.s.player;
    this.loadMap(p.mapId, p.x * T, p.y * T, p.dir, { banner: false });
    this.follower?.resetBehind();
    app.save();
    await ui.fade(false);
    await ui.say(`Seus Monstrins estão desmaiados e precisam de cuidados. Fale comigo no balcão para recuperá-los!${r.lost ? ` (Você perdeu ${r.lost} moedas.)` : ''}`, { name: 'Enfermeira Lia', portrait: art.lookUrl(lookFor('enfermeira')) });
  }

  checkTrainerSight() {
    const pt = this.player.tile();
    for (const n of this.npcs) {
      const tr = n.def.trainer;
      if (!tr || n.busy || n.sightDone || app.game.s.stats.trainersDefeated.includes(tr.id) || this.locked) continue;
      const nt = n.tile();
      const [vx, vy] = DIR_VEC[n.dir];
      for (let k = 1; k <= tr.sight; k++) {
        const tx = nt.tx + vx * k; const ty = nt.ty + vy * k;
        if (this.tileSolid(tx, ty)) break;
        if (Math.abs(pt.tx - tx) + Math.abs(pt.ty - ty) === 0) { this.trainerSpotted(n, k); return; }
      }
    }
  }

  async trainerSpotted(npc, dist) {
    this.locked = true;
    npc.busy = true;
    npc.sightDone = true; // desafia só uma vez por visita ao mapa
    sfx.play('alert');
    const alert = this.add.image(npc.x, npc.y - 104, 'emote_alert').setDepth(1e6).setScale(0.1);
    this.tweens.add({ targets: alert, scale: 1, duration: 200, ease: 'Back.out' });
    await new Promise((r) => setTimeout(r, 700));
    alert.destroy();
    const [vx, vy] = DIR_VEC[npc.dir];
    if (dist > 1) {
      await new Promise((r) => this.tweens.add({ targets: npc, x: npc.x + vx * T * (dist - 1), y: npc.y + vy * T * (dist - 1), duration: 220 * (dist - 1), onUpdate: () => npc.animate(0.016, true), onComplete: r }));
    }
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    this.player.face(opposite[npc.dir]);
    try { await this.runScript(npc.def.talk, npc); } finally { npc.busy = false; this.locked = false; }
  }

  // ---------------- Ambiente ----------------
  updateAmbient(dt) {
    if (this.waterTiles.length) {
      this.sparkleT -= dt;
      if (this.sparkleT <= 0) {
        this.sparkleT = 0.12;
        const [x, y] = this.waterTiles[Math.floor(Math.random() * this.waterTiles.length)];
        const s = this.add.image((x + Math.random()) * T, (y + Math.random()) * T, 'p_spark').setDepth(-40000).setScale(0.05).setAlpha(0.9);
        this.tweens.add({ targets: s, scale: 0.35, alpha: 0, duration: 900, onComplete: () => s.destroy() });
      }
    }
    for (const b of this.ambient) {
      if (!b.texture || b.texture.key !== 'butterfly') continue;
      b.t += dt;
      b.vx += (Math.random() - 0.5) * 120 * dt; b.vy += (Math.random() - 0.5) * 120 * dt;
      b.vx = Math.max(-50, Math.min(50, b.vx)); b.vy = Math.max(-40, Math.min(40, b.vy));
      b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(b.t * 6) * 0.6;
      b.scaleX = 0.9 * Math.abs(Math.sin(b.t * 14));
      const W = this.def.width * T; const H = this.def.height * T;
      if (b.x < 0 || b.x > W) b.vx *= -1;
      if (b.y < 0 || b.y > H) b.vy *= -1;
    }
  }
}
