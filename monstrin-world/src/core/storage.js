// Camada de salvamento. Hoje usa o armazenamento local do navegador.
// Para contas com sincronização em servidor no futuro, basta criar outro
// "adaptador" com os mesmos métodos (load, save, clear) — ex.: ServerStorage.
import { CONFIG } from '../config.js';

function safeLocalStorage() {
  try {
    const ls = globalThis.localStorage;
    const k = '__mw_test__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

// Armazenamento em memória (usado se o navegador bloquear o localStorage).
class MemoryStore {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

export class LocalStorageAdapter {
  constructor(store) {
    this.store = store || safeLocalStorage() || new MemoryStore();
    this.persistent = !(this.store instanceof MemoryStore);
  }

  load() {
    const raw = this.store.getItem(CONFIG.SAVE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { /* tenta o backup */ }
    }
    const bak = this.store.getItem(CONFIG.BACKUP_KEY);
    if (bak) {
      try { return JSON.parse(bak); } catch { return null; }
    }
    return null;
  }

  save(data) {
    const json = JSON.stringify(data);
    // Mantém uma cópia de segurança do salvamento anterior.
    const prev = this.store.getItem(CONFIG.SAVE_KEY);
    try {
      if (prev) this.store.setItem(CONFIG.BACKUP_KEY, prev);
      this.store.setItem(CONFIG.SAVE_KEY, json);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Falha ao salvar' };
    }
  }

  hasSave() {
    return !!(this.store.getItem(CONFIG.SAVE_KEY) || this.store.getItem(CONFIG.BACKUP_KEY));
  }

  clear() {
    this.store.removeItem(CONFIG.SAVE_KEY);
    this.store.removeItem(CONFIG.BACKUP_KEY);
  }

  loadSettings() {
    try { return JSON.parse(this.store.getItem(CONFIG.SETTINGS_KEY) || 'null'); } catch { return null; }
  }

  saveSettings(s) {
    try { this.store.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignora */ }
  }
}
