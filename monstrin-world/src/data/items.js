// Itens do jogo. Para criar um item novo, basta adicioná-lo aqui.
// category: captura | recuperacao | runa | especial | missao
export const ITEM_CATEGORIES = {
  captura: { id: 'captura', name: 'Captura', icon: '💠' },
  recuperacao: { id: 'recuperacao', name: 'Recuperação', icon: '🧪' },
  runa: { id: 'runa', name: 'Runas de Técnica', icon: '🔮' },
  especial: { id: 'especial', name: 'Especiais', icon: '⭐' },
  missao: { id: 'missao', name: 'Missão', icon: '📜' },
};

export const ITEMS = {
  // ---------- Captura: Selos de Vínculo (cristal hexagonal original) ----------
  selo_vinculo: {
    id: 'selo_vinculo', name: 'Selo de Vínculo', category: 'captura', price: 100,
    desc: 'Cristal hexagonal que cria um laço de amizade com um Monstrin selvagem enfraquecido.',
    catchMult: 1, color: '#5ad1ff', usableIn: ['battle-wild'],
  },
  selo_aurora: {
    id: 'selo_aurora', name: 'Selo Aurora', category: 'captura', price: 250,
    desc: 'Selo lapidado com luz da aurora. Chance de captura bem maior.',
    catchMult: 1.6, color: '#ff9de2', usableIn: ['battle-wild'],
  },

  // ---------- Recuperação ----------
  tonico: {
    id: 'tonico', name: 'Tônico de Frutas', category: 'recuperacao', price: 60,
    desc: 'Recupera 30 PV de um Monstrin.', heal: 30, usableIn: ['battle', 'field'],
  },
  super_tonico: {
    id: 'super_tonico', name: 'Super Tônico', category: 'recuperacao', price: 150,
    desc: 'Recupera 80 PV de um Monstrin.', heal: 80, usableIn: ['battle', 'field'],
  },
  erva_despertar: {
    id: 'erva_despertar', name: 'Erva do Despertar', category: 'recuperacao', price: 300,
    desc: 'Reanima um Monstrin desmaiado com metade dos PV.', revive: 0.5, usableIn: ['battle', 'field'],
  },

  // ---------- Runas de Técnica ----------
  runa_fogo: {
    id: 'runa_fogo', name: 'Runa de Fogo', category: 'runa', price: 800, rarity: 'incomum',
    element: 'fogo', teaches: 'labareda', compatible: { elements: ['fogo'] }, minLevel: 5,
    desc: 'Ensina Labareda a um Monstrin de Fogo.', usableIn: ['field'],
  },
  runa_raio: {
    id: 'runa_raio', name: 'Runa de Raio', category: 'runa', price: 800, rarity: 'incomum',
    element: 'eletrico', teaches: 'esfera_eletrica', compatible: { elements: ['eletrico', 'agua'] }, minLevel: 5,
    desc: 'Ensina Esfera Elétrica a Monstrins de Elétrico ou Água.', usableIn: ['field'],
  },
  runa_protecao: {
    id: 'runa_protecao', name: 'Runa de Proteção', category: 'runa', price: 500, rarity: 'comum',
    element: 'neutro', teaches: 'barreira', compatible: { elements: ['fogo', 'agua', 'planta', 'eletrico', 'pedra'] }, minLevel: 1,
    desc: 'Ensina Barreira Prismática a qualquer Monstrin.', usableIn: ['field'],
  },
  runa_pedra: {
    id: 'runa_pedra', name: 'Runa de Pedra', category: 'runa', price: 800, rarity: 'incomum',
    element: 'pedra', teaches: 'fragmentos', compatible: { elements: ['pedra', 'fogo'] }, minLevel: 5,
    desc: 'Ensina Fragmentos a Monstrins de Pedra ou Fogo.', usableIn: ['field'],
  },
  runa_cura: {
    id: 'runa_cura', name: 'Runa de Cura', category: 'runa', price: 1000, rarity: 'raro',
    element: 'neutro', teaches: 'brilho_restaurador', compatible: { elements: ['planta', 'agua', 'pedra'] }, minLevel: 8,
    desc: 'Ensina Brilho Restaurador a Monstrins de Planta, Água ou Pedra.', usableIn: ['field'],
  },
  runa_onda: {
    id: 'runa_onda', name: 'Runa da Maré', category: 'runa', price: 900, rarity: 'incomum',
    element: 'agua', teaches: 'onda', compatible: { elements: ['agua'] }, minLevel: 8,
    desc: 'Ensina Onda Quebrante a um Monstrin de Água.', usableIn: ['field'],
  },
  runa_espinhos: {
    id: 'runa_espinhos', name: 'Runa de Espinhos', category: 'runa', price: 900, rarity: 'incomum',
    element: 'planta', teaches: 'espinhos', compatible: { elements: ['planta'] }, minLevel: 8,
    desc: 'Ensina Chuva de Espinhos a um Monstrin de Planta.', usableIn: ['field'],
  },

  // ---------- Especiais / Missão ----------
  mapa_aurora: {
    id: 'mapa_aurora', name: 'Mapa de Aurora', category: 'especial',
    desc: 'Um mapa da região de Aurora presenteado pela Professora Íris.', usableIn: [],
  },
  carta_professora: {
    id: 'carta_professora', name: 'Carta da Professora', category: 'missao',
    desc: 'Uma carta da Professora Íris para o vigia da saída da vila.', usableIn: [],
  },
};

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Item desconhecido: ${id}`);
  return it;
}
