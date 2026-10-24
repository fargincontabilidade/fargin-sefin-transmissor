// Entidades do mapa: personagens (jogador/NPC) e Monstrins (acompanhante/selvagens).
import { CONFIG } from '../config.js';
import { getSpecies } from '../data/species.js';
import { CHAR_H } from '../art/characters.js';

const T = CONFIG.TILE;
const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
export const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class CharacterEntity {
  constructor(scene, texKey, x, y, dir = 'down') {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.75, 0.8).setAlpha(0.9);
    this.sprite = scene.add.sprite(x, y, texKey, DIR_ROW[dir] * 4).setOrigin(0.5, 186 / CHAR_H).setScale(0.5);
    this.animT = 0;
    this.moving = false;
    this.sync();
  }

  setTexture(key) { this.sprite.setTexture(key, DIR_ROW[this.dir] * 4); }

  face(dir) {
    this.dir = dir;
    this.sprite.setFrame(DIR_ROW[dir] * 4 + (this.moving ? this.frameIdx() : 0));
  }

  frameIdx() { return Math.floor(this.animT * 8) % 4; }

  animate(dt, moving, speedMult = 1) {
    this.moving = moving;
    if (moving) this.animT += dt * speedMult;
    else this.animT = 0;
    this.sprite.setFrame(DIR_ROW[this.dir] * 4 + (moving ? this.frameIdx() : 0));
  }

  sync() {
    this.sprite.setPosition(this.x, this.y);
    this.shadow.setPosition(this.x, this.y - 2);
    this.sprite.setDepth(this.y);
    this.shadow.setDepth(this.y - 40);
  }

  tile() { return { tx: Math.floor(this.x / T), ty: Math.floor((this.y - 8) / T) }; }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}

// Sprite de Monstrin com animações procedurais (respirar, pular, piscar).
export class MonSprite {
  constructor(scene, speciesId, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hop = 0;
    this.t = Math.random() * 10;
    this.blinkT = 2 + Math.random() * 3;
    this.facing = 1;
    this.shadow = scene.add.image(x, y, 'shadow');
    this.sprite = scene.add.image(x, y, `mon_${speciesId}`).setOrigin(0.5, 236 / 256);
    this.setSpecies(speciesId);
    this.extraScale = 1;
    this.sync();
  }

  setSpecies(speciesId) {
    this.speciesId = speciesId;
    const sp = getSpecies(speciesId);
    this.baseScale = (sp.art.size * 92) / 256;
    this.sprite.setTexture(`mon_${speciesId}`);
    this.shadow.setScale(0.9 * sp.art.size, 0.9 * sp.art.size);
  }

  update(dt, moving) {
    this.t += dt;
    if (moving) this.hop = Math.abs(Math.sin(this.t * 10)) * 7;
    else this.hop *= 0.8;
    const breathe = moving ? 0 : Math.sin(this.t * 3) * 0.025;
    const squash = moving ? Math.abs(Math.cos(this.t * 10)) * 0.06 : 0;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.sprite.setTexture(`mon_${this.speciesId}_b`);
      if (this.blinkT <= -0.14) { this.sprite.setTexture(`mon_${this.speciesId}`); this.blinkT = 2 + Math.random() * 4; }
    }
    const s = this.baseScale * this.extraScale;
    this.sprite.setScale(s * this.facing * (1 + squash), s * (1 + breathe - squash));
    this.sync();
  }

  sync() {
    this.sprite.setPosition(this.x, this.y - this.hop);
    this.shadow.setPosition(this.x, this.y - 2);
    this.sprite.setDepth(this.y);
    this.shadow.setDepth(this.y - 40);
  }

  faceTowards(x) { if (Math.abs(x - this.x) > 2) this.facing = x < this.x ? -1 : 1; }

  setVisible(v) { this.sprite.setVisible(v); this.shadow.setVisible(v); }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}

// Acompanhante: segue o rastro do jogador.
export class Follower {
  constructor(scene, mon, player) {
    this.scene = scene;
    this.mon = mon;
    this.player = player;
    this.view = new MonSprite(scene, mon.speciesId, player.x, player.y);
    this.trail = [];
    this.paused = false;
    this.resetBehind();
  }

