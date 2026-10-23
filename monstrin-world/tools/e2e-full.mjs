// Teste de ponta a ponta: joga o ciclo completo usando teclado e cliques reais.
// Uso: node tools/e2e-full.mjs <pasta-de-screenshots> [url]
import { open, sleep } from './e2e-lib.mjs';

const out = process.argv[2] || '.';
const url = process.argv[3] || 'http://localhost:8080/index.html';
const T = 64;
const log = (...a) => console.log('▶', ...a);
const shots = [];
const shot = async (p, name) => { const f = `${out}/${name}.png`; await p.screenshot({ path: f }); shots.push(f); };

const { b, p, errors } = await open(url);

const state = () => p.evaluate(() => {
  const w = __mw.app.world;
  const g = __mw.app.game;
  return {
    map: w?.def?.id, x: w?.player?.x, y: w?.player?.y, locked: w?.locked, blocking: __mw.ui.isBlocking(), inBattle: !!w?.inBattle,
    party: g?.party().map((m) => ({ s: m.speciesId, lv: m.level, xp: m.xp, hp: m.hp })), box: g?.box().length, coins: g?.s.player.coins,
    quests: g ? Object.fromEntries(Object.entries(g.s.quests).map(([k, v]) => [k, v.status])) : {},
  };
});

// Caminho (BFS) calculado com a colisão real do jogo
async function pathTo(tx, ty, adjacent = false) {
  return p.evaluate(({ tx, ty, adjacent }) => {
    const w = __mw.app.world;
    const st = w.player.tile();
    const key = (x, y) => `${x},${y}`;
    const goal = (x, y) => adjacent ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : (x === tx && y === ty);
    const q = [[st.tx, st.ty]];
    const prev = new Map([[key(st.tx, st.ty), null]]);
    while (q.length) {
      const [x, y] = q.shift();
      if (goal(x, y)) {
        const path = [];
        let k = key(x, y);
        while (k) { path.unshift(k.split(',').map(Number)); k = prev.get(k); }
        return path;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (prev.has(key(nx, ny))) continue;
        const isTarget = nx === tx && ny === ty;
        const isWarp = !!w.warpAt(nx, ny);
        if (w.tileSolid(nx, ny) && !isTarget) continue;
        if (w.npcAt(nx, ny) && !isTarget) continue;
        if (isWarp && !isTarget) continue;
        prev.set(key(nx, ny), key(x, y));
        q.push([nx, ny]);
      }
    }
    return null;
  }, { tx, ty, adjacent });
}

async function holdUntil(keyName, cond, timeout = 4000) {
  await p.keyboard.down(keyName);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await state();
    if (cond(s)) break;
    await sleep(15);
  }
  await p.keyboard.up(keyName);
}

async function walkPath(path) {
  for (const [tx, ty] of path.slice(1)) {
    const s = await state();
    if (s.inBattle || s.blocking) return false;
    const cx = (tx + 0.5) * T; const cy = (ty + 0.62) * T;
    if (Math.abs(s.x - cx) > 6) {
      const k = cx > s.x ? 'ArrowRight' : 'ArrowLeft';
      await holdUntil(k, (n) => n.inBattle || n.blocking || n.map !== s.map || (k === 'ArrowRight' ? n.x >= cx - 3 : n.x <= cx + 3));
    }
    const s2 = await state();
    if (s2.inBattle || s2.blocking || s2.map !== s.map) return s2.map !== s.map;
    if (Math.abs(s2.y - cy) > 6) {
      const k = cy > s2.y ? 'ArrowDown' : 'ArrowUp';
      await holdUntil(k, (n) => n.inBattle || n.blocking || n.map !== s.map || (k === 'ArrowDown' ? n.y >= cy - 3 : n.y <= cy + 3));
    }
    const s3 = await state();
    if (s3.map !== s.map) return true;
  }
  return true;
}

