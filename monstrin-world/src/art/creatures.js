// Gerador de arte ORIGINAL dos Monstrins.
// Cada espécie é desenhada a partir da descrição "art" em src/data/species.js
// (formato do corpo, cores e características). Quando as ilustrações do
// Duelo Elemental forem importadas, basta registrar a imagem da espécie e
// ela substitui o desenho gerado.
import { shade, ellipse, volumeFill, fillStroke, rgba, mix } from './draw.js';

export const MON_CANVAS = 256;

const LAYOUT = {
  blob: { head: [128, 150, 72], face: [128, 162], top: [128, 84], tail: [62, 182], back: [128, 110] },
  egg: { head: [128, 132, 62], face: [128, 146], top: [128, 70], tail: [72, 196], back: [128, 100] },
  quad: { head: [170, 114, 52], face: [174, 122], top: [168, 62], tail: [46, 166], back: [104, 128] },
  biped: { head: [128, 96, 52], face: [128, 104], top: [128, 44], tail: [74, 200], back: [128, 150] },
  frog: { head: [128, 168, 74], face: [128, 186], top: [128, 108], tail: [60, 200], back: [128, 140] },
  bird: { head: [128, 146, 66], face: [138, 150], top: [124, 80], tail: [58, 172], back: [118, 120] },
};

function outlineColor(art) {
  return shade(art.c, -0.55);
}

