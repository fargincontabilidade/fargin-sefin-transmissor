// Objetos do cenário (árvores, construções, móveis...). Arte original gerada por código.
// Cada objeto define: tamanho do desenho, área de colisão (em quadrados) e desenho.
import { shade, rgba, ellipse, roundRect, fillStroke, volumeFill, seeded } from './draw.js';

const T = 64;

function shadowEllipse(ctx, x, y, rx, ry, a = 0.28) {
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = rgba('#1a2a10', a);
  ctx.fill();
}

function canopyBlob(ctx, cx, cy, r, color, seed) {
  const rnd = seeded(seed);
  const blobs = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    blobs.push([cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.45, r * (0.45 + rnd() * 0.15)]);
  }
  blobs.push([cx, cy, r * 0.7]);
  // contorno escuro
  for (const [x, y, rr] of blobs) { ellipse(ctx, x, y + 4, rr + 4, rr + 3); ctx.fillStyle = shade(color, -0.55); ctx.fill(); }
  for (const [x, y, rr] of blobs) { ellipse(ctx, x, y, rr, rr * 0.95); ctx.fillStyle = volumeFill(ctx, cx, cy, r, color, { lx: 0.4, ly: 0.6, hi: 0.3, lo: 0.4 }); ctx.fill(); }
  // folhas de luz
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2; const d = rnd() * r * 0.8;
    const x = cx + Math.cos(a) * d; const y = cy + Math.sin(a) * d * 0.8;
    const light = y < cy;
    ellipse(ctx, x, y, 7, 4, a);
    ctx.fillStyle = rgba(light ? shade(color, 0.45) : shade(color, -0.3), light ? 0.55 : 0.4);
    ctx.fill();
  }
}

function trunk(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.35, y - h * 0.5, x - w * 0.3, y - h);
  ctx.lineTo(x + w * 0.3, y - h); ctx.quadraticCurveTo(x + w * 0.35, y - h * 0.5, x + w / 2, y); ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#6b4226'); g.addColorStop(0.4, '#9a6a3e'); g.addColorStop(1, '#4e2f1a');
  fillStroke(ctx, g, '#2f1c0e', 3);
}

function window_(ctx, x, y, w, h, frame = '#ffffff') {
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 4); fillStroke(ctx, frame, '#3a2a3a', 3);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#bfe9ff'); g.addColorStop(0.5, '#7cc4ef'); g.addColorStop(1, '#4b8fc8');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = rgba('#ffffff', 0.55); ctx.beginPath(); ctx.moveTo(x + 3, y + h - 4); ctx.lineTo(x + w * 0.5, y + 3); ctx.lineTo(x + w * 0.7, y + 3); ctx.lineTo(x + 8, y + h - 4); ctx.fill();
  ctx.fillStyle = frame; ctx.fillRect(x + w / 2 - 1.5, y, 3, h); ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
}

function flowerBox(ctx, x, y, w) {
  roundRect(ctx, x, y, w, 10, 3); fillStroke(ctx, '#9a5a32', '#4a2a14', 2);
  const cols = ['#ff6b8a', '#ffd23f', '#ffffff', '#b58cff'];
  for (let i = 0; i < w / 8; i++) { ellipse(ctx, x + 5 + i * 8, y - 2, 4, 4); ctx.fillStyle = cols[i % cols.length]; ctx.fill(); ellipse(ctx, x + 5 + i * 8, y + 2, 4, 3); ctx.fillStyle = '#3f8a35'; ctx.fill(); }
}

function roof(ctx, x, y, w, h, color, overhang = 14) {
  // telhado com fileiras de telhas
  ctx.beginPath();
  ctx.moveTo(x - overhang, y + h); ctx.lineTo(x + w * 0.08, y); ctx.lineTo(x + w * 0.92, y); ctx.lineTo(x + w + overhang, y + h); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, 0.15)); g.addColorStop(1, shade(color, -0.15));
  fillStroke(ctx, g, shade(color, -0.6), 4);
  ctx.save(); ctx.clip();
  const rows = Math.ceil(h / 14);
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 14;
    ctx.fillStyle = rgba(shade(color, -0.35), 0.6); ctx.fillRect(x - overhang, yy + 11, w + overhang * 2, 3);
    for (let k = -1; k < w / 18 + 2; k++) {
      const xx = x - overhang + k * 18 + (r % 2) * 9;
      ctx.fillStyle = rgba(shade(color, 0.3), 0.35); ctx.fillRect(xx + 2, yy + 2, 12, 3);
      ctx.fillStyle = rgba(shade(color, -0.4), 0.4); ctx.fillRect(xx, yy, 2, 13);
    }
  }
  ctx.restore();
  // beiral
  roundRect(ctx, x - overhang - 4, y + h - 4, w + overhang * 2 + 8, 12, 5); fillStroke(ctx, shade(color, -0.25), shade(color, -0.65), 3);
}

