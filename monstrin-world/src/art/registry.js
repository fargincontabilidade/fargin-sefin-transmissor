// Gera todas as texturas do jogo no início e guarda imagens para a interface.
import { SPECIES } from '../data/species.js';
import { ITEMS } from '../data/items.js';
import { drawMonstrin, MON_CANVAS } from './creatures.js';
import { drawCharacterSheet, PLAYER_LOOKS, NPC_LOOKS, CHAR_W, CHAR_H, drawCharacter } from './characters.js';
import { OBJECTS } from './objects.js';
import { drawItemIcon, drawSeal } from './items.js';
import { makeCanvas, rgba, ellipse } from './draw.js';

const urlCache = new Map();

function cached(key, make) {
  if (!urlCache.has(key)) urlCache.set(key, make());
  return urlCache.get(key);
}

// Ilustrações do Duelo Elemental por espécie. Elas são carregadas na cena
// de carregamento (BootScene) e substituem o desenho gerado por código no
// mapa, na batalha e nos menus. Espécies sem ilustração usam o desenho gerado.
export const CUSTOM_ART = {
  brasito: 'img/ignix.webp', brasador: 'img/lobrasa.webp', vulcarion: 'img/dracoflama.webp',
  gotinho: 'img/axola.webp', marolho: 'img/tubaronda.webp', maremonte: 'img/leviamar.webp',
  brotim: 'img/folhebre.webp', ramalhao: 'img/cervifolha.webp', silvarok: 'img/bosquerex.webp',
};

// Desenha a ilustração no mesmo enquadramento do desenho gerado (256x256,
// pés da criatura perto de y=236, que é a origem usada pelos sprites).
function drawCustomArt(ctx, img) {
  const box = 240;
  ctx.drawImage(img, (MON_CANVAS - box) / 2, 238 - box, box, box);
}

export const art = {
  monUrl(speciesId) {
    if (CUSTOM_ART[speciesId]) return CUSTOM_ART[speciesId];
    return cached(`mon:${speciesId}`, () => {
      const c = makeCanvas(MON_CANVAS, MON_CANVAS);
      drawMonstrin(c.getContext('2d'), SPECIES[speciesId].art);
      return c.toDataURL();
    });
  },
  lookUrl(look) {
    const key = `look:${JSON.stringify(look)}`;
    return cached(key, () => {
      const c = makeCanvas(CHAR_W, CHAR_H);
      drawCharacter(c.getContext('2d'), look, 'down', 0);
      return c.toDataURL();
    });
  },
  itemUrl(itemId) {
    return cached(`item:${itemId}`, () => {
      const c = makeCanvas(64, 64);
      drawItemIcon(c.getContext('2d'), ITEMS[itemId]);
      return c.toDataURL();
    });
  },
};

export function lookFor(key) {
  if (typeof key === 'number') return PLAYER_LOOKS[key] || PLAYER_LOOKS[0];
  return NPC_LOOKS[key] || PLAYER_LOOKS[0];
}

function addCanvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), c);
  scene.textures.addCanvas(key, c);
}

