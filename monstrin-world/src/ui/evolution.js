// Animação de evolução (após a batalha):
// energia envolve a criatura, a forma alterna, flash, nova forma revelada.
import { h, ui } from './ui.js';
import { app } from '../app.js';
import { evolve, displayName, pendingEvolution } from '../core/monstrin.js';
import { getSpecies } from '../data/species.js';
import { getMove } from '../data/moves.js';
import { ELEMENTS } from '../data/elements.js';
import { art } from '../art/registry.js';
import { sfx } from '../audio/sfx.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const STYLE = `
.evo { position: fixed; inset: 0; z-index: 45; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: radial-gradient(circle, #2a1f5a, #0a0818 75%); animation: fadeIn .4s; overflow: hidden; }
.evo .stage { position: relative; width: min(70vw, 320px); aspect-ratio: 1; }
.evo .stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; transition: filter .25s, opacity .2s, transform .25s; }
.evo .glow { position: absolute; inset: -30%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.9), rgba(160,220,255,.35) 35%, transparent 65%); opacity: 0; transition: opacity .5s, transform .5s; }
.evo .txt { font-size: 22px; font-weight: 900; text-align: center; padding: 0 20px; text-shadow: 0 3px 6px rgba(0,0,0,.6); min-height: 60px; }
.evo .orb { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #bff6ff; box-shadow: 0 0 14px #9ff3ff; }
`;

export async function playEvolutions(uids) {
  if (!document.getElementById('evo-style')) document.head.append(h('style', { id: 'evo-style' }, STYLE));
  for (const uid of uids) {
    const mon = app.game.getMon(uid);
    if (!mon || !pendingEvolution(mon)) continue;
    await playOne(mon);
  }
  app.world?.refreshFollower();
}

async function playOne(mon) {
  const fromId = mon.speciesId;
  const toId = pendingEvolution(mon);
  const oldName = displayName(mon);
  ui.blockingFlag = true;
  const overlay = h('div', { class: 'evo' });
  const stage = h('div', { class: 'stage' });
  const imgA = h('img', { src: art.monUrl(fromId) });
  const imgB = h('img', { src: art.monUrl(toId), style: { opacity: 0 } });
  const glow = h('div', { class: 'glow' });
  stage.append(glow, imgA, imgB);
  const txt = h('div', { class: 'txt' }, `O quê? ${oldName} está evoluindo!`);
  overlay.append(stage, txt);
  ui.root.append(overlay);
  sfx.stopMusic();
  sfx.play('evolve');
  await wait(1200);
  // energia envolve a criatura
  for (let i = 0; i < 24; i++) {
    const o = h('div', { class: 'orb' });
    const a = Math.random() * Math.PI * 2;
    o.style.left = `${50 + Math.cos(a) * 70}%`; o.style.top = `${50 + Math.sin(a) * 70}%`;
    o.style.transition = `all ${0.8 + Math.random() * 0.6}s ease-in`;
    stage.append(o);
    requestAnimationFrame(() => { o.style.left = '50%'; o.style.top = '50%'; o.style.opacity = '0'; });
  }
  imgA.style.filter = 'brightness(0) invert(1) drop-shadow(0 0 20px #9ff3ff)';
  imgB.style.filter = 'brightness(0) invert(1) drop-shadow(0 0 20px #9ff3ff)';
  glow.style.opacity = '0.6';
  await wait(900);
  // formas alternando cada vez mais rápido
  let delay = 420;
  for (let i = 0; i < 12; i++) {
    imgA.style.opacity = i % 2 ? '1' : '0';
    imgB.style.opacity = i % 2 ? '0' : '1';
    sfx.play('cursor');
    await wait(delay);
    delay = Math.max(70, delay * 0.78);
  }
  imgA.style.opacity = '0';
  imgB.style.opacity = '1';
  glow.style.opacity = '1';
  glow.style.transform = 'scale(1.6)';
  ui.flash();
  sfx.play('caught');
  await wait(450);
  // revela
  const res = evolve(mon);
  imgB.style.filter = 'drop-shadow(0 10px 18px rgba(0,0,0,.5))';
  imgB.style.transform = 'scale(1.06)';
  glow.style.opacity = '0.25';
  const sp = getSpecies(toId);
  const el = ELEMENTS[sp.element];
  overlay.style.background = `radial-gradient(circle, ${el.dark}, #0a0818 75%)`;
  txt.textContent = `Parabéns! ${oldName} evoluiu para ${sp.name}!`;
  sfx.play('levelup');
  await wait(2200);
  const b = res.before; const a = res.after;
  txt.textContent = `PV ${b.hp}→${a.hp} · Atq ${b.atk}→${a.atk} · Def ${b.def}→${a.def} · Vel ${b.spd}→${a.spd}`;
  await wait(2200);
  for (const m of res.learned) { txt.textContent = `${displayName(mon)} aprendeu ${getMove(m).name}!`; sfx.play('item'); await wait(1600); }
  overlay.style.transition = 'opacity .4s';
  overlay.style.opacity = '0';
  await wait(400);
  overlay.remove();
  ui.blockingFlag = false;
  app.game.markDex(toId, 'caught');
  ui.toast(`${sp.name} registrado no Criaturário!`, art.monUrl(toId));
  sfx.music(app.world?.def?.music || 'village');
}