function door(ctx, x, y, w, h, color = '#8a5530') {
  roundRect(ctx, x - 5, y - 5, w + 10, h + 5, 6); fillStroke(ctx, '#e8d8c0', '#3a2a2a', 3);
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 10); ctx.quadraticCurveTo(x + w / 2, y - 6, x + w, y + 10); ctx.lineTo(x + w, y + h); ctx.closePath();
  fillStroke(ctx, volumeFill(ctx, x + w / 2, y + h / 2, h, color), '#3a2010', 3);
  ctx.strokeStyle = rgba('#000', 0.25); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  ellipse(ctx, x + w * 0.72, y + h * 0.55, 3, 3); ctx.fillStyle = '#ffd23f'; ctx.fill();
  roundRect(ctx, x - 8, y + h - 2, w + 16, 8, 3); fillStroke(ctx, '#b9b0a0', '#5a5040', 2);
}

function plasterWall(ctx, x, y, w, h, color) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, 0.08)); g.addColorStop(1, shade(color, -0.12));
  roundRect(ctx, x, y, w, h, 4); fillStroke(ctx, g, '#4a3a3a', 3);
  // base de pedra
  roundRect(ctx, x - 2, y + h - 14, w + 4, 14, 3); fillStroke(ctx, '#a89f90', '#4a4238', 2);
  ctx.fillStyle = rgba('#ffffff', 0.25);
  for (let i = 0; i < w / 22; i++) roundRect(ctx, x + 4 + i * 22, y + h - 11, 16, 4, 2), ctx.fill();
  // vigas de madeira
  ctx.fillStyle = '#7a4f2e';
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(x, y, 6, h - 14); ctx.fillRect(x + w - 6, y, 6, h - 14);
}

