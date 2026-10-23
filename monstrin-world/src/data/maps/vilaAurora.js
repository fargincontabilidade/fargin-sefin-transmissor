// VILA AURORA — cidade inicial.
import { MapBuilder } from './builder.js';

export function buildVilaAurora() {
  const m = new MapBuilder('vila_aurora', 'Vila Aurora', 34, 28);
  m.def.music = 'village';
  m.def.seed = 7;

  // Gramado mais escuro nas bordas
  m.rect(0, 0, 34, 3, ',').rect(0, 25, 34, 3, ',').rect(0, 0, 3, 28, ',').rect(31, 0, 3, 28, ',');

  // Caminhos
  m.path([[15, 6], [15, 9]], 'p', 2); // laboratório -> praça
  m.path([[3, 12], [33, 12]], 'p', 2); // rua principal (saída leste)
  m.path([[6, 8], [6, 12]], 'p', 2); // casa do jogador
  m.path([[25, 9], [25, 12]], 'p', 2); // centro monstrin
  m.path([[15, 15], [15, 18]], 'p', 2); // praça -> rua de baixo
  m.path([[3, 19], [29, 19]], 'p', 2); // rua de baixo
  m.path([[6, 18], [6, 19]], 'p', 2); // casa da Flora
  m.path([[24, 18], [24, 19]], 'p', 2); // mercado

  // Praça central de pedra (por cima das ruas)
  m.rect(12, 9, 10, 6, 'c');

  // Lago com flores
  m.ellipse(16.5, 23.8, 5.4, 2.5, 's');
  m.ellipse(16.5, 23.8, 4.5, 1.9, 'w');
  m.rect(8, 22, 3, 2, 'f').rect(23, 22, 3, 2, 'f').rect(10, 9, 2, 2, 'f').rect(27, 14, 3, 2, 'f').rect(18, 6, 2, 2, 'f');
  m.rect(3, 22, 3, 2, 'f').rect(28, 22, 2, 2, 'f');

  // Construções
  m.building('lab', 12, 3, [7, 3], [3, 2], { to: 'lab', tx: 6.5, ty: 9.3, dir: 'up' });
  m.building('house_red', 4, 5, [5, 3], [2, 2], { to: 'casa_jogador', tx: 4.5, ty: 7.3, dir: 'up' });
  m.building('centro', 22, 6, [7, 3], [3, 2], { to: 'centro_monstrin', tx: 6.5, ty: 8.3, dir: 'up' });
  m.building('house_blue', 4, 15, [5, 3], [2, 2], null);
  m.building('shop', 22, 15, [5, 3], [2, 2], { to: 'mercado', tx: 4.5, ty: 6.3, dir: 'up' });

  // Poço no centro da praça
  m.obj('well', 16, 11, {}, [2, 1]);
  // Postes de luz
  m.many('lamp', [[11, 9], [22, 9], [11, 14], [22, 14], [30, 11], [30, 14]]);
  // Placas
  m.obj('sign', 29, 11, { text: 'VILA AURORA\nOnde toda aventura começa.\n→ Leste: Bosque Sussurrante' });
  m.obj('sign', 20, 7, { text: 'LABORATÓRIO ÍRIS\nPesquisa de Monstrins da região de Aurora.' });
  m.obj('sign', 13, 21, { text: 'Lago Espelho\nCuidado para não cair!' });
  m.obj('mailbox', 9, 7);
  m.obj('mailbox', 9, 17);

  // Cerca do jardim da casa do jogador
  for (let x = 3; x < 10; x++) if (x !== 6 && x !== 7) m.obj('fenceH', x, 9);
  // Jardim da Flora
  m.many('berrybush', [[10, 15], [10, 16], [11, 17]]);
  m.many('bush', [[3, 14], [27, 9], [29, 17], [21, 16]]);
  m.many('blossom', [[10, 4], [21, 4], [12, 17], [20, 16]]);
  m.many('barrel', [[27, 18], [21, 18]]);
  m.obj('crate', 28, 18);
  m.obj('bench', 18, 15, {}, [2, 1]);

  // NPCs
  m.npc({ id: 'nina', name: 'Nina', look: 'nina', x: 13, y: 13, dir: 'down', wander: 2, talk: 'nina' });
  m.npc({ id: 'tobias', name: 'Seu Tobias', look: 'tobias', x: 11, y: 23, dir: 'right', talk: 'tobias' });
  m.npc({ id: 'flora', name: 'Dona Flora', look: 'flora', x: 9, y: 18, dir: 'down', talk: 'flora' });
  m.npc({ id: 'bento', name: 'Vigia Bento', look: 'vigia', x: 31, y: 12, dir: 'left', talk: 'bento', moveIf: { flag: 'starterChosen', x: 30, y: 10, dir: 'down' } });

  m.reserve(30, 10); // posição do vigia depois de liberar a passagem
  m.reserve(5, 8, 4, 1); m.reserve(24, 9, 4, 1); // frente das casas

  // Floresta ao redor (com saída a leste na rua principal)
  m.forestBorder(2, [{ x: 31, y: 12, w: 3, h: 2 }], 5, ['oak', 'oak2', 'pine', 'oak']);
  m.scatter(['oak', 'pine', 'bush'], 2, 2, 30, 24, 10, 9);

  // Saída para o Bosque
  m.warp({ x: 33, y: 12, w: 1, h: 2, to: 'bosque', tx: 1.5, ty: 13, dir: 'right' });
  m.blocker({ cells: [[32, 12], [32, 13]], unlessFlag: 'starterChosen', talk: 'bento_block' });

  return m.build({ music: 'village', bg: '#4f9a3e' });
}
