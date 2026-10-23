import { open, sleep } from './e2e-lib.mjs';
import { fixture } from './fixture.mjs';
const out = process.argv[2];
const { b, p, errors } = await open('http://localhost:8080/index.html', { storage: fixture() });
await sleep(2500);
await p.click('text=Continuar');
await sleep(2000);
const t0 = Date.now();
const fps = await p.evaluate(() => __mw.game.loop.actualFps);
console.log('fps', fps);
await p.evaluate(() => { const w = __mw.app.world; w.startWildBattle(w.wilds[0]); });
for (let i = 0; i < 8; i++) { await sleep(1000); const s = await p.evaluate(() => ({ log: document.querySelector('.battle-log')?.textContent, btns: document.querySelectorAll('.battle-actions .btn').length })); console.log(i, JSON.stringify(s)); }
await p.screenshot({ path: out + '/dbg-battle.png' });
console.log(errors.filter(e=>!/GL Driver|swiftshader|GPU stall/.test(e)).join('\n'));
await b.close();
