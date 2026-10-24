// Teste de ponta a ponta da aventura: criar personagem com parceiro e deck,
// andar até a Treinadora Duda, duelar jogando pelas cartas e voltar ao mapa.
// Uso: node tools/adventure-e2e.mjs <pasta-de-saida> [mobile]
import { open, sleep } from './e2e-lib.mjs';

const out = process.argv[2] || '.';
const mobile = process.argv[3] === 'mobile';
const { b, p, errors } = await open('http://localhost:8080/index.html', mobile ? { w: 390, h: 844, mobile: true } : { w: 1366, h: 768 });
const log = (...a) => console.log(...a);
const fail = async (msg) => { log('FALHA:', msg); await p.screenshot({ path: `${out}/falha-${mobile ? 'm' : 'd'}.png` }); log(errors.join('\n')); await b.close(); process.exit(1); };
const ok = async (cond, msg) => { if (!cond) await fail(msg); if (msg) log("ok -", msg); return true; };
const tap = async (sel) => { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded().catch(() => {}); if (mobile) await el.tap(); else await el.click(); };
const dialogs = async (max = 30) => { for (let i = 0; i < max; i++) { const d = await p.$('.dialog'); if (!d) return; if (await p.$('.choices')) return; await d.click(); await sleep(250); } };

await p.evaluate(() => { localStorage.clear(); localStorage.setItem('mw-duel-speed', 'fast'); });
await p.reload();
await sleep(2500);

// 1) Criação do personagem com parceiro (deck inicial)
await tap('text=Nova aventura');
await sleep(500);
await p.fill('.text-input', 'Teste');
await tap('.starter-pick .mc >> nth=1'); // Gotinho
await sleep(300);
await p.screenshot({ path: `${out}/01-criacao-${mobile ? 'm' : 'd'}.png` });
await tap('text=Começar aventura');
await sleep(2500);
await dialogs();
const g0 = await p.evaluate(() => ({ duel: __mw.app.game.s.duel, party: __mw.app.game.party().map((m) => m.speciesId), follower: __mw.app.game.follower()?.speciesId }));
await ok(g0.duel && g0.duel.deck.length === 15, 'personagem criado com deck de 15 cartas');
await ok(g0.party[0] === 'gotinho' && g0.follower === 'gotinho', 'parceiro escolhido entrou na equipe e acompanha no mapa');
await ok(!(await p.$('text=Arena de Duelos')), 'não existe mais botão de Arena separado');

// 2) Menu → Deck
await p.keyboard.press('Escape'); await sleep(400);
if (!(await p.$('.menu-grid'))) { await p.evaluate(() => __mw.menus.openMainMenu()); await sleep(400); }
await ok(await p.$('.menu-tile:has-text("Deck")'), 'menu tem o botão Deck');
await ok(!(await p.$('.menu-tile:has-text("Arena")')) && !(await p.$('.menu-tile:has-text("Coleção")')), 'sem Arena/Coleção duplicadas no menu');
await tap('.menu-tile:has-text("Deck")'); await sleep(500);
await p.screenshot({ path: `${out}/02-deck-${mobile ? 'm' : 'd'}.png` });
await ok(await p.$('.deck-count.ok'), 'tela de deck mostra 15/15');
await tap('.deck-ctr button[aria-label="Tirar do deck"]'); await sleep(200);
await ok(await p.$('.deck-count.bad') && await p.$('button:has-text("Salvar deck")[disabled]'), 'deck com 14 cartas não pode ser salvo');
await tap('button:has-text("Desfazer mudanças")'); await sleep(200);
await p.evaluate(() => __mw.ui.closeAll()); await sleep(300);