  setMon(mon) { this.mon = mon; this.view.setSpecies(mon.speciesId); }

  record() {
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - this.player.x, last.y - this.player.y) > 4) {
      this.trail.push({ x: this.player.x, y: this.player.y });
      if (this.trail.length > 200) this.trail.shift();
    }
  }

  // Coloca o acompanhante atrás do jogador (ou ao lado, se atrás for parede).
  resetBehind() {
    const [dx, dy] = DIR_VEC[this.player.dir];
    const p = this.player;
    const options = [[-dx, -dy], [dy, dx], [-dy, -dx], [dx, dy]];
    let pos = [p.x - dx * 48, p.y - dy * 48];
    for (const [ox, oy] of options) {
      const x = p.x + ox * 52; const y = p.y + oy * 52;
      if (!this.scene.canStand || this.scene.canStand(x, y)) { pos = [x, y]; break; }
    }
    this.view.x = pos[0];
    this.view.y = pos[1];
    this.trail = [];
  }

  update(dt) {
    if (this.paused) { this.view.update(dt, false); return; }
    this.record();
    // alvo: ponto do rastro a ~56px de distância do jogador
    let target = null;
    let acc = 0;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i]; const b = this.trail[i - 1];
      acc += Math.hypot(a.x - b.x, a.y - b.y);
      if (acc >= 56) { target = b; break; }
    }
    const v = this.view;
    const distP = Math.hypot(this.player.x - v.x, this.player.y - v.y);
    if (distP > T * 7) { this.resetBehind(); return; }
    let moving = false;
    if (target) {
      const dx = target.x - v.x; const dy = target.y - v.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        const sp = Math.min(d, (CONFIG.PLAYER_SPEED * 1.8) * dt);
        v.x += (dx / d) * sp; v.y += (dy / d) * sp;
        v.faceTowards(target.x + dx);
        moving = true;
      }
    }
    v.update(dt, moving);
  }

  destroy() { this.view.destroy(); }
}

// Monstrin selvagem visível no mapa.
export class WildEntity {
  constructor(scene, mon, zone, x, y) {
    this.scene = scene;
    this.mon = mon;
    this.zone = zone;
    this.view = new MonSprite(scene, mon.speciesId, x, y);
    this.state = 'idle';
    this.timer = 0.5 + Math.random() * 2;
    this.target = null;
    this.cooldown = 0;
    const sp = getSpecies(mon.speciesId);
    this.behavior = sp.behavior || 'wander';
    this.rare = sp.rarity === 'raro' || sp.rarity === 'lendario';
    this.speed = 45 + (sp.base.spd || 50) * 0.6;
    this.label = null;
    this.view.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.view.sprite, alpha: 1, duration: 500 });
    if (this.rare) this.sparkleT = 0;
  }

  get x() { return this.view.x; }
  get y() { return this.view.y; }

  pickTarget(walkable) {
    const z = this.zone;
    for (let i = 0; i < 10; i++) {
      const tx = z.x + Math.floor(Math.random() * z.w);
      const ty = z.y + Math.floor(Math.random() * z.h);
      if (walkable(tx, ty)) return { x: tx * T + T / 2, y: ty * T + T * 0.75 };
    }
    return null;
  }

  update(dt, ctx) {
    const { player, walkablePx, walkable } = ctx;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const dP = Math.hypot(player.x - this.x, player.y - this.y);
    let moving = false;
    // comportamento conforme a espécie
    if (this.behavior === 'shy' && dP < T * 2.6) {
      const dx = this.x - player.x; const dy = this.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.state = 'walk';
      this.target = { x: this.x + (dx / d) * T * 2, y: this.y + (dy / d) * T * 2 };
      this.fast = true;
    } else if (this.behavior === 'curious' && dP < T * 4 && dP > T * 1.4 && this.state === 'idle' && Math.random() < dt * 0.6) {
      this.state = 'walk'; this.target = { x: player.x, y: player.y }; this.fast = false;
    }
    if (this.state === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.target = this.pickTarget(walkable);
        this.state = this.target ? 'walk' : 'idle';
        this.fast = false;
        this.timer = (this.behavior === 'lazy' ? 3 : 1.2) + Math.random() * 2.5;
      }
    } else if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.x; const dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) { this.state = 'idle'; }
      else {
        const sp = this.speed * (this.fast ? 1.8 : 1) * (this.behavior === 'lazy' ? 0.6 : 1) * dt;
        const nx = this.x + (dx / d) * Math.min(sp, d);
        const ny = this.y + (dy / d) * Math.min(sp, d);
        const z = this.zone;
        const inside = nx > z.x * T && nx < (z.x + z.w) * T && ny > z.y * T && ny < (z.y + z.h) * T;
        if (walkablePx(nx, ny) && inside) {
          this.view.x = nx; this.view.y = ny; moving = true;
          this.view.faceTowards(nx + dx);
        } else { this.state = 'idle'; this.timer = 0.4 + Math.random(); }
      }
    }
    this.view.update(dt, moving);
    // nome e nível quando o jogador está perto
    if (dP < T * 3.2) {
      if (!this.label) {
        const sp = getSpecies(this.mon.speciesId);
        this.label = this.scene.add.text(this.x, this.y, `${sp.name}  Nv.${this.mon.level}${this.rare ? ' ✦' : ''}`, {
          fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontStyle: '900', color: this.rare ? '#ffe36b' : '#ffffff', stroke: '#1a1a2e', strokeThickness: 5,
        }).setOrigin(0.5, 1).setResolution(2);
      }
      const h = 92 * getSpecies(this.mon.speciesId).art.size;
      this.label.setPosition(this.x, this.y - h - 4).setDepth(this.y + 2000).setVisible(true);
    } else if (this.label) this.label.setVisible(false);
    if (this.rare) {
      this.sparkleT -= dt;
      if (this.sparkleT <= 0) {
        this.sparkleT = 0.25;
        const s = this.scene.add.image(this.x + (Math.random() - 0.5) * 50, this.y - 20 - Math.random() * 50, 'p_spark').setScale(0.4).setTint(0xbff6ff).setDepth(this.y + 1);
        this.scene.tweens.add({ targets: s, alpha: 0, scale: 0.1, y: s.y - 20, duration: 700, onComplete: () => s.destroy() });
      }
    }
  }

  destroy() { this.view.destroy(); if (this.label) this.label.destroy(); }
}

