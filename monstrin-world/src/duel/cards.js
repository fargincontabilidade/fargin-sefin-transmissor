// Catálogo de cartas de duelo — PROVISÓRIO (valores para testes de balanceamento).
//
// Formato de uma carta (todas as regras ficam nos dados; o motor é genérico):
// {
//   id, name, element, art (espécie usada para a ilustração), hp, resistance (resistência fixa),
//   weaknesses: { elemento: multiplicador }  (fraqueza comum = 2),
//   immunities: ['poison' | 'burn' | 'paralysis' | 'sleep' | 'freeze'],
//   abilities: [ habilidade, ... ]  (até 4 ativas, usadas pelo PRINCIPAL),
//   special: habilidade             (usada como SECUNDÁRIO, 1x por duelo, consome a ação principal),
//   passive: passiva                (opcional),
// }
//
// Habilidade:
//   kind: 'attack' | 'shield' | 'heal' | 'purify' | 'revive'
//   cost: Energia de Duelo (0 = ataque básico)
//   element, target: 'single' | 'area' | 'self' | 'main' (aliado principal)
//   hits, damage: { fixed, pct }  (pct = % dos PV máximos do alvo)
//   accuracy (0–100), crit: { chance, mult }, pierce: { resistance, shield } (0..1), ignoreImmunity
//   drain (0..1), effects: [{ condition, chance, dmg, dmgPct, duration, perHit }]
//   shield: { pct, duration, scope: 'direct' | 'all', blocksConditions, immunities }
//   heal: { fixed, pct }, purify: true
//   interrupt: true  (Interrupção Imediata: cancela a ação confirmada do adversário)
//   oncePerDuel, cooldown (rodadas)
//
// Passiva:
//   { type: 'retaliate', damage: { fixed, pct }, per: 'attack' | 'hit', effects, pierce }
//   { type: 'onEnter', shield | heal, rearm: 'every' | 'once' | número de rodadas de recarga }

const W_FOGO = { agua: 2, pedra: 2 };
const W_AGUA = { planta: 2, eletrico: 2 };
const W_PLANTA = { fogo: 2 };
const W_ELETRICO = { pedra: 2 };
const W_PEDRA = { agua: 2, planta: 2 };