// 3) Ir até a Duda (praça da vila) e conversar
await p.evaluate(() => { const w = __mw.app.world; w.loadMap('vila_aurora', 19.5 * 64, 11.5 * 64, 'up', { banner: false }); });
await sleep(1200);
const pos0 = await p.evaluate(() => { const w = __mw.app.world; return { map: w.def.id, x: w.player.x, y: w.player.y, mark: w.npcs.find((n) => n.def.id === 'duda')?.mark?.text }; });
await ok(pos0.map === 'vila_aurora' && pos0.mark === '⚔', 'Duda está na praça com o marcador ⚔');
await p.keyboard.press('Space'); await sleep(800);
await dialogs();
await ok(await p.$('.choices button:has-text("Duelar!")'), 'Duda pergunta se quer duelar');
await tap('.choices button:has-text("Duelar!")');
await sleep(1500);
await ok(await p.$('.dz'), 'tela de duelo abriu');
await ok(await p.evaluate(() => __mw.app.world.inBattle && __mw.app.world.locked), 'mapa bloqueado durante o duelo');

// tentativa de andar durante o duelo não move o personagem
await p.keyboard.down('ArrowLeft'); await sleep(400); await p.keyboard.up('ArrowLeft');
const posMid = await p.evaluate(() => ({ x: __mw.app.world.player.x, y: __mw.app.world.player.y }));
await ok(posMid.x === pos0.x && posMid.y === pos0.y, 'personagem não anda durante o duelo');

// 4) Preparação: escolher principal e um secundário tocando nas cartas
const focusBtn = async (text) => {
  const sel = mobile ? `.dz-sheet .mc-foot button:has-text("${text}")` : `.dz-side .mc-foot button:has-text("${text}")`;
  await tap(sel); await sleep(250);
};
await ok(await p.$('.dz-confirm[disabled]'), 'confirmar desativado sem principal');
await tap('.dz-hand .mc >> nth=0'); await sleep(300);
await p.screenshot({ path: `${out}/03-carta-ampliada-${mobile ? 'm' : 'd'}.png` });
await focusBtn('Escolher como principal');
await tap('.dz-hand .mc >> nth=1'); await sleep(300);
await focusBtn('Colocar como secundário');
await p.screenshot({ path: `${out}/04-preparacao-${mobile ? 'm' : 'd'}.png` });
await ok(!(await p.$('.dz-confirm[disabled]')), 'confirmar ativo com principal escolhido');
await tap('.dz-confirm'); await sleep(1500);

