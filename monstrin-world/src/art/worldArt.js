// Ilustrações do cenário (Kit Visual 01). Cada tipo de objeto do mapa pode ter
// uma ou mais ilustrações; quem não tem continua com o desenho feito por código
// (src/art/objects.js). Para novas cidades e regiões, basta acrescentar aqui.
//
//  src     : arquivos (a variação é sorteada pela posição no mapa, sempre igual)
//  w       : largura no mapa, em pixels do mundo (1 quadrado = 64)
//  originY : altura do "pé" da imagem (0 = topo, 1 = base)
//  tree    : balança suavemente com o vento
export const WORLD_ART = {
  // Construções
  house_red: { src: ['img/mundo/casa_telhado_vermelho.webp'], w: 360, originY: 0.97 },
  house_blue: { src: ['img/mundo/casa_telhado_azul.webp'], w: 360, originY: 0.97 },
  house_green: { src: ['img/mundo/casa_telhado_verde.webp'], w: 360, originY: 0.97 },
  centro: { src: ['img/mundo/centro_monstrin.webp'], w: 488, originY: 0.965 },
  lab: { src: ['img/mundo/laboratorio_iris.webp'], w: 488, originY: 0.97 },
  shop: { src: ['img/mundo/mercado.webp'], w: 360, originY: 0.97 },
  // Vegetação
  oak: { src: ['img/mundo/arvore.webp', 'img/mundo/arvore_2.webp'], w: 200, originY: 0.95, tree: true },
  oak2: { src: ['img/mundo/arvore_2.webp', 'img/mundo/arvore.webp'], w: 192, originY: 0.95, tree: true },
  blossom: { src: ['img/mundo/arvore_florida.webp'], w: 200, originY: 0.95, tree: true },
  pine: { src: ['img/mundo/arvore_escura.webp', 'img/mundo/arvore_2.webp'], w: 186, originY: 0.95, tree: true },
  bush: { src: ['img/mundo/arbusto.webp', 'img/mundo/arbusto_2.webp'], w: 112, originY: 0.93 },
  flowerbed: { src: ['img/mundo/canteiro_flores.webp'], w: 104, originY: 0.9 },
  rock: { src: ['img/mundo/rochas.webp'], w: 100, originY: 0.94 },
  bigrock: { src: ['img/mundo/rochas_grandes.webp'], w: 168, originY: 0.94 },
  // Objetos
  fenceH: { src: ['img/mundo/cerca.webp'], w: 68, originY: 0.9 },
  sign: { src: ['img/mundo/placa.webp'], w: 74, originY: 0.95 },
};

const keyOf = (file) => `wart_${file.split('/').pop().replace('.webp', '')}`;

// Lista de imagens para carregar na cena de carregamento.
export function worldArtFiles() {
  const all = new Set();
  for (const a of Object.values(WORLD_ART)) for (const f of a.src) all.add(f);
  return [...all].map((f) => ({ key: keyOf(f), url: f }));
}

// Ilustração a usar para um objeto do mapa (ou null = usar o desenho por código).
export function artFor(scene, type, x, y) {
  const a = WORLD_ART[type];
  if (!a) return null;
  const file = a.src[Math.abs(x * 7 + y * 13) % a.src.length];
  const key = keyOf(file);
  if (!scene.textures.exists(key)) return null;
  const img = scene.textures.get(key).getSourceImage();
  const s = a.w / img.width;
  if (!a.tree) return { key, sx: s, sy: s, originY: a.originY, tree: false };
  // Árvores: tamanho e lado variam um pouco (sempre iguais no mesmo lugar)
  const j = 0.88 + (Math.abs(x * 13 + y * 7) % 7) / 36;
  const flip = Math.abs(x * 31 + y * 17) % 2 === 0 ? -1 : 1;
  return { key, sx: s * j * flip, sy: s * j, originY: a.originY, tree: true };
}
