// Diretor de batalha: as batalhas acontecem no próprio cenário.
// O motor de regras (core/battleEngine.js) decide o que acontece; aqui
// cuidamos da encenação: posições, câmera, efeitos, barras e textos.
import { CONFIG } from '../config.js';
import { app } from '../app.js';
import { Battle } from '../core/battleEngine.js';
import { displayName, pendingEvolution, isFainted } from '../core/monstrin.js';
import { getSpecies } from '../data/species.js';
import { getItem } from '../data/items.js';
import { getMove } from '../data/moves.js';
import { MonSprite, DIR_VEC } from '../world/entities.js';
import { BattleHud } from '../ui/battleHud.js';
import { ui } from '../ui/ui.js';
import { menus } from '../ui/menus.js';
import { controls } from '../ui/controls.js';
import { sfx } from '../audio/sfx.js';
import { art } from '../art/registry.js';
import { playMoveAnim, hitReaction, floatText, statFx, healFx, burnFx, wait, tw, burst, ring, glowAt } from './effects.js';

const T = CONFIG.TILE;

function monH(view) { return 92 * getSpecies(view.speciesId).art.size * (view.extraScale || 1); }

export async function runBattle(scene, opts) {
  const game = app.game;
  const party = game.party();
  const enemyTeam = opts.kind === 'wild' ? [opts.wild.mon] : opts.team;
  const battle = new Battle({
    kind: opts.kind,
    playerTeam: party,
    enemyTeam,
    playerName: game.s.player.name,
    enemyName: opts.kind === 'wild' ? 'Selvagem' : opts.trainer.name,
    playerLeadIndex: game.leadIndex(),
  });
  for (const m of enemyTeam) game.markDex(m.speciesId, 'seen');

  const player = scene.player;
  const cam = scene.cameras.main;
  const extras = [];

  // ---------- Posicionamento ----------
  let enemyView;
  let enemyPos;
  let trainerNpc = opts.trainerNpc || null;
  if (opts.kind === 'wild') {
    enemyView = opts.wild.view;
    enemyPos = { x: enemyView.x, y: enemyView.y };
  } else {
    const n = trainerNpc;
    const dx = player.x - n.x; const dy = player.y - n.y; const d = Math.hypot(dx, dy) || 1;
    enemyPos = { x: n.x + (dx / d) * T * 1.1 + (Math.abs(dy) > Math.abs(dx) ? T * 0.8 : 0), y: n.y + (dy / d) * T * 1.1 };
    enemyView = new MonSprite(scene, battle.activeMon(1).speciesId, enemyPos.x, enemyPos.y);
    enemyView.setVisible(false);
    extras.push(enemyView);
  }
  // posição do nosso Monstrin: entre o jogador e o inimigo
  const candidates = [];
  const side = Math.sign(enemyPos.x - player.x) || 1;
  candidates.push({ x: enemyPos.x - side * T * 2.4, y: enemyPos.y });
  candidates.push({ x: enemyPos.x + side * T * 2.4, y: enemyPos.y });
  candidates.push({ x: enemyPos.x, y: enemyPos.y + T * 2.2 });
  candidates.push({ x: enemyPos.x, y: enemyPos.y - T * 2.2 });
  if (opts.kind === 'trainer') candidates.unshift({ x: player.x + (enemyPos.x - player.x) * 0.35, y: player.y + (enemyPos.y - player.y) * 0.35 });
  const ourPos = candidates.find((c) => scene.canStand(c.x, c.y) && Math.hypot(c.x - player.x, c.y - player.y) < T * 4.5) || { x: player.x + side * T * 0.9, y: player.y };

  // o treinador recua para não ficar colado no adversário
  if (opts.kind === 'wild') {
    const d0 = Math.hypot(enemyPos.x - player.x, enemyPos.y - player.y);
    if (d0 < T * 3) {
      const ux = (player.x - enemyPos.x) / (d0 || 1); const uy = (player.y - enemyPos.y) / (d0 || 1);
      const back = [ourPos.x + (ourPos.x - enemyPos.x) * 0.45, ourPos.y + (ourPos.y - enemyPos.y) * 0.45 + T * 0.5];
      const cand = [back, [player.x + ux * T * 1.3, player.y + uy * T * 1.3]].find(([x, y]) => scene.canStand(x, y) && Math.hypot(x - enemyPos.x, y - enemyPos.y) > T * 2.2);
      if (cand) {
        await tw(scene, { targets: player, x: cand[0], y: cand[1], duration: 300, onUpdate: () => { player.animate(0.016, true); player.sync(); } });
        player.animate(0, false);
      }
    }
  }
  for (const w of scene.wilds) if (w.label) w.label.setVisible(false);

  // jogador olha para a batalha
  const ddx = enemyPos.x - player.x; const ddy = enemyPos.y - player.y;
  player.face(Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'));

  // nosso Monstrin
  const follower = scene.follower;
  let ourView;
  if (follower) { follower.paused = true; ourView = follower.view; } else { ourView = new MonSprite(scene, party[0].speciesId, player.x, player.y); extras.push(ourView); }
  const lead = battle.activeMon(0);
  ourView.setSpecies(lead.speciesId);
  ourView.setVisible(true);
  ourView.sprite.setAlpha(1);

  // anéis da arena
  const ringA = scene.add.image(ourPos.x, ourPos.y, 'battle_ring').setDepth(-30000).setScale(0.6).setAlpha(0);
  const ringB = scene.add.image(enemyPos.x, enemyPos.y, 'battle_ring').setDepth(-30000).setScale(0.6).setAlpha(0);
  extras.push(ringA, ringB);

  // ---------- Abertura ----------
  sfx.play('encounter');
  sfx.music('battle');
  ui.flash();
  if (opts.kind === 'wild') {
    const alert = scene.add.image(enemyView.x, enemyView.y - monH(enemyView) - 30, 'emote_alert').setDepth(1e6).setScale(0.1);
    scene.tweens.add({ targets: alert, scale: 0.9, duration: 200, ease: 'Back.out' });
    scene.time.delayedCall(800, () => alert.destroy());
  }
  cam.stopFollow();
  const midX = (ourPos.x + enemyPos.x) / 2; const midY = (ourPos.y + enemyPos.y) / 2 - 30;
  scene.battleZoom = 1.22;
  cam.pan(midX, midY, 600, 'Sine.easeInOut');
  cam.zoomTo(scene.baseZoom * 1.22, 600, 'Sine.easeInOut');
  await tw(scene, { targets: ourView, x: ourPos.x, y: ourPos.y, duration: 450, onUpdate: () => ourView.update(0.016, true) });
  ourView.faceTowards(enemyPos.x);
  enemyView.faceTowards(ourPos.x);
  scene.tweens.add({ targets: [ringA, ringB], alpha: 1, scale: 1, duration: 300 });
  if (opts.kind === 'trainer') await summonFx(scene, enemyView, trainerNpc, battle.activeMon(1).speciesId);

  // laço de animação dos Monstrins durante a batalha
  const tick = scene.time.addEvent({ delay: 16, loop: true, callback: () => { if (!follower) ourView.update(0.016, false); if (opts.kind !== 'wild' && enemyView.sprite.visible) enemyView.update(0.016, false); } });

  const hud = new BattleHud(ui.root);
  ui.blockingFlag = true;
  controls.setTouchVisible(false);
  menus.showHud(false);
  hud.open(battle, game);
  if (opts.kind === 'wild') {
    const sp = getSpecies(enemyTeam[0].speciesId);
    await hud.log(`Um ${sp.name} selvagem apareceu!${sp.rarity === 'raro' ? ' Que raro!' : ''}`);
  } else {
    await hud.log(`${opts.trainer.name} quer batalhar!`);
    await hud.log(`${opts.trainer.name} convocou ${displayName(battle.activeMon(1))}!`);
  }
  await hud.log(`Vai, ${displayName(lead)}!`, 900);

  const views = { 0: ourView, 1: enemyView };
  const trainers = { 0: player, 1: trainerNpc };
  const pt = (sideIdx) => {
    const v = views[sideIdx];
    if (battle.activeMon(sideIdx) || v.sprite.visible) return { x: v.x, y: v.y, h: monH(v), view: v };
    const tr = trainers[sideIdx];
    return { x: tr.x, y: tr.y, h: 90, sprite: tr.sprite, trainer: tr };
  };

  // ---------- Turnos ----------
  while (!battle.over) {
    const action = await hud.chooseAction();
    if (action.type === 'capture') game.removeItem(action.itemId);
    if (action.type === 'item') game.removeItem(action.itemId);
    const events = battle.playTurn(action);
    for (const ev of events) await animateEvent(scene, battle, hud, ev, views, pt, trainers, game);
  }

  // ---------- Encerramento ----------
  tick.remove();
  const result = battle.result;
  if (result === 'win') {
    sfx.music(null);
    sfx.play('victory');
    await hud.log(opts.kind === 'trainer' ? `Você venceu ${opts.trainer.name}!` : 'Você venceu a batalha!', 1600);
  } else if (result === 'caught') {
    const mon = battle.caughtMon;
    mon.origin = { how: 'capturado', mapId: scene.def.id, level: mon.level, date: new Date().toISOString(), item: null };
    mon.history.push({ type: 'caught', mapId: scene.def.id, level: mon.level, date: new Date().toISOString() });
    mon.status = null;
    const where = game.addMonstrin(mon);
    game.s.stats.captures += 1;
    game.questEvent('capture', { species: mon.speciesId });
    await hud.log(`Você capturou ${getSpecies(mon.speciesId).name}! ${where === 'party' ? 'Ele entrou para a sua equipe.' : 'Ele foi enviado para a sua Coleção.'}`, 2200);
  } else if (result === 'fled') {
    // a animação já foi feita
  } else if (result === 'lose') {
    sfx.play('defeat');
    await hud.log(battle.useTrainerHp && battle.sides[0].trainerHp <= 0 ? 'Seus PV de treinador chegaram a zero...' : 'Você não tem mais Monstrins aptos para batalhar...', 1800);
  }
  hud.close();
  ui.blockingFlag = false;
  menus.showHud(true);
  ui.setTouchVisible(ui.touchVisible);

  // Monstrins que podem evoluir
  const evolve = game.party().filter((m) => !isFainted(m) && pendingEvolution(m)).map((m) => m.uid);

  // restaura a cena
  scene.battleZoom = null;
  cam.zoomTo(scene.baseZoom, 500, 'Sine.easeInOut');
  cam.pan(player.x, player.y, 500, 'Sine.easeInOut');
  await wait(520);
  cam.startFollow(player.sprite, false, 0.14, 0.14, 0, 20);
  for (const e of extras) e.destroy();
  if (follower) {
    follower.paused = false;
    const f = game.follower();
    if (f) { follower.setMon(f); ourView.setVisible(true); ourView.sprite.setAlpha(1); ourView.extraScale = 1; }
    follower.resetBehind();
  }
  if (opts.kind === 'wild' && result !== 'caught' && result !== 'win') {
    enemyView.setVisible(true); enemyView.sprite.setAlpha(1); enemyView.extraScale = 1; enemyView.sprite.clearTint();
  }
  sfx.music(scene.def.music || (scene.def.ambient === 'interior' ? 'interior' : 'village'));
  menus.refreshHud();
  return { result, evolve };
}

async function summonFx(scene, view, fromEntity, speciesId) {
  view.setSpecies(speciesId);
  const src = fromEntity || view;
  const beam = scene.add.image(src.x, src.y - 40, 'p_soft').setTint(0xbff6ff).setDepth(9e5).setBlendMode('ADD').setScale(0.4);
  await tw(scene, { targets: beam, x: view.x, y: view.y - 30, duration: 260 });
  beam.destroy();
  view.setVisible(true);
  view.sprite.setAlpha(1);
  view.extraScale = 0.05;
  view.sprite.setTintFill(0xffffff);
  ring(scene, view.x, view.y, { tint: 0xbff6ff, to: 1.2 });
  glowAt(scene, view.x, view.y - 30, 0xbff6ff, 2.5, 400);
  sfx.play('select');
  await tw(scene, { targets: view, extraScale: 1, duration: 320, ease: 'Back.out', onUpdate: () => view.update(0.001, false) });
  view.sprite.clearTint();
}

async function recallFx(scene, view, toEntity) {
  view.sprite.setTintFill(0xffffff);
  await tw(scene, { targets: view, extraScale: 0.05, duration: 260, onUpdate: () => view.update(0.001, false) });
  view.setVisible(false);
  view.sprite.clearTint();
  view.extraScale = 1;
  if (toEntity) {
    const beam = scene.add.image(view.x, view.y - 30, 'p_soft').setTint(0xbff6ff).setDepth(9e5).setBlendMode('ADD').setScale(0.4);
    await tw(scene, { targets: beam, x: toEntity.x, y: toEntity.y - 40, duration: 220 });
    beam.destroy();
  }
}

async function animateEvent(scene, battle, hud, ev, views, pt, trainers, game) {
  switch (ev.type) {
    case 'move': {
      await hud.log(ev.text, 700);
      const mv = getMove(ev.moveId);
      const from = pt(ev.side);
      const to = mv.category === 'dano' ? pt(1 - ev.side) : from;
      await playMoveAnim(scene, ev.moveId, from, to);
      break;
    }
    case 'damage': {
      const target = pt(ev.side);
      if (ev.source === 'burn') await burnFx(scene, target);
      if (ev.target === 'trainer') {
        const tr = trainers[ev.side];
        if (tr) { tr.sprite.setTint(0xff7a7a); scene.cameras.main.shake(260, 0.01); await wait(120); tr.sprite.clearTint(); }
        floatText(scene, tr ? tr.x : target.x, (tr ? tr.y : target.y) - 110, `-${ev.amount}`, '#ffb36b', 40);
        sfx.play('superhit');
        hud.setTrainerHp(ev.side, ev.hp, ev.maxHp);
        await hud.log(ev.text, 1100);
        break;
      }
      const big = ev.eff > 1 || ev.crit;
      const hr = hitReaction(scene, target, { big });
      floatText(scene, target.x, target.y - target.h - 10, `-${ev.amount}`, ev.eff > 1 ? '#ffe14a' : ev.eff < 1 ? '#c8d0e0' : '#ffffff', ev.eff > 1 ? 42 : 34);
      hud.setHp(ev.side, ev.hp, ev.maxHp);
      await hr;
      await wait(250);
      if (ev.crit) await hud.log('Acerto crítico!', 800);
      if (ev.eff > 1) await hud.log('É super eficaz!', 900);
      else if (ev.eff < 1) await hud.log('Não é muito eficaz...', 900);
      if (ev.text) await hud.log(ev.text, 900);
      break;
    }
    case 'miss': {
      sfx.play('miss');
      await hud.log(ev.text, 900);
      break;
    }
    case 'heal': {
      await healFx(scene, pt(ev.side));
      hud.setHp(ev.side, ev.hp, ev.maxHp);
      await hud.log(ev.text || `${ev.side === 0 ? 'Seu Monstrin' : 'O adversário'} recuperou ${ev.amount} PV!`, 900);
      break;
    }
    case 'stat': {
      await statFx(scene, pt(ev.side), ev.delta > 0);
      await hud.log(ev.text, 900);
      break;
    }
    case 'status': {
      hud.setStatus(ev.side, ev.status);
      await burnFx(scene, pt(ev.side));
      await hud.log(ev.text, 900);
      break;
    }
    case 'faint': {
      const v = views[ev.side];
      sfx.play('faint');
      await tw(scene, { targets: v, extraScale: 0.6, duration: 500, onUpdate: () => v.update(0.001, false) });
      await tw(scene, { targets: [v.sprite, v.shadow], alpha: 0, duration: 250 });
      v.setVisible(false);
      v.sprite.setAlpha(1); v.shadow.setAlpha(1); v.extraScale = 1;
      hud.setMon(ev.side, null);
      await hud.log(ev.text, 1000);
      if (battle.useTrainerHp && !battle.over && !battle.hasHealthy(ev.side)) {
        await hud.log(ev.side === 0 ? 'Você está sem Monstrins! Seus PV de treinador estão expostos!' : `${battle.sides[1].name} está sem Monstrins! Ataque diretamente!`, 1400);
      }
      break;
    }
    case 'xp': {
      const mon = game.getMon(ev.uid);
      await hud.log(ev.text, 900);
      const active = battle.activeMon(0);
      for (const r of ev.results) {
        if (r.type === 'levelup') {
          sfx.play('levelup');
          if (active && active.uid === ev.uid) {
            hud.setXp(mon, r.level, ev.xp);
            const v = views[0];
            burst(scene, v.x, v.y - 30, { tex: 'p_star', tint: [0xffe14a, 0xffffff, 0x7fe9ff], count: 18, speed: [80, 220], scale: [0.6, 0] });
          }
          const d = r.after;
          const b = r.before;
          await hud.log(`${displayName(mon)} subiu para o nível ${r.level}! (PV +${d.hp - b.hp}, Atq +${d.atk - b.atk}, Def +${d.def - b.def}, Vel +${d.spd - b.spd})`, 2000);
        } else if (r.type === 'learned') {
          sfx.play('item');
          await hud.log(`${displayName(mon)} aprendeu ${getMove(r.move).name}!${r.equipped ? '' : ' (Guardado: equipe pelo menu da Equipe.)'}`, 1700);
        } else if (r.type === 'canEvolve') {
          // evolução acontece ao fim da batalha
        }
      }
      if (active && active.uid === ev.uid) { hud.setXp(mon, ev.level, ev.xp); hud.setHp(0, ev.hp, ev.maxHp); hud.playerPanel.lv.textContent = `Nv.${ev.level}`; }
      break;
    }
    case 'switch': {
      const v = views[ev.side];
      const tr = trainers[ev.side];
      if (ev.fromUid && v.sprite.visible) {
        await hud.log(ev.side === 0 ? `Volte, ${displayName(game.getMon(ev.fromUid) || { speciesId: v.speciesId })}!` : `${battle.sides[1].name} recolheu seu Monstrin.`, 800);
        await recallFx(scene, v, tr);
      }
      const mon = battle.sides[ev.side].team[ev.index];
      await summonFx(scene, v, tr, mon.speciesId);
      v.faceTowards(views[1 - ev.side].x);
      hud.setMon(ev.side, mon, ev.hp, ev.maxHp);
      if (ev.side === 1) game.markDex(mon.speciesId, 'seen');
      await hud.log(ev.side === 0 ? `Vai, ${displayName(mon)}!` : ev.text, 900);
      break;
    }
    case 'item': {
      sfx.play('heal');
      const active = battle.activeMon(ev.side);
      if (active && active.uid === ev.targetUid) { await healFx(scene, pt(ev.side)); hud.setHp(ev.side, ev.hp, ev.maxHp); }
      await hud.log(ev.text, 1100);
      menus.refreshHud();
      break;
    }
    case 'capture': {
      await captureAnim(scene, hud, ev, views[1], scene.player);
      break;
    }
    case 'flee': {
      if (ev.success) {
        const v = views[0];
        await hud.log('Você fugiu em segurança!', 900);
        void v;
      } else {
        await hud.log('Não conseguiu fugir!', 900);
      }
      break;
    }
    case 'message': {
      await hud.log(ev.text, 1000);
      break;
    }
    default: break;
  }
}

async function captureAnim(scene, hud, ev, target, player) {
  const item = getItem(ev.itemId);
  await hud.log(`Você lançou um ${item.name}!`, 700);
  sfx.play('throw');
  const seal = scene.add.image(player.x, player.y - 60, `seal_${ev.itemId}`).setDepth(9.5e5).setScale(1.2);
  const tx = target.x; const ty = target.y - monH(target) * 0.5;
  const o = { t: 0 };
  const x0 = seal.x; const y0 = seal.y;
  await tw(scene, { targets: o, t: 1, duration: 520, ease: 'Sine.inOut', onUpdate: () => { seal.x = x0 + (tx - x0) * o.t; seal.y = y0 + (ty - y0) * o.t - Math.sin(o.t * Math.PI) * 120; seal.rotation += 0.25; } });
  seal.rotation = 0;
  // o Monstrin vira luz e entra no selo
  ring(scene, tx, ty, { tint: 0xbff6ff, to: 1.4, sy: 1 });
  glowAt(scene, tx, ty, 0xbff6ff, 3, 500);
  target.sprite.setTintFill(0xbff6ff);
  await tw(scene, { targets: target, extraScale: 0.05, duration: 380, onUpdate: () => target.update(0.001, false) });
  target.setVisible(false);
  // o selo cai no chão
  await tw(scene, { targets: seal, y: target.y - 16, duration: 300, ease: 'Bounce.out' });
  for (let i = 0; i < ev.shakes; i++) {
    await wait(350);
    sfx.play('shake');
    await tw(scene, { targets: seal, angle: { from: -22, to: 22 }, duration: 110, yoyo: true, repeat: 1 });
    seal.angle = 0;
  }
  await wait(380);
  if (ev.success) {
    sfx.play('caught');
    burst(scene, seal.x, seal.y, { tex: 'p_star', tint: [0xffe14a, 0xffffff, 0x7fe9ff, 0xff9de2], count: 26, speed: [90, 260], scale: [0.7, 0] });
    seal.setTint(0xfff6a8);
    await tw(scene, { targets: seal, scale: 1.6, duration: 200, yoyo: true });
    await hud.log(`Isso! ${getSpecies(target.speciesId).name} foi capturado!`, 1500);
    await tw(scene, { targets: seal, alpha: 0, y: seal.y - 30, duration: 400 });
    seal.destroy();
  } else {
    sfx.play('break');
    burst(scene, seal.x, seal.y, { tex: 'p_rock', tint: [0x5ad1ff, 0xbff6ff, 0xffffff], count: 16, speed: [100, 260], gravity: 500, blend: 'NORMAL' });
    seal.destroy();
    target.setVisible(true);
    target.sprite.clearTint();
    target.extraScale = 0.3;
    await tw(scene, { targets: target, extraScale: 1, duration: 300, ease: 'Back.out', onUpdate: () => target.update(0.001, false) });
    const msgs = ['Ah, não! Ele escapou!', 'Quase! Faltou pouco!', 'Droga! Estava quase preso!'];
    await hud.log(msgs[Math.min(2, ev.shakes)], 1100);
  }
}

export { DIR_VEC, art };