async function goTo(tx, ty, opts = {}) {
  for (let tries = 0; tries < 4; tries++) {
    const path = await pathTo(tx, ty, opts.adjacent);
    if (!path) throw new Error(`sem caminho até ${tx},${ty}`);
    await walkPath(path);
    const s = await state();
    if (s.inBattle || s.blocking) return s;
    const t = await p.evaluate(() => __mw.app.world.player.tile());
    if (opts.adjacent ? Math.abs(t.tx - tx) + Math.abs(t.ty - ty) === 1 : (t.tx === tx && t.ty === ty)) return s;
    if (opts.untilMap && s.map === opts.untilMap) return s;
  }
  return state();
}

async function waitMap(id, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { const s = await state(); if (s.map === id && !s.locked) return s; await sleep(100); }
  throw new Error(`não chegou ao mapa ${id}`);
}

async function face(dir) {
  const k = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir];
  await p.keyboard.down(k); await sleep(40); await p.keyboard.up(k); await sleep(80);
}

// Avança diálogos até não haver mais (ou até aparecer uma tela)
async function skipDialogs(max = 30, stopAtScreen = true) {
  for (let i = 0; i < max; i++) {
    const has = await p.evaluate(() => !!document.querySelector('.dialog'));
    const choices = await p.evaluate(() => !!document.querySelector('.choices'));
    const screen = await p.evaluate(() => !!document.querySelector('.screen'));
    if (choices) return 'choices';
    if (screen && stopAtScreen) return 'screen';
    if (!has) { await sleep(250); if (!(await p.evaluate(() => !!document.querySelector('.dialog')))) return 'none'; continue; }
    await p.keyboard.press('Space'); await sleep(60); await p.keyboard.press('Space');
    await sleep(250);
  }
  return 'max';
}