export const DUEL_CARDS = {
  brasito: {
    id: 'brasito', name: 'Brasito', element: 'fogo', art: 'brasito', hp: 46, resistance: 0, weaknesses: W_FOGO, immunities: [],
    abilities: [
      { id: 'brasa', name: 'Brasa', kind: 'attack', cost: 0, element: 'fogo', target: 'single', damage: { fixed: 14 }, accuracy: 95, crit: { chance: 0.1 },
        effects: [{ condition: 'burn', chance: 0.25, dmg: 4, duration: 2 }], desc: '25% de chance de Queimadura (4/rodada, 2 rodadas).' },
      { id: 'bola_fogo', name: 'Bola de Fogo', kind: 'attack', cost: 2, element: 'fogo', target: 'single', damage: { fixed: 26 }, accuracy: 90, crit: { chance: 0.1 } },
      { id: 'rajada_brasas', name: 'Rajada de Brasas', kind: 'attack', cost: 3, element: 'fogo', target: 'area', damage: { fixed: 15 }, accuracy: 90, desc: 'Atinge todos os Monstrins adversários em campo.' },
    ],
    special: { id: 'chama_apoio', name: 'Chama de Apoio', kind: 'attack', cost: 1, element: 'fogo', target: 'area', damage: { fixed: 10 }, accuracy: 100, oncePerDuel: true, desc: 'Brasas em área a partir do banco.' },
  },
  brasador: {
    id: 'brasador', name: 'Brasador', element: 'fogo', art: 'brasador', hp: 60, resistance: 2, weaknesses: W_FOGO, immunities: ['burn'],
    abilities: [
      { id: 'garra_ignea', name: 'Garra Ígnea', kind: 'attack', cost: 0, element: 'fogo', target: 'single', damage: { fixed: 17 }, accuracy: 95, crit: { chance: 0.1 } },
      { id: 'labareda', name: 'Labareda', kind: 'attack', cost: 2, element: 'fogo', target: 'single', damage: { fixed: 28 }, accuracy: 90,
        effects: [{ condition: 'burn', chance: 0.4, dmg: 5, duration: 2 }], desc: '40% de chance de Queimadura (5/rodada, 2 rodadas).' },
      { id: 'erupcao', name: 'Erupção', kind: 'attack', cost: 3, element: 'fogo', target: 'area', damage: { fixed: 20 }, accuracy: 85, crit: { chance: 0.1 } },
    ],
    passive: { id: 'pele_ardente', name: 'Pele Ardente', type: 'retaliate', per: 'attack', damage: { fixed: 5 }, desc: 'Ao perder PV por um ataque, causa 5 de dano ao atacante.' },
    special: { id: 'aquecer', name: 'Aquecer', kind: 'shield', cost: 1, target: 'main', shield: { pct: 0.3, duration: 2, scope: 'direct' }, oncePerDuel: true, desc: 'Principal recebe escudo de 30% (2 rodadas).' },
  },
  fagulino: {
    id: 'fagulino', name: 'Fagulino', element: 'fogo', art: 'fagulino', hp: 40, resistance: 0, weaknesses: W_FOGO, immunities: [],
    abilities: [
      { id: 'bicada', name: 'Bicada Dupla', kind: 'attack', cost: 0, element: 'neutro', target: 'single', hits: 2, damage: { fixed: 7 }, accuracy: 95, crit: { chance: 0.15 } },
      { id: 'pluma_chamas', name: 'Pluma em Chamas', kind: 'attack', cost: 1, element: 'fogo', target: 'single', damage: { fixed: 16 }, accuracy: 95,
        effects: [{ condition: 'burn', chance: 0.5, dmg: 4, duration: 2 }] },
      { id: 'mergulho_solar', name: 'Mergulho Solar', kind: 'attack', cost: 3, element: 'fogo', target: 'single', damage: { fixed: 32 }, accuracy: 85, crit: { chance: 0.2 } },
    ],
    special: { id: 'vento_quente', name: 'Vento Quente', kind: 'attack', cost: 1, element: 'fogo', target: 'single', damage: { fixed: 14 }, accuracy: 100, oncePerDuel: true },
  },
  gotinho: {
    id: 'gotinho', name: 'Gotinho', element: 'agua', art: 'gotinho', hp: 44, resistance: 0, weaknesses: W_AGUA, immunities: [],
    abilities: [
      { id: 'jato', name: "Jato d'Água", kind: 'attack', cost: 0, element: 'agua', target: 'single', damage: { fixed: 14 }, accuracy: 95, crit: { chance: 0.1 } },
      { id: 'bolhas', name: 'Rajada de Bolhas', kind: 'attack', cost: 1, element: 'agua', target: 'single', hits: 3, damage: { fixed: 7 }, accuracy: 90 },
      { id: 'barreira_agua', name: 'Barreira de Água', kind: 'shield', cost: 1, target: 'self', shield: { pct: 0.4, duration: 2, scope: 'direct' }, desc: 'Reduz 40% do dano direto (esta rodada e a seguinte).' },
    ],
    special: { id: 'garoa', name: 'Garoa Curativa', kind: 'heal', cost: 0, target: 'main', heal: { fixed: 20 }, oncePerDuel: true, desc: 'Cura 20 PV do principal.' },
  },
  marolho: {
    id: 'marolho', name: 'Marolho', element: 'agua', art: 'marolho', hp: 62, resistance: 3, weaknesses: W_AGUA, immunities: [],
    abilities: [
      { id: 'onda', name: 'Onda', kind: 'attack', cost: 0, element: 'agua', target: 'single', damage: { fixed: 16 }, accuracy: 95, crit: { chance: 0.1 } },
      { id: 'redemoinho', name: 'Redemoinho', kind: 'attack', cost: 2, element: 'agua', target: 'single', damage: { fixed: 28 }, accuracy: 90 },
      { id: 'maremoto', name: 'Maremoto', kind: 'attack', cost: 3, element: 'agua', target: 'area', damage: { fixed: 18 }, accuracy: 90 },
    ],
    passive: { id: 'mare_protetora', name: 'Maré Protetora', type: 'onEnter', shield: { pct: 0.25, duration: 1, scope: 'direct' }, rearm: 'every', desc: 'Ao entrar em campo: escudo de 25% nesta rodada.' },
    special: { id: 'correnteza', name: 'Correnteza', kind: 'purify', cost: 1, target: 'main', purify: true, heal: { fixed: 10 }, oncePerDuel: true, desc: 'Remove condições do principal e cura 10 PV.' },
  },
  bolhuga: {
    id: 'bolhuga', name: 'Bolhuga', element: 'agua', art: 'bolhuga', hp: 42, resistance: 0, weaknesses: W_AGUA, immunities: [],
    abilities: [
      { id: 'lingua', name: 'Língua Ágil', kind: 'attack', cost: 0, element: 'neutro', target: 'single', hits: 2, damage: { fixed: 7 }, accuracy: 95 },
      { id: 'jato_gelado', name: 'Jato Gelado', kind: 'attack', cost: 2, element: 'agua', target: 'single', damage: { fixed: 18 }, accuracy: 90,
        effects: [{ condition: 'freeze', chance: 0.25, duration: 1 }], desc: '25% de chance de Congelar (1 rodada).' },
      { id: 'purificar', name: 'Purificar', kind: 'purify', cost: 1, target: 'self', purify: true, heal: { fixed: 10 }, desc: 'Remove condições e cura 10 PV.' },
    ],
    special: { id: 'canto', name: 'Canto do Brejo', kind: 'attack', cost: 1, element: 'neutro', target: 'single', damage: { fixed: 6 }, accuracy: 90,
      effects: [{ condition: 'sleep', chance: 0.5, duration: 1 }], oncePerDuel: true, desc: '50% de chance de Sono (1 rodada).' },
  },
  brotim: {
    id: 'brotim', name: 'Brotim', element: 'planta', art: 'brotim', hp: 44, resistance: 0, weaknesses: W_PLANTA, immunities: [],
    abilities: [
      { id: 'folha', name: 'Folha Cortante', kind: 'attack', cost: 0, element: 'planta', target: 'single', damage: { fixed: 13 }, accuracy: 95, crit: { chance: 0.15 } },
      { id: 'raizes', name: 'Raízes Drenantes', kind: 'attack', cost: 2, element: 'planta', target: 'single', damage: { fixed: 22 }, accuracy: 95, drain: 0.5, desc: 'Recupera 50% dos PV efetivamente retirados.' },
      { id: 'esporos_toxicos', name: 'Esporos Tóxicos', kind: 'attack', cost: 1, element: 'planta', target: 'single', damage: { fixed: 8 }, accuracy: 95,
        effects: [{ condition: 'poison', chance: 1, dmg: 5, duration: 3 }], desc: 'Envenena (5/rodada, 3 rodadas).' },
    ],
    special: { id: 'fotossintese', name: 'Fotossíntese', kind: 'purify', cost: 0, target: 'main', purify: true, heal: { fixed: 12 }, oncePerDuel: true, desc: 'Purifica o principal e cura 12 PV.' },
  },
  ramalhao: {
    id: 'ramalhao', name: 'Ramalhão', element: 'planta', art: 'ramalhao', hp: 62, resistance: 2, weaknesses: W_PLANTA, immunities: [],
    abilities: [
      { id: 'chicote', name: 'Chicote de Cipó', kind: 'attack', cost: 0, element: 'planta', target: 'single', damage: { fixed: 16 }, accuracy: 95, crit: { chance: 0.1 } },
      { id: 'chuva_espinhos', name: 'Chuva de Espinhos', kind: 'attack', cost: 2, element: 'planta', target: 'area', damage: { fixed: 14 }, accuracy: 90 },
      { id: 'crescer', name: 'Crescer', kind: 'heal', cost: 1, target: 'self', heal: { pct: 0.25 }, desc: 'Recupera 25% dos PV máximos.' },
    ],
    passive: { id: 'espinhos', name: 'Espinhos', type: 'retaliate', per: 'attack', damage: { fixed: 6 }, desc: 'Ao perder PV por um ataque, causa 6 de dano ao atacante.' },
    special: { id: 'muralha_verde', name: 'Muralha Verde', kind: 'shield', cost: 1, target: 'main', shield: { pct: 0.35, duration: 2, scope: 'all' }, oncePerDuel: true, desc: 'Escudo de 35% (direto e indireto) no principal, 2 rodadas.' },
  },
  cogumi: {
    id: 'cogumi', name: 'Cogumi', element: 'planta', art: 'cogumi', hp: 40, resistance: 0, weaknesses: W_PLANTA, immunities: ['poison'],
    abilities: [
      { id: 'esporos', name: 'Esporos', kind: 'attack', cost: 0, element: 'planta', target: 'single', damage: { fixed: 10 }, accuracy: 95,
        effects: [{ condition: 'poison', chance: 0.5, dmg: 4, duration: 3 }] },
      { id: 'nuvem_toxica', name: 'Nuvem Tóxica', kind: 'attack', cost: 2, element: 'planta', target: 'area', damage: { fixed: 6 }, accuracy: 90,
        effects: [{ condition: 'poison', chance: 0.6, dmg: 4, duration: 2 }] },
      { id: 'brilho', name: 'Brilho Restaurador', kind: 'heal', cost: 1, target: 'self', heal: { fixed: 20 } },
    ],
    special: { id: 'renascer', name: 'Renascer do Esporo', kind: 'revive', cost: 2, oncePerDuel: true, desc: 'Traz um Monstrin do Cemitério de volta à mão com 100% dos PV.' },
  },
  faiscol: {
    id: 'faiscol', name: 'Faíscol', element: 'eletrico', art: 'faiscol', hp: 40, resistance: 0, weaknesses: W_ELETRICO, immunities: [],
    abilities: [
      { id: 'faisca', name: 'Faísca', kind: 'attack', cost: 0, element: 'eletrico', target: 'single', damage: { fixed: 12 }, accuracy: 95,
        effects: [{ condition: 'paralysis', chance: 0.2, intensity: 0.3, duration: 2 }], desc: '20% de chance de Paralisia (30% de perder a ação, 2 rodadas).' },
      { id: 'esfera', name: 'Esfera Elétrica', kind: 'attack', cost: 2, element: 'eletrico', target: 'single', damage: { fixed: 25 }, accuracy: 90, crit: { chance: 0.2 } },
      { id: 'raio_duplo', name: 'Raio Duplo', kind: 'attack', cost: 2, element: 'eletrico', target: 'single', hits: 2, damage: { fixed: 12 }, accuracy: 90 },
    ],
    special: { id: 'clarao', name: 'Clarão', kind: 'interrupt', cost: 1, interrupt: true, oncePerDuel: true, desc: 'Interrupção Imediata: cancela o ataque confirmado do adversário nesta rodada.' },
  },
  voltrino: {
    id: 'voltrino', name: 'Voltrino', element: 'eletrico', art: 'voltrino', hp: 56, resistance: 2, weaknesses: W_ELETRICO, immunities: ['paralysis'],
    abilities: [
      { id: 'descarga', name: 'Descarga', kind: 'attack', cost: 0, element: 'eletrico', target: 'single', damage: { fixed: 16 }, accuracy: 95, crit: { chance: 0.1 } },
      { id: 'trovao', name: 'Trovão', kind: 'attack', cost: 3, element: 'eletrico', target: 'single', damage: { fixed: 32 }, accuracy: 85, crit: { chance: 0.15, mult: 2 } },
      { id: 'campo_eletrico', name: 'Campo Elétrico', kind: 'attack', cost: 2, element: 'eletrico', target: 'area', damage: { fixed: 12 }, accuracy: 90,
        effects: [{ condition: 'paralysis', chance: 0.25, intensity: 0.3, duration: 2 }] },
    ],
    special: { id: 'corrente', name: 'Corrente Rápida', kind: 'attack', cost: 1, element: 'eletrico', target: 'single', damage: { fixed: 15 }, accuracy: 100, oncePerDuel: true },
  },
  pedrolho: {
    id: 'pedrolho', name: 'Pedrolho', element: 'pedra', art: 'pedrolho', hp: 48, resistance: 4, weaknesses: W_PEDRA, immunities: [],
    abilities: [
      { id: 'pedrada', name: 'Pedrada', kind: 'attack', cost: 0, element: 'pedra', target: 'single', damage: { fixed: 13 }, accuracy: 95 },
      { id: 'fragmentos', name: 'Fragmentos', kind: 'attack', cost: 2, element: 'pedra', target: 'single', hits: 3, damage: { fixed: 8 }, accuracy: 90, crit: { chance: 0.1 } },
      { id: 'fortificar', name: 'Fortificar', kind: 'shield', cost: 1, target: 'self', shield: { pct: 0.5, duration: 1, scope: 'all', blocksConditions: true }, desc: 'Escudo de 50% e bloqueia novas condições nesta rodada.' },
    ],
    special: { id: 'muralha', name: 'Muralha', kind: 'shield', cost: 0, target: 'main', shield: { pct: 0.4, duration: 2, scope: 'direct' }, oncePerDuel: true, desc: 'Principal recebe escudo de 40% (2 rodadas).' },
  },
  rochedonte: {
    id: 'rochedonte', name: 'Rochedonte', element: 'pedra', art: 'rochedonte', hp: 68, resistance: 5, weaknesses: W_PEDRA, immunities: ['paralysis'],
    abilities: [
      { id: 'cabecada', name: 'Cabeçada', kind: 'attack', cost: 0, element: 'pedra', target: 'single', damage: { fixed: 17 }, accuracy: 90 },
      { id: 'esmagar', name: 'Esmagar', kind: 'attack', cost: 2, element: 'pedra', target: 'single', damage: { fixed: 26 }, accuracy: 90, pierce: { resistance: 1 }, desc: 'Ignora toda a resistência fixa do alvo.' },
      { id: 'tremor', name: 'Tremor', kind: 'attack', cost: 3, element: 'pedra', target: 'area', damage: { fixed: 18 }, accuracy: 90 },
    ],
    special: { id: 'avalanche', name: 'Avalanche', kind: 'attack', cost: 2, element: 'pedra', target: 'area', damage: { fixed: 12 }, accuracy: 90, oncePerDuel: true },
  },
  cristalume: {
    id: 'cristalume', name: 'Cristalume', element: 'pedra', art: 'cristalume', hp: 50, resistance: 3, weaknesses: W_PEDRA, immunities: [],
    abilities: [
      { id: 'prisma', name: 'Prisma', kind: 'attack', cost: 0, element: 'pedra', target: 'single', damage: { fixed: 14 }, accuracy: 95, pierce: { shield: 0.5 }, desc: 'Perfura 50% dos escudos.' },
      { id: 'raio_prismatico', name: 'Raio Prismático', kind: 'attack', cost: 2, element: 'neutro', target: 'single', damage: { fixed: 12, pct: 0.15 }, accuracy: 95, desc: '12 + 15% dos PV máximos do alvo.' },
      { id: 'reflexo', name: 'Reflexo Cristalino', kind: 'shield', cost: 2, target: 'self', shield: { pct: 0.6, duration: 1, scope: 'direct' } },
    ],
    passive: { id: 'aura_cristal', name: 'Aura de Cristal', type: 'onEnter', shield: { pct: 0.3, duration: 2, scope: 'direct' }, rearm: 'once', desc: 'Na primeira entrada em campo: escudo de 30% (2 rodadas).' },
    special: { id: 'brilho_prisma', name: 'Brilho de Prisma', kind: 'heal', cost: 1, target: 'main', heal: { pct: 0.3 }, oncePerDuel: true, desc: 'Cura 30% dos PV máximos do principal.' },
  },
};

