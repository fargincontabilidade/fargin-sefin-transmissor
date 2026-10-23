/* global Phaser */
// Ponto de entrada do Monstrin World.
import { app } from './app.js';
import { initUI, ui } from './ui/ui.js';
import { controls } from './ui/controls.js';
import { menus, applySettings } from './ui/menus.js';
import { showTitle } from './ui/title.js';
import { BootScene, TitleScene } from './scenes/scenes.js';
import { WorldScene } from './world/WorldScene.js';
import { Game, newGameState, migrate } from './core/gameState.js';
import { QUESTS } from './data/quests.js';
import { getItem } from './data/items.js';
import { art } from './art/registry.js';
import { sfx } from './audio/sfx.js';

initUI();
Object.assign(app.settings, app.storage.loadSettings() || {});
controls.mountTouch(ui.root);
controls.setTouchVisible(false);
applySettings();

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const size = () => ({ w: Math.max(320, window.innerWidth), h: Math.max(320, window.innerHeight) });

const s0 = size();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0f1226',
  scale: { mode: Phaser.Scale.NONE, width: Math.round(s0.w * dpr()), height: Math.round(s0.h * dpr()), zoom: 1 / dpr() },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  input: { keyboard: false },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, WorldScene],
});

function onResize() {
  const s = size();
  game.scale.resize(Math.round(s.w * dpr()), Math.round(s.h * dpr()));
  game.scale.setZoom(1 / dpr());
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

function wireGameEvents(g) {
  g.on((type, p) => {
    if (type !== 'quest') return;
    const q = QUESTS[p.id];
    if (!q) return;
    if (p.status === 'active') { ui.toast(`📜 Nova missão: ${q.name}`); sfx.play('item'); }
    if (p.status === 'ready') { ui.toast(`🎁 Missão pronta: fale com ${q.giver}`); sfx.play('item'); }
    if (p.status === 'done') {
      ui.toast(`✅ Missão concluída: ${q.name}!`);
      sfx.play('levelup');
      for (const [id, n] of Object.entries(p.rewards?.items || {})) ui.toast(`Recompensa: ${n}x ${getItem(id).name}`, art.itemUrl(id));
      if (p.rewards?.coins) ui.toast(`Recompensa: ${p.rewards.coins} moedas 🪙`);
      setTimeout(() => app.save(), 50);
    }
  });
}

function startGame(g, isNew) {
  app.game = g;
  app.sessionStart = Date.now();
  wireGameEvents(g);
  game.scene.stop('title');
  game.scene.start('world');
  menus.mountHud();
  applySettings();
  if (isNew) {
    app.save();
    setTimeout(async () => {
      await ui.say(`Bom dia, ${g.s.player.name}! Hoje é o grande dia: a Professora Íris está esperando você no laboratório, ao norte da Vila Aurora.`, { name: 'Mamãe (bilhete na mesa)' });
      await ui.say('Use WASD/setas (ou o direcional na tela) para andar e E/Espaço (ou o botão A) para conversar e interagir.');
    }, 900);
  }
}

game.events.once('mw-ready', () => {
  document.getElementById('loading')?.remove();
  game.scene.start('title');
  showTitle({
    onContinue: (saved) => startGame(new Game(migrate(saved)), false),
    onNewGame: ({ name, look }) => startGame(new Game(newGameState({ name, look })), true),
  });
});

// Salva ao sair/minimizar (importante no celular)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && app.game) app.save(); });
window.addEventListener('pagehide', () => { if (app.game) app.save(); });

// Preparação para PWA (atalho na tela inicial)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.endsWith('claude.ai') && !location.hostname.endsWith('claudeusercontent.com')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Acesso para testes automatizados
window.__mw = { app, game, ui, menus };