try {
  // 1-2. Abrir o jogo e começar nova aventura
  await sleep(2500);
  await shot(p, '01-titulo');
  await p.click('text=Nova aventura');
  await sleep(300);
  await p.fill('.text-input', 'Ana');
  await p.click('.look >> nth=2');
  await p.fill('.text-input', 'Ana');
  await p.click('text=Começar aventura');
  await sleep(1500);
  await skipDialogs();
  log('nova aventura iniciada', JSON.stringify(await state()));

  // 3-4. Andar e sair de casa
  await goTo(4, 8, { untilMap: 'vila_aurora' });
  await waitMap('vila_aurora');
  log('saiu de casa');
  await shot(p, '02-vila');

  // Tentar sair da vila sem Monstrin (vigia bloqueia)
  await goTo(31, 13);
  await face('right');
  await p.keyboard.down('ArrowRight'); await sleep(500); await p.keyboard.up('ArrowRight');
  await sleep(600);
  await shot(p, '03-vigia');
  await skipDialogs();
  log('vigia bloqueou a saída:', (await state()).map === 'vila_aurora');

  // 5. Conversar com NPC (Nina)
  const nina = await p.evaluate(() => { const n = __mw.app.world.npcs.find((x) => x.def.id === 'nina'); return n.tile(); });
  await goTo(nina.tx, nina.ty, { adjacent: true });
  const me = await p.evaluate(() => __mw.app.world.player.tile());
  const nn = await p.evaluate(() => __mw.app.world.npcs.find((x) => x.def.id === 'nina').tile());
  await face(nn.tx > me.tx ? 'right' : nn.tx < me.tx ? 'left' : nn.ty > me.ty ? 'down' : 'up');
  await p.keyboard.press('Space');
  await sleep(700);
  const talked = await p.evaluate(() => document.querySelector('.dialog .name')?.textContent);
  log('conversou com NPC:', talked);
  await shot(p, '04-nina');
  await skipDialogs();

  // 6. Laboratório e escolha do primeiro Monstrin
  await goTo(15, 5, { untilMap: 'lab' });
  await waitMap('lab');
  await goTo(6, 5);
  await face('up');
  await p.keyboard.press('Space');
  await sleep(500);
  let r = await skipDialogs(30);
  log('após diálogo da professora:', r);
  await shot(p, '05-escolha');
  await p.click('.starter >> nth=0');
  await sleep(200);
  await p.click('text=Escolher Brasito');
  await sleep(400);
  await p.click('text=Sim, é esse!');
  await sleep(800);
  await skipDialogs(30, false);
  let s = await state();
  log('equipe após escolha:', JSON.stringify(s.party), 'missões:', JSON.stringify(s.quests));
  if (!s.party.length) throw new Error('inicial não foi adicionado');

  // 7. Sair da cidade
  await goTo(6, 10, { untilMap: 'vila_aurora' });
  await waitMap('vila_aurora');
  await shot(p, '06-com-acompanhante');
  await goTo(33, 12, { untilMap: 'bosque' });
  await waitMap('bosque');
  await skipDialogs();
  log('chegou ao Bosque Sussurrante');
  await sleep(800);
  await shot(p, '07-bosque');

  // 8-12. Encontrar Monstrin selvagem visível, batalhar e capturar
  let captured = false;
  let battles = 0;
  while (!captured && battles < 6) {
    const target = await p.evaluate(() => {
      const w = __mw.app.world;
      const pl = w.player;
      const list = w.wilds.map((x) => ({ tx: Math.floor(x.x / 64), ty: Math.floor((x.y - 8) / 64), d: Math.hypot(x.x - pl.x, x.y - pl.y), s: x.mon.speciesId, lv: x.mon.level }));
      list.sort((a, b) => a.d - b.d);
      return list[0];
    });
    if (!target) { await sleep(1000); continue; }
    log('indo até', target.s, 'nv', target.lv);
    await goTo(target.tx, target.ty, { adjacent: true });
    // encosta no Monstrin para iniciar a batalha
    for (let i = 0; i < 12; i++) {
      s = await state();
      if (s.inBattle) break;
      const t2 = await p.evaluate(() => { const w = __mw.app.world; const pl = w.player; const x = w.wilds.slice().sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0]; return x ? { dx: x.x - pl.x, dy: x.y - pl.y } : null; });
      if (!t2) break;
      const k = Math.abs(t2.dx) > Math.abs(t2.dy) ? (t2.dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (t2.dy > 0 ? 'ArrowDown' : 'ArrowUp');
      await p.keyboard.down(k); await sleep(160); await p.keyboard.up(k);
      await p.keyboard.press('Space');
      await sleep(150);
    }
    s = await state();
    if (!s.inBattle) { log('não iniciou batalha, tentando de novo'); continue; }
    battles++;
    await sleep(2600);
    if (battles === 1) await shot(p, '08-batalha');
    // laço de batalha
    let turns = 0;
    while ((await state()).inBattle && turns < 30) {
      const ui = await p.evaluate(() => {
        const btns = [...document.querySelectorAll('.battle-actions .btn, .move-grid button')].map((x) => x.textContent);
        const enemyHp = document.querySelectorAll('.fighter')[0]?.querySelector('.hpn')?.textContent;
        return { btns, enemyHp };
      });
      if (!ui.btns.length) { await sleep(300); continue; }
      const hpm = /(\d+) \/ (\d+)/.exec(ui.enemyHp || '');
      const ratio = hpm ? +hpm[1] / +hpm[2] : 1;
      const hasMoves = ui.btns.some((t) => t.includes('Poder'));
      if (hasMoves) {
        await p.click('.move-grid .move-btn >> nth=0');
      } else if (ratio < 0.55 && ui.btns.some((t) => t.startsWith('💠'))) {
        await p.click('.battle-actions .btn.gold');
        await sleep(300);
        const choose = await p.$('.move-grid button');
        if (choose) await p.click('.move-grid button >> nth=0');
        log('tentando capturar com PV', Math.round(ratio * 100) + '%');
        await sleep(1500);
        await shot(p, `09-captura-${battles}`);
      } else if (ui.btns.some((t) => t.includes('Atacar'))) {
        await p.click('text=Atacar');
        await sleep(250);
        if (turns === 1) await shot(p, '08b-ataques');
        continue;
      } else if (ui.btns.some((t) => t.includes('Pelo') || t.includes('Nv.'))) {
        await p.click('.move-grid button:not([disabled]) >> nth=0');
      }
      turns++;
      await sleep(1200);
      if (turns === 2) await shot(p, `08c-efeito-${battles}`);
    }
    while ((await state()).inBattle) await sleep(300);
    await sleep(800);
    s = await state();
    log('fim da batalha', battles, 'equipe:', JSON.stringify(s.party), 'coleção:', s.box, 'missões:', JSON.stringify(s.quests));
    captured = s.party.length + s.box > 1;
    // evoluções/diálogos pendentes
    await skipDialogs();
    if (!s.party.some((m) => m.hp > 0)) { log('equipe desmaiou -> recuperação'); await skipDialogs(); }
  }
  await shot(p, '10-apos-captura');

  // 13-14. XP e nível
  s = await state();
  log('nível do inicial:', s.party[0].lv, 'xp', s.party[0].xp);

  // Menus
  await p.keyboard.press('Escape');
  await sleep(500);
  await shot(p, '11-menu');
  await p.click('text=Equipe');
  await sleep(500);
  await shot(p, '12-equipe');
  await p.click('.mon-card >> nth=0');
  await sleep(500);
  await shot(p, '13-detalhes');
  await p.keyboard.press('Escape'); await sleep(200);
  await p.keyboard.press('Escape'); await sleep(200);
  await p.click('text=Criaturário');
  await sleep(500);
  await shot(p, '14-criaturario');
  await p.keyboard.press('Escape'); await sleep(200);
  await p.click('text=Inventário');
  await sleep(400);
  await shot(p, '15-inventario');
  await p.keyboard.press('Escape'); await sleep(200);
  await p.click('text=Missões');
  await sleep(400);
  await shot(p, '16-missoes');
  await p.keyboard.press('Escape'); await sleep(200);
  await p.click('text=Mapa');
  await sleep(400);
  await shot(p, '17-mapa');
  await p.keyboard.press('Escape'); await sleep(200);
  await p.keyboard.press('Escape'); await sleep(300);

  // 15. Voltar para a cidade
  if ((await state()).map === 'bosque') {
    await goTo(0, 12, { untilMap: 'vila_aurora' });
    await waitMap('vila_aurora');
  }
  log('voltou para', (await state()).map);

  // 16. Salvar pelo menu
  await p.keyboard.press('Escape'); await sleep(400);
  await p.click('text=Salvar');
  await sleep(400);
  const before = await state();
  await p.keyboard.press('Escape'); await sleep(200);

  // 17. Reabrir e continuar
  await p.reload();
  await sleep(3000);
  await p.click('text=Continuar');
  await sleep(2500);
  const after = await state();
  log('após recarregar:', JSON.stringify({ map: after.map, party: after.party, box: after.box, coins: after.coins }));
  const same = JSON.stringify(after.party) === JSON.stringify(before.party) && after.map === before.map && after.box === before.box;
  log(same ? 'SALVAMENTO OK' : 'SALVAMENTO DIFERENTE', JSON.stringify(before.party));
  await shot(p, '18-continuar');
} catch (e) {
  console.error('FALHOU:', e.message);
  await shot(p, 'erro');
}
const errs = errors.filter((e) => !e.includes('GL Driver') && !e.includes('swiftshader') && !e.includes('GPU stall'));
console.log(errs.length ? 'ERROS:\n' + errs.join('\n') : 'Sem erros no console.');
await b.close();
