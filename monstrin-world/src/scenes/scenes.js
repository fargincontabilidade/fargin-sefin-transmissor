/* global Phaser */
// Cenas auxiliares: carregamento (gera a arte) e fundo animado da tela inicial.
import { CONFIG } from '../config.js';
import { generateTextures } from '../art/registry.js';
import { paintGround } from '../art/terrain.js';
import { getMap } from '../data/maps/index.js';
import { OBJECTS } from '../art/objects.js';
import { MonSprite } from '../world/entities.js';

const T = CONFIG.TILE;

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    generateTextures(this);
    this.game.events.emit('mw-ready');
  }
}

export class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }
  create() {
    const def = getMap('vila_aurora');
    const canvas = paintGround(def.ground, T, def.seed);
    if (this.textures.exists('title_ground')) this.textures.remove('title_ground');
    this.textures.addCanvas('title_ground', canvas);
    this.add.image(0, 0, 'title_ground').setOrigin(0).setDepth(-1e5);
    for (const o of def.objects) {
      const od = OBJECTS[o.type];
      if (!od) continue;
      const [fw, fh] = od.foot;
      const tree = ['oak', 'oak2', 'pine', 'blossom'].includes(o.type);
      const baseY = { oak: 200, oak2: 200, blossom: 200, pine: 212 }[o.type] ?? od.h;
      const img = this.add.image((o.x + fw / 2) * T, (o.y + fh) * T - (tree ? 10 : 0), `obj_${o.type}`).setOrigin(0.5, baseY / od.h).setDepth(od.ground ? -5e4 : (o.y + fh) * T);
      if (tree) this.tweens.add({ targets: img, angle: { from: -0.6, to: 0.8 }, duration: 2400 + Math.random() * 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.mons = [];
    const spots = [['brasito', 14, 16], ['gotinho', 18, 21], ['brotim', 20, 13], ['faiscol', 12, 11], ['cogumi', 9, 13]];
    for (const [id, x, y] of spots) {
      const m = new MonSprite(this, id, x * T, y * T);
      m.vx = (Math.random() - 0.5) * 60; m.moveT = 0;
      this.mons.push(m);
    }
    const cam = this.cameras.main;
    const fit = () => {
      const z = Math.max(this.scale.width / (T * 14), this.scale.height / (T * 10));
      cam.setZoom(z);
    };
    fit();
    this.scale.on('resize', fit);
    cam.setBounds(0, 0, def.width * T, def.height * T);
    cam.centerOn(16 * T, 12 * T);
    this.tweens.add({ targets: cam, scrollX: cam.scrollX + T * 4, scrollY: cam.scrollY - T * 2, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
  update(_, dms) {
    const dt = dms / 1000;
    for (const m of this.mons) {
      m.moveT -= dt;
      if (m.moveT <= 0) { m.moveT = 1 + Math.random() * 2; m.vx = (Math.random() - 0.5) * 80; m.vy = (Math.random() - 0.5) * 50; m.walking = Math.random() < 0.6; }
      if (m.walking) { m.x += m.vx * dt; m.y += m.vy * dt; m.faceTowards(m.x + m.vx); }
      m.update(dt, m.walking);
    }
  }
}
