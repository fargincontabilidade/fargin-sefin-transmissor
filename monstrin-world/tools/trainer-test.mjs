import { open, sleep } from './e2e-lib.mjs';
import { fixture } from './fixture.mjs';
const out = process.argv[2];
const { b, p, errors } = await open('http://localhost:8080/index.html', { storage: fixture({ x: 38.5, y: 21.6, level: 15, nearLevel: true, extra: [['pedrolho', 3]] }) });
await sleep(2500);
await p.click('text=Continuar');
await sleep(2000);
// anda para cima até ser visto pelo Caio
await p.keyboard.down('ArrowUp'); await sleep(500); await p.keyboard.up('ArrowUp');
const st = () => p.evaluate(() => ({ inB: __mw.app.world.inBattle, dlg: !!document.querySelector('.dialog'), log: document.querySelector('.battle-log')?.textContent, btns: [...document.querySelectorAll('.battle-actions .btn')].map(x=>x.textContent), trainer: [...document.querySelectorAll('.trainer-hp .v')].map(x=>x.textContent), evo: !!document.querySelector('.evo') }));
let shot = 0;
for (let i = 0; i < 160; i++) {
  const s = await st();
  if (s.dlg) { await p.keyboard.press('Space'); await sleep(250); continue; }
  if (s.evo) { if (shot < 3) { await p.screenshot({ path: `${out}/evo-${shot++}.png` }); } await sleep(1500); continue; }
  if (s.btns.length) {
    if (i % 7 === 0) console.log(JSON.stringify(s));
    // testar troca: primeira vez trocar para pedrolho (fraco) para ver dano direto depois
    if (s.btns.some(t => t.includes('Atacar'))) { await p.click('text=Atacar'); await sleep(200); await p.click('.move-grid .move-btn >> nth=0'); }
    else if (s.btns.some(t=>t.includes('Convocar'))) { await p.click('text=Convocar'); await sleep(200); await p.click('.move-grid button:not([disabled]) >> nth=0'); }
    else if (s.btns.some(t=>t.includes('Aguardar'))) await p.click('text=Aguardar');
    await sleep(800);
    if (i === 10) await p.screenshot({ path: `${out}/trainer-mid.png` });
    continue;
  }
  if (!s.inB && i > 20 && !s.dlg && !s.evo) break;
  await sleep(400);
}
await p.screenshot({ path: `${out}/trainer-end.png` });
console.log(JSON.stringify(await p.evaluate(() => ({ party: __mw.app.game.party().map(m => [m.speciesId, m.level, m.hp]), defeated: __mw.app.game.s.stats.trainersDefeated, quests: __mw.app.game.s.quests, coins: __mw.app.game.s.player.coins }))));
console.log(errors.filter(e=>!/GL Driver|swiftshader|GPU stall/.test(e)).join('\n'));
await b.close();