// ---------------- Corpos ----------------
function drawBody(ctx, art, L) {
  const c = art.c;
  const ol = outlineColor(art);
  const lw = 6;
  switch (art.body) {
    case 'blob': {
      // pezinhos
      for (const dx of [-38, 38]) { ellipse(ctx, 128 + dx, 222, 22, 13); fillStroke(ctx, shade(c, -0.12), ol, lw); }
      ellipse(ctx, 128, 152, 80, 74); fillStroke(ctx, volumeFill(ctx, 128, 152, 80, c), ol, lw);
      ellipse(ctx, 128, 182, 46, 34); ctx.fillStyle = rgba(art.b, 0.95); ctx.fill();
      break;
    }
    case 'egg': {
      for (const dx of [-30, 30]) { ellipse(ctx, 128 + dx, 226, 20, 12); fillStroke(ctx, shade(c, -0.15), ol, lw); }
      ellipse(ctx, 128, 150, 66, 80); fillStroke(ctx, volumeFill(ctx, 128, 150, 80, c), ol, lw);
      ellipse(ctx, 128, 184, 40, 36); ctx.fillStyle = rgba(art.b, 0.9); ctx.fill();
      break;
    }
    case 'quad': {
      const legC = shade(c, -0.12);
      // patas de trás (mais escuras)
      for (const x of [74, 136]) { ellipse(ctx, x, 214, 15, 22); fillStroke(ctx, shade(c, -0.25), ol, lw); }
      ellipse(ctx, 108, 172, 82, 50); fillStroke(ctx, volumeFill(ctx, 108, 172, 82, c), ol, lw);
      ellipse(ctx, 118, 192, 50, 22); ctx.fillStyle = rgba(art.b, 0.9); ctx.fill();
      for (const x of [92, 152]) { ellipse(ctx, x, 218, 16, 22); fillStroke(ctx, legC, ol, lw); ellipse(ctx, x, 234, 17, 8); ctx.fillStyle = shade(art.b, -0.05); ctx.fill(); }
      // cabeça
      const [hx, hy, hr] = L.head;
      ellipse(ctx, hx - 20, hy + 30, 30, 34); fillStroke(ctx, volumeFill(ctx, hx - 20, hy + 30, 34, c), ol, lw); // pescoço
      ellipse(ctx, hx, hy, hr * 1.05, hr * 0.95); fillStroke(ctx, volumeFill(ctx, hx, hy, hr, c), ol, lw);
      ellipse(ctx, hx + 18, hy + 26, hr * 0.5, hr * 0.32); ctx.fillStyle = rgba(art.b, 0.95); ctx.fill(); // focinho
      ellipse(ctx, hx + 38, hy + 18, 6, 4.5); ctx.fillStyle = shade(c, -0.6); ctx.fill(); // nariz
      break;
    }
    case 'biped': {
      for (const dx of [-30, 30]) { ellipse(ctx, 128 + dx, 222, 22, 16); fillStroke(ctx, shade(c, -0.15), ol, lw); }
      ellipse(ctx, 128, 170, 60, 58); fillStroke(ctx, volumeFill(ctx, 128, 170, 62, c), ol, lw);
      ellipse(ctx, 128, 182, 38, 38); ctx.fillStyle = rgba(art.b, 0.92); ctx.fill();
      // braços
      for (const s of [-1, 1]) { ellipse(ctx, 128 + s * 62, 168, 16, 26, s * -0.5); fillStroke(ctx, shade(c, -0.08), ol, lw); }
      const [hx, hy, hr] = L.head;
      ellipse(ctx, hx, hy, hr * 1.05, hr); fillStroke(ctx, volumeFill(ctx, hx, hy, hr, c), ol, lw);
      break;
    }
    case 'frog': {
      for (const s of [-1, 1]) { ellipse(ctx, 128 + s * 70, 214, 30, 16, s * 0.2); fillStroke(ctx, shade(c, -0.15), ol, lw); }
      // olhos saltados
      for (const s of [-1, 1]) { ellipse(ctx, 128 + s * 40, 116, 30, 28); fillStroke(ctx, volumeFill(ctx, 128 + s * 40, 116, 30, c), ol, lw); }
      ellipse(ctx, 128, 172, 92, 58); fillStroke(ctx, volumeFill(ctx, 128, 172, 92, c), ol, lw);
      ellipse(ctx, 128, 198, 58, 26); ctx.fillStyle = rgba(art.b, 0.95); ctx.fill();
      // manchas
      ctx.fillStyle = rgba(shade(c, -0.25), 0.5);
      for (const [x, y, r] of [[70, 160, 9], [186, 150, 11], [176, 182, 7], [84, 186, 6]]) { ellipse(ctx, x, y, r, r * 0.8); ctx.fill(); }
      break;
    }
    case 'bird': {
      for (const dx of [-18, 18]) {
        ctx.beginPath(); ctx.moveTo(128 + dx, 206); ctx.lineTo(128 + dx, 232); ctx.lineWidth = 6; ctx.strokeStyle = shade(art.a, -0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(116 + dx, 236); ctx.lineTo(140 + dx, 236); ctx.stroke();
      }
      ellipse(ctx, 128, 152, 72, 68); fillStroke(ctx, volumeFill(ctx, 128, 152, 72, c), ol, lw);
      ellipse(ctx, 128, 176, 44, 36); ctx.fillStyle = rgba(art.b, 0.95); ctx.fill();
      // asas
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(128 + s * 64, 160); ctx.rotate(s * 0.5);
        ellipse(ctx, 0, 0, 20, 38); fillStroke(ctx, shade(c, -0.15), ol, lw);
        ctx.restore();
      }
      // bico
      ctx.beginPath(); ctx.moveTo(150, 152); ctx.lineTo(178, 160); ctx.lineTo(150, 170); ctx.closePath();
      fillStroke(ctx, '#ffb648', shade('#ffb648', -0.5), 4);
      break;
    }
    default: break;
  }
}

