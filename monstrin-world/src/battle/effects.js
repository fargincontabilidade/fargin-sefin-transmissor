// Sistema reutilizável de efeitos de ataque.
// Cada ataque aponta para uma animação (campo "anim" em src/data/moves.js).
// Para criar uma animação nova, adicione uma função em ANIMS usando as
// ferramentas abaixo (projétil, explosão, raio, onda...).
import { sfx } from '../audio/sfx.js';
import { getMove } from '../data/moves.js';

const C = {
  fire: [0xff4f1f, 0xff8a2a, 0xffd23f, 0xfff1a0],
  water: [0x2f9bff, 0x5cc0f5, 0xa8e1ff, 0xffffff],
  leaf: [0x3fae3c, 0x6fd04f, 0xa6e57c, 0xd8ff9a],
  elec: [0xffe14a, 0xfff6a8, 0xffffff, 0x7fe9ff],
  rock: [0x8a7a62, 0xb08a5c, 0xd9cdb8, 0x6b5032],
  neutral: [0xffffff, 0xe4e8f0, 0xbfd0ff],
  heal: [0x7dff9a, 0xffffff, 0xbfffd0],
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function tw(scene, cfg) {
  return new Promise((resolve) => scene.tweens.add({ ...cfg, onComplete: () => { cfg.onComplete?.(); resolve(); } }));
}

// Pontos: { x, y, h } (h = altura visual do alvo, para mirar no "peito")
const mid = (p) => ({ x: p.x, y: p.y - p.h * 0.45 });
const DEPTH = 9e5;

function burst(scene, x, y, { tex = 'p_soft', tint = C.neutral, count = 14, speed = [80, 260], scale = [0.5, 0], life = 600, gravity = 0, angle, blend = 'ADD', rotate } = {}) {
  const em = scene.add.particles(x, y, tex, {
    speed: { min: speed[0], max: speed[1] }, lifespan: life, scale: { start: scale[0], end: scale[1] }, alpha: { start: 1, end: 0 },
    tint, gravityY: gravity, emitting: false, blendMode: blend, angle: angle || { min: 0, max: 360 }, rotate: rotate || 0,
  }).setDepth(DEPTH);
  em.explode(count);
  scene.time.delayedCall(life + 100, () => em.destroy());
  return em;
}

function ring(scene, x, y, { tint = 0xffffff, from = 0.1, to = 1.2, dur = 450, alpha = 0.9, sy = 0.45 } = {}) {
  const r = scene.add.image(x, y, 'p_ring').setTint(tint).setScale(from, from * sy).setAlpha(alpha).setDepth(DEPTH).setBlendMode('ADD');
  return tw(scene, { targets: r, scaleX: to, scaleY: to * sy, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}

function glowAt(scene, x, y, tint, scale = 2, dur = 400) {
  const g = scene.add.image(x, y, 'p_soft').setTint(tint).setScale(0.2).setAlpha(0.9).setDepth(DEPTH - 1).setBlendMode('ADD');
  return tw(scene, { targets: g, scale, alpha: 0, duration: dur, onComplete: () => g.destroy() });
}

async function prepare(scene, from, tint) {
  glowAt(scene, from.x, from.y - from.h * 0.4, tint, 2.2, 500);
  if (from.view) {
    const s = from.view.sprite;
    const y0 = from.view.extraScale;
    from.view.extraScale = y0 * 1.08;
    await wait(160);
    from.view.extraScale = y0;
  } else await wait(160);
}

async function projectile(scene, from, to, { tex = 'p_soft', tint = 0xffffff, scale = 0.8, dur = 420, arc = 0, spin = 0, trail = null, blend = 'ADD' } = {}) {
  const a = mid(from); const b = mid(to);
  const img = scene.add.image(a.x, a.y, tex).setTint(tint).setScale(scale).setDepth(DEPTH).setBlendMode(blend);
  let em = null;
  if (trail) {
    em = scene.add.particles(0, 0, trail.tex || 'p_soft', { speed: 20, lifespan: trail.life || 300, scale: { start: trail.scale || 0.4, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: trail.tint, frequency: 16, blendMode: 'ADD' }).setDepth(DEPTH - 1);
    em.startFollow(img);
  }
  const o = { t: 0 };
  await tw(scene, {
    targets: o, t: 1, duration: dur, ease: 'Sine.in',
    onUpdate: () => {
      img.x = a.x + (b.x - a.x) * o.t;
      img.y = a.y + (b.y - a.y) * o.t - Math.sin(o.t * Math.PI) * arc;
      if (spin) img.rotation += spin;
    },
  });
  img.destroy();
  if (em) { em.stop(); scene.time.delayedCall(400, () => em.destroy()); }
  return b;
}

function lightningPath(scene, x0, y0, x1, y1, color, width = 5, segs = 9, jitter = 22) {
  const g = scene.add.graphics().setDepth(DEPTH).setBlendMode('ADD');
  const pts = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * jitter * 2, y0 + (y1 - y0) * t + (Math.random() - 0.5) * jitter]);
  }
  pts.push([x1, y1]);
  for (const [w, c, a] of [[width * 3, color, 0.35], [width, color, 1], [width * 0.4, 0xffffff, 1]]) {
    g.lineStyle(w, c, a);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.strokePath();
  }
  return g;
}

function shake(scene, intensity = 0.006, dur = 250) { scene.cameras.main.shake(dur, intensity); }

async function lunge(scene, from, to, dist = 0.45) {
  if (!from.view) return;
  const v = from.view; const x0 = v.x; const y0 = v.y;
  await tw(scene, { targets: v, x: x0 + (to.x - x0) * dist, y: y0 + (to.y - y0) * dist, duration: 140, ease: 'Quad.in' });
  tw(scene, { targets: v, x: x0, y: y0, duration: 220, ease: 'Quad.out' });
}

// ---------------- Animações dos ataques ----------------
const ANIMS = {
  async tackle(s, f, t) { await prepare(s, f, 0xffffff); await lunge(s, f, t, 0.7); const b = mid(t); burst(s, b.x, b.y, { tex: 'p_star', tint: C.neutral, count: 10, scale: [0.6, 0] }); ring(s, b.x, b.y, { sy: 1, to: 0.8 }); sfx.play('hit'); },
  async roar(s, f) { sfx.play('statdown'); for (let i = 0; i < 3; i++) { ring(s, mid(f).x, mid(f).y, { tint: 0xffe0a0, to: 2.2, sy: 1, dur: 600 }); await wait(160); } },
  async shield(s, f) {
    sfx.play('stat'); const b = mid(f);
    const r = s.add.image(b.x, b.y, 'p_ring').setTint(0x7fe9ff).setScale(0.1).setAlpha(0.95).setDepth(DEPTH).setBlendMode('ADD');
    await tw(s, { targets: r, scale: 1.1, duration: 300, ease: 'Back.out' });
    burst(s, b.x, b.y, { tex: 'p_spark', tint: [0x7fe9ff, 0xffffff], count: 12, speed: [40, 120], scale: [0.5, 0] });
    await tw(s, { targets: r, alpha: 0, duration: 400, onComplete: () => r.destroy() });
  },
  async heal(s, f) {
    sfx.play('heal'); const b = mid(f);
    glowAt(s, b.x, b.y, 0x7dff9a, 3, 800);
    for (let i = 0; i < 3; i++) { burst(s, b.x, f.y, { tex: 'p_spark', tint: C.heal, count: 8, speed: [40, 110], angle: { min: 240, max: 300 }, scale: [0.5, 0], life: 900, gravity: -60 }); await wait(180); }
  },
  async ember(s, f, t) {
    await prepare(s, f, 0xff8a2a); sfx.play('fire');
    for (let i = 0; i < 4; i++) { projectile(s, f, { x: t.x + (Math.random() - 0.5) * 30, y: t.y, h: t.h }, { tex: 'p_flame', tint: C.fire[1], scale: 0.7, dur: 300, trail: { tint: C.fire, scale: 0.35 } }); await wait(90); }
    await wait(250); const b = mid(t); burst(s, b.x, b.y, { tex: 'p_flame', tint: C.fire, count: 16, scale: [0.6, 0] }); sfx.play('hit');
  },
  async fireball(s, f, t) {
    await prepare(s, f, 0xff6a2a); sfx.play('fire');
    await projectile(s, f, t, { tex: 'p_soft', tint: 0xff7a2a, scale: 1.3, dur: 480, arc: 40, trail: { tint: C.fire, scale: 0.7, life: 350 } });
    const b = mid(t);
    burst(s, b.x, b.y, { tex: 'p_flame', tint: C.fire, count: 26, speed: [100, 320], scale: [0.9, 0] });
    burst(s, b.x, b.y, { tex: 'p_spark', tint: [0xffd23f, 0xffffff], count: 14, speed: [150, 380], scale: [0.5, 0] });
    ring(s, b.x, t.y, { tint: 0xff8a2a, to: 1.6 }); glowAt(s, b.x, b.y, 0xff6a2a, 3.5, 450);
    shake(s, 0.008, 260); sfx.play('superhit');
  },
  async flamePillar(s, f, t) {
    await prepare(s, f, 0xff4f1f); sfx.play('fire');
    ring(s, t.x, t.y, { tint: 0xff4f1f, to: 1.4, dur: 700 });
    const em = s.add.particles(t.x, t.y, 'p_flame', { x: { min: -28, max: 28 }, speedY: { min: -420, max: -250 }, speedX: { min: -30, max: 30 }, lifespan: 600, scale: { start: 1.1, end: 0.1 }, alpha: { start: 1, end: 0 }, tint: C.fire, frequency: 12, blendMode: 'ADD' }).setDepth(DEPTH);
    shake(s, 0.005, 700); await wait(700); em.stop(); s.time.delayedCall(700, () => em.destroy()); sfx.play('superhit');
  },
  async eruption(s, f, t) {
    await prepare(s, f, 0xff3a1a); sfx.play('fire');
    s.cameras.main.flash(250, 255, 120, 40);
    for (let i = 0; i < 6; i++) {
      const sx = t.x + (Math.random() - 0.5) * 160;
      projectile(s, { x: sx, y: t.y - 420, h: 0 }, { x: t.x + (Math.random() - 0.5) * 50, y: t.y, h: t.h * 0.5 }, { tex: 'p_soft', tint: 0xff5a1f, scale: 0.9, dur: 380, trail: { tint: C.fire, scale: 0.5 } });
      await wait(90);
    }
    await wait(330); const b = mid(t);
    burst(s, b.x, b.y, { tex: 'p_flame', tint: C.fire, count: 40, speed: [150, 450], scale: [1.1, 0], life: 800 });
    ring(s, t.x, t.y, { tint: 0xff4f1f, to: 2.4, dur: 600 }); shake(s, 0.016, 500); sfx.play('superhit');
  },
  async waterJet(s, f, t) {
    await prepare(s, f, 0x5cc0f5); sfx.play('water');
    const a = mid(f); const b = mid(t);
    const ang = Phaser.Math.RadToDeg(Math.atan2(b.y - a.y, b.x - a.x));
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const em = s.add.particles(a.x, a.y, 'p_drop', { speed: { min: dist * 1.6, max: dist * 1.9 }, angle: { min: ang - 4, max: ang + 4 }, lifespan: 520, scale: { start: 0.9, end: 0.5 }, tint: C.water, frequency: 10, rotate: ang + 90, alpha: { start: 1, end: 0.6 } }).setDepth(DEPTH);
    await wait(600); em.stop(); s.time.delayedCall(600, () => em.destroy());
    burst(s, b.x, b.y, { tex: 'p_drop', tint: C.water, count: 18, speed: [80, 260], scale: [0.8, 0.2], gravity: 500, blend: 'NORMAL' }); sfx.play('hit');
  },
  async bubbles(s, f, t) {
    await prepare(s, f, 0xa8e1ff); sfx.play('water');
    for (let i = 0; i < 7; i++) {
      projectile(s, f, { x: t.x + (Math.random() - 0.5) * 50, y: t.y + (Math.random() - 0.5) * 20, h: t.h }, { tex: 'p_bubble', tint: 0xffffff, scale: 0.6 + Math.random() * 0.5, dur: 520 + Math.random() * 200, arc: (Math.random() - 0.3) * 60, blend: 'NORMAL' });
      await wait(70);
    }
    await wait(550); const b = mid(t); burst(s, b.x, b.y, { tex: 'p_bubble', tint: 0xffffff, count: 12, speed: [60, 180], scale: [0.5, 0], blend: 'NORMAL' }); sfx.play('hit');
  },
  async wave(s, f, t) {
    await prepare(s, f, 0x2f9bff); sfx.play('water');
    const dir = Math.sign(t.x - f.x) || 1;
    const wv = s.add.particles(f.x, f.y - 20, 'p_soft', { speedX: { min: 380 * dir, max: 460 * dir }, speedY: { min: -40, max: 20 }, y: { min: -40, max: 30 }, lifespan: Math.abs(t.x - f.x) / 420 * 1000 + 150, scale: { start: 1, end: 0.6 }, alpha: { start: 0.9, end: 0.3 }, tint: C.water, frequency: 8, blendMode: 'ADD' }).setDepth(DEPTH);
    await wait(500); wv.stop(); s.time.delayedCall(800, () => wv.destroy());
    const b = mid(t); burst(s, b.x, b.y, { tex: 'p_drop', tint: C.water, count: 30, speed: [120, 340], scale: [0.9, 0.2], gravity: 600, blend: 'NORMAL' });
    shake(s, 0.007, 300); sfx.play('superhit');
  },
  async whirlpool(s, f, t) {
    await prepare(s, f, 0x2f9bff); sfx.play('water');
    const drops = [];
    for (let i = 0; i < 18; i++) drops.push(s.add.image(t.x, t.y, i % 3 ? 'p_drop' : 'p_bubble').setTint(C.water[i % 4]).setDepth(DEPTH).setScale(0.7));
    const o = { a: 0, r: 70 };
    await tw(s, { targets: o, a: Math.PI * 6, r: 18, duration: 1000, ease: 'Sine.in', onUpdate: () => drops.forEach((d, i) => { const ang = o.a + (i / drops.length) * Math.PI * 2; d.x = t.x + Math.cos(ang) * o.r; d.y = t.y - t.h * 0.35 + Math.sin(ang) * o.r * 0.5 - (i % 6) * 8; d.rotation = ang; }) });
    drops.forEach((d) => d.destroy());
    const b = mid(t); burst(s, b.x, b.y, { tex: 'p_drop', tint: C.water, count: 24, speed: [100, 300], gravity: 500, blend: 'NORMAL' }); shake(s, 0.008, 300); sfx.play('superhit');
  },
  async leafBlade(s, f, t) {
    await prepare(s, f, 0x6fd04f); sfx.play('leaf');
    for (let i = 0; i < 5; i++) { projectile(s, f, { x: t.x, y: t.y + (Math.random() - 0.5) * 30, h: t.h }, { tex: 'p_leaf', tint: C.leaf[i % 4], scale: 1.4, dur: 420, arc: (i - 2) * 30, spin: 0.4, blend: 'NORMAL' }); await wait(80); }
    await wait(380); const b = mid(t); burst(s, b.x, b.y, { tex: 'p_leaf', tint: C.leaf, count: 12, scale: [1, 0.3], blend: 'NORMAL', rotate: { min: 0, max: 360 } }); sfx.play('hit');
  },
  async vineWhip(s, f, t) {
    await prepare(s, f, 0x3fae3c); sfx.play('leaf');
    const a = mid(f); const b = mid(t);
    const g = s.add.graphics().setDepth(DEPTH);
    const o = { k: 0 };
    const draw = (bend) => {
      g.clear();
      for (const [w, c] of [[11, 0x1f5e1c], [7, 0x4fae3e]]) {
        g.lineStyle(w, c, 1);
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2((a.x + b.x) / 2, Math.min(a.y, b.y) - 90 * bend), new Phaser.Math.Vector2(a.x + (b.x - a.x) * o.k, a.y + (b.y - a.y) * o.k));
        curve.draw(g, 24);
      }
    };
    await tw(s, { targets: o, k: 1, duration: 260, onUpdate: () => draw(1) });
    for (let i = 0; i < 2; i++) { burst(s, b.x, b.y, { tex: 'p_leaf', tint: C.leaf, count: 8, blend: 'NORMAL' }); sfx.play('hit'); draw(-0.6); await wait(110); draw(1); await wait(110); }
    await tw(s, { targets: o, k: 0, duration: 200, onUpdate: () => draw(1) });
    g.destroy();
  },
  async roots(s, f, t) {
    await prepare(s, f, 0x3fae3c); sfx.play('rock');
    for (let i = 0; i < 6; i++) {
      const th = s.add.image(t.x + (i - 2.5) * 16, t.y + 6, 'p_thorn').setTint(i % 2 ? 0x6b4a2a : 0x3fae3c).setOrigin(0.5, 1).setScale(1.2, 0).setDepth(DEPTH);
      tw(s, { targets: th, scaleY: 1.3 + Math.random(), duration: 180, yoyo: true, hold: 300, delay: i * 40, onComplete: () => th.destroy() });
    }
    shake(s, 0.004, 300); await wait(450); sfx.play('hit');
    for (let i = 0; i < 6; i++) { projectile(s, t, f, { tex: 'p_soft', tint: 0x7dff9a, scale: 0.4, dur: 500, arc: 40 + i * 10 }); await wait(50); }
    await wait(450);
  },
  async thorns(s, f, t) {
    await prepare(s, f, 0x3fae3c); sfx.play('leaf');
    for (let i = 0; i < 12; i++) {
      const x = t.x + (Math.random() - 0.5) * 90;
      const th = s.add.image(x, t.y - 360, 'p_thorn').setTint(C.leaf[i % 4]).setScale(1, 1.2).setAngle(180).setDepth(DEPTH);
      tw(s, { targets: th, y: t.y - Math.random() * t.h * 0.6, duration: 300, delay: i * 40, ease: 'Quad.in', onComplete: () => { burst(s, th.x, th.y, { tex: 'p_leaf', tint: C.leaf, count: 3, blend: 'NORMAL' }); th.destroy(); } });
    }
    await wait(800); shake(s, 0.008, 300); sfx.play('superhit');
  },
  async spark(s, f, t) {
    await prepare(s, f, 0xffe14a); sfx.play('zap');
    const a = mid(f); const b = mid(t);
    for (let i = 0; i < 2; i++) { const g = lightningPath(s, a.x, a.y, b.x, b.y, 0xffe14a, 4); await wait(70); g.destroy(); await wait(30); }
    burst(s, b.x, b.y, { tex: 'p_spark', tint: C.elec, count: 16, speed: [100, 300], scale: [0.6, 0] }); sfx.play('hit');
  },
  async electroBall(s, f, t) {
    await prepare(s, f, 0xffe14a); sfx.play('zap');
    await projectile(s, f, t, { tex: 'p_soft', tint: 0xffe14a, scale: 1.2, dur: 520, arc: 20, trail: { tex: 'p_spark', tint: C.elec, scale: 0.5, life: 260 } });
    const b = mid(t);
    for (let i = 0; i < 4; i++) { const ang = Math.random() * Math.PI * 2; const g = lightningPath(s, b.x, b.y, b.x + Math.cos(ang) * 80, b.y + Math.sin(ang) * 60, 0xfff6a8, 3, 5, 12); s.time.delayedCall(120, () => g.destroy()); }
    burst(s, b.x, b.y, { tex: 'p_spark', tint: C.elec, count: 24, speed: [150, 380], scale: [0.7, 0] }); glowAt(s, b.x, b.y, 0xffe14a, 3, 400);
    shake(s, 0.007, 250); sfx.play('superhit');
  },
  async flash(s, f) { await prepare(s, f, 0xffffff); sfx.play('zap'); s.cameras.main.flash(350, 255, 255, 220); const b = mid(f); burst(s, b.x, b.y, { tex: 'p_star', tint: C.elec, count: 18, speed: [120, 380], scale: [0.7, 0] }); await wait(350); },
  async thunderbolt(s, f, t) {
    await prepare(s, f, 0xffe14a); sfx.play('zap');
    const b = mid(t);
    for (let i = 0; i < 3; i++) {
      const g = lightningPath(s, t.x + (Math.random() - 0.5) * 60, t.y - 520, b.x, b.y, 0xfff16a, 7, 12, 34);
      s.cameras.main.flash(80, 255, 255, 200);
      await wait(90); g.destroy(); await wait(50);
    }
    burst(s, b.x, b.y, { tex: 'p_spark', tint: C.elec, count: 30, speed: [150, 420], scale: [0.8, 0] }); ring(s, t.x, t.y, { tint: 0xffe14a, to: 2 });
    shake(s, 0.012, 350); sfx.play('superhit');
  },
  async rockThrow(s, f, t) {
    await prepare(s, f, 0xb08a5c); sfx.play('throw');
    await projectile(s, f, t, { tex: 'p_rock', tint: 0xb08a5c, scale: 2.2, dur: 480, arc: 90, spin: 0.25, blend: 'NORMAL' });
    const b = mid(t); burst(s, b.x, b.y, { tex: 'p_rock', tint: C.rock, count: 16, speed: [100, 300], gravity: 700, scale: [1, 0.6], blend: 'NORMAL', rotate: { min: 0, max: 360 } });
    shake(s, 0.008, 250); sfx.play('rock');
  },
  async shards(s, f, t) {
    await prepare(s, f, 0xb08a5c); sfx.play('rock');
    for (let i = 0; i < 7; i++) { projectile(s, f, { x: t.x + (Math.random() - 0.5) * 40, y: t.y + (Math.random() - 0.5) * 20, h: t.h }, { tex: 'p_rock', tint: C.rock[i % 4], scale: 1, dur: 280, arc: (i - 3) * 12, spin: 0.5, blend: 'NORMAL' }); await wait(55); }
    await wait(300); const b = mid(t); burst(s, b.x, b.y, { tex: 'p_rock', tint: C.rock, count: 14, gravity: 600, blend: 'NORMAL' }); sfx.play('hit');
  },
  async quake(s, f, t) {
    await prepare(s, f, 0x8a7a62); sfx.play('rock');
    shake(s, 0.018, 700);
    for (let i = 0; i < 3; i++) { ring(s, t.x, t.y, { tint: 0xb08a5c, to: 1.6 + i * 0.4, dur: 500, alpha: 0.8 }); burst(s, t.x, t.y, { tex: 'p_rock', tint: C.rock, count: 8, angle: { min: 200, max: 340 }, gravity: 700, speed: [120, 260], blend: 'NORMAL' }); await wait(200); }
    await wait(200); sfx.play('superhit');
  },
  async shockwave(s, f, t) {
    await prepare(s, f, 0x8a7a62); sfx.play('rock');
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const x = f.x + ((t.x - f.x) * i) / steps; const y = f.y + ((t.y - f.y) * i) / steps;
      ring(s, x, y, { tint: 0xd9cdb8, to: 0.7 + i * 0.1, dur: 350 });
      burst(s, x, y, { tex: 'p_rock', tint: C.rock, count: 5, angle: { min: 220, max: 320 }, gravity: 800, speed: [100, 220], blend: 'NORMAL' });
      await wait(70);
    }
    shake(s, 0.014, 400); const b = mid(t); glowAt(s, b.x, b.y, 0xffe0a0, 3, 400); sfx.play('superhit');
  },
};

