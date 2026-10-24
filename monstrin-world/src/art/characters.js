// Gerador de arte ORIGINAL dos personagens (jogador e NPCs).
// Cada personagem tem 4 direções x 4 quadros de caminhada.
// A aparência é definida por um "look" — preparado para personalização futura
// (cabelo, roupas, acessórios e cores).
import { shade, ellipse, roundRect, fillStroke, volumeFill, rgba } from './draw.js';

export const CHAR_W = 128;
export const CHAR_H = 192;
export const DIRS = ['down', 'left', 'right', 'up'];

export const PLAYER_LOOKS = [
  { name: 'Teo', skin: '#f1c7a0', hair: '#3b2a20', hairStyle: 'short', hat: '#e84a3c', top: '#2f7de1', topStyle: 'jacket', pants: '#2b3148', shoes: '#f5f5f5', accent: '#ffd23f' },
  { name: 'Lia', skin: '#f6d3b3', hair: '#e2672a', hairStyle: 'ponytail', hat: null, top: '#ff6f9f', topStyle: 'shirt', pants: '#3a3f6b', shoes: '#ffffff', accent: '#ffe36b' },
  { name: 'Davi', skin: '#8d5a3b', hair: '#1d1513', hairStyle: 'curly', hat: null, top: '#2fb37e', topStyle: 'vest', pants: '#4a3a2a', shoes: '#ff7a3c', accent: '#ffe36b' },
  { name: 'Maya', skin: '#c98e64', hair: '#2a1d3d', hairStyle: 'long', hat: '#8a5cf0', top: '#8a5cf0', topStyle: 'jacket', pants: '#2b3148', shoes: '#ffd23f', accent: '#7fe9ff' },
];

export const NPC_LOOKS = {
  professora: { skin: '#f3cfb1', hair: '#9b7fe0', hairStyle: 'bun', hat: null, top: '#ffffff', topStyle: 'coat', inner: '#5aa8ff', pants: '#3d3f5c', shoes: '#6b4a3a', glasses: true },
  enfermeira: { skin: '#f6d3b3', hair: '#ff8db8', hairStyle: 'long', hat: '#ffffff', hatStyle: 'nurse', top: '#ffb3cf', topStyle: 'dress', pants: '#ffb3cf', shoes: '#ffffff' },
  vigia: { skin: '#b9825c', hair: '#3a2a1e', hairStyle: 'short', hat: '#3f7a46', top: '#4f8f56', topStyle: 'vest', pants: '#3a4a3a', shoes: '#3a2a1e', accent: '#ffd23f' },
  flora: { skin: '#f1c7a0', hair: '#d9d9e0', hairStyle: 'bun', hat: null, top: '#d97a5a', topStyle: 'apron', inner: '#fff1d6', pants: '#7a5a8a', shoes: '#5a3a2a' },
  caio: { skin: '#e8b48c', hair: '#5a3015', hairStyle: 'short', hat: '#2f5fe1', top: '#ff8a2a', topStyle: 'jacket', pants: '#2b3148', shoes: '#ffffff', accent: '#2f5fe1' },
  duda: { skin: '#f0c4a0', hair: '#e2563a', hairStyle: 'long', hat: '#7a4bd6', top: '#7a4bd6', topStyle: 'jacket', pants: '#2b3148', shoes: '#ffffff', accent: '#ffd23f' },
  nina: { skin: '#a8714c', hair: '#2a1a12', hairStyle: 'curly', hat: null, top: '#ffd23f', topStyle: 'dress', pants: '#ffd23f', shoes: '#ff6f9f' },
  tobias: { skin: '#e8c09c', hair: '#8a8a8a', hairStyle: 'short', hat: '#c9a25a', hatStyle: 'straw', top: '#6aa5d8', topStyle: 'shirt', pants: '#5a4632', shoes: '#3a2a1e' },
  lojista: { skin: '#d9a07a', hair: '#3a2a1e', hairStyle: 'short', hat: null, top: '#2fb3a0', topStyle: 'apron', inner: '#ffffff', pants: '#3a3a4a', shoes: '#3a2a1e' },
};