// ---------------- Definições ----------------
export const OBJECTS = {
  oak: {
    w: 168, h: 210, foot: [1, 1], solid: true,
    draw(ctx) { shadowEllipse(ctx, 84, 196, 56, 14); trunk(ctx, 84, 200, 30, 70); canopyBlob(ctx, 84, 92, 74, '#4fae46', 3); },
  },
  oak2: {
    w: 168, h: 210, foot: [1, 1], solid: true,
    draw(ctx) { shadowEllipse(ctx, 84, 196, 56, 14); trunk(ctx, 84, 200, 30, 70); canopyBlob(ctx, 84, 92, 74, '#3d9442', 7); },
  },
  blossom: {
    w: 168, h: 210, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 84, 196, 54, 14); trunk(ctx, 84, 200, 28, 70); canopyBlob(ctx, 84, 94, 70, '#f49ac1', 5);
      const r = seeded(9); for (let i = 0; i < 18; i++) { ellipse(ctx, 30 + r() * 108, 40 + r() * 100, 3, 3); ctx.fillStyle = '#fff'; ctx.fill(); }
    },
  },
  pine: {
    w: 128, h: 220, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 64, 208, 40, 11); trunk(ctx, 64, 212, 20, 40);
      const layers = [[64, 186, 58, 60], [64, 146, 48, 56], [64, 104, 38, 52], [64, 64, 26, 46]];
      for (const [x, y, w, h] of layers) {
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.quadraticCurveTo(x, y + 10, x - w, y); ctx.closePath();
        const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, '#2f8a4a'); g.addColorStop(0.5, '#3faa5c'); g.addColorStop(1, '#1f6a38');
        fillStroke(ctx, g, '#123d20', 3);
      }
    },
  },
  bush: {
    w: 84, h: 72, foot: [1, 1], solid: true,
    draw(ctx) { shadowEllipse(ctx, 42, 62, 34, 8); canopyBlob(ctx, 42, 40, 30, '#55b94a', 2); },
  },
  berrybush: {
    w: 84, h: 72, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 42, 62, 34, 8); canopyBlob(ctx, 42, 40, 30, '#4aa645', 4);
      for (const [x, y] of [[28, 34], [50, 28], [58, 46], [36, 50], [46, 40]]) { ellipse(ctx, x, y, 5, 5); fillStroke(ctx, '#e8455a', '#7a1a2a', 1.5); ellipse(ctx, x - 1.5, y - 1.5, 1.5, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); }
    },
  },
  tallgrass: {
    w: 72, h: 60, foot: [1, 1], solid: false, sway: true,
    draw(ctx) {
      const r = seeded(21);
      for (let i = 0; i < 16; i++) {
        const x = 8 + r() * 56; const h = 26 + r() * 22;
        ctx.beginPath(); ctx.moveTo(x - 4, 58); ctx.quadraticCurveTo(x - 2, 58 - h * 0.6, x + (r() - 0.5) * 12, 58 - h); ctx.quadraticCurveTo(x + 2, 58 - h * 0.5, x + 4, 58); ctx.closePath();
        fillStroke(ctx, i % 3 ? '#4fae3e' : '#6fd04f', '#25601c', 1.5);
      }
    },
  },
  rock: {
    w: 80, h: 64, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 40, 54, 32, 8);
      ctx.beginPath(); ctx.moveTo(10, 52); ctx.lineTo(14, 26); ctx.lineTo(32, 12); ctx.lineTo(56, 16); ctx.lineTo(70, 34); ctx.lineTo(68, 54); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 40, 34, 34, '#a9a296'), '#4a453c', 3);
      ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(38, 34); ctx.lineTo(70, 34); ctx.strokeStyle = rgba('#5a554c', 0.5); ctx.lineWidth = 2; ctx.stroke();
      ellipse(ctx, 20, 46, 6, 3); ctx.fillStyle = rgba('#6fbf5a', 0.8); ctx.fill();
    },
  },
  bigrock: {
    w: 150, h: 120, foot: [2, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 75, 108, 66, 12);
      ctx.beginPath(); ctx.moveTo(10, 104); ctx.lineTo(16, 56); ctx.lineTo(44, 22); ctx.lineTo(92, 14); ctx.lineTo(130, 42); ctx.lineTo(142, 104); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 75, 60, 70, '#9e968a'), '#443f36', 4);
      ctx.strokeStyle = rgba('#4a453c', 0.45); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(44, 22); ctx.lineTo(62, 64); ctx.lineTo(130, 42); ctx.moveTo(62, 64); ctx.lineTo(56, 104); ctx.stroke();
      for (const [x, y] of [[24, 96], [120, 98], [100, 30]]) { ellipse(ctx, x, y, 9, 4); ctx.fillStyle = rgba('#6fbf5a', 0.85); ctx.fill(); }
    },
  },
  crystalrock: {
    w: 110, h: 120, foot: [1, 1], solid: true, glow: '#8ff0ff',
    draw(ctx) {
      const g = ctx.createRadialGradient(55, 70, 5, 55, 70, 60); g.addColorStop(0, rgba('#9ff3ff', 0.5)); g.addColorStop(1, rgba('#9ff3ff', 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, 110, 120);
      shadowEllipse(ctx, 55, 110, 40, 8);
      ctx.beginPath(); ctx.moveTo(18, 108); ctx.lineTo(24, 80); ctx.lineTo(50, 70); ctx.lineTo(84, 78); ctx.lineTo(94, 108); ctx.closePath();
      fillStroke(ctx, volumeFill(ctx, 55, 90, 40, '#8f8a9a'), '#3f3a4a', 3);
      const cr = (x, y, w, h, a, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.75); ctx.lineTo(w / 2, 0); ctx.closePath(); const gg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); gg.addColorStop(0, shade(c, 0.6)); gg.addColorStop(0.5, c); gg.addColorStop(1, shade(c, -0.3)); fillStroke(ctx, gg, shade(c, -0.6), 2.5); ctx.restore(); };
      cr(40, 82, 16, 50, -0.35, '#7fe9ff'); cr(58, 80, 20, 66, 0.05, '#b9a8f0'); cr(76, 84, 14, 40, 0.45, '#7fe9ff');
    },
  },
  fenceH: {
    w: 64, h: 64, foot: [1, 1], solid: true,
    draw(ctx) {
      ctx.fillStyle = rgba('#1a2a10', 0.2); ctx.fillRect(0, 54, 64, 6);
      for (const y of [26, 42]) { roundRect(ctx, 0, y, 64, 8, 3); fillStroke(ctx, '#c9894f', '#5a3416', 2); }
      for (const x of [6, 44]) { roundRect(ctx, x, 14, 14, 44, 4); fillStroke(ctx, volumeFill(ctx, x + 7, 30, 20, '#d9995c'), '#5a3416', 2.5); }
    },
  },
  fenceV: {
    w: 64, h: 64, foot: [1, 1], solid: true,
    draw(ctx) {
      ctx.fillStyle = rgba('#1a2a10', 0.2); ctx.fillRect(22, 54, 20, 8);
      roundRect(ctx, 28, 0, 8, 60, 3); fillStroke(ctx, '#c9894f', '#5a3416', 2);
      roundRect(ctx, 25, 14, 14, 44, 4); fillStroke(ctx, volumeFill(ctx, 32, 30, 20, '#d9995c'), '#5a3416', 2.5);
    },
  },
  lamp: {
    w: 48, h: 150, foot: [1, 1], solid: true, light: true,
    draw(ctx) {
      shadowEllipse(ctx, 24, 144, 14, 5);
      roundRect(ctx, 20, 30, 8, 114, 3); fillStroke(ctx, '#3a3a4a', '#1a1a24', 2);
      roundRect(ctx, 14, 136, 20, 8, 3); fillStroke(ctx, '#4a4a5a', '#1a1a24', 2);
      roundRect(ctx, 10, 6, 28, 30, 6); fillStroke(ctx, '#3a3a4a', '#1a1a24', 2.5);
      const g = ctx.createRadialGradient(24, 21, 2, 24, 21, 14); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffcf5a');
      roundRect(ctx, 14, 10, 20, 22, 4); ctx.fillStyle = g; ctx.fill();
    },
  },
  sign: {
    w: 72, h: 80, foot: [1, 1], solid: true, interact: true,
    draw(ctx) {
      shadowEllipse(ctx, 36, 74, 22, 5);
      roundRect(ctx, 31, 34, 10, 40, 3); fillStroke(ctx, '#8a5530', '#3a2010', 2);
      roundRect(ctx, 6, 10, 60, 34, 6); fillStroke(ctx, volumeFill(ctx, 36, 26, 40, '#d9a066'), '#4a2a14', 3);
      ctx.fillStyle = rgba('#5a3416', 0.7); for (const y of [20, 27, 34]) ctx.fillRect(14, y, 44, 3);
    },
  },
  well: {
    w: 140, h: 150, foot: [2, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 70, 136, 58, 10);
      ellipse(ctx, 70, 112, 52, 22); fillStroke(ctx, '#9e968a', '#443f36', 3);
      roundRect(ctx, 18, 92, 104, 34, 10); fillStroke(ctx, volumeFill(ctx, 70, 108, 52, '#b1a99b'), '#443f36', 3);
      ellipse(ctx, 70, 94, 46, 14); ctx.fillStyle = '#1d4a6a'; ctx.fill();
      ellipse(ctx, 62, 92, 16, 4); ctx.fillStyle = rgba('#9fdcff', 0.5); ctx.fill();
      for (const x of [22, 110]) { roundRect(ctx, x, 28, 9, 72, 3); fillStroke(ctx, '#8a5530', '#3a2010', 2); }
      ctx.beginPath(); ctx.moveTo(8, 36); ctx.lineTo(70, 6); ctx.lineTo(132, 36); ctx.closePath(); fillStroke(ctx, volumeFill(ctx, 70, 20, 60, '#c0573a'), '#5a1f10', 3);
      ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(70, 34); ctx.lineTo(70, 70); ctx.stroke();
      roundRect(ctx, 62, 68, 16, 14, 3); fillStroke(ctx, '#8a5530', '#3a2010', 2);
    },
  },
  bench: {
    w: 128, h: 70, foot: [2, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 64, 62, 54, 7);
      for (const x of [16, 104]) { roundRect(ctx, x, 30, 8, 30, 2); fillStroke(ctx, '#3a3a4a', '#1a1a24', 2); }
      roundRect(ctx, 6, 8, 116, 12, 4); fillStroke(ctx, '#c9894f', '#5a3416', 2);
      roundRect(ctx, 4, 30, 120, 12, 4); fillStroke(ctx, '#d9995c', '#5a3416', 2);
    },
  },
  barrel: {
    w: 56, h: 70, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 28, 64, 22, 6);
      roundRect(ctx, 8, 10, 40, 54, 12); fillStroke(ctx, volumeFill(ctx, 28, 36, 28, '#a8683a'), '#4a2a14', 3);
      ctx.fillStyle = '#5a5a6a'; ctx.fillRect(8, 20, 40, 4); ctx.fillRect(8, 50, 40, 4);
      ellipse(ctx, 28, 12, 19, 6); fillStroke(ctx, '#c9894f', '#4a2a14', 2);
    },
  },
  crate: {
    w: 64, h: 70, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 32, 64, 28, 6);
      roundRect(ctx, 6, 12, 52, 50, 4); fillStroke(ctx, volumeFill(ctx, 32, 36, 36, '#c9894f'), '#4a2a14', 3);
      ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, 16); ctx.lineTo(54, 58); ctx.moveTo(54, 16); ctx.lineTo(10, 58); ctx.stroke();
    },
  },
  mailbox: {
    w: 44, h: 80, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 22, 74, 14, 4);
      roundRect(ctx, 19, 36, 6, 38, 2); fillStroke(ctx, '#7a4a24', '#3a2010', 2);
      roundRect(ctx, 6, 14, 32, 26, 10); fillStroke(ctx, volumeFill(ctx, 22, 26, 20, '#3f7ae0'), '#1a2a5a', 2.5);
      ctx.fillStyle = '#ff4a4a'; ctx.fillRect(34, 10, 4, 14);
    },
  },
  chest: {
    w: 72, h: 64, foot: [1, 1], solid: true, interact: true,
    draw(ctx) {
      shadowEllipse(ctx, 36, 58, 30, 6);
      roundRect(ctx, 8, 26, 56, 32, 5); fillStroke(ctx, volumeFill(ctx, 36, 40, 36, '#b06a2e'), '#4a2410', 3);
      ctx.beginPath(); ctx.moveTo(8, 30); ctx.quadraticCurveTo(36, 2, 64, 30); ctx.closePath(); fillStroke(ctx, volumeFill(ctx, 36, 20, 36, '#c97a38'), '#4a2410', 3);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(8, 30, 56, 5); roundRect(ctx, 30, 28, 12, 14, 3); fillStroke(ctx, '#ffd23f', '#7a5a10', 2);
    },
  },
  chestOpen: {
    w: 72, h: 64, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 36, 58, 30, 6);
      ctx.beginPath(); ctx.moveTo(10, 28); ctx.quadraticCurveTo(36, -2, 62, 20); ctx.lineTo(62, 26); ctx.lineTo(10, 30); ctx.closePath(); fillStroke(ctx, '#8a5a28', '#4a2410', 3);
      roundRect(ctx, 8, 26, 56, 32, 5); fillStroke(ctx, volumeFill(ctx, 36, 40, 36, '#b06a2e'), '#4a2410', 3);
      ellipse(ctx, 36, 30, 24, 5); ctx.fillStyle = '#2a1a10'; ctx.fill();
    },
  },
  log: {
    w: 200, h: 90, foot: [3, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 100, 80, 92, 9);
      roundRect(ctx, 14, 30, 172, 46, 22); fillStroke(ctx, volumeFill(ctx, 100, 50, 90, '#8a5530'), '#3a2010', 3);
      ctx.strokeStyle = rgba('#3a2010', 0.4); ctx.lineWidth = 2; for (const y of [42, 54, 64]) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(166, y); ctx.stroke(); }
      ellipse(ctx, 176, 53, 14, 22); fillStroke(ctx, '#d9a066', '#3a2010', 3);
      for (const r of [9, 4]) { ellipse(ctx, 176, 53, r * 0.65, r); ctx.strokeStyle = '#8a5530'; ctx.stroke(); }
      for (const [x, y] of [[50, 30], [92, 28], [130, 32]]) { ellipse(ctx, x, y, 12, 5); ctx.fillStyle = '#5fb24a'; ctx.fill(); }
    },
  },

  // ---------------- Construções ----------------
  house_red: { w: 5 * T + 40, h: 6 * T, foot: [5, 3], solid: true, door: [2, 2], draw(ctx) { drawHouse(ctx, '#d9534a', '#f6ead8', 0); } },
  house_blue: { w: 5 * T + 40, h: 6 * T, foot: [5, 3], solid: true, door: [2, 2], draw(ctx) { drawHouse(ctx, '#4a7fd9', '#fff3e0', 1); } },
  house_green: { w: 5 * T + 40, h: 6 * T, foot: [5, 3], solid: true, door: [2, 2], draw(ctx) { drawHouse(ctx, '#4fa65a', '#f3ead8', 2); } },
  centro: { w: 7 * T + 40, h: 6.4 * T, foot: [7, 3], solid: true, door: [3, 2], draw(ctx) { drawCentro(ctx); } },
  lab: { w: 7 * T + 40, h: 6.4 * T, foot: [7, 3], solid: true, door: [3, 2], draw(ctx) { drawLab(ctx); } },
  shop: { w: 5 * T + 40, h: 6 * T, foot: [5, 3], solid: true, door: [2, 2], draw(ctx) { drawShop(ctx); } },

  // ---------------- Interiores ----------------
  counter: {
    w: 3 * T, h: 120, foot: [3, 1], solid: true,
    draw(ctx) {
      roundRect(ctx, 4, 40, 3 * T - 8, 76, 8); fillStroke(ctx, volumeFill(ctx, 96, 70, 100, '#ff9fc4'), '#7a2a4a', 3);
      roundRect(ctx, 0, 34, 3 * T, 16, 6); fillStroke(ctx, '#fff', '#7a2a4a', 3);
      ctx.fillStyle = '#ff5a8a'; ctx.fillRect(84, 64, 24, 8); ctx.fillRect(92, 56, 8, 24);
    },
  },
  healer: {
    w: 2 * T, h: 140, foot: [2, 1], solid: true,
    draw(ctx) {
      roundRect(ctx, 8, 30, 112, 100, 14); fillStroke(ctx, volumeFill(ctx, 64, 70, 70, '#e8f0ff'), '#3a4a6a', 3);
      roundRect(ctx, 20, 42, 88, 40, 10); ctx.fillStyle = '#1a2a4a'; ctx.fill();
      for (let i = 0; i < 6; i++) { const x = 30 + (i % 3) * 30; const y = 52 + Math.floor(i / 3) * 18; ellipse(ctx, x + 4, y + 4, 8, 6); ctx.fillStyle = '#5ad1ff'; ctx.fill(); }
      roundRect(ctx, 26, 92, 76, 26, 6); fillStroke(ctx, '#c9d8f0', '#3a4a6a', 2);
      ellipse(ctx, 64, 22, 10, 10); fillStroke(ctx, '#5ad1ff', '#1a4a6a', 2);
    },
  },
  bookshelf: {
    w: 2 * T, h: 150, foot: [2, 1], solid: true,
    draw(ctx) {
      roundRect(ctx, 4, 10, 120, 136, 6); fillStroke(ctx, volumeFill(ctx, 64, 70, 80, '#8a5530'), '#3a2010', 3);
      const cols = ['#e84a3c', '#2f7de1', '#ffd23f', '#36b37e', '#8a5cf0', '#ff8a2a'];
      const r = seeded(4);
      for (let shelf = 0; shelf < 3; shelf++) {
        const y = 18 + shelf * 42;
        ctx.fillStyle = '#4a2a14'; ctx.fillRect(10, y + 36, 108, 5);
        let x = 12; while (x < 112) { const w = 7 + r() * 8; const h = 24 + r() * 10; ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.fillRect(x, y + 36 - h, w - 1, h); ctx.fillStyle = rgba('#fff', 0.3); ctx.fillRect(x + 1, y + 36 - h + 3, w - 3, 2); x += w; }
      }
    },
  },
  table: {
    w: 2 * T, h: 96, foot: [2, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 64, 86, 56, 8);
      for (const x of [16, 104]) { roundRect(ctx, x, 40, 8, 46, 2); fillStroke(ctx, '#7a4a24', '#3a2010', 2); }
      roundRect(ctx, 4, 24, 120, 26, 8); fillStroke(ctx, volumeFill(ctx, 64, 34, 60, '#c9894f'), '#4a2a14', 3);
      ellipse(ctx, 40, 26, 12, 6); fillStroke(ctx, '#fff', '#8a8a9a', 2);
      roundRect(ctx, 76, 12, 18, 18, 4); fillStroke(ctx, '#ff8a5a', '#7a3a1a', 2);
    },
  },
  bed: {
    w: T, h: 2 * T, foot: [1, 2], solid: true,
    draw(ctx) {
      roundRect(ctx, 4, 8, 56, 116, 8); fillStroke(ctx, '#8a5530', '#3a2010', 3);
      roundRect(ctx, 8, 14, 48, 104, 6); ctx.fillStyle = '#ffffff'; ctx.fill();
      roundRect(ctx, 12, 18, 40, 22, 8); fillStroke(ctx, '#f0f4ff', '#8a8aa0', 2);
      roundRect(ctx, 8, 46, 48, 72, 6); fillStroke(ctx, volumeFill(ctx, 32, 80, 40, '#5a8fe8'), '#2a4a8a', 2);
    },
  },
  plant: {
    w: T, h: 96, foot: [1, 1], solid: true,
    draw(ctx) {
      shadowEllipse(ctx, 32, 90, 20, 5);
      ctx.beginPath(); ctx.moveTo(16, 62); ctx.lineTo(48, 62); ctx.lineTo(44, 90); ctx.lineTo(20, 90); ctx.closePath(); fillStroke(ctx, volumeFill(ctx, 32, 76, 24, '#d9734a'), '#5a2a14', 2.5);
      canopyBlob(ctx, 32, 40, 24, '#4fae46', 8);
    },
  },
  pc: {
    w: T, h: 110, foot: [1, 1], solid: true, interact: true,
    draw(ctx) {
      roundRect(ctx, 6, 50, 52, 56, 6); fillStroke(ctx, '#d0d4e0', '#3a3a4a', 2.5);
      roundRect(ctx, 4, 6, 56, 46, 6); fillStroke(ctx, '#3a3a4a', '#1a1a24', 2.5);
      const g = ctx.createLinearGradient(0, 10, 0, 46); g.addColorStop(0, '#5ad1ff'); g.addColorStop(1, '#2a6ab0');
      roundRect(ctx, 10, 12, 44, 34, 4); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = rgba('#fff', 0.7); ctx.fillRect(16, 20, 22, 3); ctx.fillRect(16, 28, 30, 3);
    },
  },
  labmachine: {
    w: 3 * T, h: 150, foot: [3, 1], solid: true, interact: true,
    draw(ctx) {
      roundRect(ctx, 6, 50, 3 * T - 12, 94, 10); fillStroke(ctx, volumeFill(ctx, 96, 90, 100, '#e8ecf6'), '#3a4a6a', 3);
      roundRect(ctx, 14, 60, 3 * T - 28, 20, 6); ctx.fillStyle = '#2a3a5a'; ctx.fill();
      // três cápsulas
      const cols = ['#ff7a3c', '#3fa7ff', '#5ad06a'];
      for (let i = 0; i < 3; i++) {
        const x = 40 + i * 56;
        ellipse(ctx, x, 46, 20, 26); fillStroke(ctx, rgba('#d8f6ff', 0.6), '#3a4a6a', 2.5);
        ellipse(ctx, x, 54, 12, 12); fillStroke(ctx, volumeFill(ctx, x, 54, 12, cols[i]), shade(cols[i], -0.5), 2);
        ellipse(ctx, x - 6, 36, 5, 8); ctx.fillStyle = rgba('#fff', 0.7); ctx.fill();
      }
      for (let i = 0; i < 5; i++) { ellipse(ctx, 30 + i * 34, 100, 6, 6); ctx.fillStyle = ['#ff5a5a', '#ffd23f', '#5ad06a', '#5ad1ff', '#b58cff'][i]; ctx.fill(); }
    },
  },
  rug: {
    w: 3 * T, h: 2 * T, foot: [3, 2], solid: false, ground: true,
    draw(ctx) {
      roundRect(ctx, 6, 6, 3 * T - 12, 2 * T - 12, 18); fillStroke(ctx, '#c0573a', '#7a2a1a', 3);
      roundRect(ctx, 18, 18, 3 * T - 36, 2 * T - 36, 12); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.stroke();
      ellipse(ctx, 96, 64, 26, 16); ctx.fillStyle = '#ffd23f'; ctx.fill();
    },
  },
  flowerbed: {
    w: 104, h: 78, foot: [1, 1], solid: false,
    draw(ctx) {
      for (const [x, y, c] of [[30, 50, '#ffffff'], [52, 40, '#ffe36b'], [74, 52, '#ffffff'], [44, 62, '#ff9de2'], [64, 64, '#ffffff']]) {
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ellipse(ctx, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.5, 4.5); ctx.fillStyle = c; ctx.fill(); }
        ellipse(ctx, x, y, 3, 3); ctx.fillStyle = '#ffcf3a'; ctx.fill();
      }
    },
  },
  mat: {
    w: T, h: T, foot: [1, 1], solid: false, ground: true,
    draw(ctx) { roundRect(ctx, 6, 16, 52, 34, 8); fillStroke(ctx, '#5aa86a', '#2a5a3a', 2.5); ctx.fillStyle = rgba('#fff', 0.4); ctx.fillRect(14, 30, 36, 4); },
  },
};

