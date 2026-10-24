// Diálogos e eventos dos NPCs. Cada script recebe "ctx" com ações prontas:
// ctx.say(texto), ctx.ask(texto, opções), ctx.give(item, qtd), ctx.startQuest(id),
// ctx.healParty(), ctx.chooseStarter(), ctx.duel(duelistaId), ctx.openShop(lista),
// ctx.openBox(), ctx.flag(k), ctx.setFlag(k), ctx.game, ctx.playerName.
import { QUESTS } from './quests.js';
import { speciesList } from './species.js';
import { DUELISTS } from './duelists.js';
import { displayName } from '../core/monstrin.js';

// Conversa padrão de um duelista: pergunta, duela e comenta o resultado.
async function duelTalk(ctx, id, { greet } = {}) {
  const d = DUELISTS[id];
  const beaten = ctx.game.s.stats.trainersDefeated.includes(id);
  await ctx.say(greet || (beaten ? (d.after || 'Quer duelar de novo?') : d.intro));
  const r = await ctx.ask(beaten ? 'Duelar de novo? (a recompensa só é dada na primeira vitória)' : 'Aceitar o duelo de cartas?', ['Duelar!', 'Agora não']);
  if (r !== 0) { await ctx.say('Tudo bem. Quando quiser, é só falar comigo.'); return null; }
  const res = await ctx.duel(id);
  if (!res) return null;
  await ctx.say(res.result === 'win' ? d.win : res.result === 'lose' ? d.lose : d.draw);
  return res;
}

// Batalhas antigas do RPG contra treinadores (não usadas na aventura atual:
// treinadores do mapa agora desafiam para duelos de cartas, ver data/duelists.js).
export const TRAINERS = {
  caio: {
    id: 'caio', name: 'Treinador Caio', look: 'caio', coins: 450,
    team: [
      { species: 'faiscol', level: 5, temperament: 'agil' },
      { species: 'pedrolho', level: 6, temperament: 'robusto' },
    ],
    intro: '', lose: '', win: '', after: '',
  },
};

export const SHOP_STOCK = ['selo_vinculo', 'selo_aurora', 'tonico', 'super_tonico', 'runa_protecao'];