function legs(ctx, look, dir, frame) {
  const ol = '#2a2233';
  const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const by = 150;
  if (dir === 'down' || dir === 'up') {
    for (const s of [-1, 1]) {
      const lift = swing * s * (dir === 'down' ? 1 : -1);
      const y = by + (lift > 0 ? -6 : 0);
      roundRect(ctx, 64 + s * 13 - 10, y - 4, 20, 34 + (lift > 0 ? 0 : 2), 8);
      fillStroke(ctx, look.pants, ol, 4);
      ellipse(ctx, 64 + s * 13, y + 31, 13, 8);
      fillStroke(ctx, look.shoes, ol, 4);
    }
  } else {
    const s = dir === 'right' ? 1 : -1;
    for (const k of [-1, 1]) {
      const off = swing * k * 10;
      ctx.save();
      ctx.translate(64 + off * s, by);
      roundRect(ctx, -10, -4, 20, 34, 8);
      fillStroke(ctx, k > 0 ? look.pants : shade(look.pants, -0.2), ol, 4);
      ellipse(ctx, 4 * s, 31, 15, 8);
      fillStroke(ctx, k > 0 ? look.shoes : shade(look.shoes, -0.15), ol, 4);
      ctx.restore();
    }
  }
}

function torso(ctx, look, dir, frame) {
  const ol = '#2a2233';
  const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const isSide = dir === 'left' || dir === 'right';
  const s = dir === 'left' ? -1 : 1;
  // braço de trás (perfil)
  const armColor = look.topStyle === 'vest' || look.topStyle === 'apron' ? look.skin : look.top;
  if (isSide) {
    ctx.save(); ctx.translate(64 - s * 4, 112); ctx.rotate(-swing * 0.5 * s);
    roundRect(ctx, -8, 0, 16, 36, 8); fillStroke(ctx, shade(armColor, -0.2), ol, 4);
    ellipse(ctx, 0, 38, 8, 8); fillStroke(ctx, shade(look.skin, -0.1), ol, 3);
    ctx.restore();
  }
  // tronco
  const w = isSide ? 40 : 52;
  const top = 104;
  const h = look.topStyle === 'coat' || look.topStyle === 'dress' ? 58 : 50;
  ctx.beginPath();
  roundRect(ctx, 64 - w / 2, top, w, h, 14);
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, shade(look.top, 0.15)); g.addColorStop(1, shade(look.top, -0.15));
  fillStroke(ctx, g, ol, 4);
  if (look.topStyle === 'dress') {
    ctx.beginPath(); ctx.moveTo(64 - w / 2 - 6, top + h); ctx.lineTo(64 - w / 2 + 2, top + 24); ctx.lineTo(64 + w / 2 - 2, top + 24); ctx.lineTo(64 + w / 2 + 6, top + h); ctx.closePath();
    fillStroke(ctx, shade(look.top, -0.05), ol, 4);
  }
  if (!isSide && dir === 'down') {
    if (look.topStyle === 'jacket') {
      ctx.fillStyle = rgba('#ffffff', 0.85); roundRect(ctx, 60, top + 4, 8, h - 8, 3); ctx.fill();
      ctx.fillStyle = look.accent || '#ffd23f'; roundRect(ctx, 64 - w / 2 + 3, top + 30, w - 6, 6, 3); ctx.fill();
    } else if (look.topStyle === 'coat') {
      ctx.fillStyle = look.inner || '#5aa8ff'; ctx.beginPath(); ctx.moveTo(56, top + 2); ctx.lineTo(64, top + 30); ctx.lineTo(72, top + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#000000', 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(64, top + 30); ctx.lineTo(64, top + h - 4); ctx.stroke();
    } else if (look.topStyle === 'vest') {
      ctx.fillStyle = rgba('#ffffff', 0.8); ctx.beginPath(); ctx.moveTo(58, top + 2); ctx.lineTo(64, top + 18); ctx.lineTo(70, top + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = look.accent || '#ffd23f'; ellipse(ctx, 76, top + 22, 5, 5); ctx.fill();
    } else if (look.topStyle === 'apron') {
      ctx.fillStyle = look.inner || '#fff1d6'; roundRect(ctx, 50, top + 12, 28, h - 12, 6); ctx.fill();
      ctx.strokeStyle = rgba('#000', 0.2); ctx.lineWidth = 2; ctx.stroke();
    } else if (look.topStyle === 'shirt') {
      ctx.fillStyle = rgba('#ffffff', 0.7); ellipse(ctx, 64, top + 26, 9, 9); ctx.fill();
      ctx.fillStyle = look.accent || '#ffe36b'; ellipse(ctx, 64, top + 26, 5, 5); ctx.fill();
    }
  }
  if (dir === 'up') {
    ctx.fillStyle = rgba('#000000', 0.08); roundRect(ctx, 64 - w / 2 + 4, top + 6, w - 8, h - 12, 10); ctx.fill();
    if (look.backpack !== false) {
      roundRect(ctx, 46, top + 6, 36, 36, 10); fillStroke(ctx, volumeFill(ctx, 64, top + 20, 30, look.hat || '#c0573a'), ol, 4);
      ctx.fillStyle = rgba('#ffffff', 0.35); roundRect(ctx, 52, top + 26, 24, 8, 4); ctx.fill();
    }
  }
  // braços
  if (!isSide) {
    for (const k of [-1, 1]) {
      const a = swing * k * 0.35 * (dir === 'down' ? 1 : -1);
      ctx.save(); ctx.translate(64 + k * (w / 2 + 2), top + 8); ctx.rotate(a + k * 0.12);
      roundRect(ctx, -8, 0, 16, 34, 8); fillStroke(ctx, armColor, ol, 4);
      ellipse(ctx, 0, 37, 8, 8); fillStroke(ctx, look.skin, ol, 3);
      ctx.restore();
    }
  } else {
    ctx.save(); ctx.translate(64 + s * 4, 112); ctx.rotate(swing * 0.5 * s);
    roundRect(ctx, -8, 0, 16, 36, 8); fillStroke(ctx, armColor, ol, 4);
    ellipse(ctx, 0, 38, 8, 8); fillStroke(ctx, look.skin, ol, 3);
    ctx.restore();
  }
}

function hairBack(ctx, look, dir) {
  const ol = shade(look.hair, -0.55);
  const hs = look.hairStyle;
  if (hs === 'long') {
    roundRect(ctx, 26, 56, 76, 66, 26);
    fillStroke(ctx, volumeFill(ctx, 64, 80, 50, look.hair), ol, 4);
  }
  if (hs === 'ponytail') {
    const px = dir === 'left' ? 96 : dir === 'right' ? 32 : 64;
    const py = dir === 'up' ? 86 : 70;
    ellipse(ctx, px, py + 18, 14, 26, dir === 'left' ? -0.4 : dir === 'right' ? 0.4 : 0);
    fillStroke(ctx, volumeFill(ctx, px, py + 18, 26, look.hair), ol, 4);
  }
  if (hs === 'bun' && dir !== 'down') {
    ellipse(ctx, dir === 'left' ? 88 : dir === 'right' ? 40 : 64, 34, 18, 16);
    fillStroke(ctx, volumeFill(ctx, 64, 30, 18, look.hair), ol, 4);
  }
}

function head(ctx, look, dir) {
  const ol = '#2a2233';
  const hx = 64;
  const hy = 66;
  const hr = 40;
  hairBack(ctx, look, dir);
  ellipse(ctx, hx, hy, hr, hr * 0.95);
  fillStroke(ctx, volumeFill(ctx, hx, hy, hr, look.skin, { hi: 0.18, lo: 0.18 }), ol, 4);
  const hairOl = shade(look.hair, -0.55);
  const hs = look.hairStyle;
  ctx.save();
  // cabelo (topo)
  if (dir === 'up') {
    ellipse(ctx, hx, hy - 2, hr + 2, hr * 0.98);
    fillStroke(ctx, volumeFill(ctx, hx, hy - 10, hr, look.hair), hairOl, 4);
    if (hs === 'curly') for (const [x, y] of [[36, 50], [92, 50], [50, 32], [78, 32], [64, 74], [40, 76], [88, 76]]) { ellipse(ctx, x, y, 14, 14); fillStroke(ctx, volumeFill(ctx, x, y, 14, look.hair), hairOl, 3); }
    if (hs === 'bun') { ellipse(ctx, 64, 30, 18, 16); fillStroke(ctx, volumeFill(ctx, 64, 30, 18, look.hair), hairOl, 4); }
  } else {
    const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    ctx.beginPath();
    if (hs === 'curly') {
      for (const [x, y, r] of [[34, 56, 16], [94, 56, 16], [42, 36, 17], [86, 36, 17], [64, 28, 19], [52, 50, 12], [76, 50, 12]]) {
        ellipse(ctx, x - side * 6, y, r, r); fillStroke(ctx, volumeFill(ctx, x, y, r, look.hair), hairOl, 3);
      }
    } else {
      ctx.moveTo(hx - hr - 2, hy + 4);
      ctx.bezierCurveTo(hx - hr - 6, hy - hr - 18, hx + hr + 6, hy - hr - 18, hx + hr + 2, hy + 4);
      if (side === 0) {
        ctx.lineTo(hx + hr - 8, hy - 6);
        for (let i = 0; i < 5; i++) { const x = hx + hr - 8 - (i + 1) * ((2 * hr - 16) / 5); ctx.lineTo(x + 7, hy - 22 + (i % 2) * 6); ctx.lineTo(x, hy - 8); }
      } else {
        const front = hx + side * (hr - 4);
        ctx.lineTo(front, hy - 10);
        ctx.lineTo(hx + side * 4, hy - 22);
        ctx.lineTo(hx - side * (hr - 10), hy - 2);
        ctx.lineTo(hx - side * (hr + 2), hy + 14);
      }
      ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, hx, hy - 24, hr, look.hair), hairOl, 4);
      if (hs === 'bun') { ellipse(ctx, 64, 26, 18, 15); fillStroke(ctx, volumeFill(ctx, 64, 26, 18, look.hair), hairOl, 4); }
      if (hs === 'short' && side === 0) {
        ctx.beginPath(); ctx.moveTo(42, 40); ctx.lineTo(50, 22); ctx.lineTo(58, 38); ctx.lineTo(70, 18); ctx.lineTo(76, 38); ctx.lineTo(88, 26); ctx.lineTo(88, 44); ctx.closePath();
        fillStroke(ctx, volumeFill(ctx, 64, 30, 30, look.hair), hairOl, 3);
      }
    }
    // rosto
    const ex = side === 0 ? [hx - 14, hx + 14] : [hx + side * 16];
    for (const x of ex) {
      ellipse(ctx, x, hy + 8, 5.5, 8); ctx.fillStyle = '#231a2e'; ctx.fill();
      ellipse(ctx, x - 1.5, hy + 4, 2.2, 3); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (look.glasses) {
      ctx.strokeStyle = '#4a3a5a'; ctx.lineWidth = 3;
      for (const x of ex) { ellipse(ctx, x, hy + 8, 11, 10); ctx.stroke(); }
      if (side === 0) { ctx.beginPath(); ctx.moveTo(hx - 3, hy + 6); ctx.lineTo(hx + 3, hy + 6); ctx.stroke(); }
    }
    ctx.fillStyle = rgba('#ff7d8f', 0.35);
    for (const x of ex) { ellipse(ctx, x + (side === 0 ? (x < hx ? -8 : 8) : -side * 4), hy + 22, 7, 4); ctx.fill(); }
    ctx.beginPath();
    const mx = side === 0 ? hx : hx + side * 22;
    ctx.moveTo(mx - 5, hy + 24); ctx.quadraticCurveTo(mx, hy + 29, mx + 5, hy + 24);
    ctx.lineWidth = 3; ctx.strokeStyle = '#7a3a3a'; ctx.stroke();
  }
  // chapéu
  if (look.hat) {
    const hc = look.hat;
    const hol = shade(hc, -0.55);
    if (look.hatStyle === 'nurse') {
      roundRect(ctx, 44, 20, 40, 18, 6); fillStroke(ctx, '#ffffff', '#8a7a8a', 3);
      ctx.fillStyle = '#ff5a7a'; ctx.fillRect(61, 23, 6, 12); ctx.fillRect(58, 26, 12, 6);
    } else if (look.hatStyle === 'straw') {
      ellipse(ctx, 64, 38, 54, 14); fillStroke(ctx, hc, shade(hc, -0.5), 3);
      ellipse(ctx, 64, 28, 30, 18); fillStroke(ctx, volumeFill(ctx, 64, 24, 30, hc), shade(hc, -0.5), 3);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(36, 34, 56, 5);
    } else {
      ctx.beginPath(); ctx.moveTo(24, 50); ctx.bezierCurveTo(22, 4, 106, 4, 104, 50); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 64, 26, 40, hc), hol, 4);
      if (dir !== 'up') {
        const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        ellipse(ctx, 64 + side * 30, 50, side === 0 ? 44 : 30, 9); fillStroke(ctx, shade(hc, -0.15), hol, 4);
        ctx.fillStyle = '#ffffff'; ellipse(ctx, 64 + side * 8, 30, 9, 7); ctx.fill();
        ctx.fillStyle = look.accent || '#ffd23f'; ellipse(ctx, 64 + side * 8, 30, 5, 4); ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function drawCharacter(ctx, look, dir, frame) {
  ctx.save();
  const bob = frame === 1 || frame === 3 ? -3 : 0;
  ctx.translate(0, bob);
  if (dir === 'up') {
    legs(ctx, look, dir, frame);
    torso(ctx, look, dir, frame);
    head(ctx, look, dir);
  } else {
    legs(ctx, look, dir, frame);
    torso(ctx, look, dir, frame);
    head(ctx, look, dir);
  }
  ctx.restore();
}

// Folha de sprites: 4 colunas (quadros) x 4 linhas (direções)
export function drawCharacterSheet(canvas, look) {
  const ctx = canvas.getContext('2d');
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < 4; f++) {
      ctx.save();
      ctx.translate(f * CHAR_W, row * CHAR_H);
      if (dir === 'left') {
        // perfil esquerdo = perfil direito espelhado
        ctx.translate(CHAR_W, 0);
        ctx.scale(-1, 1);
        drawCharacter(ctx, look, 'right', f);
      } else {
        drawCharacter(ctx, look, dir, f);
      }
      ctx.restore();
    }
  });
}