function drawHouse(ctx, roofColor, wallColor, variant) {
  const ox = 20;
  const wallTop = 2.7 * T;
  const W = 5 * T;
  shadowEllipse(ctx, ox + W / 2, 6 * T - 6, W / 2 + 14, 12, 0.25);
  plasterWall(ctx, ox, wallTop, W, 6 * T - wallTop - 4, wallColor);
  window_(ctx, ox + 26, wallTop + 34, 44, 38);
  window_(ctx, ox + W - 70, wallTop + 34, 44, 38);
  flowerBox(ctx, ox + 22, wallTop + 76, 52);
  flowerBox(ctx, ox + W - 74, wallTop + 76, 52);
  door(ctx, ox + 2 * T + 12, 6 * T - 86, 40, 76, ['#8a5530', '#5a7ab0', '#8a3a3a'][variant]);
  roof(ctx, ox, 0.55 * T, W, wallTop - 0.55 * T + 6, roofColor);
  // chaminé
  const cx = variant === 1 ? ox + 60 : ox + W - 90;
  roundRect(ctx, cx, 10, 30, 56, 3); fillStroke(ctx, '#b06a4a', '#4a2a1a', 3);
  ctx.fillStyle = '#4a2a1a'; ctx.fillRect(cx - 3, 8, 36, 8);
}

