# Monstrin World

RPG 2D de exploração, captura e evolução de criaturas que roda direto no navegador
(Chrome, Edge, Safari, Android e iPhone). Não precisa instalar nada.

## Como jogar localmente

```bash
cd monstrin-world
npm start        # abre um servidor em http://localhost:8080
npm test         # testes automáticos das regras do jogo
```

Qualquer servidor de arquivos estáticos funciona (GitHub Pages, Netlify, Render etc.).
O jogo precisa ser aberto por `http(s)://` — abrir o `index.html` direto do disco não funciona.

Controles: WASD/setas para andar, Shift para correr, E/Espaço/Enter para interagir,
Esc/M para o menu. No celular: direcional virtual, botão **A** e botão **☰**.

## O que já existe (versão 0.1)

- Vila Aurora (casas, laboratório, Centro Monstrin, mercado, lago, NPCs) e o Bosque Sussurrante.
- Escolha do primeiro Monstrin (Brasito, Gotinho ou Brotim) e acompanhante que segue o jogador.
- Monstrins selvagens visíveis no mapa, com comportamentos (tímido, curioso, preguiçoso) e raros brilhando.
- Batalha por turnos no próprio cenário, com efeitos de ataque para os 5 elementos.
- PV de treinador (1.000) em batalhas contra treinadores: sem Monstrin ativo, o treinador leva ataques diretos.
- Captura com o **Selo de Vínculo** (cristal hexagonal original) e animação de sucesso/falha.
- Cada Monstrin é único: identificador, variação de atributos, temperamento, vínculo e histórico.
- XP, níveis 1–50, ataques por nível, evolução automática com animação.
- Até 4 ataques equipados (configurável); ataques aprendidos nunca se perdem.
- Runas de Técnica para ensinar ataques.
- Equipe (6), Deck de duelo, Criaturário com silhuetas, Inventário, Mapa da região, Missões e Configurações.
- Salvamento automático local com cópia de segurança, exportar/importar progresso.
- Derrota: o jogador volta ao Centro Monstrin com a equipe curada, sem perder progresso.

## Duelos de cartas (Regulamento v1.0)

Uma única aventura: ao criar o personagem você escolhe o parceiro, que define seu deck inicial de
15 cartas. Pelo mapa, pessoas com **⚔** acima da cabeça aceitam duelos (Treinadora Duda na praça,
Treinador Caio no bosque). O duelo segue o regulamento: mão de 5, 1 principal + até 2 secundários,
escolhas secretas e resolução simultânea, Energia de Duelo, escudos, condições, retaliação,
drenagem, reviver e vitória por 5 KOs. As habilidades são escolhidas tocando na própria carta.
Ao terminar, você volta ao mesmo ponto do mapa. O deck fica em **Menu → Deck**.
Não há multijogador online (sem servidor): todos os adversários são NPCs.
Detalhes e decisões: [`docs/DUELOS.md`](docs/DUELOS.md).

## Onde mudar cada coisa

| Quero mudar...                  | Arquivo |
|---------------------------------|---------|
| Regras gerais (PV do treinador, limite de ataques, nível máximo...) | `src/config.js` |
| Criaturas, atributos, evoluções | `src/data/species.js` |
| Ataques                         | `src/data/moves.js` (animações em `src/battle/effects.js`) |
| Itens e Runas                   | `src/data/items.js` |
| Missões                         | `src/data/quests.js` |
| Diálogos e NPCs                 | `src/data/scripts.js` e os mapas |
| Mapas e regiões                 | `src/data/maps/` (registro em `index.js`) |
| Vantagens entre elementos       | `src/data/elements.js` |
| Cartas e regras do duelo        | `src/duel/cards.js` e `src/duel/rules.js` |

## Arquitetura

- `src/core/` — regras puras (sem gráficos): criaturas, batalha, captura, estado do jogo e salvamento.
  O motor de batalha devolve "eventos"; a parte visual só os anima. Isso permite criar um modo em
  tempo real no futuro reaproveitando criaturas, ataques e cálculos.
- `src/core/storage.js` — salvamento local. Para contas com servidor, basta criar outro adaptador
  com os mesmos métodos (`load`, `save`, `clear`). **Ainda não há sincronização entre aparelhos.**
- `src/art/` — toda a arte é desenhada por código (original). Ilustrações externas podem ser
  registradas em `CUSTOM_ART` (`src/art/registry.js`).
- `src/world/` — exploração (Phaser 3.80.1, incluído em `vendor/`).
- `src/battle/` — encenação das batalhas no cenário e efeitos especiais.
- `src/ui/` — menus e interface em HTML/CSS (textos grandes no celular).

## Dados provisórios

O protótipo **Duelo Elemental** não estava disponível neste repositório. Por isso, todas as espécies,
evoluções e atributos atuais são **provisórios** (`provisorio: true`) e podem ser substituídos pelos
dados e ilustrações originais assim que forem enviados.
