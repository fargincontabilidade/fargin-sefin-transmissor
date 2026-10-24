// Adversários de duelo do mundo (NPCs que podem ser desafiados).
// Cada um usa um deck válido pelo regulamento (15 cartas, até 2 cópias).
// reward: entregue UMA ÚNICA VEZ, na primeira vitória contra este NPC.
import { PRESET_DECKS } from '../duel/cards.js';

export const DUELISTS = {
  duda: {
    id: 'duda', name: 'Treinadora Duda', look: 'duda', repeatable: true,
    deck: PRESET_DECKS.mare.cards,
    intro: 'Quer treinar um duelo de cartas? Eu jogo com o deck Maré da Floresta!',
    win: 'Boa! Você pegou o jeito. Pode voltar para treinar quando quiser.',
    lose: 'Foi por pouco! Revise as habilidades das suas cartas e tente de novo.',
    draw: 'Empate! Os dois chegaram a 5 KOs na mesma rodada.',
    reward: { coins: 150, cards: { marolho: 1 } },
  },
  caio: {
    id: 'caio', name: 'Treinador Caio', look: 'caio', repeatable: true,
    deck: PRESET_DECKS.chamas.cards,
    intro: 'Ei, você aí! Treinadores que se cruzam no bosque precisam duelar! Mostre o seu deck!',
    win: 'Uau... Você e suas cartas formam uma ótima equipe!',
    lose: 'Ha! Ajuste seu deck e volte para a revanche!',
    draw: 'Empate? Essa foi apertada!',
    after: 'Quando quiser uma revanche, é só falar comigo.',
    reward: { coins: 400, cards: { rochedonte: 1, voltrino: 1 }, items: { runa_raio: 1 } },
  },
};
