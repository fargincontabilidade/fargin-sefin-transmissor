// Espécies de Monstrins.
//
// ATENÇÃO: todas as espécies abaixo são PROVISÓRIAS (provisorio: true).
// Foram criadas apenas para tornar a primeira versão jogável enquanto os
// dados e ilustrações do Duelo Elemental não são importados. Nomes,
// atributos e evoluções podem ser substituídos sem alterar o resto do jogo.
//
// Campos:
//  base: atributos base { hp, atk, def, spd }
//  learnset: ataques aprendidos por nível
//  evolution: { to, level } (forma seguinte) — null se não evolui
//  catchRate: facilidade de captura (0..1)
//  baseXp: experiência concedida ao ser derrotado
//  behavior: comportamento no mapa: wander | shy | curious | lazy
//  art: descrição usada pelo gerador de arte (src/art/creatures.js)
export const RARITY = {
  comum: { id: 'comum', name: 'Comum', color: '#9fb0c3' },
  incomum: { id: 'incomum', name: 'Incomum', color: '#5fd38a' },
  raro: { id: 'raro', name: 'Raro', color: '#5aa8ff' },
  lendario: { id: 'lendario', name: 'Lendário', color: '#ffb52e' },
};

export const SPECIES = {
  // ---------------- Linha de Fogo (inicial) ----------------
  brasito: {
    id: 'brasito', num: 1, name: 'Brasito', element: 'fogo', rarity: 'incomum', provisorio: true,
    desc: 'Um filhote brincalhão com uma chama na ponta da cauda. Quando está feliz, a chama solta faíscas douradas.',
    base: { hp: 44, atk: 56, def: 42, spd: 60 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'brasa' }, { level: 6, move: 'rugido' }, { level: 9, move: 'bola_fogo' }, { level: 18, move: 'labareda' }, { level: 34, move: 'erupcao' }],
    evolution: { to: 'brasador', level: 16 },
    catchRate: 0.35, baseXp: 62, behavior: 'curious', locations: ['Escolha inicial'],
    art: { body: 'quad', size: 0.78, c: '#ff8a3d', b: '#ffe2b0', a: '#ffd23f', eyes: 'cute', features: ['earsPointy', 'flameTail'] },
  },
  brasador: {
    id: 'brasador', num: 2, name: 'Brasador', element: 'fogo', rarity: 'incomum', provisorio: true,
    desc: 'Sua juba de fogo cresce conforme ganha confiança. Protege o treinador com coragem.',
    base: { hp: 58, atk: 72, def: 56, spd: 76 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'brasa' }],
    evolution: { to: 'vulcarion', level: 32 },
    catchRate: 0.2, baseXp: 140, behavior: 'wander', locations: ['Evolução de Brasito'],
    art: { body: 'quad', size: 1.0, c: '#f2642a', b: '#ffd59a', a: '#ffcf3a', eyes: 'sharp', features: ['earsPointy', 'flameTail', 'flameMane'] },
  },
  vulcarion: {
    id: 'vulcarion', num: 3, name: 'Vulcarion', element: 'fogo', rarity: 'raro', provisorio: true,
    desc: 'Dizem que seus passos aquecem a terra. Sua armadura de rocha vulcânica brilha como lava.',
    base: { hp: 78, atk: 96, def: 74, spd: 88 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'labareda' }],
    evolution: null,
    catchRate: 0.08, baseXp: 230, behavior: 'wander', locations: ['Evolução de Brasador'],
    art: { body: 'quad', size: 1.32, c: '#d9431e', b: '#ffb36b', a: '#ffcf3a', eyes: 'sharp', features: ['horns', 'flameTail', 'flameMane', 'rockPlates'] },
  },

  // ---------------- Linha de Água (inicial) ----------------
  gotinho: {
    id: 'gotinho', num: 4, name: 'Gotinho', element: 'agua', rarity: 'incomum', provisorio: true,
    desc: 'Uma gotinha curiosa que adora poças. Solta bolhas quando dá risada.',
    base: { hp: 50, atk: 48, def: 56, spd: 48 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'jato_agua' }, { level: 6, move: 'barreira' }, { level: 9, move: 'bolhas' }, { level: 18, move: 'onda' }, { level: 34, move: 'redemoinho' }],
    evolution: { to: 'marolho', level: 16 },
    catchRate: 0.35, baseXp: 62, behavior: 'curious', locations: ['Escolha inicial'],
    art: { body: 'blob', size: 0.8, c: '#4fb6ff', b: '#d8f3ff', a: '#8fe0ff', eyes: 'cute', features: ['waterCrest', 'finTail'] },
  },
  marolho: {
    id: 'marolho', num: 5, name: 'Marolho', element: 'agua', rarity: 'incomum', provisorio: true,
    desc: 'Surfa nas próprias ondas que cria. Muito leal e brincalhão.',
    base: { hp: 66, atk: 62, def: 72, spd: 60 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'jato_agua' }],
    evolution: { to: 'maremonte', level: 32 },
    catchRate: 0.2, baseXp: 140, behavior: 'wander', locations: ['Evolução de Gotinho'],
    art: { body: 'biped', size: 1.0, c: '#2f8de8', b: '#cdeeff', a: '#8fe0ff', eyes: 'sharp', features: ['waterCrest', 'finTail', 'fins'] },
  },
  maremonte: {
    id: 'maremonte', num: 6, name: 'Maremonte', element: 'agua', rarity: 'raro', provisorio: true,
    desc: 'Carrega um recife vivo nas costas. Acalma tempestades com um só rugido.',
    base: { hp: 92, atk: 80, def: 96, spd: 62 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'onda' }],
    evolution: null,
    catchRate: 0.08, baseXp: 230, behavior: 'lazy', locations: ['Evolução de Marolho'],
    art: { body: 'quad', size: 1.35, c: '#1f6fc7', b: '#bfe6ff', a: '#6fe3d0', eyes: 'sharp', features: ['shell', 'waterCrest', 'finTail'] },
  },

  // ---------------- Linha de Planta (inicial) ----------------
  brotim: {
    id: 'brotim', num: 7, name: 'Brotim', element: 'planta', rarity: 'incomum', provisorio: true,
    desc: 'Um brotinho sorridente que adora tomar sol. O broto da cabeça balança quando anda.',
    base: { hp: 54, atk: 50, def: 54, spd: 44 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'folha_cortante' }, { level: 6, move: 'rugido' }, { level: 9, move: 'chicote_cipo' }, { level: 13, move: 'raizes' }, { level: 22, move: 'espinhos' }],
    evolution: { to: 'ramalhao', level: 16 },
    catchRate: 0.35, baseXp: 62, behavior: 'curious', locations: ['Escolha inicial'],
    art: { body: 'blob', size: 0.8, c: '#7bd65a', b: '#e8ffd0', a: '#ff8fb1', eyes: 'cute', features: ['leafSprout'] },
  },
  ramalhao: {
    id: 'ramalhao', num: 8, name: 'Ramalhão', element: 'planta', rarity: 'incomum', provisorio: true,
    desc: 'Os ramos dos seus braços florescem na primavera. Cuida das plantas da floresta.',
    base: { hp: 70, atk: 66, def: 70, spd: 56 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'folha_cortante' }],
    evolution: { to: 'silvarok', level: 32 },
    catchRate: 0.2, baseXp: 140, behavior: 'wander', locations: ['Evolução de Brotim'],
    art: { body: 'biped', size: 1.0, c: '#4fb34a', b: '#dcffc0', a: '#ff8fb1', eyes: 'sharp', features: ['leafCrown', 'leafArms'] },
  },
  silvarok: {
    id: 'silvarok', num: 9, name: 'Silvarok', element: 'planta', rarity: 'raro', provisorio: true,
    desc: 'Uma árvore antiga cresce em suas costas. Onde ele dorme, nasce uma clareira florida.',
    base: { hp: 90, atk: 88, def: 90, spd: 64 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'espinhos' }],
    evolution: null,
    catchRate: 0.08, baseXp: 230, behavior: 'lazy', locations: ['Evolução de Ramalhão'],
    art: { body: 'quad', size: 1.35, c: '#3a8f3c', b: '#cfeeb0', a: '#ff8fb1', eyes: 'sharp', features: ['treeBack', 'horns'] },
  },

  // ---------------- Selvagens do Bosque Sussurrante ----------------
  faiscol: {
    id: 'faiscol', num: 10, name: 'Faíscol', element: 'eletrico', rarity: 'incomum', provisorio: true,
    desc: 'Suas antenas captam a eletricidade do ar. Quando se assusta, solta um zumbido e some num piscar.',
    base: { hp: 42, atk: 54, def: 40, spd: 74 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'faisca' }, { level: 5, move: 'clarao' }, { level: 10, move: 'esfera_eletrica' }, { level: 24, move: 'raio_trovejante' }],
    evolution: { to: 'voltrino', level: 20 },
    catchRate: 0.42, baseXp: 58, behavior: 'shy', locations: ['Bosque Sussurrante'],
    art: { body: 'egg', size: 0.72, c: '#7fd9e8', b: '#f2fdff', a: '#ffe14a', eyes: 'cute', features: ['antennae', 'boltTail', 'stripes'] },
  },
  voltrino: {
    id: 'voltrino', num: 11, name: 'Voltrino', element: 'eletrico', rarity: 'raro', provisorio: true,
    desc: 'Sua crina carregada ilumina florestas escuras. Ágil e orgulhoso, corre mais rápido que o trovão.',
    base: { hp: 62, atk: 78, def: 56, spd: 96 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'faisca' }],
    evolution: null,
    catchRate: 0.15, baseXp: 150, behavior: 'wander', locations: ['Evolução de Faíscol'],
    art: { body: 'quad', size: 1.05, c: '#4fc3d9', b: '#e6fbff', a: '#ffe14a', eyes: 'sharp', features: ['antennae', 'boltTail', 'mane', 'stripes'] },
  },
  pedrolho: {
    id: 'pedrolho', num: 12, name: 'Pedrolho', element: 'pedra', rarity: 'comum', provisorio: true,
    desc: 'Parece uma pedra comum até abrir os olhos. Dorme em qualquer lugar.',
    base: { hp: 50, atk: 52, def: 66, spd: 30 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'pedrada' }, { level: 6, move: 'barreira' }, { level: 11, move: 'fragmentos' }, { level: 19, move: 'tremor' }, { level: 30, move: 'onda_choque' }],
    evolution: { to: 'rochedonte', level: 22 },
    catchRate: 0.55, baseXp: 52, behavior: 'lazy', locations: ['Bosque Sussurrante'],
    art: { body: 'egg', size: 0.78, c: '#a89880', b: '#d9cdb8', a: '#7ad1a0', eyes: 'sleepy', features: ['rockPlates'] },
  },
  rochedonte: {
    id: 'rochedonte', num: 13, name: 'Rochedonte', element: 'pedra', rarity: 'incomum', provisorio: true,
    desc: 'Forte como uma montanha. Seus chifres de pedra nunca param de crescer.',
    base: { hp: 72, atk: 78, def: 92, spd: 38 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'pedrada' }],
    evolution: null,
    catchRate: 0.2, baseXp: 150, behavior: 'lazy', locations: ['Evolução de Pedrolho'],
    art: { body: 'biped', size: 1.25, c: '#8c7a62', b: '#cdbfa5', a: '#7ad1a0', eyes: 'sharp', features: ['rockPlates', 'horns'] },
  },
  cogumi: {
    id: 'cogumi', num: 14, name: 'Cogumi', element: 'planta', rarity: 'comum', provisorio: true,
    desc: 'Vive em grupos à sombra das árvores. Seu chapéu solta esporos que cheiram a chuva.',
    base: { hp: 48, atk: 44, def: 50, spd: 40 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'folha_cortante' }, { level: 7, move: 'raizes' }, { level: 12, move: 'brilho_restaurador' }, { level: 20, move: 'espinhos' }],
    evolution: null,
    catchRate: 0.6, baseXp: 48, behavior: 'wander', locations: ['Bosque Sussurrante'],
    art: { body: 'egg', size: 0.68, c: '#f4e7d2', b: '#fff8ea', a: '#e8453c', eyes: 'cute', features: ['mushroomCap'] },
  },
  bolhuga: {
    id: 'bolhuga', num: 15, name: 'Bolhuga', element: 'agua', rarity: 'comum', provisorio: true,
    desc: 'Uma rãzinha que canta ao entardecer. Infla as bochechas para soltar bolhas.',
    base: { hp: 52, atk: 46, def: 46, spd: 50 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'jato_agua' }, { level: 6, move: 'bolhas' }, { level: 14, move: 'onda' }],
    evolution: null,
    catchRate: 0.6, baseXp: 50, behavior: 'wander', locations: ['Bosque Sussurrante (lago)'],
    art: { body: 'frog', size: 0.74, c: '#5fd0c0', b: '#e0fff6', a: '#ffcf5a', eyes: 'cute', features: [] },
  },
  fagulino: {
    id: 'fagulino', num: 16, name: 'Fagulino', element: 'fogo', rarity: 'incomum', provisorio: true,
    desc: 'Um passarinho de penas mornas. Seu topete pega fogo quando fica bravo.',
    base: { hp: 44, atk: 56, def: 40, spd: 66 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'brasa' }, { level: 8, move: 'bola_fogo' }, { level: 16, move: 'labareda' }],
    evolution: null,
    catchRate: 0.42, baseXp: 58, behavior: 'shy', locations: ['Bosque Sussurrante'],
    art: { body: 'bird', size: 0.7, c: '#ff9d4d', b: '#ffe9c4', a: '#ff4f3a', eyes: 'cute', features: ['flameCrest'] },
  },
  cristalume: {
    id: 'cristalume', num: 17, name: 'Cristalume', element: 'pedra', rarity: 'raro', provisorio: true,
    desc: 'Raríssimo. Cristais brilhantes crescem em seu corpo e refletem a luz da lua.',
    base: { hp: 56, atk: 60, def: 82, spd: 58 },
    learnset: [{ level: 1, move: 'investida' }, { level: 1, move: 'pedrada' }, { level: 1, move: 'barreira' }, { level: 9, move: 'fragmentos' }, { level: 16, move: 'brilho_restaurador' }, { level: 24, move: 'onda_choque' }],
    evolution: null,
    catchRate: 0.18, baseXp: 120, behavior: 'shy', locations: ['Bosque Sussurrante (área rochosa) — raro'],
    art: { body: 'blob', size: 0.8, c: '#b9a8f0', b: '#efe8ff', a: '#7fe9ff', eyes: 'cute', features: ['crystals'], glow: '#9ff3ff' },
  },
  trovarion: {
    id: 'trovarion', num: 18, name: 'Trovarion', element: 'eletrico', rarity: 'lendario', provisorio: true,
    desc: 'Lenda dos céus de Aurora. Dizem que aparece apenas durante tempestades de verão.',
    base: { hp: 90, atk: 110, def: 80, spd: 115 },
    learnset: [{ level: 1, move: 'faisca' }, { level: 1, move: 'raio_trovejante' }, { level: 1, move: 'clarao' }, { level: 1, move: 'esfera_eletrica' }],
    evolution: null,
    catchRate: 0.03, baseXp: 300, behavior: 'shy', locations: ['Desconhecido'],
    art: { body: 'quad', size: 1.6, c: '#3c4fd8', b: '#c8d4ff', a: '#ffe14a', eyes: 'sharp', features: ['wings', 'boltTail', 'mane', 'horns'], glow: '#ffe14a' },
  },
};

export const STARTERS = ['brasito', 'gotinho', 'brotim'];

export function getSpecies(id) {
  const s = SPECIES[id];
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}

export function speciesList() {
  return Object.values(SPECIES).sort((a, b) => a.num - b.num);
}

// Linha evolutiva completa de uma espécie (do primeiro ao último estágio).
export function evolutionLine(id) {
  let first = id;
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of Object.values(SPECIES)) {
      if (s.evolution && s.evolution.to === first) { first = s.id; changed = true; }
    }
  }
  const line = [first];
  let cur = SPECIES[first];
  while (cur && cur.evolution) { line.push(cur.evolution.to); cur = SPECIES[cur.evolution.to]; }
  return line;
}
