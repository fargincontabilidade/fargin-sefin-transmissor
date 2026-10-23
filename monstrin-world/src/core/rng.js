// Gerador de números aleatórios. Pode receber uma semente (útil em testes).
export function createRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let s = (seed >>> 0) || 1;
  return function mulberry32() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function weightedPick(rng, entries, weightKey = 'weight') {
  const total = entries.reduce((s, e) => s + e[weightKey], 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= e[weightKey];
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

let uidCounter = 0;
export function uid(prefix = 'm', rng = Math.random) {
  uidCounter = (uidCounter + 1) % 1296;
  const time = Date.now().toString(36);
  const rand = Math.floor(rng() * 1e9).toString(36).padStart(6, '0');
  return `${prefix}_${time}_${uidCounter.toString(36)}${rand}`;
}
