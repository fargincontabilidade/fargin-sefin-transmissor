// Regras gerais do jogo. Altere aqui para testes de balanceamento.
export const CONFIG = {
  VERSION: '0.1.0',

  // Mundo
  TILE: 64, // tamanho de cada quadrado do mapa (em pixels do mundo)
  PLAYER_SPEED: 190, // pixels por segundo
  RUN_MULT: 1.6, // multiplicador ao correr (Shift)

  // Equipe e criaturas
  PARTY_SIZE: 6,
  MAX_EQUIPPED_MOVES: 4,
  MAX_LEVEL: 50,
  XP_MULT: 1, // multiplicador global de experiência
  TRAIT_MAX: 15, // variação individual máxima por atributo (0..15)
  TEMPERAMENT_PCT: 0.05, // +5% / -5% do temperamento

  // Batalhas: só os Monstrins têm PV. Treinadores e jogadores não recebem
  // ataques diretos; vence quem derrotar todos os Monstrins do adversário.

  // Derrota (volta ao último Centro Monstrin, com a equipe ainda desmaiada)
  DEFEAT_COIN_PENALTY: 0, // 0 = não perde moedas; 0.1 = perde 10%

  // Encontros no mapa. Desativados na versão com cartas: os Monstrins não
  // andam mais soltos pelo cenário (o código continua pronto para reativar).
  WILD_MONSTRINS: false,
  WILD_RESPAWN_MS: 25000,

  // Cartas e decks (regras PROVISÓRIAS — ajuste aqui quando definirmos as finais)
  DECK_MIN_CARDS: 8, // mínimo de cartas para um deck poder ser usado
  DECK_MAX_CARDS: 30, // máximo de cartas por deck
  DECK_MAX_COPIES: 3, // cópias da mesma carta por deck
  DECK_MAX_DECKS: 5, // quantos decks o jogador pode ter

  // Salvamento
  SAVE_KEY: 'monstrin-world-save-v1',
  BACKUP_KEY: 'monstrin-world-save-v1-backup',
  SETTINGS_KEY: 'monstrin-world-settings',
};
