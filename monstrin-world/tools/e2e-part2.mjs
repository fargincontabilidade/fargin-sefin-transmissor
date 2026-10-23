// Parte 2: batalha selvagem, captura, XP, menus, voltar à cidade, salvar e recarregar.
import { open, sleep } from './e2e-lib.mjs';
import { fixture } from './fixture.mjs';
const out = process.argv[2];
const fx = fixture({ x: 5.5, y: 13, level: 8, nearLevel: true });
{ const st = JSON.parse(fx['monstrin-world-save-v1']); st.inventory.selo_vinculo = 12; fx['monstrin-world-save-v1'] = JSON.stringify(st); }
fx['monstrin-world-settings'] = JSON.stringify({ textSpeed: 'fast', sfx: 0, music: 0 });
const { b, p, errors } = await open('http://localhost:8080/index.html', { storage: fx });
const log = (...a) => console.log('▶', ...a);
const S = () => p.evaluate(() => { const g = __mw.app.game, w = __mw.app.world; return { map: w?.def?.id, inB: !!w?.inBattle, party: g.party().map(m => [m.speciesId, m.level, m.xp, m.hp]), box: g.box().length, quests: Object.fromEntries(Object.entries(g.s.quests).map(([k, v]) => [k, v.status])), dex: g.s.dex }; });
await sleep(2500);
await p.click('text=Continuar');
await sleep(2000);
let captured = false, fights = 0;
while (!captured && fights < 5) {
  fights++;
  // pede um Monstrin fácil (Cogumi/Bolhuga) e começa a batalha encostando nele
  await p.evaluate(() => { const w = __mw.app.world; const t = w.wilds.find(x => ['cogumi', 'pedrolho', 'bolhuga', 'faiscol'].includes(x.mon.speciesId)) || w.wilds[0]; t.view.x = w.player.x + 70; t.view.y = w.player.y; t.state = 'idle'; t.timer = 99; });
  await p.keyboard.down('ArrowRight'); await sleep(400); await p.keyboard.up('ArrowRight');
  for (let i = 0; i < 20 && !(await S()).inB; i++) { await p.keyboard.press('Space'); await sleep(200); }
  log('batalha', fights, 'iniciada:', (await S()).inB);
  let first = true;
  for (let t = 0; t < 60 && (await S()).inB; t++) {
    const ui = await p.evaluate(() => ({ btns: [...document.querySelectorAll('.battle-actions .btn')].map(x => x.textContent), hp: document.querySelector('.fighter .hpn')?.textContent }));
    if (!ui.btns.length) { await sleep(300); continue; }
    const m = /(\d+) \/ (\d+)/.exec(ui.hp || ''); const r = m ? m[1] / m[2] : 1;
    if (r <= 0.5 && ui.btns.some(x => x.startsWith('💠') && !x.includes('(0)'))) {
      await p.click('.battle-actions .btn.gold'); await sleep(300);
      if (await p.$('.move-grid button')) await p.click('.move-grid button >> nth=-1');
      log('capturando com PV', Math.round(r * 100) + '%', 'selos:', await p.evaluate(() => __mw.app.game.count('selo_vinculo')));
      await sleep(1700); await p.screenshot({ path: `${out}/p2-captura-${fights}.png` });
    } else {
      await p.click('text=Atacar'); await sleep(250);
      // escolhe Investida (fraca) para não derrubar de uma vez
      await p.click('.move-grid .move-btn >> nth=0');
      if (first) { first = false; await sleep(900); await p.screenshot({ path: `${out}/p2-ataque-${fights}.png` }); }
    }
    await sleep(500);
  }
  for (let i = 0; i < 40; i++) { const s = await S(); const ev = await p.evaluate(() => !!document.querySelector('.evo') || !!document.querySelector('.dialog')); if (!s.inB && !ev) break; if (await p.evaluate(() => !!document.querySelector('.dialog'))) await p.keyboard.press('Space'); await sleep(500); }
  const s = await S();
  log('após batalha', fights, JSON.stringify(s.party), 'coleção', s.box, JSON.stringify(s.quests));
  captured = s.party.length + s.box > 1;
}
await p.screenshot({ path: `${out}/p2-pos.png` });
// menus
await p.keyboard.press('Escape'); await sleep(500); await p.screenshot({ path: `${out}/p2-menu.png` });
for (const [name, file] of [['Equipe', 'equipe'], ['Criaturário', 'dex'], ['Inventário', 'inv'], ['Missões', 'missoes'], ['Mapa', 'mapa']]) {
  await p.click(`.menu-tile:has-text("${name}")`); await sleep(500);
  if (name === 'Equipe') { await p.screenshot({ path: `${out}/p2-equipe.png` }); await p.click('.mon-card >> nth=0'); await sleep(500); }
  await p.screenshot({ path: `${out}/p2-${file}.png` });
  while (await p.evaluate(() => document.querySelectorAll('.screen').length > 1)) { await p.keyboard.press('Escape'); await sleep(250); }
}
// usar Runa de Proteção (recompensa da 1ª captura) no inicial
await p.click('.menu-tile:has-text("Inventário")'); await sleep(400);
await p.click('.tab:has-text("Runas")'); await sleep(300);
const hasRune = await p.$('text=Runa de Proteção');
if (hasRune) {
  await p.click('.item-row:has-text("Runa de Proteção") >> text=Usar'); await sleep(400);
  await p.click('.screen >> nth=-1 >> .mon-card >> nth=0'); await sleep(400);
  await p.click('text=Usar >> nth=-1').catch(() => {});
  await p.click('.choices >> text=Usar').catch(() => {}); await sleep(600);
  log('runa usada, ataques aprendidos:', JSON.stringify(await p.evaluate(() => __mw.app.game.party()[0].learnedMoves)));
}
while (await p.evaluate(() => document.querySelectorAll('.screen').length)) { await p.keyboard.press('Escape'); await sleep(250); }
// voltar para a cidade andando até a borda oeste
await p.evaluate(() => { const w = __mw.app.world; w.player.x = 2.5 * 64; w.player.y = 12.6 * 64; });
await p.keyboard.down('ArrowLeft'); await sleep(1600); await p.keyboard.up('ArrowLeft');
await sleep(1500);
log('mapa atual:', (await S()).map);
await p.screenshot({ path: `${out}/p2-volta-cidade.png` });
await p.keyboard.press('Escape'); await sleep(400);
await p.click('.menu-tile:has-text("Salvar")'); await sleep(400);
const before = await S();
await p.reload(); await sleep(2800);
await p.click('text=Continuar'); await sleep(2500);
const after = await S();
const same = JSON.stringify(before.party) === JSON.stringify(after.party) && before.map === after.map && before.box === after.box;
log(same ? 'SALVAMENTO OK' : 'DIFERENTE', JSON.stringify(after.party), after.map);
await p.screenshot({ path: `${out}/p2-recarregado.png` });
console.log(errors.filter(e => !/GL Driver|swiftshader|GPU stall/.test(e)).join('\n') || 'Sem erros no console.');
await b.close();
