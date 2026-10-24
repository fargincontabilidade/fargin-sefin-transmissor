// Constantes do Regulamento de Duelos v1.0.
// [C] = CONFIRMADO pelo usuário · [F] = FECHAMENTO v1.0 (ajustável em versões futuras).
export const RULES = {
  VERSION: '1.0',
  DECK_SIZE: 15, // [C] 15 cartas, somente Monstrins
  MAX_COPIES: 2, // [C] máximo de 2 cópias do mesmo Monstrin
  HAND_SIZE: 5, // [C] 5 cartas iniciais e limite de 5
  MAX_SECONDARIES: 2, // [C] 1 principal + até 2 secundários
  KOS_TO_WIN: 5, // [C] vitória ao contabilizar 5 KOs
  ED_START: 2, // [F] Energia de Duelo inicial
  ED_PER_ROUND: 2, // [F] +2 ED no início de cada rodada (inclusive a primeira)
  ED_MAX: 6, // [F] máximo de 6 ED
  DEFAULT_CRIT_MULT: 1.5, // [C] padrão recomendado de crítico
  DEFAULT_CRIT_CHANCE: 0, // lacuna: a carta define a chance; sem valor = sem crítico (ver docs)
  WEAKNESS_MULT: 2, // [F] valor comum de fraqueza na ficha
  SHIELD_CAP: 0.75, // [F] limite de redução dos escudos comuns
  MAX_ACTIVE_ABILITIES: 4, // [F] até 4 habilidades ativas por Monstrin
  INCAPACITATE_MAX_DURATION: 2, // [F] sono/congelamento: no máximo 2 rodadas efetivas
  TURN_SECONDS: 45, // [F] tempo de escolha (online); em PvE pode ser desativado
  TIMEOUT_DEFENSE: 0.2, // [F] Defesa Básica: -20% do dano de ataques diretos na rodada
  TIMEOUTS_TO_FORFEIT: 3, // [F] 3 esgotamentos consecutivos = derrota por abandono
  ITEM_USES_PVE: 2, // [F] itens em PvE: 2 usos totais por partida, consomem a ação principal
  FREE_PLACEMENTS_PER_ROUND: 2, // [C] até 2 secundários posicionados gratuitamente por turno
  FREE_REPLACEMENTS_PER_ROUND: 1, // [C] 1 substituição de secundário por rodada
};

// Arredondamento para cima tolerante a erros de ponto flutuante (ex.: 30 × 0,8).
export function ceilSafe(x) {
  return Math.ceil(x - 1e-9);
}