function drawCentro(ctx) {
  const ox = 20;
  const W = 7 * T;
  const wallTop = 2.9 * T;
  shadowEllipse(ctx, ox + W / 2, 6.4 * T - 6, W / 2 + 16, 14, 0.25);
  plasterWall(ctx, ox, wallTop, W, 6.4 * T - wallTop - 4, '#ffffff');
  ctx.fillStyle = '#ff7aa8'; ctx.fillRect(ox + 6, wallTop + 6, W - 12, 12);
  for (const x of [ox + 30, ox + 102, ox + W - 146, ox + W - 74]) window_(ctx, x, wallTop + 40, 44, 40, '#ffe4ef');
  // porta de vidro
  const dx = ox + 3 * T + 4; const dy = 6.4 * T - 92;
  roundRect(ctx, dx - 8, dy - 8, 72, 88, 8); fillStroke(ctx, '#ff7aa8', '#7a2a4a', 3);
  const g = ctx.createLinearGradient(dx, dy, dx + 56, dy + 80); g.addColorStop(0, '#d8f6ff'); g.addColorStop(1, '#6fb6e8');
  ctx.fillStyle = g; ctx.fillRect(dx, dy, 56, 80);
  ctx.fillStyle = '#7a2a4a'; ctx.fillRect(dx + 27, dy, 2, 80);
  // telhado
  roof(ctx, ox, 0.7 * T, W, wallTop - 0.7 * T + 6, '#ff5a8a', 18);
  // emblema
  const ex = ox + W / 2; const ey = 0.95 * T;
  ellipse(ctx, ex, ey + 24, 44, 44); fillStroke(ctx, '#ffffff', '#7a2a4a', 4);
  ctx.fillStyle = '#ff5a8a'; roundRect(ctx, ex - 9, ey - 2, 18, 52, 4); ctx.fill(); roundRect(ctx, ex - 26, ey + 15, 52, 18, 4); ctx.fill();
  // placa
  roundRect(ctx, ox + W / 2 - 90, wallTop + 98, 180, 34, 10); fillStroke(ctx, '#7a2a4a', '#3a0a1a', 3);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CENTRO MONSTRIN', ox + W / 2, wallTop + 116);
}

