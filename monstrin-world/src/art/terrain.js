// Pintura do chão dos mapas (grama, caminhos, água, areia, pisos...).
// Tudo é desenhado por código, com bordas arredondadas e texturas,
// para evitar a aparência de "quadradinhos" de jogos antigos.
import { shade, rgba, seeded, ellipse, makeCanvas, roundRect } from './draw.js';

export const TERRAIN = {
  '.': { id: 'grass', walk: true },
  ',': { id: 'grassDark', walk: true },
  f: { id: 'flowers', walk: true },
  p: { id: 'path', walk: true },
  c: { id: 'cobble', walk: true },
  s: { id: 'sand', walk: true },
  r: { id: 'rocky', walk: true },
  w: { id: 'water', walk: false },
  b: { id: 'bridge', walk: true },
  F: { id: 'wood', walk: true },
  T: { id: 'tiles', walk: true },
  X: { id: 'void', walk: false },
};

const PAL = {
  grass: '#7ccb5a',
  grassDark: '#5fae4a',
  path: '#d9b47c',
  cobble: '#c9c2b4',
  sand: '#f1dca2',
  rocky: '#a99f8e',
  water: '#3fa7e6',
  wood: '#c48a55',
  tiles: '#e9e2f2',
};

function texture(size, base, painter, seed) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  painter(ctx, size, seeded(seed));
  return c;
}

// Texturas pintadas (Kit Visual 02) que substituem as geradas por código.
// São carregadas na BootScene; se faltarem, fica a textura gerada.
export const TERRAIN_IMAGES = {};