// Baralhos prontos (15 cartas, no máximo 2 cópias)
export const PRESET_DECKS = {
  chamas: {
    id: 'chamas', name: 'Chamas da Montanha', desc: 'Fogo, Pedra e Elétrico. Golpes fortes e escudos de pedra.',
    cards: ['brasito', 'brasito', 'brasador', 'brasador', 'fagulino', 'fagulino', 'pedrolho', 'pedrolho', 'rochedonte', 'cristalume', 'cristalume', 'faiscol', 'faiscol', 'voltrino', 'voltrino'],
  },
  mare: {
    id: 'mare', name: 'Maré da Floresta', desc: 'Água e Planta. Curas, venenos e retaliação.',
    cards: ['gotinho', 'gotinho', 'marolho', 'marolho', 'brotim', 'brotim', 'ramalhao', 'ramalhao', 'cogumi', 'cogumi', 'bolhuga', 'bolhuga', 'faiscol', 'voltrino', 'voltrino'],
  },
};

export function getCard(id, catalog = DUEL_CARDS) {
  const c = catalog[id];
  if (!c) throw new Error(`Carta de duelo desconhecida: ${id}`);
  return c;
}

// Valida um baralho conforme o regulamento.
export function validateDeck(cardIds, rules, catalog = DUEL_CARDS) {
  const errors = [];
  if (cardIds.length !== rules.DECK_SIZE) errors.push(`O baralho precisa ter ${rules.DECK_SIZE} cartas (tem ${cardIds.length}).`);
  const count = {};
  for (const id of cardIds) {
    if (!catalog[id]) { errors.push(`Carta inexistente: ${id}`); continue; }
    count[id] = (count[id] || 0) + 1;
  }
  for (const [id, n] of Object.entries(count)) if (n > rules.MAX_COPIES) errors.push(`${catalog[id].name}: ${n} cópias (máximo ${rules.MAX_COPIES}).`);
  for (const c of Object.values(catalog)) {
    if ((c.abilities || []).length > rules.MAX_ACTIVE_ABILITIES) errors.push(`${c.name} tem mais de ${rules.MAX_ACTIVE_ABILITIES} habilidades ativas.`);
  }
  return { ok: errors.length === 0, errors };
}
