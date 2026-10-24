// Menus do jogo (Equipe, Criaturário, Inventário, Mapa, Missões, Configurações, Loja...).
import { h, ui } from './ui.js';
import { app } from '../app.js';
import { CONFIG } from '../config.js';
import { ELEMENTS } from '../data/elements.js';
import { SPECIES, STARTERS, getSpecies, speciesList, evolutionLine, RARITY } from '../data/species.js';
import { getMove } from '../data/moves.js';
import { ITEMS, ITEM_CATEGORIES, getItem } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { REGION_MAP, MAP_REGION_PLACE } from '../data/maps/index.js';
import {
  displayName, getStats, maxHp, xpForLevel, isFainted, TEMPERAMENTS, STAT_NAMES, signatureTrait,
  equipMove, unequipMove, canUseRune, applyRune, canUseHealItem, applyHealItem,
} from '../core/monstrin.js';
import { art, lookFor } from '../art/registry.js';
import { sfx } from '../audio/sfx.js';
import { controls } from './controls.js';
import { openDeck } from './deckScreen.js';

const elBadge = (elId) => { const e = ELEMENTS[elId]; return h('span', { class: 'badge', style: { background: e.color } }, `${e.icon} ${e.name}`); };
const rarityBadge = (r) => { const x = RARITY[r]; return h('span', { class: 'badge', style: { background: x.color } }, x.name); };
const hpBar = (hp, max) => { const r = Math.max(0, hp) / max; return h('div', { class: 'bar hp' }, h('i', { style: { width: `${r * 100}%`, background: r > 0.5 ? 'var(--hp-hi)' : r > 0.2 ? 'var(--hp-mid)' : 'var(--hp-lo)' } })); };
const xpBar = (m) => { const a = xpForLevel(m.level); const b = xpForLevel(m.level + 1); const r = m.level >= CONFIG.MAX_LEVEL ? 1 : (m.xp - a) / Math.max(1, b - a); return h('div', { class: 'bar xp' }, h('i', { style: { width: `${Math.min(100, r * 100)}%` } })); };
const fmtTime = (ms) => { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min`; };

function monCard(m, game, onclick, extra = {}) {
  const mx = maxHp(m);
  const isF = game.s.followerUid === m.uid && game.s.party.includes(m.uid);
  const fainted = isFainted(m);
  return h('button', { class: `mon-card ${fainted ? 'fainted' : ''} ${isF ? 'follower' : ''} ${extra.selected ? 'selected' : ''}`, onclick },
    h('span', { class: 'mon-pic' }, h('img', { src: art.monUrl(m.speciesId), alt: '' }), fainted ? h('span', { class: 'ko-tag' }, 'DESMAIADO') : null),
    h('div', { class: 'info' },
      h('div', { class: 'row' }, h('span', { class: 'nm' }, `${isF ? '⭐ ' : ''}${displayName(m)}`), h('span', { class: 'lv' }, `Nv.${m.level}`)),
      h('div', { class: 'row' }, elBadge(getSpecies(m.speciesId).element), h('span', { class: 'hp-txt' }, `${Math.max(0, m.hp)}/${mx} PV`)),
      hpBar(m.hp, mx), xpBar(m),
      fainted ? h('div', { class: 'ko-note' }, 'Recupere no Centro Monstrin para voltar a batalhar.') : null,
    ));
}

export const menus = {
  hudEl: null,

  // ---------------- HUD de exploração ----------------
  mountHud() {
    if (this.hudEl) this.hudEl.remove();
    const party = h('div', { class: 'hud-party' });
    const top = h('div', { class: 'hud-top' }, h('button', { class: 'hud-btn', 'aria-label': 'Menu', onclick: () => this.openMainMenu() }, '☰'));
    this.hudEl = h('div', {}, party, top);
    this.partyEl = party;
    ui.root.append(this.hudEl);
    this.refreshHud();
  },

  showHud(v) { if (this.hudEl) this.hudEl.style.display = v ? '' : 'none'; },

  refreshHud() {
    if (!this.partyEl || !app.game) return;
    const g = app.game;
    this.partyEl.innerHTML = '';
    for (const m of g.party()) {
      const r = Math.max(0, m.hp) / maxHp(m);
      const isF = g.s.followerUid === m.uid;
      this.partyEl.append(h('button', { class: `slot ${isFainted(m) ? 'fainted' : ''} ${isF ? 'follower' : ''}`, title: displayName(m), onclick: () => this.openMonDetail(m.uid) },
        h('img', { src: art.monUrl(m.speciesId), alt: '' }),
        h('div', { class: 'mini' }, h('i', { style: { width: `${r * 100}%`, background: r > 0.5 ? 'var(--hp-hi)' : r > 0.2 ? 'var(--hp-mid)' : 'var(--hp-lo)' } }))));
    }
  },

  // ---------------- Menu principal ----------------
  openMainMenu() {
    if (ui.isBlocking()) return;
    const g = app.game;
    ui.openScreen('Menu', (body, entry) => {
      const p = g.s.player;
      const caught = Object.values(g.s.dex).filter((v) => v === 'caught').length;
      const ms = (g.s.stats.playMs || 0) + (Date.now() - app.sessionStart);
      body.append(h('div', { class: 'player-card' }, h('img', { src: art.lookUrl(lookFor(p.look)) }),
        h('div', {}, h('b', {}, p.name), h('div', { class: 'stats' }, h('span', {}, `🪙 ${p.coins}`), h('span', {}, `📖 ${caught}/${speciesList().length}`), h('span', {}, `⏱ ${fmtTime(ms)}`), h('span', {}, `⚔️ ${g.s.stats.wins} vitórias`)))));
      const tile = (ico, label, fn) => h('button', { class: 'menu-tile', onclick: () => { fn(); } }, h('span', { class: 'ico' }, ico), label);
      body.append(h('div', { class: 'menu-grid' },
        tile('▶️', 'Continuar', () => ui.close(entry)),
        tile('🐾', 'Equipe', () => this.openTeam()),
        tile('📖', 'Criaturário', () => this.openDex()),
        tile('🃏', 'Deck', () => openDeck()),
        tile('🎒', 'Inventário', () => this.openBag()),
        tile('🗺️', 'Mapa', () => this.openMap()),
        tile('📜', 'Missões', () => this.openQuests()),
        tile('💾', 'Salvar', () => { const r = app.save(); ui.toast(r.ok ? 'Progresso salvo neste aparelho!' : 'Não foi possível salvar.'); sfx.play('select'); }),
        tile('⚙️', 'Configurações', () => this.openSettings()),
      ));
    });
  },

  // ---------------- Equipe e Reserva (Monstrins guardados) ----------------
  openTeam(opts = {}) {
    const g = app.game;
    let tab = opts.box ? 'box' : 'party';
    ui.openScreen(opts.box ? 'Terminal da Reserva' : 'Equipe', (body, entry) => {
      const tabs = h('div', { class: 'tabs' },
        h('button', { class: `tab ${tab === 'party' ? 'on' : ''}`, onclick: () => { tab = 'party'; entry.render(); } }, `Equipe (${g.s.party.length}/${CONFIG.PARTY_SIZE})`),
        h('button', { class: `tab ${tab === 'box' ? 'on' : ''}`, onclick: () => { tab = 'box'; entry.render(); } }, `Reserva (${g.s.box.length})`));
      body.append(tabs);
      const list = tab === 'party' ? g.party() : g.box();
      if (!list.length) body.append(h('p', { class: 'muted' }, tab === 'party' ? 'Você ainda não tem Monstrins.' : 'Nenhum Monstrin guardado. Quando a equipe estiver cheia, novas capturas vêm para cá.'));
      body.append(h('div', { class: 'mon-list' }, list.map((m) => monCard(m, g, () => this.openMonDetail(m.uid, () => entry.render())))));
      body.append(h('p', { class: 'muted', style: { fontSize: '14px', marginTop: '14px' } }, '⭐ = acompanhante (segue você no mapa e entra primeiro nas batalhas). Toque num Monstrin para ver detalhes, ataques e opções.'));
    }, { onClose: () => this.refreshHud() });
  },

  openMonDetail(uid, onChange) {
    const g = app.game;
    ui.openScreen('Detalhes', (body, entry) => {
      const m = g.getMon(uid);
      if (!m) { ui.close(entry); return; }
      const sp = getSpecies(m.speciesId);
      const el = ELEMENTS[sp.element];
      const stats = getStats(m);
      const mx = stats.hp;
      const temp = TEMPERAMENTS[m.temperament];
      const sig = signatureTrait(m);
      const inParty = g.s.party.includes(uid);
      entry.setTitle(displayName(m));
      const refresh = () => { entry.render(); onChange?.(); this.refreshHud(); };

      const hero = h('div', { class: 'hero', style: { background: `radial-gradient(circle at 50% 60%, ${el.light}55, ${el.dark}22 70%)` } },
        h('img', { src: art.monUrl(m.speciesId) }),
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' } }, elBadge(sp.element), rarityBadge(sp.rarity)));
      const info = h('div', {});
      info.append(h('div', { class: 'kv' },
        h('span', {}, 'Espécie: ', h('b', {}, `#${String(sp.num).padStart(3, '0')} ${sp.name}`)),
        h('span', {}, 'Nível: ', h('b', {}, m.level)),
        h('span', {}, 'XP: ', h('b', {}, m.level >= CONFIG.MAX_LEVEL ? 'Máximo' : `${m.xp - xpForLevel(m.level)}/${xpForLevel(m.level + 1) - xpForLevel(m.level)}`))));
      info.append(h('div', { style: { margin: '8px 0' } }, hpBar(m.hp, mx), h('div', { class: 'hp-txt muted', style: { fontSize: '14px', fontWeight: 800, marginTop: '3px' } }, `${Math.max(0, m.hp)}/${mx} PV ${isFainted(m) ? '· DESMAIADO (recupere no Centro Monstrin)' : m.status === 'burn' ? '· Queimado' : ''}`), h('div', { style: { marginTop: '6px' } }, xpBar(m))));
      info.append(h('div', { class: 'kv' },
        h('span', {}, 'Temperamento: ', h('b', {}, temp.name), temp.up ? ` (+${STAT_NAMES[temp.up]} / −${STAT_NAMES[temp.down]})` : ''),
        h('span', {}, 'Traço marcante: ', h('b', {}, sig.label)),
        h('span', {}, 'Vínculo: ', h('b', { class: 'hearts' }, '♥'.repeat(1 + Math.floor((m.bond || 0) / 51)) + '♡'.repeat(5 - (1 + Math.floor((m.bond || 0) / 51)))))));
      // atributos
      const maxStat = Math.max(...Object.values(stats));
      for (const k of ['hp', 'atk', 'def', 'spd']) {
        info.append(h('div', { class: 'stat-row' }, h('span', {}, STAT_NAMES[k]), h('b', {}, stats[k]), h('div', { class: 'bar' }, h('i', { style: { width: `${(stats[k] / maxStat) * 100}%` } }))));
      }
      info.append(h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 700 } }, `Variação individual (0–${CONFIG.TRAIT_MAX}): PV ${m.traits.hp} · Atq ${m.traits.atk} · Def ${m.traits.def} · Vel ${m.traits.spd}`));
      body.append(h('div', { class: 'detail' }, hero, info));

      // ações
      const actions = h('div', { class: 'actions' });
      if (inParty) {
        if (g.s.followerUid !== uid) actions.append(h('button', { class: 'btn gold small', onclick: () => { g.setFollower(uid); app.world?.refreshFollower(); ui.toast(`${displayName(m)} agora acompanha você!`, art.monUrl(m.speciesId)); refresh(); } }, '⭐ Acompanhante'));
        actions.append(h('button', { class: 'btn ghost small', onclick: () => { g.moveInParty(uid, -1); refresh(); } }, '↑ Subir'));
        actions.append(h('button', { class: 'btn ghost small', onclick: () => { g.moveInParty(uid, 1); refresh(); } }, '↓ Descer'));
        actions.append(h('button', { class: 'btn ghost small', onclick: () => { const r = g.sendToBox(uid); if (!r.ok) ui.toast(r.reason); else { app.world?.refreshFollower(); ui.toast(`${displayName(m)} foi para a Reserva.`); } refresh(); } }, '📦 Guardar na Reserva'));
      } else {
        actions.append(h('button', { class: 'btn green small', onclick: () => { const r = g.takeFromBox(uid); if (!r.ok) ui.toast(r.reason); else ui.toast(`${displayName(m)} entrou na equipe!`); refresh(); } }, '➕ Levar para a Equipe'));
      }
      actions.append(h('button', { class: 'btn ghost small', onclick: async () => { const n = await ui.input('Apelido (vazio = nome da espécie)', m.nickname || '', { placeholder: getSpecies(m.speciesId).name }); if (n !== null) { m.nickname = n.trim().slice(0, 14) || null; refresh(); } } }, '✏️ Apelido'));
      body.append(actions);

      // ataques
      body.append(h('div', { class: 'section-title' }, `Ataques equipados (${m.equippedMoves.length}/${CONFIG.MAX_EQUIPPED_MOVES})`));
      body.append(h('p', { class: 'muted', style: { margin: '0 0 8px', fontSize: '14px', fontWeight: 700 } }, 'Toque num ataque para equipar ou desequipar. Ataques aprendidos nunca são esquecidos.'));
      const moveBtn = (id) => {
        const mv = getMove(id);
        const e = ELEMENTS[mv.element];
        const eq = m.equippedMoves.includes(id);
        return h('button', { class: `move ${eq ? 'equipped' : ''}`, onclick: () => {
          const r = eq ? unequipMove(m, id) : equipMove(m, id);
          if (!r.ok) { ui.toast(r.reason); sfx.play('bump'); } else sfx.play('select');
          refresh();
        } },
        h('span', { class: 'dot', style: { background: e.color } }, e.icon),
        h('span', { class: 'mv' }, h('b', {}, mv.name), h('small', {}, `${mv.category === 'dano' ? `Poder ${mv.power} · ${mv.accuracy}%` : mv.category === 'cura' ? 'Cura' : 'Suporte'} — ${mv.desc}`)),
        eq ? h('span', { class: 'tag' }, 'EQUIPADO') : null);
      };
      body.append(h('div', { class: 'moves' }, m.learnedMoves.map(moveBtn)));
      const next = sp.learnset.filter((e) => e.level > m.level).slice(0, 2);
      if (next.length) body.append(h('p', { class: 'muted', style: { fontSize: '14px', fontWeight: 700 } }, `Próximos ataques: ${next.map((e) => `${getMove(e.move).name} (Nv.${e.level})`).join(', ')}`));

      // evolução
      body.append(h('div', { class: 'section-title' }, 'Evolução'));
      const line = evolutionLine(sp.id);
      const evo = h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } });
      line.forEach((id, i) => {
        const known = g.dexStatus(id) || id === sp.id;
        const s2 = getSpecies(id);
        if (i) evo.append(h('span', { class: 'muted', style: { fontWeight: 900 } }, `→ Nv.${getSpecies(line[i - 1]).evolution.level}`));
        evo.append(h('div', { style: { textAlign: 'center', fontWeight: 800, fontSize: '14px' } }, h('img', { src: art.monUrl(id), class: known ? '' : 'silhouette', style: { width: '64px', height: '64px', objectFit: 'contain', display: 'block', margin: '0 auto' } }), known ? s2.name : '???'));
      });
      if (line.length === 1) evo.append(h('span', { class: 'muted', style: { fontWeight: 700 } }, 'Não há evolução conhecida para esta espécie.'));
      body.append(evo);

      // histórico
      body.append(h('div', { class: 'section-title' }, 'Histórico'));
      const hist = [`Obtido: ${m.origin?.how || '—'} no nível ${m.origin?.level ?? '?'} em ${m.origin?.date ? new Date(m.origin.date).toLocaleDateString('pt-BR') : '?'}`, `Treinador original: ${m.ot || '—'}`, `Identificador único: ${m.uid}`];
      for (const ev of m.history.slice(-6)) {
        if (ev.type === 'evolved') hist.push(`Evoluiu de ${getSpecies(ev.from).name} para ${getSpecies(ev.to).name} no nível ${ev.level}`);
        if (ev.type === 'learned') hist.push(`Aprendeu ${getMove(ev.move).name} (${ev.source === 'runa' ? 'Runa de Técnica' : ev.source === 'evolution' ? 'evolução' : `nível ${ev.level}`})`);
      }
      body.append(h('div', { class: 'history' }, hist.map((t) => h('div', {}, '• ' + t))));
    });
  },

  // ---------------- Criaturário ----------------
  openDex() {
    const g = app.game;
    ui.openScreen('Criaturário', (body) => {
      const all = speciesList();
      const seen = all.filter((s) => g.dexStatus(s.id)).length;
      const caught = all.filter((s) => g.dexStatus(s.id) === 'caught').length;
      body.append(h('p', { class: 'muted', style: { fontWeight: 800, marginTop: 0 } }, `Vistos: ${seen}/${all.length} · Capturados: ${caught}/${all.length}`));
      body.append(h('div', { class: 'dex-grid' }, all.map((s) => {
        const st = g.dexStatus(s.id);
        return h('button', { class: `dex-cell ${st ? '' : 'unknown'} ${st === 'caught' ? 'caught' : ''}`, onclick: () => this.openDexEntry(s.id) },
          h('img', { src: art.monUrl(s.id), alt: '' }), h('div', { class: 'num' }, `#${String(s.num).padStart(3, '0')}`), h('div', {}, st ? `${st === 'caught' ? '✔ ' : ''}${s.name}` : '???'));
      })));
    });
  },

  openDexEntry(id) {
    const g = app.game;
    const s = getSpecies(id);
    const st = g.dexStatus(id);
    ui.openScreen(st ? s.name : '???', (body) => {
      const el = ELEMENTS[s.element];
      const hero = h('div', { class: 'hero', style: { background: st ? `radial-gradient(circle at 50% 60%, ${el.light}55, ${el.dark}22 70%)` : 'rgba(255,255,255,0.04)' } }, h('img', { src: art.monUrl(id), class: st ? '' : 'silhouette' }));
      const info = h('div', {});
      if (!st) {
        info.append(h('p', { style: { fontWeight: 800 } }, 'Espécie ainda não descoberta.'), h('p', { class: 'muted', style: { fontWeight: 700 } }, 'Explore novas regiões para encontrá-la!'));
        if (s.rarity === 'lendario') info.append(h('p', { class: 'muted', style: { fontWeight: 700 } }, 'Dizem que é uma criatura lendária...'));
      } else {
        info.append(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' } }, elBadge(s.element), rarityBadge(s.rarity), st === 'caught' ? h('span', { class: 'badge', style: { background: 'var(--green)' } }, '✔ Capturado') : h('span', { class: 'badge', style: { background: '#9aa4b8' } }, 'Visto')));
        info.append(h('p', { style: { fontWeight: 700, lineHeight: 1.45 } }, s.desc));
        info.append(h('div', { class: 'kv' }, h('span', {}, 'Onde encontrar: ', h('b', {}, s.locations.join(', ')))));
        if (st === 'caught') {
          const maxB = 120;
          for (const k of ['hp', 'atk', 'def', 'spd']) info.append(h('div', { class: 'stat-row' }, h('span', {}, STAT_NAMES[k]), h('b', {}, s.base[k]), h('div', { class: 'bar' }, h('i', { style: { width: `${(s.base[k] / maxB) * 100}%` } }))));
        }
        const line = evolutionLine(id);
        if (line.length > 1) {
          info.append(h('div', { class: 'section-title' }, 'Linha evolutiva'));
          const row = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } });
          line.forEach((x, i) => { const k = g.dexStatus(x); if (i) row.append(h('span', { class: 'muted' }, '→')); row.append(h('div', { style: { textAlign: 'center', fontWeight: 800, fontSize: '13px' } }, h('img', { src: art.monUrl(x), class: k ? '' : 'silhouette', style: { width: '56px', height: '56px', objectFit: 'contain', display: 'block', margin: '0 auto' } }), k ? getSpecies(x).name : '???')); });
          info.append(row);
        }
        if (s.provisorio) info.append(h('p', { class: 'muted', style: { fontSize: '12px', fontWeight: 700 } }, 'Dados provisórios para testes.'));
      }
      body.append(h('div', { class: 'detail' }, hero, info));
    });
  },

  // ---------------- Inventário ----------------
  openBag() {
    const g = app.game;
    let cat = 'captura';
    ui.openScreen('Inventário', (body, entry) => {
      body.append(h('p', { class: 'muted', style: { marginTop: 0, fontWeight: 800 } }, `🪙 ${g.s.player.coins} moedas`));
      body.append(h('div', { class: 'tabs' }, Object.values(ITEM_CATEGORIES).map((c) => h('button', { class: `tab ${cat === c.id ? 'on' : ''}`, onclick: () => { cat = c.id; entry.render(); } }, `${c.icon} ${c.name}`))));
      const items = Object.entries(g.s.inventory).map(([id, n]) => ({ it: getItem(id), n })).filter((x) => x.it.category === cat);
      if (!items.length) body.append(h('p', { class: 'muted', style: { fontWeight: 700 } }, 'Nenhum item nesta categoria.'));
      for (const { it, n } of items) {
        const usable = (it.usableIn || []).includes('field');
        let extra = '';
        if (it.category === 'runa') extra = ` · Ensina: ${getMove(it.teaches).name} · Requer Nv.${it.minLevel}`;
        body.append(h('div', { class: 'item-row' }, h('img', { src: art.itemUrl(it.id) }),
          h('div', { class: 'info' }, h('b', {}, it.name), h('small', {}, it.desc + extra)),
          usable ? h('button', { class: 'btn small green', onclick: () => this.useItemFlow(it.id, () => entry.render()) }, 'Usar') : null,
          h('span', { class: 'qty' }, `×${n}`)));
      }
      if (cat === 'captura') body.append(h('p', { class: 'muted', style: { fontSize: '14px', fontWeight: 700 } }, 'Os selos são usados durante batalhas contra Monstrins selvagens (botão "Capturar").'));
    }, { onClose: () => this.refreshHud() });
  },

  useItemFlow(itemId, done) {
    const g = app.game;
    const it = getItem(itemId);
    ui.openScreen(`Usar ${it.name}`, (body, entry) => {
      body.append(h('p', { class: 'muted', style: { marginTop: 0, fontWeight: 700 } }, it.category === 'runa' ? `Escolha um Monstrin compatível para aprender ${getMove(it.teaches).name}.` : 'Escolha um Monstrin.'));
      const list = g.allMons();
      body.append(h('div', { class: 'mon-list' }, list.map((m) => {
        const check = it.category === 'runa' ? canUseRune(m, itemId) : canUseHealItem(m, itemId);
        const card = monCard(m, g, async () => {
          if (!check.ok) { ui.toast(check.reason); sfx.play('bump'); return; }
          if (it.category === 'runa') {
            const ok = await ui.ask(`Usar ${it.name} em ${displayName(m)}? A runa será consumida.`, ['Usar', 'Cancelar']);
            if (ok !== 0) return;
            const r = applyRune(m, itemId);
            g.removeItem(itemId);
            sfx.play('levelup');
            ui.toast(`${displayName(m)} aprendeu ${getMove(r.move).name}!${r.equipped ? '' : ' Equipe-o no menu da Equipe.'}`, art.monUrl(m.speciesId));
          } else {
            const r = applyHealItem(m, itemId);
            g.removeItem(itemId);
            sfx.play('heal');
            ui.toast(`${displayName(m)} recuperou ${r.healed} PV!`, art.monUrl(m.speciesId));
          }
          ui.close(entry); done?.(); this.refreshHud(); app.save();
        });
        if (!check.ok) card.style.opacity = '0.55';
        card.title = check.ok ? '' : check.reason;
        return card;
      })));
    });
  },

  // ---------------- Mapa ----------------
  openMap() {
    const g = app.game;
    ui.openScreen(REGION_MAP.name, (body) => {
      const here = MAP_REGION_PLACE[g.s.player.mapId];
      const map = h('div', { class: 'region-map' });
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 62.5');
      svg.setAttribute('preserveAspectRatio', 'none');
      const decor = [
        ['ellipse', { cx: 36, cy: 58, rx: 40, ry: 10, fill: '#5cc0f5', opacity: 0.85 }],
        ['ellipse', { cx: 72, cy: 8, rx: 14, ry: 9, fill: '#a99f8e' }],
        ['ellipse', { cx: 52, cy: 31, rx: 12, ry: 10, fill: '#3f8a35', opacity: 0.8 }],
        ['ellipse', { cx: 82, cy: 24, rx: 9, ry: 7, fill: '#c9c2b4', opacity: 0.8 }],
      ];
      for (const [tag, attrs] of decor) { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); svg.append(e); }
      const pos = Object.fromEntries(REGION_MAP.places.map((p) => [p.id, p]));
      for (const [a, b] of REGION_MAP.roads) {
        const l = document.createElementNS(svgNS, 'line');
        l.setAttribute('x1', pos[a].x * 100); l.setAttribute('y1', pos[a].y * 62.5); l.setAttribute('x2', pos[b].x * 100); l.setAttribute('y2', pos[b].y * 62.5);
        l.setAttribute('stroke', '#e8c995'); l.setAttribute('stroke-width', '1.6'); l.setAttribute('stroke-dasharray', pos[b].kind === 'locked' ? '2 1.5' : '0'); l.setAttribute('stroke-linecap', 'round');
        svg.append(l);
      }
      map.append(svg);
      for (const p of REGION_MAP.places) {
        map.append(h('div', { class: `place ${p.kind} ${p.id === here ? 'here' : ''}`, style: { left: `${p.x * 100}%`, top: `${p.y * 100}%` } }, h('div', { class: 'pin' }), p.kind === 'locked' ? `${p.name} 🔒` : p.name));
      }
      body.append(map);
      const cur = REGION_MAP.places.find((p) => p.id === here);
      body.append(h('p', { style: { fontWeight: 800 } }, `📍 Você está em: ${cur ? cur.name : '—'}`));
      for (const p of REGION_MAP.places) body.append(h('div', { class: 'muted', style: { fontWeight: 700, fontSize: '14px', margin: '3px 0' } }, `${p.kind === 'locked' ? '🔒' : '•'} ${p.name}: ${p.desc}`));
    });
  },

  // ---------------- Missões ----------------
  openQuests() {
    const g = app.game;
    ui.openScreen('Missões', (body) => {
      const entries = Object.entries(g.s.quests);
      if (!entries.length) body.append(h('p', { class: 'muted' }, 'Nenhuma missão ainda.'));
      const order = { ready: 0, active: 1, done: 2 };
      entries.sort((a, b) => order[a[1].status] - order[b[1].status]);
      for (const [id, st] of entries) {
        const q = QUESTS[id];
        if (!q) continue;
        const rewards = [...Object.entries(q.rewards.items || {}).map(([it, n]) => `${n}x ${getItem(it).name}`), q.rewards.coins ? `${q.rewards.coins} moedas` : null].filter(Boolean).join(', ');
        body.append(h('div', { class: `quest ${st.status === 'done' ? 'done' : ''}` },
          h('h3', {}, `${st.status === 'done' ? '✅' : st.status === 'ready' ? '🎁' : '📜'} ${q.name}`),
          h('p', {}, q.desc + (st.status === 'ready' ? ` Fale com ${q.giver} para entregar.` : '')),
          h('ul', {}, g.questProgressText(id).map((o) => h('li', {}, `${o.done ? '☑' : '☐'} ${o.text}`))),
          h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 800 } }, `Recompensa: ${rewards}`)));
      }
    });
  },

  // ---------------- Configurações ----------------
  openSettings() {
    const s = app.settings;
    ui.openScreen('Configurações', (body, entry) => {
      const save = () => { app.storage.saveSettings(s); applySettings(); };
      const slider = (label, key) => {
        const inp = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key] });
        inp.addEventListener('input', () => { s[key] = parseFloat(inp.value); save(); });
        inp.addEventListener('change', () => sfx.play('select'));
        return h('div', { class: 'setting' }, label, inp);
      };
      const seg = (label, key, opts) => h('div', { class: 'setting' }, label, h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: s[key] === v ? 'on' : '', onclick: () => { s[key] = v; save(); entry.render(); } }, t))));
      body.append(slider('🔊 Efeitos sonoros', 'sfx'), slider('🎵 Música', 'music'));
      body.append(seg('📱 Controles de toque', 'touch', [['auto', 'Auto'], ['on', 'Sempre'], ['off', 'Nunca']]));
      body.append(seg('💬 Velocidade do texto', 'textSpeed', [['normal', 'Normal'], ['fast', 'Rápida']]));
      body.append(h('div', { class: 'section-title' }, 'Salvamento'));
      body.append(h('p', { class: 'muted', style: { fontWeight: 700, fontSize: '14px' } }, app.storage.persistent
        ? 'Seu progresso é salvo automaticamente neste navegador/aparelho (ao trocar de mapa, após batalhas e pelo botão Salvar). Ainda não há sincronização entre aparelhos.'
        : 'Atenção: este navegador está bloqueando o salvamento local. O progresso será perdido ao fechar.'));
      const actions = h('div', { class: 'actions' });
      if (app.game) {
        actions.append(h('button', { class: 'btn small', onclick: () => { const r = app.save(); ui.toast(r.ok ? 'Progresso salvo!' : 'Falha ao salvar'); } }, '💾 Salvar agora'));
        actions.append(h('button', { class: 'btn ghost small', onclick: () => this.exportSave() }, '⬇️ Exportar progresso'));
      }
      actions.append(h('button', { class: 'btn ghost small', onclick: () => this.importSave() }, '⬆️ Importar progresso'));
      actions.append(h('button', { class: 'btn red small', onclick: async () => {
        const r = await ui.ask('Apagar TODO o progresso salvo neste aparelho? Isso não pode ser desfeito.', ['Manter progresso', 'Apagar tudo']);
        if (r === 1) { app.storage.clear(); location.reload(); }
      } }, '🗑️ Apagar progresso'));
      body.append(actions);
      body.append(h('div', { class: 'section-title' }, 'Controles'));
      body.append(h('div', { class: 'muted', style: { fontWeight: 700, fontSize: '14px', lineHeight: 1.6 } },
        h('div', {}, '⌨️ Computador: WASD ou setas para andar · Shift para correr · E / Espaço / Enter para interagir · Esc ou M para o menu.'),
        h('div', {}, '📱 Celular: direcional na esquerda (empurre até o fim para correr) · botão A para interagir · ☰ para o menu.')));
      body.append(h('p', { class: 'muted', style: { fontSize: '12px', fontWeight: 700, marginTop: '14px' } }, `Monstrin World v${CONFIG.VERSION}`));
    });
  },

  exportSave() {
    const data = JSON.stringify(app.game.toJSON());
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `monstrin-world-${app.game.s.player.name}.json`;
      document.body.append(a); a.click(); a.remove();
      ui.toast('Arquivo de progresso gerado.');
    } catch { ui.toast('Não foi possível exportar.'); }
  },

  importSave() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || !data.player || !data.monstrins) throw new Error('inválido');
        app.storage.save(data);
        ui.toast('Progresso importado! Recarregando...');
        setTimeout(() => location.reload(), 800);
      } catch { ui.toast('Arquivo inválido.'); }
    };
    inp.click();
  },

  // ---------------- Loja ----------------
  openShop(stock) {
    const g = app.game;
    return new Promise((resolve) => {
      ui.openScreen('Mercado Aurora', (body, entry) => {
        body.append(h('p', { style: { marginTop: 0, fontWeight: 900, color: 'var(--gold)', fontSize: '20px' } }, `🪙 ${g.s.player.coins} moedas`));
        for (const id of stock) {
          const it = getItem(id);
          const can = g.s.player.coins >= it.price;
          body.append(h('div', { class: 'item-row' }, h('img', { src: art.itemUrl(id) }),
            h('div', { class: 'info' }, h('b', {}, it.name), h('small', {}, `${it.desc} · Você tem: ${g.count(id)}`)),
            h('span', { class: 'qty' }, `${it.price}`),
            h('button', { class: `btn small ${can ? 'gold' : ''}`, disabled: !can, onclick: () => {
              if (g.s.player.coins < it.price) return;
              g.addCoins(-it.price); g.addItem(id, 1); sfx.play('coin');
              ui.toast(`Comprou 1x ${it.name}`, art.itemUrl(id)); entry.render();
            } }, 'Comprar')));
        }
      }, { onClose: () => { app.save(); resolve(); } });
    });
  },

  // ---------------- Escolha do primeiro Monstrin ----------------
  chooseStarter() {
    return new Promise((resolve) => {
      let sel = null;
      let entryRef = null;
      let resolved = false;
      ui.openScreen('Escolha seu primeiro Monstrin', (body, entry) => {
        entryRef = entry;
        body.append(h('p', { class: 'muted', style: { marginTop: 0, fontWeight: 800 } }, 'Cada um tem um elemento e uma personalidade. Toque para conhecer e confirme sua escolha.'));
        body.append(h('div', { class: 'starters' }, STARTERS.map((id) => {
          const s = SPECIES[id];
          return h('button', { class: `starter ${sel === id ? 'on' : ''}`, onclick: () => { sel = id; sfx.play('cursor'); entry.render(); } },
            h('img', { src: art.monUrl(id) }),
            h('div', {}, h('h3', {}, s.name), h('div', { style: { margin: '6px 0' } }, elBadge(s.element)), h('p', {}, s.desc)));
        })));
        const row = h('div', { class: 'actions', style: { justifyContent: 'center', marginTop: '16px' } });
        row.append(h('button', { class: 'btn gold', disabled: !sel, onclick: async () => {
          if (!sel) return;
          const s = SPECIES[sel];
          const r = await ui.ask(`Escolher ${s.name}, do elemento ${ELEMENTS[s.element].name}?`, ['Sim, é esse!', 'Pensar melhor']);
          if (r === 0) { resolved = true; ui.close(entry); resolve(sel); }
        } }, sel ? `Escolher ${SPECIES[sel].name}` : 'Selecione um Monstrin'));
        body.append(row);
      }, { onClose: () => { if (!resolved) resolve(null); } });
      void entryRef;
      void controls;
    });
  },
};

export function applySettings() {
  const s = app.settings;
  sfx.setVolumes(s.sfx, s.music);
  ui.settings.textSpeed = s.textSpeed;
  const touchOn = s.touch === 'on' || (s.touch === 'auto' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0));
  ui.setTouchVisible(!!app.game && touchOn && !app.inTitle);
}