// ---------------- Olhos e boca ----------------
function drawFace(ctx, art, L, blink) {
  const [fx, fy] = L.face;
  const hr = L.head[2];
  const ol = outlineColor(art);
  const isQuad = art.body === 'quad';
  const isFrog = art.body === 'frog';
  const isBird = art.body === 'bird';
  const spread = isQuad ? hr * 0.42 : hr * 0.4;
  const eyes = isFrog ? [[88, 114], [168, 114]] : [[fx - spread + (isQuad ? 4 : 0), fy - hr * 0.12], [fx + spread + (isQuad ? 6 : 0), fy - hr * 0.12]];
  if (isBird) { eyes[0][0] -= 6; eyes[1][0] -= 2; }
  const ex = hr * (art.eyes === 'sharp' ? 0.13 : 0.15);
  const ey = hr * (art.eyes === 'sharp' ? 0.16 : 0.21);

  for (const [x, y] of eyes) {
    if (blink || art.eyes === 'sleepy') {
      ctx.beginPath();
      ctx.arc(x, y + 2, ex * 1.1, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 5; ctx.strokeStyle = '#231a2e'; ctx.lineCap = 'round'; ctx.stroke();
      continue;
    }
    ellipse(ctx, x, y, ex * 1.15, ey * 1.08); ctx.fillStyle = '#ffffff'; ctx.fill();
    ellipse(ctx, x + 1, y + 2, ex, ey); ctx.fillStyle = '#231a2e'; ctx.fill();
    // íris colorida
    ellipse(ctx, x + 1, y + ey * 0.35, ex * 0.75, ey * 0.5); ctx.fillStyle = rgba(art.eyeColor || shade(art.a || art.c, -0.1), 0.55); ctx.fill();
    // brilhos
    ellipse(ctx, x - ex * 0.3, y - ey * 0.4, ex * 0.42, ey * 0.32); ctx.fillStyle = '#ffffff'; ctx.fill();
    ellipse(ctx, x + ex * 0.35, y + ey * 0.35, ex * 0.18, ey * 0.14); ctx.fill();
    if (art.eyes === 'sharp') {
      // pálpebra decidida
      ctx.beginPath();
      const s = x < fx ? 1 : -1;
      ctx.moveTo(x - ex * 1.4, y - ey * (s > 0 ? 1.2 : 0.55));
      ctx.lineTo(x + ex * 1.4, y - ey * (s > 0 ? 0.55 : 1.2));
      ctx.lineTo(x + ex * 1.4, y - ey * 1.6);
      ctx.lineTo(x - ex * 1.4, y - ey * 1.6);
      ctx.closePath();
      ctx.fillStyle = art.body === 'frog' ? art.c : mix(art.c, shade(art.c, -0.1), 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - ex * 1.3, y - ey * (s > 0 ? 1.15 : 0.6));
      ctx.lineTo(x + ex * 1.3, y - ey * (s > 0 ? 0.6 : 1.15));
      ctx.lineWidth = 4; ctx.strokeStyle = ol; ctx.stroke();
    }
  }
  // bochechas
  if (art.eyes !== 'sharp' || art.features.includes('cheeks')) {
    const cheek = art.features.includes('cheeks') ? '#ff6a4a' : '#ff8fa8';
    for (const [x, y] of eyes) {
      const dx = x < fx ? -ex * 1.2 : ex * 1.2;
      ellipse(ctx, x + dx, y + ey * 1.5, ex * (art.features.includes('cheeks') ? 0.95 : 0.8), ex * 0.5);
      ctx.fillStyle = rgba(cheek, art.features.includes('cheeks') ? 0.9 : 0.45); ctx.fill();
    }
  }
  if (isBird) return;
  // boca
  const my = isFrog ? 196 : isQuad ? fy + hr * 0.5 : fy + hr * 0.32;
  const mx = isQuad ? fx + 16 : fx;
  ctx.beginPath();
  if (art.eyes === 'sharp') {
    ctx.moveTo(mx - 9, my); ctx.quadraticCurveTo(mx, my + 7, mx + 9, my - 1);
  } else {
    ctx.moveTo(mx - 10, my - 2); ctx.quadraticCurveTo(mx - 5, my + 7, mx, my); ctx.quadraticCurveTo(mx + 5, my + 7, mx + 10, my - 2);
  }
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a1f2c'; ctx.lineCap = 'round'; ctx.stroke();
  if (art.eyes === 'sharp' && !isFrog) {
    // presinha
    ctx.beginPath(); ctx.moveTo(mx + 3, my + 2); ctx.lineTo(mx + 6, my + 9); ctx.lineTo(mx + 8, my + 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  }
}

// ---------------- Características ----------------
function flame(ctx, x, y, size, ang, outer, inner) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const s = size;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.55, s * 0.3, -s * 0.5, -s * 0.25, -s * 0.12, -s * 0.55);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.2, s * 0.05, -s * 0.35, 0, -s);
    ctx.bezierCurveTo(s * 0.35, -s * 0.55, s * 0.6, -s * 0.1, s * 0.45, s * 0.12);
    ctx.bezierCurveTo(s * 0.4, s * 0.32, s * 0.2, s * 0.38, 0, s * 0.35);
    ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(0, -s, 0, s * 0.4);
  g.addColorStop(0, shade(outer, 0.2));
  g.addColorStop(1, outer);
  fillStroke(ctx, g, shade(outer, -0.45), 4);
  ctx.scale(0.55, 0.6);
  ctx.translate(0, s * 0.18);
  path();
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();
}

