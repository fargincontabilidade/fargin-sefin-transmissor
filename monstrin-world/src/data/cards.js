// Catálogo de cartas do Monstrin World.
//
// Tipos:
//  monstrin -> criatura usada em batalha (gerada a partir de SPECIES)
//  tecnica  -> ataques, habilidades e efeitos (gerada a partir de MOVES)
//  item     -> recuperação, proteção e outros recursos (gerada a partir de ITEMS)
//
// Campos comuns de cada carta:
//  id, type, name, desc, element (null quando não se aplica), rarity,
//  stage / stages (estágio evolutivo — independente da raridade),
//  evolvesFrom / evolvesTo (ids de cartas), art (de onde vem a ilustração),
//  data (o que cada tipo precisa para funcionar), visual (molduras, verso e
//  acabamentos — vazios por enquanto; serão preenchidos com a arte aprovada).
//
// Para criar cartas novas no futuro, basta acrescentar em EXTRA_CARDS.
import { SPECIES, RARITY, evolutionLine } from './species.js';
import { MOVES } from './moves.js';
import { ITEMS } from './items.js';

export const CARD_TYPES = {
  monstrin: { id: 'monstrin', name: 'Monstrin', icon: '🐾', order: 0 },
  tecnica: { id: 'tecnica', name: 'Técnica', icon: '✨', order: 1 },
  item: { id: 'item', name: 'Item', icon: '🎒', order: 2 },
};

export const CARD_RARITIES = RARITY; // comum, incomum, raro, lendario
export const RARITY_ORDER = ['comum', 'incomum', 'raro', 'lendario'];

// Personalização visual futura (moldura, verso, brilho...). Mantido vazio de propósito.
const visual = () => ({ frame: null, back: null, finish: null, artOverride: null });

// Cartas extras definidas à mão (ex.: técnicas especiais, itens de evento).
export const EXTRA_CARDS = {};

function moveRarity(m) {
  if (m.power >= 85) return 'raro';
  if (m.power >= 60 || m.category !== 'dano') return 'incomum';
  return 'comum';
}

function buildCards() {
  const cards = {};
  // Monstrins
  for (const s of Object.values(SPECIES)) {
    const line = evolutionLine(s.id);
    const idx = line.indexOf(s.id);
    cards[`m_${s.id}`] = {
      id: `m_${s.id}`, type: 'monstrin', name: s.name, desc: s.desc, element: s.element, rarity: s.rarity,
      stage: idx + 1, stages: line.length,
      evolvesFrom: idx > 0 ? `m_${line[idx - 1]}` : null,
      evolvesTo: s.evolution ? `m_${s.evolution.to}` : null,
      art: { kind: 'monstrin', ref: s.id },
      data: { speciesId: s.id, base: { ...s.base }, moves: s.learnset.map((l) => l.move) },
      visual: visual(), order: s.num,
    };
  }
  // Técnicas
  Object.values(MOVES).forEach((m, i) => {
    cards[`t_${m.id}`] = {
      id: `t_${m.id}`, type: 'tecnica', name: m.name, desc: m.desc, element: m.element, rarity: moveRarity(m),
      stage: null, stages: null, evolvesFrom: null, evolvesTo: null,
      art: { kind: 'element', ref: m.element },
      data: { moveId: m.id, category: m.category, power: m.power, accuracy: m.accuracy, effect: m.effect || null },
      visual: visual(), order: 100 + i,
    };
  });
  // Itens (só os que funcionam hoje: recuperação para Monstrins conscientes)
  Object.values(ITEMS).filter((it) => it.category === 'recuperacao' && !it.revive).forEach((it, i) => {
    cards[`i_${it.id}`] = {
      id: `i_${it.id}`, type: 'item', name: it.name, desc: it.desc, element: null, rarity: it.heal >= 80 ? 'incomum' : 'comum',
      stage: null, stages: null, evolvesFrom: null, evolvesTo: null,
      art: { kind: 'item', ref: it.id },
      data: { itemId: it.id, heal: it.heal || 0 },
      visual: visual(), order: 200 + i,
    };
  });
  for (const [id, c] of Object.entries(EXTRA_CARDS)) cards[id] = { visual: visual(), order: 900, ...c, id };
  return cards;
}

export const CARDS = buildCards();

export function getCard(id) {
  return CARDS[id] || null;
}

export function cardList() {
  return Object.values(CARDS).sort((a, b) => CARD_TYPES[a.type].order - CARD_TYPES[b.type].order || a.order - b.order);
}

export const monstrinCardId = (speciesId) => `m_${speciesId}`;
export const techniqueCardId = (moveId) => `t_${moveId}`;
export const itemCardId = (itemId) => `i_${itemId}`;
