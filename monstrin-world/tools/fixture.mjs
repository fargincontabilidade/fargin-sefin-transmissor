// Gera um salvamento de teste (jogador no bosque com Brasito nv 6).
import { Game, newGameState } from '../src/core/gameState.js';
import { createMonstrin, xpForLevel } from '../src/core/monstrin.js';
export function fixture({ map = 'bosque', x = 5.5, y = 13, level = 6, species = 'brasito', extra = [], nearLevel = false } = {}) {
  const g = new Game(newGameState({ name: 'Teste', look: 0 }));
  const m = createMonstrin(species, level, { how: 'inicial' });
  if (nearLevel) m.xp = xpForLevel(level + 1) - 1;
  g.addMonstrin(m);
  for (const [s, l] of extra) g.addMonstrin(createMonstrin(s, l));
  g.setFlag('starterChosen'); g.setFlag('metIris');
  g.startQuest('primeira_captura');
  Object.assign(g.s.player, { mapId: map, x, y, dir: 'right' });
  return { 'monstrin-world-save-v1': JSON.stringify(g.s) };
}