function makePatterns(ctx) {
  const pats = {};
  pats.grass = ctx.createPattern(texture(256, PAL.grass, (g, n, r) => {
    for (let i = 0; i < 90; i++) { g.fillStyle = rgba(r() < 0.5 ? '#9be070' : '#5fae4a', 0.35); ellipse(g, r() * n, r() * n, 6 + r() * 14, 4 + r() * 8); g.fill(); }
    for (let i = 0; i < 520; i++) {
      const x = r() * n; const y = r() * n; const h = 4 + r() * 7;
      g.strokeStyle = rgba(r() < 0.55 ? '#4f9e3b' : '#a6e57c', 0.75); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - h); g.stroke();
    }
  }, 11), 'repeat');
  pats.grassDark = ctx.createPattern(texture(256, PAL.grassDark, (g, n, r) => {
    for (let i = 0; i < 80; i++) { g.fillStyle = rgba(r() < 0.5 ? '#7cc65e' : '#4a8f3a', 0.35); ellipse(g, r() * n, r() * n, 8 + r() * 16, 5 + r() * 9); g.fill(); }
    for (let i = 0; i < 520; i++) {
      const x = r() * n; const y = r() * n; const h = 4 + r() * 8;
      g.strokeStyle = rgba(r() < 0.6 ? '#3e7f30' : '#86cf68', 0.7); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - h); g.stroke();
    }
  }, 12), 'repeat');
  pats.path = ctx.createPattern(texture(256, PAL.path, (g, n, r) => {
    for (let i = 0; i < 70; i++) { g.fillStyle = rgba(r() < 0.5 ? '#e8c995' : '#c49a62', 0.4); ellipse(g, r() * n, r() * n, 8 + r() * 16, 5 + r() * 8); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = r() * n; const y = r() * n; const s = 2 + r() * 4; g.fillStyle = rgba('#a78457', 0.8); ellipse(g, x, y, s, s * 0.7); g.fill(); g.fillStyle = rgba('#f4dfb7', 0.8); ellipse(g, x - 0.8, y - 0.8, s * 0.5, s * 0.35); g.fill(); }
  }, 13), 'repeat');
  pats.cobble = ctx.createPattern(texture(128, '#b3ab9c', (g, n, r) => {
    const s = 32;
    for (let y = 0; y < n; y += s) for (let x = -(y / s % 2) * s / 2; x < n; x += s) {
      const c = shade('#d4cdbf', (r() - 0.5) * 0.12);
      roundRect(g, x + 2, y + 2, s - 4, s - 4, 8); g.fillStyle = c; g.fill();
      g.fillStyle = rgba('#ffffff', 0.25); roundRect(g, x + 4, y + 4, s - 10, 6, 3); g.fill();
    }
  }, 14), 'repeat');
  pats.sand = ctx.createPattern(texture(256, PAL.sand, (g, n, r) => {
    for (let i = 0; i < 900; i++) { g.fillStyle = rgba(r() < 0.5 ? '#d9bf80' : '#fff3c8', 0.6); g.fillRect(r() * n, r() * n, 1.5, 1.5); }
  }, 15), 'repeat');
  pats.rocky = ctx.createPattern(texture(256, PAL.rocky, (g, n, r) => {
    for (let i = 0; i < 60; i++) { g.fillStyle = rgba(r() < 0.5 ? '#bdb3a2' : '#8a8070', 0.5); ellipse(g, r() * n, r() * n, 6 + r() * 14, 4 + r() * 8); g.fill(); }
    for (let i = 0; i < 90; i++) { const x = r() * n; const y = r() * n; const s = 2 + r() * 5; g.fillStyle = '#7d7466'; ellipse(g, x, y, s, s * 0.7); g.fill(); g.fillStyle = '#cfc6b6'; ellipse(g, x - 1, y - 1, s * 0.5, s * 0.35); g.fill(); }
  }, 16), 'repeat');
  pats.water = ctx.createPattern(texture(256, PAL.water, (g, n, r) => {
    for (let i = 0; i < 40; i++) { g.fillStyle = rgba(r() < 0.5 ? '#5cc0f5' : '#2f8fd0', 0.5); ellipse(g, r() * n, r() * n, 20 + r() * 30, 6 + r() * 8); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = r() * n; const y = r() * n; g.strokeStyle = rgba('#d8f4ff', 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16, y); g.stroke(); }
  }, 17), 'repeat');
  pats.wood = ctx.createPattern(texture(128, PAL.wood, (g, n, r) => {
    const h = 16;
    for (let y = 0; y < n; y += h) {
      g.fillStyle = shade(PAL.wood, (r() - 0.5) * 0.14); g.fillRect(0, y, n, h - 1);
      g.fillStyle = rgba('#7a4f2a', 0.6); g.fillRect(0, y + h - 2, n, 2);
      const off = r() * n; g.fillRect(off, y, 2, h);
      for (let k = 0; k < 4; k++) { g.strokeStyle = rgba('#a06a3a', 0.35); g.lineWidth = 1; g.beginPath(); const yy = y + 3 + r() * (h - 6); g.moveTo(r() * n, yy); g.lineTo(r() * n, yy); g.stroke(); }
    }
  }, 18), 'repeat');
  pats.tiles = ctx.createPattern(texture(128, PAL.tiles, (g, n) => {
    const s = 32;
    for (let y = 0; y < n; y += s) for (let x = 0; x < n; x += s) {
      g.fillStyle = (x / s + y / s) % 2 ? '#f6f2fb' : '#dcd3ea';
      g.fillRect(x, y, s, s);
      g.fillStyle = rgba('#ffffff', 0.5); g.fillRect(x + 2, y + 2, s - 4, 3);
    }
  }, 19), 'repeat');
  if (TERRAIN_IMAGES.water) pats.water = ctx.createPattern(TERRAIN_IMAGES.water, 'repeat');
  if (TERRAIN_IMAGES.cobble) pats.cobble = ctx.createPattern(TERRAIN_IMAGES.cobble, 'repeat');
  return pats;
}

// Constrói o contorno de todas as células de um tipo (com cantos arredondados
// onde a área termina), opcionalmente expandido para criar bordas.
function regionPath(ctx, grid, chars, T, expand, rnd) {
  const H = grid.length;
  const W = grid[0].length;
  const is = (x, y) => y >= 0 && y < H && x >= 0 && x < W && chars.includes(grid[y][x]);
  ctx.beginPath();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!is(x, y)) continue;
      const up = is(x, y - 1); const dn = is(x, y + 1); const lf = is(x - 1, y); const rt = is(x + 1, y);
      const R = T * 0.42;
      const ex = expand;
      const x0 = x * T - (lf ? 0 : ex); const x1 = (x + 1) * T + (rt ? 0 : ex);
      const y0 = y * T - (up ? 0 : ex); const y1 = (y + 1) * T + (dn ? 0 : ex);
      const rTL = !up && !lf ? R : 0; const rTR = !up && !rt ? R : 0;
      const rBR = !dn && !rt ? R : 0; const rBL = !dn && !lf ? R : 0;
      ctx.moveTo(x0 + rTL, y0);
      ctx.lineTo(x1 - rTR, y0); if (rTR) ctx.quadraticCurveTo(x1, y0, x1, y0 + rTR);
      ctx.lineTo(x1, y1 - rBR); if (rBR) ctx.quadraticCurveTo(x1, y1, x1 - rBR, y1);
      ctx.lineTo(x0 + rBL, y1); if (rBL) ctx.quadraticCurveTo(x0, y1, x0, y1 - rBL);
      ctx.lineTo(x0, y0 + rTL); if (rTL) ctx.quadraticCurveTo(x0, y0, x0 + rTL, y0);
      ctx.closePath();
      // pequenas irregularidades nas bordas
      if (rnd && ex > 0) {
        const bumps = [];
        if (!up) bumps.push([x * T + T * (0.25 + rnd() * 0.5), y0]);
        if (!dn) bumps.push([x * T + T * (0.25 + rnd() * 0.5), y1]);
        if (!lf) bumps.push([x0, y * T + T * (0.25 + rnd() * 0.5)]);
        if (!rt) bumps.push([x1, y * T + T * (0.25 + rnd() * 0.5)]);
        for (const [bx, by] of bumps) { const r = ex * (0.4 + rnd() * 0.6); ctx.moveTo(bx + r, by); ctx.arc(bx, by, r, 0, Math.PI * 2); }
      }
    }
  }
}

