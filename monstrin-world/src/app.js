// Estado compartilhado da aplicação (jogo atual, salvamento e configurações).
import { LocalStorageAdapter } from './core/storage.js';

export const app = {
  storage: new LocalStorageAdapter(),
  game: null,
  world: null,
  sessionStart: Date.now(),
  settings: { sfx: 0.6, music: 0.3, touch: 'auto', textSpeed: 'normal' },

  save() {
    if (!this.game) return { ok: false };
    const now = Date.now();
    this.game.s.stats.playMs = (this.game.s.stats.playMs || 0) + (now - this.sessionStart);
    this.sessionStart = now;
    if (this.world) this.world.storePlayerPosition();
    return this.storage.save(this.game.toJSON());
  },
};