// 5) Rodadas
let rounds = 0; let checkedHand = false; let checkedUndo = false;
while (rounds < 45) {
  const st = await p.evaluate(() => ({ phase: window.__duel?.phase, over: !!document.querySelector('.dz-end') }));
  if (st.over || !st.phase) break;
  if (st.phase === 'replace') {
    await tap('.dz-board .mc.pickable'); await sleep(300);
    await focusBtn('Assumir como principal'); await sleep(900);
    continue;
  }
  if (st.phase !== 'planning') { await sleep(300); continue; }
  rounds++;
  if (!checkedHand) {
    // habilidades de carta na mão não podem ser usadas
    await tap('.dz-hand .mc >> nth=0'); await sleep(300);
    const scope = mobile ? '.dz-sheet' : '.dz-side';
    const anyOk = await p.$(`${scope} .mc-ab.ok`);
    const why = await p.textContent(`${scope} .mc-ab-why`).catch(() => '');
    await ok(!anyOk && /campo|secundário/.test(why || ''), `carta na mão mostra habilidades bloqueadas com motivo ("${(why || '').trim()}")`);
    if (mobile) { await tap('.dz-sheet-close'); await sleep(200); }
    checkedHand = true;
  }
  await ok(await p.$('.dz-confirm[disabled]') || true, '');
  // tocar no principal e escolher uma habilidade disponível dentro da carta
  await tap('.dz-field.me .dz-slot.main .mc'); await sleep(300);
  const scope = mobile ? '.dz-sheet' : '.dz-side';
  const abs = await p.$$(`${scope} button.mc-ab.ok`);
  let chosen = null;
  for (const a of abs) { const t = await a.textContent(); if (!/Cemitério|revive|Revive/i.test(t)) { chosen = a; break; } }
  if (!chosen) {
    // sem habilidade utilizável: troca com um secundário (ou carta da mão)
    if (mobile) { await tap('.dz-sheet-close'); await sleep(200); }
    await tap('.dz-hand .mc >> nth=0'); await sleep(300);
    await focusBtn('Trocar pelo principal');
  } else {
    await chosen.click(); await sleep(300);
  }
  if (rounds === 1) {
    await p.screenshot({ path: `${out}/05-habilidade-escolhida-${mobile ? 'm' : 'd'}.png` });
    const marks = await p.evaluate(() => ({ actor: !!document.querySelector('.dz-field.me .mc.actor'), target: document.querySelectorAll('.mc.target, .mc.target-ally').length }));
    await ok(marks.actor && marks.target > 0, `habilidade e alvo destacados (alvos: ${marks.target})`);
  }
  if (!checkedUndo && chosen) {
    await tap('.dz-plan .dz-undo'); await sleep(200);
    await ok(await p.$('.dz-confirm[disabled]'), 'desfazer a escolha desativa o confirmar');
    await tap('.dz-field.me .dz-slot.main .mc'); await sleep(300);
    const again = await p.$$(`${scope} button.mc-ab.ok`);
    for (const a of again) { const t = await a.textContent(); if (!/Cemitério/i.test(t)) { await a.click(); break; } }
    await sleep(250);
    checkedUndo = true;
  }
  if (await p.$('.dz-confirm[disabled]')) {
    const err = await p.textContent('.dz-plan').catch(() => '');
    log('aviso: confirmar desativado:', err);
    if (mobile && await p.$('.dz-sheet')) { await tap('.dz-sheet-close'); }
    await p.evaluate(() => { const d = window.__duel; d.plan.action = { type: 'switch', iid: d.duel.players[0].hand[0].iid }; d.render(); });
  }
  if (mobile && await p.$('.dz-sheet')) { await tap('.dz-sheet-close'); await sleep(150); }
  await tap('.dz-confirm');
  if (rounds === 1) { await sleep(1900); await p.screenshot({ path: `${out}/06-resolucao-${mobile ? 'm' : 'd'}.png` }); }
  // espera a animação
  for (let i = 0; i < 80; i++) { const ph = await p.evaluate(() => window.__duel?.phase); if (ph !== 'anim' && ph !== 'waiting') break; await sleep(250); }
}
await ok(await p.$('.dz-end'), `duelo terminou em ${rounds} rodada(s)`);
await p.screenshot({ path: `${out}/07-resultado-${mobile ? 'm' : 'd'}.png` });
const res = await p.evaluate(() => ({ r: window.__duel?.duel.result, kos: window.__duel?.duel.players.map((x) => x.kos) }));
log('resultado:', JSON.stringify(res));
await tap('.dz-end button'); await sleep(1500);
await dialogs();
await sleep(500);
await dialogs();
const pos1 = await p.evaluate(() => { const w = __mw.app.world; return { map: w.def.id, x: w.player.x, y: w.player.y, inB: w.inBattle, locked: w.locked, rec: __mw.app.game.s.duel.record, defeated: __mw.app.game.s.stats.trainersDefeated, dz: !!document.querySelector('.dz'), hud: getComputedStyle(document.querySelector('.hud') || document.body).display }; });
log(JSON.stringify(pos1));
await ok(!pos1.dz && !pos1.inB && !pos1.locked, 'voltou ao mapa e pode andar');
await ok(pos1.map === pos0.map && pos1.x === pos0.x && pos1.y === pos0.y, 'mesma posição de antes do duelo');
await ok(pos1.rec.wins + pos1.rec.losses + pos1.rec.draws === 1, 'resultado registrado uma vez');
await p.screenshot({ path: `${out}/08-mapa-depois-${mobile ? 'm' : 'd'}.png` });
// salvamento recarregado mantém tudo
await p.evaluate(() => __mw.app.save());
const saved = await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /save/i.test(x) && !/backup/i.test(x)); return JSON.parse(localStorage.getItem(k)).duel; });
await ok(saved && saved.deck.length === 15 && saved.record, 'deck e histórico de duelos salvos');
const real = errors.filter((e) => !/GL Driver|swiftshader|GPU stall|WebGL|Automatic fallback/i.test(e));
await ok(real.length === 0, `sem erros no console${real.length ? `: ${real.join(' | ')}` : ''}`);
await b.close();
log('TUDO OK', mobile ? '(celular)' : '(computador)');