function paintRegion(ctx, grid, chars, T, layers, seed) {
  for (const L of layers) {
    regionPath(ctx, grid, chars, T, L.expand, L.bumpy ? seeded(seed) : null);
    if (L.shadow) { ctx.save(); ctx.shadowColor = L.shadow; ctx.shadowBlur = L.blur || 10; ctx.shadowOffsetY = L.offY || 0; }
    ctx.fillStyle = L.fill;
    ctx.fill('nonzero');
    if (L.shadow) ctx.restore();
  }
}

function decorateGrass(ctx, grid, T, rnd) {
  const H = grid.length;
  const W = grid[0].length;
  const flowerColors = ['#ffffff', '#ffe36b', '#ff8fb1', '#b58cff', '#ff6b5a'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = grid[y][x];
    if (ch === 'f') {
      for (let i = 0; i < 7; i++) {
        const fx = x * T + 8 + rnd() * (T - 16); const fy = y * T + 8 + rnd() * (T - 16);
        const col = flowerColors[Math.floor(rnd() * flowerColors.length)];
        ctx.strokeStyle = '#3f8a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy + 2); ctx.lineTo(fx, fy + 8); ctx.stroke();
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ellipse(ctx, fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.8, 2.8); ctx.fillStyle = col; ctx.fill(); }
        ellipse(ctx, fx, fy, 2, 2); ctx.fillStyle = '#ffcf3a'; ctx.fill();
      }
    } else if ((ch === '.' || ch === ',') && rnd() < 0.08) {
      const fx = x * T + 10 + rnd() * (T - 20); const fy = y * T + 10 + rnd() * (T - 20);
      const col = flowerColors[Math.floor(rnd() * flowerColors.length)];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ellipse(ctx, fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2.2, 2.2); ctx.fillStyle = col; ctx.fill(); }
    } else if ((ch === '.' || ch === ',') && rnd() < 0.12) {
      // tufinhos
      const fx = x * T + rnd() * T; const fy = y * T + rnd() * T;
      ctx.strokeStyle = rgba('#3c8a2e', 0.8); ctx.lineWidth = 2.2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(fx + k * 2, fy); ctx.lineTo(fx + k * 3.5, fy - 7 - Math.abs(k) * -1); ctx.stroke(); }
    }
  }
}

function paintBridge(ctx, grid, T) {
  const H = grid.length; const W = grid[0].length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== 'b') continue;
    const horizontal = (grid[y][x - 1] === 'b' || grid[y][x + 1] === 'b' || grid[y][x - 1] === 'p' || grid[y][x + 1] === 'p');
    ctx.save();
    ctx.translate(x * T, y * T);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 6, T, T);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const c = shade('#b07a46', (i % 2 ? -0.06 : 0.04));
      if (horizontal) { roundRect(ctx, i * (T / n) + 1, 2, T / n - 2, T - 4, 3); }
      else { roundRect(ctx, 2, i * (T / n) + 1, T - 4, T / n - 2, 3); }
      ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = '#6b4424'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = '#5a3a1e';
    if (horizontal) { ctx.fillRect(0, 0, T, 5); ctx.fillRect(0, T - 5, T, 5); }
    else { ctx.fillRect(0, 0, 5, T); ctx.fillRect(T - 5, 0, 5, T); }
    ctx.restore();
  }
}