const ELEMENT_DEFAULT = { fogo: 'fireball', agua: 'waterJet', planta: 'leafBlade', eletrico: 'spark', pedra: 'rockThrow', neutro: 'tackle' };

export async function playMoveAnim(scene, moveId, from, to) {
  const mv = getMove(moveId);
  const fn = ANIMS[mv.anim] || ANIMS[ELEMENT_DEFAULT[mv.element]] || ANIMS.tackle;
  try { await fn(scene, from, to || from); } catch (e) { console.warn('efeito falhou', e); }
}

// ---------------- Reações e utilidades de batalha ----------------
export async function hitReaction(scene, target, { big = false } = {}) {
  const sp = target.view ? target.view.sprite : target.sprite;
  if (!sp) return;
  sp.setTintFill(0xffffff);
  const holder = target.view || target;
  const x0 = holder.x;
  const dir = Math.random() < 0.5 ? -1 : 1;
  await tw(scene, { targets: holder, x: x0 + dir * (big ? 14 : 8), duration: 50, yoyo: true, repeat: 2 });
  holder.x = x0;
  sp.clearTint();
  if (big) { sp.setTint(0xff9a9a); await wait(90); sp.clearTint(); }
}

export function floatText(scene, x, y, text, color = '#ffffff', size = 34) {
  const t = scene.add.text(x, y, text, { fontFamily: 'Nunito, sans-serif', fontSize: `${size}px`, fontStyle: '900', color, stroke: '#1a1a2e', strokeThickness: 7 }).setOrigin(0.5).setDepth(DEPTH + 10).setResolution(2).setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.out' });
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
}

export async function statFx(scene, target, up) {
  const b = mid(target);
  sfx.play(up ? 'stat' : 'statdown');
  burst(scene, b.x, up ? target.y : b.y - 30, { tex: 'p_spark', tint: up ? [0x7fe9ff, 0xffffff] : [0xff7a7a, 0xffb0b0], count: 12, speed: [60, 160], angle: up ? { min: 250, max: 290 } : { min: 70, max: 110 }, scale: [0.5, 0], gravity: up ? -120 : 120 });
  await wait(450);
}

export async function healFx(scene, target) {
  await ANIMS.heal(scene, target, target);
}

export async function burnFx(scene, target) {
  const b = mid(target);
  burst(scene, b.x, b.y, { tex: 'p_flame', tint: C.fire, count: 10, speed: [40, 120], angle: { min: 250, max: 290 }, gravity: -200 });
  sfx.play('fire');
  await wait(400);
}

export { burst, ring, glowAt, projectile, tw, shake };
