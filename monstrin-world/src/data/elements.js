// Elementos do Monstrin World. Para criar um novo elemento, adicione-o
// em ELEMENTS e defina suas vantagens em CHART.
export const ELEMENTS = {
  fogo: { id: 'fogo', name: 'Fogo', color: '#ff6b2c', light: '#ffd27a', dark: '#b8320c', icon: '🔥' },
  agua: { id: 'agua', name: 'Água', color: '#2f9bff', light: '#a8e1ff', dark: '#155fb0', icon: '💧' },
  planta: { id: 'planta', name: 'Planta', color: '#47c46a', light: '#b9f59a', dark: '#1f7a3c', icon: '🌿' },
  eletrico: { id: 'eletrico', name: 'Elétrico', color: '#ffd21f', light: '#fff6a8', dark: '#b08a00', icon: '⚡' },
  pedra: { id: 'pedra', name: 'Pedra', color: '#b08a5c', light: '#e6d2b0', dark: '#6b5032', icon: '🪨' },
  // Ataques sem elemento (ex.: Investida). Não é um elemento de criatura.
  neutro: { id: 'neutro', name: 'Neutro', color: '#9aa4b8', light: '#e4e8f0', dark: '#5b6478', icon: '✦' },
};

// Multiplicadores: CHART[ataque][defesa]. Ausente = 1x.
// S = super eficaz, W = pouco eficaz (ajustáveis para balanceamento).
export const SUPER = 1.5;
export const WEAK = 0.7;
const S = SUPER;
const W = WEAK;
export const CHART = {
  fogo: { planta: S, agua: W, pedra: W, fogo: W },
  agua: { fogo: S, pedra: S, planta: W, agua: W },
  planta: { agua: S, pedra: S, fogo: W, planta: W },
  eletrico: { agua: S, pedra: W, planta: W, eletrico: W },
  pedra: { fogo: S, eletrico: S, planta: W, pedra: W },
  neutro: {},
};

export function effectiveness(attackElement, defenderElement) {
  const row = CHART[attackElement] || {};
  return row[defenderElement] ?? 1;
}
