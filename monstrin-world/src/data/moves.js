// Catálogo de ataques.
// category: 'dano' | 'cura' | 'suporte'
// anim: identificador da animação em src/battle/effects.js
// effect (opcional): { type, chance, ... }
//   burn      -> queimadura (perde PV todo turno)
//   stat      -> altera atributo { target: 'self'|'foe', stat: 'atk'|'def'|'spd', stages }
//   drain     -> recupera parte do dano causado { ratio }
//   heal      -> recupera parte dos PV máximos { ratio }
export const MOVES = {
  // ---------- Neutro ----------
  investida: { id: 'investida', name: 'Investida', element: 'neutro', category: 'dano', power: 35, accuracy: 100, anim: 'tackle', desc: 'Avança com tudo contra o alvo.' },
  rugido: { id: 'rugido', name: 'Rugido Valente', element: 'neutro', category: 'suporte', power: 0, accuracy: 100, anim: 'roar', effect: { type: 'stat', target: 'foe', stat: 'atk', stages: -1, chance: 1 }, desc: 'Intimida o alvo e reduz seu ataque.' },
  barreira: { id: 'barreira', name: 'Barreira Prismática', element: 'neutro', category: 'suporte', power: 0, accuracy: 100, anim: 'shield', effect: { type: 'stat', target: 'self', stat: 'def', stages: 1, chance: 1 }, desc: 'Cria um escudo de luz que aumenta a defesa.' },
  brilho_restaurador: { id: 'brilho_restaurador', name: 'Brilho Restaurador', element: 'neutro', category: 'cura', power: 0, accuracy: 100, anim: 'heal', effect: { type: 'heal', ratio: 0.4, chance: 1 }, desc: 'Recupera 40% dos PV máximos.' },

  // ---------- Fogo ----------
  brasa: { id: 'brasa', name: 'Brasa', element: 'fogo', category: 'dano', power: 40, accuracy: 100, anim: 'ember', effect: { type: 'burn', chance: 0.1 }, desc: 'Faíscas quentes. Pode causar queimadura.' },
  bola_fogo: { id: 'bola_fogo', name: 'Bola de Fogo', element: 'fogo', category: 'dano', power: 60, accuracy: 95, anim: 'fireball', desc: 'Arremessa uma esfera de chamas que explode no alvo.' },
  labareda: { id: 'labareda', name: 'Labareda', element: 'fogo', category: 'dano', power: 75, accuracy: 90, anim: 'flamePillar', effect: { type: 'burn', chance: 0.2 }, desc: 'Uma coluna de fogo surge sob o alvo.' },
  erupcao: { id: 'erupcao', name: 'Erupção', element: 'fogo', category: 'dano', power: 95, accuracy: 85, anim: 'eruption', desc: 'Explosão vulcânica devastadora.' },

  // ---------- Água ----------
  jato_agua: { id: 'jato_agua', name: "Jato d'Água", element: 'agua', category: 'dano', power: 40, accuracy: 100, anim: 'waterJet', desc: 'Um jato de água pressurizada.' },
  bolhas: { id: 'bolhas', name: 'Rajada de Bolhas', element: 'agua', category: 'dano', power: 55, accuracy: 100, anim: 'bubbles', effect: { type: 'stat', target: 'foe', stat: 'spd', stages: -1, chance: 0.3 }, desc: 'Bolhas que estouram no alvo. Pode reduzir a velocidade.' },
  onda: { id: 'onda', name: 'Onda Quebrante', element: 'agua', category: 'dano', power: 75, accuracy: 95, anim: 'wave', desc: 'Uma onda poderosa varre o adversário.' },
  redemoinho: { id: 'redemoinho', name: 'Redemoinho', element: 'agua', category: 'dano', power: 90, accuracy: 85, anim: 'whirlpool', desc: 'Prende o alvo num turbilhão de água.' },

  // ---------- Planta ----------
  folha_cortante: { id: 'folha_cortante', name: 'Folha Cortante', element: 'planta', category: 'dano', power: 40, accuracy: 100, anim: 'leafBlade', desc: 'Folhas afiadas giram até o alvo.' },
  chicote_cipo: { id: 'chicote_cipo', name: 'Chicote de Cipó', element: 'planta', category: 'dano', power: 55, accuracy: 100, anim: 'vineWhip', desc: 'Cipós chicoteiam o adversário.' },
  raizes: { id: 'raizes', name: 'Raízes Drenantes', element: 'planta', category: 'dano', power: 60, accuracy: 95, anim: 'roots', effect: { type: 'drain', ratio: 0.5, chance: 1 }, desc: 'Raízes sugam energia e recuperam PV.' },
  espinhos: { id: 'espinhos', name: 'Chuva de Espinhos', element: 'planta', category: 'dano', power: 75, accuracy: 90, anim: 'thorns', desc: 'Espinhos caem do céu sobre o alvo.' },

  // ---------- Elétrico ----------
  faisca: { id: 'faisca', name: 'Faísca', element: 'eletrico', category: 'dano', power: 40, accuracy: 100, anim: 'spark', desc: 'Uma descarga rápida.' },
  esfera_eletrica: { id: 'esfera_eletrica', name: 'Esfera Elétrica', element: 'eletrico', category: 'dano', power: 60, accuracy: 95, anim: 'electroBall', desc: 'Uma esfera crepitante de energia.' },
  clarao: { id: 'clarao', name: 'Clarão', element: 'eletrico', category: 'suporte', power: 0, accuracy: 100, anim: 'flash', effect: { type: 'stat', target: 'foe', stat: 'atk', stages: -1, chance: 1 }, desc: 'Um flash ofuscante reduz o ataque do alvo.' },
  raio_trovejante: { id: 'raio_trovejante', name: 'Raio Trovejante', element: 'eletrico', category: 'dano', power: 85, accuracy: 90, anim: 'thunderbolt', desc: 'Um raio cai do céu sobre o alvo.' },

  // ---------- Pedra ----------
  pedrada: { id: 'pedrada', name: 'Pedrada', element: 'pedra', category: 'dano', power: 40, accuracy: 100, anim: 'rockThrow', desc: 'Arremessa uma rocha.' },
  fragmentos: { id: 'fragmentos', name: 'Fragmentos', element: 'pedra', category: 'dano', power: 60, accuracy: 95, anim: 'shards', desc: 'Lascas de pedra afiadas voam no alvo.' },
  tremor: { id: 'tremor', name: 'Tremor', element: 'pedra', category: 'dano', power: 75, accuracy: 95, anim: 'quake', desc: 'Faz o chão tremer violentamente.' },
  onda_choque: { id: 'onda_choque', name: 'Onda de Choque', element: 'pedra', category: 'dano', power: 90, accuracy: 85, anim: 'shockwave', desc: 'Uma onda de impacto rasga o solo.' },
};

export function getMove(id) {
  const m = MOVES[id];
  if (!m) throw new Error(`Ataque desconhecido: ${id}`);
  return m;
}
