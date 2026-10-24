# Sistema de Duelos — implementação do Regulamento v1.0

## Onde está cada parte

| Parte | Arquivo |
|---|---|
| Constantes do regulamento (15 cartas, mão 5, 5 KOs, ED, escudo 75%, 45 s...) | `src/duel/rules.js` |
| Cartas provisórias e baralhos prontos | `src/duel/cards.js` |
| Motor (rodada simultânea em 9 fases, dano, condições, KOs, vitória) | `src/duel/engine.js` |
| Adversário do computador | `src/duel/ai.js` |
| Tela da arena (computador e celular) | `src/duel/arena.js`, `css/duel.css` |
| Testes (inclui os 17 casos obrigatórios da seção 14) | `tests/duel.test.mjs` |
| Simulação de partidas IA × IA | `node tools/duel-sim.mjs 1000` |

O motor não depende da interface: recebe as ações secretas dos dois jogadores, resolve a
rodada e devolve uma lista de eventos. A interface só anima esses eventos; a animação nunca
altera o resultado.

## Como adicionar cartas e habilidades

Cada carta é um objeto de dados em `src/duel/cards.js` (PV, resistência fixa, fraquezas,
imunidades, até 4 habilidades ativas, especial de secundário e passiva). O formato está
descrito no topo do arquivo. Novas cartas usam os mesmos campos; o motor não precisa mudar.
Uma mecânica realmente nova (ex.: um tipo de passiva inédito) exige uma pequena adição no motor.

## Cartas provisórias e balanceamento

As 14 cartas e os 2 baralhos ("Chamas da Montanha" e "Maré da Floresta") são provisórios.
Em 1.000 partidas simuladas IA × IA: média de **8 rodadas** (faixa recomendada: 5 a 9),
Chamas 42%, Maré 49%, empates 8%.

## Lacunas encontradas e soluções adotadas

Nenhuma regra marcada como [CONFIRMADO] ou [FECHAMENTO v1.0] foi alterada. Os pontos abaixo
não estavam definidos no documento; a solução escolhida está implementada e pode ser trocada
numa versão 1.1.

1. **Caso de teste "principal morre sem secundário nem mão, mas com cartas no deck".**
   Como a mão é reposta imediatamente a partir do deck, esse estado não acontece em jogo normal.
   O motor aplica a regra (o deck não conta como substituto) e o teste valida a decisão
   construindo o estado diretamente. Com o deck vazio, a derrota acontece pelo fluxo normal.
2. **Custo pago na confirmação × recursos só gastos se a habilidade for iniciada.** A ED é
   descontada na confirmação. Se a ação não chega a começar (paralisia/sono/congelamento
   preexistente ou Interrupção Imediata), a ED é devolvida e o uso único não é gasto. Se a
   habilidade começa e erra, ED e uso único são gastos.
3. **Momento do teste de paralisia/sono/congelamento.** Feito no início da preparação defensiva
   (fase 4), valendo para qualquer habilidade do Monstrin afetado (ataque, escudo, cura,
   especial). Troca, itens e ações gratuitas não são afetados.
4. **Interrupção Imediata.** Cancela apenas ataques (as ações defensivas já foram resolvidas na
   fase 4). Se os dois jogadores usarem interrupções, ambas valem.
5. **Troca voluntária.** Pode ser com um secundário (os dois trocam de posição) ou com uma carta
   da mão (o antigo principal volta para a mão com seus PV, condições pausadas e recargas).
6. **Passivas "ao entrar".** Ativam quando a carta entra no campo vindo de fora (mão), inclusive
   por troca voluntária ou substituição. Um secundário que passa a principal já estava em campo e
   não reativa. Entradas da preparação inicial valem a partir da rodada 1; substituições após KO
   valem a partir da rodada seguinte.
7. **Dano periódico (veneno/queimadura).** Não usa resistência fixa nem fraqueza; é reduzido
   apenas por escudos que protegem também dano indireto.
8. **Retaliação.** Não usa fraqueza elemental. Respeita resistência fixa e somente escudos que
   cobrem dano indireto. Nenhuma carta atual tem crítico em retaliação.
9. **Chance de crítico.** Cada habilidade define a sua; sem valor na carta, não há crítico.
10. **"PV disponíveis da vítima" (golpes múltiplos e roubo de vida).** Usa os PV do alvo na
    abertura da fase de ataques (depois de curas e escudos da rodada).
11. **Reviver.** Se o jogador não indicar, revive o Monstrin de maior PV máximo do Cemitério e,
    com a mão cheia, envia ao fundo do deck a carta de menor PV máximo. Na interface o jogador
    sempre escolhe. A habilidade só pode ser escolhida com o Cemitério não vazio. Ao ir para o
    Cemitério, condições e escudos da carta são removidos.
12. **Abandono por tempo.** Três esgotamentos consecutivos encerram a partida antes da checagem
    de KOs. A Defesa Básica é um escudo de 20% contra dano direto em todos os seus Monstrins em
    campo naquela rodada (não soma com outros escudos; vale o maior). Na arena PvE o tempo é
    opcional (desligado por padrão).
13. **Especial e substituição no mesmo slot.** Não é permitido usar o especial (nem trocar o
    principal) com um secundário que está sendo substituído na mesma rodada.
14. **Escudos que bloqueiam condições.** Bloqueiam mesmo habilidades que ignoram imunidade
    (ignorar imunidade não equivale a ignorar escudo).
15. **Itens em PvE.** Implementado o "Tônico de Duelo" (cura 30 PV), 2 usos por partida, consome a
    ação principal e é aplicado antes dos ataques, como as curas comuns. Pode ser desligado.

## Ponto que precisa da sua decisão

O modo de exploração (RPG) ainda usa as batalhas por turnos criadas antes do regulamento, com
"PV do treinador". O regulamento diz que, no **duelo de cartas**, não existem PV do treinador.
A Arena de Duelos segue o regulamento; as batalhas do mapa continuam como estavam. Sugestão para
a v1.1: decidir se as batalhas contra treinadores no mapa passam a usar o duelo de cartas.