function drawLab(ctx) {
  const ox = 20;
  const W = 7 * T;
  const wallTop = 2.9 * T;
  shadowEllipse(ctx, ox + W / 2, 6.4 * T - 6, W / 2 + 16, 14, 0.25);
  plasterWall(ctx, ox, wallTop, W, 6.4 * T - wallTop - 4, '#eef2f8');
  ctx.fillStyle = '#8a5cf0'; ctx.fillRect(ox + 6, wallTop + 6, W - 12, 10);
  for (const x of [ox + 24, ox + 90, ox + W - 140, ox + W - 74]) window_(ctx, x, wallTop + 36, 50, 46, '#e8e0ff');
  door(ctx, ox + 3 * T + 12, 6.4 * T - 86, 40, 76, '#5a4ab0');
  roof(ctx, ox, 0.8 * T, W, wallTop - 0.8 * T + 6, '#7a5ae0', 18);
  // antena / observatório
  ellipse(ctx, ox + W - 90, 0.75 * T, 40, 32); fillStroke(ctx, volumeFill(ctx, ox + W - 90, 0.7 * T, 40, '#d8e0f0'), '#3a4a6a', 3);
  ctx.fillStyle = '#2a3a5a'; ctx.fillRect(ox + W - 96, 0.2 * T, 12, 34);
  ellipse(ctx, ox + 80, 0.6 * T, 22, 10, -0.4); fillStroke(ctx, '#e8ecf6', '#3a4a6a', 3);
  ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox + 80, 0.6 * T); ctx.lineTo(ox + 90, 1.2 * T); ctx.stroke();
  roundRect(ctx, ox + W / 2 - 90, wallTop + 98, 180, 32, 10); fillStroke(ctx, '#5a4ab0', '#2a1a5a', 3);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LABORATÓRIO ÍRIS', ox + W / 2, wallTop + 115);
}