function paintInteriorWalls(ctx, grid, T) {
  const H = grid.length; const W = grid[0].length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== 'X') continue;
    const below = y + 1 < H ? grid[y + 1][x] : 'X';
    ctx.fillStyle = '#2b2440';
    ctx.fillRect(x * T, y * T, T, T);
    if (below !== 'X') {
      // parede visível
      const g = ctx.createLinearGradient(0, y * T, 0, (y + 1) * T);
      g.addColorStop(0, '#f3e6d0'); g.addColorStop(1, '#e2cfb0');
      ctx.fillStyle = g; ctx.fillRect(x * T, y * T - T * 0.6, T, T * 1.6);
      ctx.fillStyle = '#c99a6a'; ctx.fillRect(x * T, (y + 1) * T - 10, T, 10);
      ctx.fillStyle = rgba('#000000', 0.12); ctx.fillRect(x * T, (y + 1) * T, T, 8);
      ctx.strokeStyle = rgba('#b89870', 0.35); ctx.lineWidth = 2;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x * T + k * T / 4, y * T - T * 0.6); ctx.lineTo(x * T + k * T / 4, (y + 1) * T - 10); ctx.stroke(); }
    }
  }
  // topo das paredes
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== 'X') continue;
    const below = y + 1 < H ? grid[y + 1][x] : 'X';
    if (below !== 'X') { ctx.fillStyle = '#4a3d6a'; ctx.fillRect(x * T, y * T - T * 0.6 - 6, T, 8); }
  }
}

// Pinta o chão inteiro do mapa num canvas grande.
export function paintGround(grid, T, seed = 1) {
  const H = grid.length;
  const W = grid[0].length;
  const canvas = makeCanvas(W * T, H * T);
  const ctx = canvas.getContext('2d');
  const pats = makePatterns(ctx);
  const rnd = seeded(seed);
  const interior = grid.some((row) => row.includes('F') || row.includes('T'));

  if (interior) {
    ctx.fillStyle = '#2b2440'; ctx.fillRect(0, 0, W * T, H * T);
    paintRegion(ctx, grid, ['F'], T, [{ expand: 0, fill: pats.wood }], seed);
    paintRegion(ctx, grid, ['T'], T, [{ expand: 0, fill: pats.tiles }], seed);
    paintInteriorWalls(ctx, grid, T);
    return canvas;
  }

  ctx.fillStyle = pats.grass;
  ctx.fillRect(0, 0, W * T, H * T);
  paintRegion(ctx, grid, [','], T, [{ expand: 10, fill: rgba('#5fae4a', 0.6), bumpy: true }, { expand: 0, fill: pats.grassDark }], seed + 1);
  paintRegion(ctx, grid, ['r'], T, [{ expand: 10, fill: rgba('#7e7462', 0.5), bumpy: true }, { expand: 4, fill: pats.rocky, bumpy: true }], seed + 2);
  paintRegion(ctx, grid, ['s'], T, [{ expand: 10, fill: '#e2c98a', bumpy: true }, { expand: 4, fill: pats.sand, bumpy: true }], seed + 3);
  paintRegion(ctx, grid, ['p', 'b'], T, [{ expand: 9, fill: rgba('#8a6a3e', 0.55), bumpy: true }, { expand: 5, fill: pats.path, bumpy: true }], seed + 4);
  paintRegion(ctx, grid, ['c'], T, [{ expand: 6, fill: '#8f8676' }, { expand: 2, fill: pats.cobble }], seed + 5);
  // água: margem de areia + espuma + água + brilho
  paintRegion(ctx, grid, ['w', 'b'], T, [
    { expand: 14, fill: '#d9c690', bumpy: true },
    { expand: 7, fill: '#bfe9ff', bumpy: true },
    { expand: 2, fill: pats.water },
  ], seed + 6);
  // sombra interna nas bordas da água (profundidade)
  ctx.save();
  regionPath(ctx, grid, ['w', 'b'], T, 2, null);
  ctx.clip();
  ctx.lineWidth = 14; ctx.strokeStyle = rgba('#1d6fb0', 0.35);
  regionPath(ctx, grid, ['w', 'b'], T, -4, null);
  ctx.stroke();
  ctx.restore();
  paintBridge(ctx, grid, T);
  decorateGrass(ctx, grid, T, rnd);
  return canvas;
}

export function isWalkableChar(ch) {
  const t = TERRAIN[ch];
  return t ? t.walk : true;
}