function leaf(ctx, x, y, len, ang, color, ol) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  const g = ctx.createLinearGradient(0, -len * 0.3, 0, len * 0.3);
  g.addColorStop(0, shade(color, 0.3));
  g.addColorStop(1, shade(color, -0.15));
  fillStroke(ctx, g, ol, 4);
  ctx.beginPath(); ctx.moveTo(len * 0.08, 0); ctx.lineTo(len * 0.85, 0);
  ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(shade(color, -0.4), 0.7); ctx.stroke();
  ctx.restore();
}

function crystal(ctx, x, y, w, h, ang, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.7); ctx.lineTo(w / 2, 0); ctx.closePath();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, shade(color, 0.55)); g.addColorStop(0.5, color); g.addColorStop(1, shade(color, -0.3));
  fillStroke(ctx, g, shade(color, -0.55), 3.5);
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, -2); ctx.lineWidth = 2; ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.stroke();
  ctx.restore();
}

function backFeatures(ctx, art, L) {
  const f = art.features;
  const ol = outlineColor(art);
  const [tx, ty] = L.tail;
  if (f.includes('wings')) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(110 + s * 10, 120); ctx.scale(s, 1);
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.bezierCurveTo(-30, -60, -100, -80, -118, -40); ctx.lineTo(-96, -30); ctx.lineTo(-110, -6); ctx.lineTo(-84, 0); ctx.lineTo(-92, 24); ctx.lineTo(-60, 22); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, -50, -20, 70, shade(art.c, 0.1)), ol, 5);
      ctx.restore();
    }
  }
  if (f.includes('flameTail')) {
    ctx.beginPath(); ctx.moveTo(tx + 24, ty + 8); ctx.quadraticCurveTo(tx - 22, ty + 4, tx - 16, ty - 40);
    ctx.lineWidth = 16; ctx.strokeStyle = ol; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = 10; ctx.strokeStyle = art.c; ctx.stroke();
    flame(ctx, tx - 16, ty - 52, 40, -0.2, '#ff5a1f', '#ffe36b');
  }
  if (f.includes('finTail')) {
    ctx.save(); ctx.translate(tx + 10, ty); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-30, -36, -50, -20); ctx.quadraticCurveTo(-34, 0, -52, 22); ctx.quadraticCurveTo(-26, 30, 10, 0);
    fillStroke(ctx, volumeFill(ctx, -20, 0, 40, art.a), shade(art.a, -0.5), 4);
    ctx.restore();
  }
  if (f.includes('boltTail')) {
    ctx.beginPath();
    const pts = [[tx + 20, ty + 10], [tx - 10, ty - 10], [tx + 6, ty - 22], [tx - 26, ty - 50], [tx - 2, ty - 58], [tx - 36, ty - 96], [tx + 18, ty - 50], [tx - 2, ty - 42], [tx + 24, ty - 20], [tx + 30, ty + 2]];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    fillStroke(ctx, volumeFill(ctx, tx, ty - 40, 50, art.c), ol, 5);
  }
  if (f.includes('mane')) {
    const [hx, hy, hr] = L.head;
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 1.25;
      const x = hx - 6 + Math.cos(a) * hr * 0.9;
      const y = hy + Math.sin(a) * hr * 0.9;
      ctx.beginPath(); ctx.moveTo(hx - 6 + Math.cos(a - 0.25) * hr * 0.5, hy + Math.sin(a - 0.25) * hr * 0.5);
      ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34);
      ctx.lineTo(hx - 6 + Math.cos(a + 0.25) * hr * 0.5, hy + Math.sin(a + 0.25) * hr * 0.5);
      ctx.closePath();
      fillStroke(ctx, i % 2 ? art.a : shade(art.a, 0.25), shade(art.a, -0.5), 4);
    }
    ctx.restore();
  }
  if (f.includes('flameMane')) {
    const [hx, hy, hr] = L.head;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 1.05 + (i / 6) * Math.PI * 1.1;
      flame(ctx, hx - 10 + Math.cos(a) * hr * 0.85, hy + Math.sin(a) * hr * 0.85, 30 + (i % 2) * 8, a + Math.PI / 2, '#ff5a1f', '#ffd84a');
    }
  }
  if (f.includes('treeBack')) {
    const [bx, by] = L.back;
    ctx.fillStyle = '#7a4b2a';
    ctx.beginPath(); ctx.moveTo(bx - 8, by + 20); ctx.lineTo(bx - 6, by - 50); ctx.lineTo(bx + 8, by - 50); ctx.lineTo(bx + 10, by + 20); ctx.closePath();
    fillStroke(ctx, '#8a5530', '#3f2410', 4);
    for (const [dx, dy, r] of [[-30, -70, 30], [28, -72, 30], [0, -96, 34], [-8, -60, 26], [20, -52, 22]]) {
      ellipse(ctx, bx + dx, by + dy, r, r * 0.9); fillStroke(ctx, volumeFill(ctx, bx + dx, by + dy, r, '#3fae4c'), '#1d5a26', 4);
    }
    for (const [dx, dy] of [[-20, -84], [16, -100], [30, -64]]) { ellipse(ctx, bx + dx, by + dy, 6, 6); ctx.fillStyle = art.a; ctx.fill(); }
  }
  if (f.includes('shell')) {
    const [bx, by] = L.back;
    ellipse(ctx, bx, by + 6, 72, 46); fillStroke(ctx, volumeFill(ctx, bx, by, 72, '#3b88a8'), '#16405a', 5);
    ctx.strokeStyle = rgba('#d8f6ff', 0.55); ctx.lineWidth = 3;
    for (const r of [24, 46]) { ellipse(ctx, bx, by + 10, r * 1.4, r * 0.8); ctx.stroke(); }
    for (const [dx, h, col] of [[-36, 44, '#ff7f9e'], [-10, 58, art.a], [20, 40, '#ffb35c'], [44, 30, art.a]]) {
      ctx.beginPath(); ctx.moveTo(bx + dx - 6, by - 26); ctx.quadraticCurveTo(bx + dx - 12, by - 26 - h, bx + dx, by - 26 - h); ctx.quadraticCurveTo(bx + dx + 12, by - 26 - h * 0.6, bx + dx + 6, by - 26); ctx.closePath();
      fillStroke(ctx, col, shade(col, -0.5), 3);
    }
  }
}

