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

  // Treinadores
  TRAINER_MAX_HP: 1000, // PV de cada treinador em batalha
  TRAINER_DIRECT_DAMAGE_MULT: 3, // multiplica o dano de ataques diretos ao treinador

  // Derrota (recuperação)
  DEFEAT_COIN_PENALTY: 0, // 0 = não perde moedas; 0.1 = perde 10%

  // Encontros no mapa
  WILD_RESPAWN_MS: 25000,

  // Salvamento
  SAVE_KEY: 'monstrin-world-save-v1',
  BACKUP_KEY: 'monstrin-world-save-v1-backup',
  SETTINGS_KEY: 'monstrin-world-settings',
};
