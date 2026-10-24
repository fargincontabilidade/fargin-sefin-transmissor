// Joga um duelo completo pela interface (clicando como um jogador).
import { open, sleep } from './e2e-lib.mjs';
const [out, mode = 'desktop'] = process.argv.slice(2);
const mobile = mode === 'mobile';
const { b, p, errors } = await open('http://localhost:8080/index.html', mobile ? { w: 390, h: 844, mobile: true } : { w: 1280, h: 800 });
const click = (sel) => (mobile ? p.tap(sel) : p.click(sel));
await sleep(2500);
await click('text=Arena de Duelos');
await sleep(600);
await p.screenshot({ path: `${out}/${mode}-1-baralhos.png` });
await click('.d-deck >> nth=1');
await click('button:has-text("Duelar com")');
await sleep(600);
// preparação: 1 principal + 2 secundários
for (let i = 0; i < 3; i++) { await click(`.d-hand .dcard >> nth=${i}`); await sleep(150); }
await p.screenshot({ path: `${out}/${mode}-2-preparacao.png` });
await click('.d-confirm .btn.gold');
await sleep(1500);
let rounds = 0; let shot = 0; const t0 = Date.now();
while (Date.now() - t0 < 600000) {
  const st = await p.evaluate(() => {
    const a = window.__arena; const d = a.duel;
    return { phaseUI: a.phaseUI, round: d.round, result: d.result, modal: !!document.querySelector('.d-modal'), modalTitle: document.querySelector('.d-modal h3')?.textContent, kos: d.players.map((x) => x.kos), ed: d.players[0].ed };
  });
  if (st.result && st.modal) { console.log('FIM', JSON.stringify(st)); break; }
  if (st.modal) { // substituição
    await click('.d-modal .grid .dcard >> nth=0');
    await sleep(500);
    continue;
  }
  if (st.phaseUI !== 'planning') { await sleep(400); continue; }
  rounds++;
  // a cada rodada: se houver espaço vazio, posiciona uma carta da mão (ação gratuita)
  const empty = await p.evaluate(() => window.__arena.duel.players[0].secs.some((s) => !s));
  if (empty && rounds % 2 === 1) {
    await click('.d-hand .dcard >> nth=0'); await sleep(250);
    const pos = await p.$('.d-modal button:has-text("Posicionar")');
    if (pos) { await (mobile ? pos.tap() : pos.click()); } else await click('.d-modal button:has-text("Fechar")');
    await sleep(250);
  }
  // escolhe a ação mais cara disponível (variedade), senão a primeira
  const btns = await p.$$('.d-actions .d-act:not([disabled])');
  const pick = btns.length > 2 && rounds % 3 === 0 ? btns[1] : btns[0];
  await (mobile ? pick.tap() : pick.click());
  await sleep(200);
  if (await p.$('.d-modal .grid .dcard')) { await click('.d-modal .grid .dcard >> nth=0'); await sleep(200); }
  if (await p.$('.d-modal .grid .dcard')) { await click('.d-modal .grid .dcard >> nth=0'); await sleep(200); }
  if (rounds === 2) await p.screenshot({ path: `${out}/${mode}-3-planejamento.png` });
  await click('.d-confirm .btn.gold');
  if (shot < 3 && rounds >= 2) { await sleep(2600); await p.screenshot({ path: `${out}/${mode}-4-anim-${shot++}.png` }); }
  await sleep(800);
}
await p.screenshot({ path: `${out}/${mode}-5-fim.png` });
console.log('rodadas jogadas', rounds);
console.log(errors.filter((e) => !/GL Driver|swiftshader|GPU stall/.test(e)).join('\n') || 'Sem erros no console.');
await b.close();