function addSheet(scene, key, look) {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(CHAR_W * 4, CHAR_H * 4);
  drawCharacterSheet(c, look);
  const tex = scene.textures.addCanvas(key, c);
  for (let row = 0; row < 4; row++) for (let f = 0; f < 4; f++) tex.add(row * 4 + f, 0, f * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
}

export function generateTextures(scene) {
  // Monstrins (normal e piscando)
  for (const s of Object.values(SPECIES)) {
    const srcKey = `src_${s.id}`;
    if (CUSTOM_ART[s.id] && scene.textures.exists(srcKey)) {
      const img = scene.textures.get(srcKey).getSourceImage();
      addCanvasTexture(scene, `mon_${s.id}`, MON_CANVAS, MON_CANVAS, (ctx) => drawCustomArt(ctx, img));
      addCanvasTexture(scene, `mon_${s.id}_b`, MON_CANVAS, MON_CANVAS, (ctx) => drawCustomArt(ctx, img));
      continue;
    }
    delete CUSTOM_ART[s.id];
    addCanvasTexture(scene, `mon_${s.id}`, MON_CANVAS, MON_CANVAS, (ctx) => drawMonstrin(ctx, s.art));
    addCanvasTexture(scene, `mon_${s.id}_b`, MON_CANVAS, MON_CANVAS, (ctx) => drawMonstrin(ctx, s.art, { blink: true }));
  }
  // Personagens
  PLAYER_LOOKS.forEach((l, i) => addSheet(scene, `chr_p${i}`, l));
  for (const [k, l] of Object.entries(NPC_LOOKS)) addSheet(scene, `chr_${k}`, l);
  // Objetos
  for (const [k, o] of Object.entries(OBJECTS)) addCanvasTexture(scene, `obj_${k}`, Math.ceil(o.w), Math.ceil(o.h), (ctx) => o.draw(ctx));
  // Selos de captura
  for (const it of Object.values(ITEMS)) {
    if (it.category === 'captura') addCanvasTexture(scene, `seal_${it.id}`, 64, 64, (ctx) => drawSeal(ctx, 32, 32, 16, it.color));
  }
  // Partículas e efeitos
  addCanvasTexture(scene, 'shadow', 64, 24, (ctx) => { ellipse(ctx, 32, 12, 30, 10); ctx.fillStyle = 'rgba(20,30,10,0.32)'; ctx.fill(); });
  addCanvasTexture(scene, 'p_soft', 64, 64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });
  addCanvasTexture(scene, 'p_dot', 16, 16, (ctx) => { ellipse(ctx, 8, 8, 7, 7); ctx.fillStyle = '#fff'; ctx.fill(); });
  addCanvasTexture(scene, 'p_spark', 32, 32, (ctx) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(19, 13); ctx.lineTo(32, 16); ctx.lineTo(19, 19); ctx.lineTo(16, 32); ctx.lineTo(13, 19); ctx.lineTo(0, 16); ctx.lineTo(13, 13); ctx.closePath(); ctx.fill(); });
  addCanvasTexture(scene, 'p_leaf', 24, 16, (ctx) => { ctx.beginPath(); ctx.moveTo(1, 8); ctx.quadraticCurveTo(12, -2, 23, 8); ctx.quadraticCurveTo(12, 18, 1, 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(21, 8); ctx.stroke(); });
  addCanvasTexture(scene, 'p_drop', 16, 24, (ctx) => { ctx.beginPath(); ctx.moveTo(8, 0); ctx.quadraticCurveTo(16, 14, 8, 23); ctx.quadraticCurveTo(0, 14, 8, 0); ctx.fillStyle = '#fff'; ctx.fill(); });
  addCanvasTexture(scene, 'p_bubble', 32, 32, (ctx) => { ellipse(ctx, 16, 16, 13, 13); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke(); ellipse(ctx, 11, 10, 4, 3); ctx.fillStyle = '#fff'; ctx.fill(); });
  addCanvasTexture(scene, 'p_rock', 24, 24, (ctx) => { ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(7, 3); ctx.lineTo(18, 2); ctx.lineTo(23, 12); ctx.lineTo(16, 22); ctx.lineTo(5, 21); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke(); });
  addCanvasTexture(scene, 'p_flame', 32, 48, (ctx) => { const g = ctx.createRadialGradient(16, 32, 2, 16, 30, 22); g.addColorStop(0, '#fff'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, 0); ctx.quadraticCurveTo(32, 26, 16, 46); ctx.quadraticCurveTo(0, 26, 16, 0); ctx.fill(); });
  addCanvasTexture(scene, 'p_ring', 128, 128, (ctx) => { ellipse(ctx, 64, 64, 58, 58); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke(); });
  addCanvasTexture(scene, 'p_thorn', 16, 40, (ctx) => { ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, 40); ctx.lineTo(2, 40); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); });
  addCanvasTexture(scene, 'p_star', 32, 32, (ctx) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 15; const a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); });
  addCanvasTexture(scene, 'emote_alert', 48, 56, (ctx) => {
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(40, 4); ctx.quadraticCurveTo(46, 4, 46, 10); ctx.lineTo(46, 36); ctx.quadraticCurveTo(46, 42, 40, 42); ctx.lineTo(28, 42); ctx.lineTo(24, 52); ctx.lineTo(20, 42); ctx.lineTo(8, 42); ctx.quadraticCurveTo(2, 42, 2, 36); ctx.lineTo(2, 10); ctx.quadraticCurveTo(2, 4, 8, 4); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2a2233'; ctx.stroke();
    ctx.fillStyle = '#ff4a3c'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 24, 24);
  });
  addCanvasTexture(scene, 'vignette', 256, 256, (ctx) => { const g = ctx.createRadialGradient(128, 128, 60, 128, 128, 182); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,20,40,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); });
  addCanvasTexture(scene, 'battle_ring', 256, 96, (ctx) => { ellipse(ctx, 128, 48, 120, 40); ctx.fillStyle = rgba('#ffffff', 0.12); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.setLineDash([14, 10]); ctx.stroke(); });
  addCanvasTexture(scene, 'butterfly', 24, 20, (ctx) => { for (const s of [-1, 1]) { ellipse(ctx, 12 + s * 6, 8, 6, 7, s * 0.4); ctx.fillStyle = '#fff'; ctx.fill(); ellipse(ctx, 12 + s * 5, 15, 4, 4); ctx.fill(); } ctx.fillStyle = '#3a2a3a'; ctx.fillRect(11, 4, 2, 13); });
}
