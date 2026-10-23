// Ferramentas para montar mapas de forma simples e modular.
// Um mapa novo = um arquivo em src/data/maps/ usando estas funções,
// registrado em src/data/maps/index.js.

export class MapBuilder {
  constructor(id, name, width, height, fill = '.') {
    this.def = {
      id, name, width, height,
      ground: Array.from({ length: height }, () => Array(width).fill(fill)),
      objects: [], npcs: [], warps: [], spawns: [], zones: [], blockers: [],
      region: 'Aurora', ambient: 'day', seed: id.length * 97,
    };
    this.reserved = Array.from({ length: height }, () => Array(width).fill(false));
  }

  in(x, y) { return x >= 0 && y >= 0 && x < this.def.width && y < this.def.height; }

  set(x, y, ch) { if (this.in(x, y)) this.def.ground[y][x] = ch; return this; }
  get(x, y) { return this.in(x, y) ? this.def.ground[y][x] : null; }

  rect(x, y, w, h, ch) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch); return this; }

  // Caminho em "L" ou reto entre pontos, com largura.
  path(points, ch = 'p', width = 2) {
    for (let k = 0; k < points.length - 1; k++) {
      const [x0, y0] = points[k];
      const [x1, y1] = points[k + 1];
      if (y0 === y1) this.rect(Math.min(x0, x1), y0, Math.abs(x1 - x0) + width, width, ch);
      else if (x0 === x1) this.rect(x0, Math.min(y0, y1), width, Math.abs(y1 - y0) + width, ch);
      else { this.path([[x0, y0], [x1, y0], [x1, y1]], ch, width); }
    }
    return this;
  }

  ellipse(cx, cy, rx, ry, ch) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx; const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, ch);
      }
    }
    return this;
  }

  reserve(x, y, w = 1, h = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.in(i, j)) this.reserved[j][i] = true; }

  isFree(x, y, w = 1, h = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (!this.in(i, j) || this.reserved[j][i]) return false;
      const g = this.def.ground[j][i];
      if (!['.', ',', 'f', 'r', 's'].includes(g)) return false;
    }
    return true;
  }

  obj(type, x, y, extra = {}, foot = [1, 1]) {
    this.def.objects.push({ type, x, y, ...extra });
    this.reserve(x, y, foot[0], foot[1]);
    return this;
  }

  // Coloca objetos de 1x1 em várias posições
  many(type, positions) { for (const [x, y] of positions) this.obj(type, x, y); return this; }

  // Borda de floresta densa ao redor do mapa (com aberturas)
  forestBorder(thickness, gaps = [], seed = 1, types = ['oak', 'oak2', 'pine']) {
    const { width: W, height: H } = this.def;
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
    const inGap = (x, y) => gaps.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = x < thickness || y < thickness || x >= W - thickness || y >= H - thickness;
      if (!edge || inGap(x, y) || this.reserved[y][x]) continue;
      this.obj(types[Math.floor(rnd() * types.length)], x, y);
    }
    return this;
  }

  // Espalha objetos aleatoriamente numa área (só em células livres)
  scatter(type, x, y, w, h, count, seed = 3) {
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
    let placed = 0; let tries = 0;
    const types = Array.isArray(type) ? type : [type];
    while (placed < count && tries++ < count * 30) {
      const px = x + Math.floor(rnd() * w); const py = y + Math.floor(rnd() * h);
      if (!this.isFree(px, py)) continue;
      this.obj(types[Math.floor(rnd() * types.length)], px, py);
      placed++;
    }
    return this;
  }

  building(type, x, y, foot, door, warp) {
    this.def.objects.push({ type, x, y });
    this.reserve(x, y, foot[0], foot[1] + 1);
    if (warp) this.def.warps.push({ x: x + door[0], y: y + door[1], w: 1, h: 1, ...warp, door: true });
    else this.def.objects[this.def.objects.length - 1].lockedDoor = { x: x + door[0], y: y + door[1] };
    return this;
  }

  npc(n) { this.def.npcs.push(n); this.reserve(n.x, n.y); return this; }
  warp(w) { this.def.warps.push(w); return this; }
  spawn(s) { this.def.spawns.push(s); return this; }
  zone(z) { this.def.zones.push(z); return this; }
  blocker(b) { this.def.blockers.push(b); return this; }

  build(extra = {}) {
    const d = this.def;
    return { ...d, ...extra, ground: d.ground.map((r) => r.join('')) };
  }
}