export const SCRIPTS = {
  async iris(ctx) {
    const name = ctx.playerName;
    // salvamentos antigos que ainda não escolheram o inicial
    if (!ctx.flag('starterChosen')) {
      await ctx.say(`Ah, ${name}! Eu sou a Professora Íris. Escolha um Monstrin parceiro: ele também define o seu deck de cartas.`);
      const sp = await ctx.chooseStarter();
      if (!sp) { await ctx.say('Sem pressa! Fale comigo quando estiver pronto.'); return; }
      const mon = await ctx.giveStarter(sp);
      await ctx.say(`${mon} vai ser seu parceiro de aventuras. Você também recebeu um deck de 15 cartas!`);
    }
    if (!ctx.flag('metIris')) {
      const f = ctx.game.follower();
      await ctx.say(`Ah, ${name}! Que bom que chegou${f ? ` com ${displayName(f)}` : ''}. Eu sou a Professora Íris e estudo os Monstrins da região de Aurora.`);
      await ctx.say('Por aqui, treinadores se desafiam em duelos de cartas. Cada carta é um Monstrin com habilidades próprias.');
      await ctx.say('No duelo, os dois escolhem a ação em segredo e tudo é revelado ao mesmo tempo. Vence quem fizer 5 KOs primeiro.');
      await ctx.say('Toque numa carta para ver as habilidades dela. Seu deck fica no Menu, no botão "Deck".');
      ctx.setFlag('metIris');
      ctx.startQuest('treino_duda');
      await ctx.say('A Treinadora Duda está na praça, ao lado do poço. Ela adora treinar iniciantes. Vá desafiá-la!');
      return;
    }
    if (ctx.game.questStatus('treino_duda') === 'active') {
      await ctx.say('A Treinadora Duda está na praça. Dica: no seu turno, escolha uma habilidade do seu principal e confirme. Use os secundários para trocar ou usar o especial.');
      return;
    }
    const rec = ctx.game.s.duel?.record || { wins: 0 };
    await ctx.say(`Você já venceu ${rec.wins} duelo(s)! No Bosque Sussurrante, a leste, o Treinador Caio procura adversários.`);
  },

  async starter_machine(ctx) {
    if (!ctx.flag('starterChosen')) await ctx.say('Três cápsulas com Monstrins dormindo tranquilamente. Fale com a Professora Íris.');
    else await ctx.say('As cápsulas de pesquisa estão funcionando normalmente.');
  },

  // Atendimento do Centro Monstrin: a ÚNICA forma de curar e reviver a equipe.
  async lia(ctx) {
    const party = ctx.game.party();
    const fainted = party.filter((m) => m.hp <= 0).length;
    if (fainted) await ctx.say(`Olá! Vejo que ${fainted === 1 ? '1 Monstrin seu está desmaiado' : `${fainted} Monstrins seus estão desmaiados`}. Posso ajudar!`);
    const r = await ctx.ask('Bem-vindo ao Centro Monstrin! O atendimento é gratuito. O que deseja?', ['Recuperar meus Monstrins', 'Não, obrigado']);
    if (r !== 0) { await ctx.say('Volte sempre que precisar!'); return; }
    if (!party.length) { await ctx.say('Você ainda não tem Monstrins. Volte quando tiver um parceiro!'); return; }
    await ctx.say('Pode deixar comigo! Vou colocá-los na máquina de recuperação.');
    await ctx.healParty();
    ctx.game.visitCenter('centro_monstrin');
    await ctx.say('Prontinho! Todos os seus Monstrins estão com PV cheio e prontos para a aventura. Volte sempre!');
  },
  async heal(ctx) { return SCRIPTS.lia(ctx); },

  async pc_box(ctx) {
    await ctx.say('Você ligou o Terminal da Reserva.');
    ctx.openBox();
  },
  async pc_casa(ctx) { await ctx.say('É o seu computador. Tem um jogo de corrida de Monstrins aberto.'); },
  async pc_lab(ctx) { await ctx.say('A tela mostra gráficos sobre a migração dos Fagulinos no outono.'); },

  async bed(ctx) {
    const r = await ctx.ask('Quer descansar um pouco?', ['Descansar', 'Agora não']);
    if (r === 0) await ctx.say('Você tirou um cochilo gostoso! Mas lembre-se: para recuperar os PV dos seus Monstrins, leve-os ao Centro Monstrin.');
  },

  async lojista(ctx) {
    await ctx.say('Bem-vindo ao Mercado Aurora! Tudo para treinadores iniciantes.');
    ctx.openShop(SHOP_STOCK);
  },
  async shop(ctx) { return SCRIPTS.lojista(ctx); },

  async nina(ctx) {
    const lines = [
      'Quem tem ⚔ em cima da cabeça aceita duelos de cartas! A Duda está bem ali na praça.',
      'Sabia que dois Monstrins da mesma espécie nunca são iguais? Cada um tem seu jeitinho!',
      'Eu quero um Fagulino! Eles são tímidos e fogem quando a gente corre atrás...',
      'Fogo vence Planta, Planta vence Água e Água vence Fogo! E a Pedra aguenta bem o Fogo e o Elétrico.',
    ];
    await ctx.say(lines[Math.floor(Math.random() * lines.length)]);
  },

  async tobias(ctx) {
    await ctx.say('Nos meus tempos de duelista, eu sempre dizia: guarde energia para o especial dos secundários!');
    await ctx.say('E lembre-se: perder um duelo não faz mal nenhum. Ajuste o deck e tente de novo.');
  },

  async flora(ctx) {
    const st = ctx.game.questStatus('cogumi_flora');
    if (!st) {
      await ctx.say('Ah, olá, querido! Eu cuido deste jardim há quarenta anos...');
      await ctx.say('Meu sonho é ver um Cogumi de pertinho. Eles vivem na sombra das árvores do Bosque Sussurrante.');
      const r = await ctx.ask('Você poderia capturar um Cogumi para me mostrar?', ['Claro!', 'Agora não']);
      if (r === 0) { ctx.startQuest('cogumi_flora'); await ctx.say('Que gentileza! Estarei esperando aqui no jardim.'); }
      return;
    }
    if (st === 'active') { await ctx.say('Os Cogumis gostam de lugares sombreados no bosque. Boa sorte!'); return; }
    if (st === 'ready') {
      await ctx.say('Oh! É um Cogumi de verdade! Que coisinha mais fofa...');
      await ctx.say('Muito obrigada, querido. Fique com estes presentes, eles vão ajudar na sua jornada.');
      ctx.completeQuest('cogumi_flora');
      return;
    }
    await ctx.say('Meu jardim nunca esteve tão bonito. Os esporos do Cogumi fazem as flores crescerem!');
  },

  async bento(ctx) {
    if (!ctx.flag('starterChosen')) {
      await ctx.say('Alto lá! O Bosque Sussurrante é cheio de Monstrins selvagens.');
      await ctx.say('Não posso deixar ninguém passar sem um Monstrin parceiro. Fale com a Professora Íris, no laboratório ao norte!');
      return;
    }
    if (!ctx.game.questStatus('explorar_bosque')) {
      await ctx.say('Ah, agora você tem um parceiro! Pode passar.');
      await ctx.say('Ouvi dizer que existe uma clareira de pedras brilhantes no fundo do bosque. Se encontrar, me conte!');
      ctx.startQuest('explorar_bosque');
      return;
    }
    await ctx.say('Cuidado no bosque! O Treinador Caio desafia todo mundo que passa na frente dele.');
  },
  async bento_block(ctx) { return SCRIPTS.bento(ctx); },

  async duda(ctx) {
    await duelTalk(ctx, 'duda');
  },

  async caio(ctx) {
    if (!ctx.game.questStatus('desafio_caio')) ctx.startQuest('desafio_caio');
    await duelTalk(ctx, 'caio');
  },
};

export function questName(id) { return QUESTS[id]?.name || id; }