export class NpcEntity extends CharacterEntity {
  constructor(scene, def, x, y, dir) {
    super(scene, `chr_${def.look}`, x, y, dir);
    this.def = def;
    this.home = { x, y };
    this.wanderT = 2 + Math.random() * 3;
    this.busy = false;
    this.stepTween = null;
    // Marcador ⚔: esta pessoa aceita duelos de cartas
    if (def.duelist) {
      this.mark = scene.add.text(x, y - 118, '⚔', { fontFamily: 'Nunito, sans-serif', fontSize: '30px', color: '#ffd23f', stroke: '#2a1d00', strokeThickness: 6 }).setOrigin(0.5).setDepth(1e6 - 1);
      scene.tweens.add({ targets: this.mark, scale: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  sync() {
    super.sync();
    if (this.mark) this.mark.setPosition(this.x, this.y - 118);
  }

  destroy() { super.destroy(); if (this.mark) this.mark.destroy(); }

  update(dt, ctx) {
    if (!this.def.wander || this.busy) { this.animate(dt, !!this.stepTween); this.sync(); return; }
    this.wanderT -= dt;
    if (this.wanderT <= 0 && !this.stepTween) {
      this.wanderT = 2 + Math.random() * 3;
      const dirs = ['up', 'down', 'left', 'right'];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const [dx, dy] = DIR_VEC[dir];
      const nx = this.x + dx * T; const ny = this.y + dy * T;
      const r = this.def.wander * T;
      this.face(dir);
      if (Math.abs(nx - this.home.x) <= r && Math.abs(ny - this.home.y) <= r && ctx.walkableForNpc(nx, ny, this)) {
        this.stepTween = this.scene.tweens.add({ targets: this, x: nx, y: ny, duration: 420, onComplete: () => { this.stepTween = null; } });
      }
    }
    this.animate(dt, !!this.stepTween);
    this.sync();
  }

  tileKey() { const t = this.tile(); return `${t.tx},${t.ty}`; }
}