function drawShop(ctx) {
  const ox = 20;
  const W = 5 * T;
  const wallTop = 2.7 * T;
  shadowEllipse(ctx, ox + W / 2, 6 * T - 6, W / 2 + 14, 12, 0.25);
  plasterWall(ctx, ox, wallTop, W, 6 * T - wallTop - 4, '#fff3dc');
  window_(ctx, ox + 22, wallTop + 34, 60, 44);
  window_(ctx, ox + W - 82, wallTop + 34, 60, 44);
  door(ctx, ox + 2 * T + 12, 6 * T - 86, 40, 76, '#2fb3a0');
  roof(ctx, ox, 0.55 * T, W, wallTop - 0.55 * T + 6, '#2fb3a0');
  // toldo listrado
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6b5a'; ctx.beginPath(); ctx.moveTo(ox + i * 32, wallTop + 4); ctx.lineTo(ox + (i + 1) * 32, wallTop + 4); ctx.lineTo(ox + (i + 1) * 32, wallTop + 22); ctx.quadraticCurveTo(ox + i * 32 + 16, wallTop + 32, ox + i * 32, wallTop + 22); ctx.fill(); }
  roundRect(ctx, ox + W / 2 - 60, wallTop - 30, 120, 28, 8); fillStroke(ctx, '#2fb3a0', '#0a4a40', 3);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MERCADO', ox + W / 2, wallTop - 16);
}
