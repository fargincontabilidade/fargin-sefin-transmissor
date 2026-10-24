// BOSQUE SUSSURRANTE — primeira rota, com Monstrins selvagens visíveis.
import { MapBuilder } from './builder.js';

export function buildBosque() {
  const m = new MapBuilder('bosque', 'Bosque Sussurrante', 56, 30);
  m.def.seed = 23;

  // Solo de floresta escura e áreas especiais
  m.ellipse(16.5, 23, 7, 4.5, ',');
  m.rect(0, 0, 56, 3, ',').rect(0, 27, 56, 3, ',');
  m.ellipse(46, 21.5, 7.5, 5, 'r');
  m.rect(3, 16, 7, 2, 'f').rect(5, 22, 4, 2, 'f').rect(33, 23, 3, 2, 'f').rect(24, 15, 3, 2, 'f');

  // Lago e riacho
  m.ellipse(30.5, 9.5, 6.2, 4.2, 's');
  m.ellipse(30.5, 9.5, 5.2, 3.3, 'w');
  m.rect(30, 12, 2, 13, 'w');
  m.ellipse(31, 25.5, 3.4, 1.9, 'w');

  // Trilha
  m.path([[0, 12], [10, 12]], 'p', 2);
  m.path([[10, 12], [10, 5]], 'p', 2);
  m.path([[10, 5], [22, 5]], 'p', 2);
  m.path([[22, 5], [22, 20]], 'p', 2);
  m.path([[22, 20], [38, 20]], 'p', 2);
  m.path([[38, 20], [38, 12]], 'p', 2);
  m.path([[38, 12], [50, 12]], 'p', 2);
  m.rect(30, 20, 2, 2, 'b'); // ponte

  // Fim da rota (caminho bloqueado por troncos caídos)
  m.obj('log', 49, 12, {}, [3, 1]);
  m.obj('log', 49, 13, {}, [3, 1]);
  m.obj('sign', 47, 10, { text: 'Rumo à Cidade Pedraluz\nCaminho bloqueado por troncos caídos.\n(Nova região em breve!)' });
  m.obj('sign', 3, 10, { text: 'BOSQUE SUSSURRANTE\nMonstrins selvagens vivem aqui.\nAproxime-se de um deles para batalhar!' });
  m.obj('sign', 39, 23, { text: 'Clareira das Pedras →\nDizem que algo brilha por lá...' });

  // Baús
  m.obj('chest', 16, 3, { id: 'bau_bosque_1', items: { runa_pedra: 1, tonico: 2 } });
  m.obj('chest', 51, 24, { id: 'bau_clareira', items: { selo_aurora: 1, super_tonico: 1 } });

  // Cristais e pedras na clareira
  m.many('crystalrock', [[42, 19], [50, 18], [47, 25]]);
  m.obj('bigrock', 43, 24, {}, [2, 1]);
  m.many('rock', [[52, 21], [40, 22], [45, 17]]);

  // Treinador
  m.npc({ id: 'caio', name: 'Treinador Caio', look: 'caio', x: 38, y: 16, dir: 'down', talk: 'caio', duelist: 'caio', trainer: { id: 'caio', sight: 5 } });
  m.reserve(39, 12, 1, 10);

  // Áreas de aparecimento de Monstrins selvagens
  m.spawn({ id: 'campina', x: 2, y: 14, w: 9, h: 11, max: 3, table: [
    { species: 'cogumi', weight: 40, min: 2, max: 4 },
    { species: 'pedrolho', weight: 25, min: 2, max: 4 },
    { species: 'faiscol', weight: 18, min: 3, max: 4 },
    { species: 'fagulino', weight: 17, min: 3, max: 4 },
  ] });
  m.spawn({ id: 'lago', x: 23, y: 3, w: 15, h: 13, max: 4, table: [
    { species: 'bolhuga', weight: 50, min: 3, max: 5 },
    { species: 'faiscol', weight: 20, min: 3, max: 5 },
    { species: 'cogumi', weight: 15, min: 3, max: 5 },
    { species: 'fagulino', weight: 15, min: 3, max: 5 },
  ] });
  m.spawn({ id: 'sombra', x: 10, y: 19, w: 13, h: 8, max: 3, table: [
    { species: 'cogumi', weight: 55, min: 3, max: 5 },
    { species: 'fagulino', weight: 25, min: 3, max: 5 },
    { species: 'faiscol', weight: 20, min: 3, max: 5 },
  ] });
  m.spawn({ id: 'clareira', x: 40, y: 17, w: 13, h: 9, max: 3, table: [
    { species: 'pedrolho', weight: 60, min: 4, max: 6 },
    { species: 'faiscol', weight: 25, min: 4, max: 6 },
    { species: 'cristalume', weight: 8, min: 7, max: 9, rare: true },
  ] });
  m.zone({ id: 'clareira_pedras', x: 40, y: 17, w: 13, h: 9, visit: 'clareira_pedras', label: 'Clareira das Pedras' });

  // Capim alto (decoração) e floresta
  m.scatter('tallgrass', 2, 14, 9, 11, 16, 31);
  m.scatter('tallgrass', 10, 19, 13, 8, 14, 32);
  m.scatter('tallgrass', 23, 13, 6, 6, 6, 33);
  m.scatter('tallgrass', 33, 14, 4, 6, 5, 34);
  m.reserve(0, 12, 3, 2);
  m.forestBorder(2, [{ x: 0, y: 12, w: 2, h: 2 }], 13, ['oak', 'pine', 'oak2', 'pine', 'blossom']);
  m.scatter(['oak', 'pine', 'oak2'], 12, 7, 9, 11, 14, 41);
  m.scatter(['oak', 'pine', 'bush'], 2, 2, 8, 9, 10, 42);
  m.scatter(['pine', 'oak', 'bush'], 40, 3, 13, 8, 14, 43);
  m.scatter(['oak2', 'bush', 'berrybush'], 24, 22, 14, 5, 7, 44);
  m.scatter(['bush', 'berrybush', 'rock'], 2, 2, 52, 26, 14, 45);

  m.warp({ x: 0, y: 12, w: 1, h: 2, to: 'vila_aurora', tx: 31.5, ty: 13, dir: 'left' });

  return m.build({ music: 'forest', bg: '#3f7f35' });
}
