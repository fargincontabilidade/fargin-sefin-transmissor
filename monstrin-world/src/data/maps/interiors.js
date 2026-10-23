// Interiores das construções da Vila Aurora.
import { MapBuilder } from './builder.js';

function room(id, name, w, h, floor, doorX) {
  const m = new MapBuilder(id, name, w, h, floor);
  m.rect(0, 0, w, 2, 'X'); // parede do fundo
  m.rect(0, 0, 1, h, 'X').rect(w - 1, 0, 1, h, 'X');
  m.rect(0, h - 1, w, 1, 'X');
  m.rect(doorX, h - 1, 2, 1, floor); // abertura da porta
  m.obj('mat', doorX, h - 2);
  m.obj('mat', doorX + 1, h - 2);
  m.def.ambient = 'interior';
  return m;
}

export function buildCasaJogador() {
  const m = room('casa_jogador', 'Sua casa', 10, 9, 'F', 4);
  m.obj('bed', 1, 2, { interact: 'bed' }, [1, 2]);
  m.obj('bookshelf', 6, 1, {}, [2, 1]);
  m.obj('table', 2, 5, {}, [2, 1]);
  m.obj('plant', 8, 2);
  m.obj('plant', 1, 6);
  m.obj('rug', 4, 3, {}, [3, 2]);
  m.obj('pc', 3, 1, { interact: 'pc_casa' });
  m.warp({ x: 4, y: 8, w: 2, h: 1, to: 'vila_aurora', tx: 6.5, ty: 8.6, dir: 'down' });
  return m.build({ bg: '#2b2440' });
}

export function buildLab() {
  const m = room('lab', 'Laboratório Íris', 13, 11, 'T', 6);
  m.obj('labmachine', 5, 2, { interact: 'starter_machine' }, [3, 1]);
  m.obj('bookshelf', 1, 1, {}, [2, 1]);
  m.obj('bookshelf', 10, 1, {}, [2, 1]);
  m.obj('pc', 3, 1, { interact: 'pc_lab' });
  m.obj('pc', 9, 1, { interact: 'pc_lab' });
  m.obj('table', 1, 6, {}, [2, 1]);
  m.obj('table', 10, 6, {}, [2, 1]);
  m.obj('plant', 1, 4);
  m.obj('plant', 11, 4);
  m.obj('rug', 5, 5, {}, [3, 2]);
  m.npc({ id: 'iris', name: 'Professora Íris', look: 'professora', x: 6, y: 4, dir: 'down', talk: 'iris' });
  m.warp({ x: 6, y: 10, w: 2, h: 1, to: 'vila_aurora', tx: 15.5, ty: 6.6, dir: 'down' });
  return m.build({ bg: '#2b2440' });
}

export function buildCentro() {
  const m = room('centro_monstrin', 'Centro Monstrin', 13, 10, 'T', 6);
  m.obj('counter', 5, 3, { interact: 'heal' }, [3, 1]);
  m.obj('healer', 8, 1, {}, [2, 1]);
  m.obj('pc', 11, 2, { interact: 'pc_box' });
  m.obj('plant', 1, 2);
  m.obj('plant', 11, 7);
  m.obj('bench', 1, 6, {}, [2, 1]);
  m.obj('rug', 5, 5, {}, [3, 2]);
  m.npc({ id: 'lia', name: 'Enfermeira Lia', look: 'enfermeira', x: 6, y: 2, dir: 'down', talk: 'lia' });
  m.warp({ x: 6, y: 9, w: 2, h: 1, to: 'vila_aurora', tx: 25.5, ty: 9.6, dir: 'down' });
  return m.build({ bg: '#2b2440' });
}

export function buildMercado() {
  const m = room('mercado', 'Mercado Aurora', 10, 8, 'F', 4);
  m.obj('counter', 3, 2, { interact: 'shop' }, [3, 1]);
  m.obj('bookshelf', 1, 1, {}, [2, 1]);
  m.obj('bookshelf', 7, 1, {}, [2, 1]);
  m.many('barrel', [[1, 4], [8, 4]]);
  m.obj('crate', 8, 5);
  m.npc({ id: 'lojista', name: 'Seu Rui', look: 'lojista', x: 4, y: 1, dir: 'down', talk: 'lojista' });
  m.warp({ x: 4, y: 7, w: 2, h: 1, to: 'vila_aurora', tx: 24.5, ty: 18.6, dir: 'down' });
  return m.build({ bg: '#2b2440' });
}
