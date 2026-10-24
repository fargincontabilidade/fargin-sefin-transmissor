// Diálogos e eventos dos NPCs. Cada script recebe "ctx" com ações prontas:
// ctx.say(texto), ctx.ask(texto, opções), ctx.give(item, qtd), ctx.startQuest(id),
// ctx.healParty(), ctx.chooseStarter(), ctx.trainerBattle(id), ctx.openShop(lista),
// ctx.openBox(), ctx.flag(k), ctx.setFlag(k), ctx.game, ctx.playerName.
import { QUESTS } from './quests.js';
import { speciesList } from './species.js';

export const TRAINERS = {
  caio: {
    id: 'caio', name: 'Treinador Caio', look: 'caio', coins: 450,
    team: [
      { species: 'faiscol', level: 5, temperament: 'agil' },
      { species: 'pedrolho', level: 6, temperament: 'robusto' },
    ],
    intro: 'Ei, você aí! Treinadores que se cruzam no bosque precisam batalhar! Vamos ver se você é bom mesmo!',
    lose: 'Uau... Você e seus Monstrins formam uma ótima equipe!',
    win: 'Ha! Treine mais um pouco e volte para a revanche!',
    after: 'Sabia que a batalha só acaba quando todos os Monstrins de um lado desmaiam? Se um cair, convoque outro da equipe!',
  },
};

export const SHOP_STOCK = ['selo_vinculo', 'selo_aurora', 'tonico', 'super_tonico', 'runa_protecao'];

export const SCRIPTS = {
  async iris(ctx) {
    const name = ctx.playerName;
    if (!ctx.flag('starterChosen')) {
      if (!ctx.flag('metIris')) {
        await ctx.say(`Ah, ${name}! Que bom que chegou. Eu sou a Professora Íris e estudo os Monstrins da região de Aurora.`);
        await ctx.say('Monstrins são criaturas incríveis que vivem nas florestas, rios, cavernas... Cada um é único, com sua própria personalidade!');
        await ctx.say('Hoje você vai começar sua jornada. Preparei três Monstrins para você conhecer. Escolha com o coração!');
        ctx.setFlag('metIris');
      }
      const sp = await ctx.chooseStarter();
      if (!sp) { await ctx.say('Sem pressa! Fale comigo quando estiver pronto.'); return; }
      const mon = await ctx.giveStarter(sp);
      await ctx.say(`${mon} vai ser seu parceiro de aventuras. Ele vai seguir você por onde for!`);
      await ctx.say('Leve também estes Selos de Vínculo. Enfraqueça um Monstrin selvagem e use um selo para criar um laço com ele.');
      ctx.startQuest('primeira_captura');
      await ctx.say('O Bosque Sussurrante fica a leste da vila. Avise o Vigia Bento que você já tem um Monstrin! Boa sorte!');
      return;
    }
    const dex = ctx.game.s.dex;
    const caught = Object.values(dex).filter((v) => v === 'caught').length;
    const seen = Object.keys(dex).length;
    if (ctx.game.questStatus('primeira_captura') === 'active') {
      await ctx.say('Lembre-se: deixe o Monstrin selvagem com pouca vida antes de usar o Selo de Vínculo. Assim a chance de captura aumenta!');
      return;
    }
    await ctx.say(`Seu Criaturário já tem ${seen} de ${speciesList().length} espécies vistas e ${caught} capturadas. Continue explorando!`);
    if (caught >= 3) await ctx.say('Dizem que na Clareira das Pedras vive um Monstrin raríssimo feito de cristal... Será verdade?');
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
      'Os Monstrins selvagens andam livres no Bosque Sussurrante! É só chegar pertinho para batalhar.',
      'Sabia que dois Monstrins da mesma espécie nunca são iguais? Cada um tem seu jeitinho!',
      'Eu quero um Fagulino! Eles são tímidos e fogem quando a gente corre atrás...',
      'Fogo vence Planta, Planta vence Água e Água vence Fogo! E a Pedra aguenta bem o Fogo e o Elétrico.',
    ];
    await ctx.say(lines[Math.floor(Math.random() * lines.length)]);
  },

  async tobias(ctx) {
    await ctx.say('Nos meus tempos de treinador, eu sempre dizia: Monstrin cansado é Monstrin mais fácil de capturar!');
    await ctx.say('E se todos os seus Monstrins desmaiarem, você volta ao Centro Monstrin. É só falar com a Enfermeira Lia para recuperá-los.');
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
    await ctx.say('Cuidado no bosque! E lembre-se: dá para fugir de batalhas contra Monstrins selvagens, mas não de treinadores.');
  },
  async bento_block(ctx) { return SCRIPTS.bento(ctx); },

  async caio(ctx) {
    const tr = TRAINERS.caio;
    if (ctx.game.s.stats.trainersDefeated.includes('caio')) { await ctx.say(tr.after); return; }
    if (!ctx.game.questStatus('desafio_caio')) ctx.startQuest('desafio_caio');
    await ctx.say(tr.intro);
    const result = await ctx.trainerBattle('caio');
    if (result === 'win') await ctx.say(tr.lose);
  },
};

export function questName(id) { return QUESTS[id]?.name || id; }