function frontFeatures(ctx, art, L) {
  const f = art.features;
  const ol = outlineColor(art);
  const [hx, hy, hr] = L.head;
  const [tpx, tpy] = L.top;

  if (f.includes('earsPointy')) {
    for (const s of [-1, 1]) {
      const bx = hx + s * hr * 0.55 - (art.body === 'quad' ? 6 : 0);
      const by = hy - hr * 0.6;
      ctx.beginPath(); ctx.moveTo(bx - 18, by + 12); ctx.lineTo(bx + s * 14, by - 46); ctx.lineTo(bx + 20, by + 8); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, bx, by - 10, 30, art.c), ol, 5);
      ctx.beginPath(); ctx.moveTo(bx - 8, by + 6); ctx.lineTo(bx + s * 11, by - 30); ctx.lineTo(bx + 10, by + 4); ctx.closePath();
      ctx.fillStyle = rgba(art.a, 0.85); ctx.fill();
    }
  }
  if (f.includes('earsLong')) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(hx + s * hr * 0.42, hy - hr * 0.62); ctx.rotate(s * 0.35);
      ellipse(ctx, 0, -34, 14, 40); fillStroke(ctx, volumeFill(ctx, 0, -34, 40, art.c), ol, 5);
      ctx.beginPath(); ctx.moveTo(-12, -54); ctx.lineTo(0, -76); ctx.lineTo(12, -54); ctx.quadraticCurveTo(0, -60, -12, -54); ctx.fillStyle = '#2a2140'; ctx.fill();
      ctx.restore();
    }
  }
  if (f.includes('stripes')) {
    ctx.save();
    ctx.strokeStyle = rgba(shade(art.a, -0.15), 0.9); ctx.lineWidth = 7; ctx.lineCap = 'round';
    const lines = art.body === 'quad' ? [[70, 140, 62, 168], [92, 132, 86, 162], [114, 130, 110, 158]] : [[76, 150, 92, 158], [180, 150, 164, 158], [78, 176, 92, 180], [178, 176, 164, 180]];
    for (const [a, b, c2, d] of lines) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); }
    ctx.restore();
  }
  if (f.includes('antennae')) {
    for (const s of [-1, 1]) {
      const bx = hx + s * hr * 0.3 - (art.body === 'quad' ? 6 : 0);
      const by = hy - hr * 0.8;
      const ex = bx + s * 30;
      const ey = by - 52;
      ctx.beginPath(); ctx.moveTo(bx, by + 6); ctx.quadraticCurveTo(bx + s * 2, by - 34, ex, ey);
      ctx.lineWidth = 9; ctx.strokeStyle = ol; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = shade(art.c, -0.1); ctx.stroke();
      const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 26);
      g.addColorStop(0, rgba(art.a, 0.7)); g.addColorStop(1, rgba(art.a, 0));
      ctx.fillStyle = g; ctx.fillRect(ex - 26, ey - 26, 52, 52);
      ellipse(ctx, ex, ey, 12, 12); fillStroke(ctx, volumeFill(ctx, ex, ey, 12, art.a, { hi: 0.7 }), shade(art.a, -0.5), 4);
    }
  }
  if (f.includes('horns')) {
    for (const s of [-1, 1]) {
      const bx = hx + s * hr * 0.35 - (art.body === 'quad' ? 4 : 0);
      const by = hy - hr * 0.72;
      ctx.beginPath(); ctx.moveTo(bx - 10, by + 8); ctx.quadraticCurveTo(bx + s * 4, by - 30, bx + s * 26, by - 44); ctx.quadraticCurveTo(bx + s * 12, by - 14, bx + 10, by + 6); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, bx, by - 20, 30, '#f2e7cf'), '#5b4a36', 4);
    }
  }
  if (f.includes('waterCrest')) {
    ctx.beginPath();
    ctx.moveTo(tpx - 26, tpy + 22);
    ctx.quadraticCurveTo(tpx - 30, tpy - 22, tpx + 4, tpy - 30);
    ctx.quadraticCurveTo(tpx - 8, tpy - 12, tpx + 10, tpy - 6);
    ctx.quadraticCurveTo(tpx + 26, tpy - 30, tpx + 40, tpy - 14);
    ctx.quadraticCurveTo(tpx + 26, tpy - 2, tpx + 26, tpy + 22);
    ctx.closePath();
    fillStroke(ctx, volumeFill(ctx, tpx, tpy - 6, 34, art.a), shade(art.a, -0.55), 4);
    ellipse(ctx, tpx - 6, tpy - 10, 5, 8, -0.4); ctx.fillStyle = rgba('#ffffff', 0.7); ctx.fill();
  }
  if (f.includes('fins')) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(128 + s * 58, 150); ctx.quadraticCurveTo(128 + s * 100, 150, 128 + s * 96, 186); ctx.quadraticCurveTo(128 + s * 80, 176, 128 + s * 62, 184); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 128 + s * 80, 165, 30, art.a), shade(art.a, -0.55), 4);
    }
  }
  if (f.includes('leafSprout')) {
    ctx.beginPath(); ctx.moveTo(tpx, tpy + 14); ctx.quadraticCurveTo(tpx + 4, tpy - 10, tpx, tpy - 24);
    ctx.lineWidth = 7; ctx.strokeStyle = '#2f7d2c'; ctx.lineCap = 'round'; ctx.stroke();
    leaf(ctx, tpx, tpy - 22, 46, -2.6, '#69d14f', '#1f5e1c');
    leaf(ctx, tpx, tpy - 22, 40, -0.55, '#82e05c', '#1f5e1c');
  }
  if (f.includes('leafCrown')) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
      leaf(ctx, hx + Math.cos(a) * hr * 0.6, hy + Math.sin(a) * hr * 0.7, 44, a, i % 2 ? '#5cc94a' : '#7fe06a', '#1f5e1c');
    }
    // flor
    const fx = hx + hr * 0.55; const fy = hy - hr * 0.7;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ellipse(ctx, fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 8, 8); fillStroke(ctx, art.a, shade(art.a, -0.45), 2.5); }
    ellipse(ctx, fx, fy, 6, 6); ctx.fillStyle = '#ffe066'; ctx.fill();
  }
  if (f.includes('leafArms')) {
    leaf(ctx, 66, 178, 38, 2.3, '#66cc52', '#1f5e1c');
    leaf(ctx, 190, 178, 38, 0.8, '#66cc52', '#1f5e1c');
  }
  if (f.includes('flameCrest')) {
    flame(ctx, tpx + 4, tpy + 4, 40, 0.15, '#ff4f2a', '#ffe36b');
    flame(ctx, tpx - 16, tpy + 10, 28, -0.4, '#ff6a2a', '#ffe36b');
  }
  if (f.includes('rockPlates')) {
    const plates = art.body === 'egg'
      ? [[96, 96, 26, -0.6], [154, 88, 22, 0.5], [128, 76, 18, 0], [170, 126, 16, 0.9]]
      : art.body === 'biped'
        ? [[86, 150, 22, -0.6], [170, 150, 22, 0.6], [128, 60, 20, 0], [100, 58, 14, -0.4]]
        : [[80, 132, 22, -0.5], [112, 122, 26, -0.1], [146, 132, 18, 0.4]];
    for (const [x, y, r, a] of plates) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-r, r * 0.4); ctx.lineTo(-r * 0.7, -r * 0.6); ctx.lineTo(0, -r); ctx.lineTo(r * 0.8, -r * 0.5); ctx.lineTo(r, r * 0.4); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 0, 0, r, '#9d9286'), '#3d362e', 4);
      if (art.a && art.body === 'egg') { ellipse(ctx, r * 0.2, -r * 0.2, r * 0.18, r * 0.12); ctx.fillStyle = rgba(art.a, 0.8); ctx.fill(); }
      ctx.restore();
    }
  }
  if (f.includes('mushroomCap')) {
    ctx.beginPath();
    ctx.moveTo(40, 112);
    ctx.bezierCurveTo(40, 20, 216, 20, 216, 112);
    ctx.quadraticCurveTo(128, 132, 40, 112);
    ctx.closePath();
    fillStroke(ctx, volumeFill(ctx, 128, 70, 96, art.a), shade(art.a, -0.55), 6);
    ctx.fillStyle = '#fff6ea';
    for (const [x, y, r] of [[96, 60, 13], [150, 54, 10], [178, 88, 9], [72, 92, 8], [126, 92, 7]]) { ellipse(ctx, x, y, r, r * 0.85); ctx.fill(); }
  }
  if (f.includes('crystals')) {
    crystal(ctx, 92, 96, 20, 52, -0.5, art.a);
    crystal(ctx, 128, 84, 24, 70, 0, art.a);
    crystal(ctx, 166, 96, 20, 50, 0.5, shade(art.a, 0.2));
    crystal(ctx, 192, 150, 14, 30, 1.1, art.a);
  }
}

// Desenha um Monstrin no contexto. blink = olhos fechados (piscar).
export function drawMonstrin(ctx, art, { blink = false } = {}) {
  const L = LAYOUT[art.body] || LAYOUT.blob;
  ctx.save();
  if (art.glow) {
    const g = ctx.createRadialGradient(128, 150, 20, 128, 150, 128);
    g.addColorStop(0, rgba(art.glow, 0.35));
    g.addColorStop(1, rgba(art.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  backFeatures(ctx, art, L);
  drawBody(ctx, art, L);
  frontFeatures(ctx, art, L);
  drawFace(ctx, art, L, blink);
  ctx.restore();
}
