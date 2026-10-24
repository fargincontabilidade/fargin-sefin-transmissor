// Missões. Tipos de objetivo:
//  flag    -> uma marcação de história é ativada (ex.: escolheu o inicial)
//  capture -> capturar N Monstrins (qualquer espécie, ou 'species')
//  own     -> possuir um Monstrin da espécie
//  defeat  -> derrotar um treinador
//  visit   -> visitar uma área do mapa
// turnIn: se definido, a missão é entregue falando com esse NPC.
export const QUESTS = {
  inicio: {
    id: 'inicio', name: 'Uma nova jornada', giver: 'Professora Íris',
    desc: 'A Professora Íris está esperando você no laboratório, no norte da Vila Aurora.',
    objectives: [{ type: 'flag', flag: 'metIris', text: 'Apresente-se à Professora Íris no laboratório' }],
    rewards: { items: { selo_vinculo: 5, tonico: 3, mapa_aurora: 1 }, coins: 300 },
  },
  primeira_captura: {
    id: 'primeira_captura', name: 'Primeira captura', giver: 'Professora Íris',
    desc: 'Enfraqueça um Monstrin selvagem no Bosque Sussurrante e use um Selo de Vínculo.',
    objectives: [{ type: 'capture', count: 1, text: 'Capture 1 Monstrin selvagem' }],
    rewards: { items: { selo_vinculo: 3, runa_protecao: 1 }, coins: 200 },
  },
  treino_duda: {
    id: 'treino_duda', name: 'Primeiro duelo', giver: 'Professora Íris',
    desc: 'A Treinadora Duda espera na praça da Vila Aurora para um duelo de treino com cartas.',
    objectives: [{ type: 'defeat', trainer: 'duda', text: 'Vença um duelo contra a Treinadora Duda' }],
    rewards: { items: { tonico: 2 }, coins: 100 },
  },
  explorar_bosque: {
    id: 'explorar_bosque', name: 'Segredos do bosque', giver: 'Vigia Bento',
    desc: 'Dizem que existe uma clareira de pedras brilhantes no fundo do Bosque Sussurrante.',
    objectives: [{ type: 'visit', zone: 'clareira_pedras', text: 'Encontre a Clareira das Pedras' }],
    rewards: { items: { selo_aurora: 2 }, coins: 150 },
  },
  cogumi_flora: {
    id: 'cogumi_flora', name: 'O jardim da Dona Flora', giver: 'Dona Flora',
    desc: 'Dona Flora quer ver um Cogumi de perto. Eles vivem à sombra das árvores do bosque.',
    objectives: [{ type: 'own', species: 'cogumi', text: 'Tenha um Cogumi na sua coleção' }],
    turnIn: 'flora',
    rewards: { items: { super_tonico: 2, runa_cura: 1 }, coins: 300 },
  },
  desafio_caio: {
    id: 'desafio_caio', name: 'Desafio no bosque', giver: 'Treinador Caio',
    desc: 'O treinador Caio desafiou você para um duelo de cartas no Bosque Sussurrante.',
    objectives: [{ type: 'defeat', trainer: 'caio', text: 'Vença um duelo contra o Treinador Caio' }],
    rewards: { items: { runa_raio: 1, super_tonico: 1 }, coins: 400 },
  },
};
