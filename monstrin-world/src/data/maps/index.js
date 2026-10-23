// Registro de mapas. Para adicionar uma cidade/região nova:
// 1) crie um arquivo em src/data/maps/ usando o MapBuilder;
// 2) registre a função aqui;
// 3) ligue os mapas com "warps" (passagens).
import { buildVilaAurora } from './vilaAurora.js';
import { buildBosque } from './bosque.js';
import { buildCasaJogador, buildLab, buildCentro, buildMercado } from './interiors.js';

const BUILDERS = {
  vila_aurora: buildVilaAurora,
  bosque: buildBosque,
  casa_jogador: buildCasaJogador,
  lab: buildLab,
  centro_monstrin: buildCentro,
  mercado: buildMercado,
};

const cache = {};

export function getMap(id) {
  if (!BUILDERS[id]) throw new Error(`Mapa desconhecido: ${id}`);
  if (!cache[id]) cache[id] = BUILDERS[id]();
  return cache[id];
}

export function mapIds() {
  return Object.keys(BUILDERS);
}

// Locais exibidos na tela "Mapa" da região
export const REGION_MAP = {
  name: 'Região de Aurora',
  places: [
    { id: 'vila_aurora', name: 'Vila Aurora', x: 0.24, y: 0.55, kind: 'city', desc: 'Vila tranquila onde mora a Professora Íris.' },
    { id: 'bosque', name: 'Bosque Sussurrante', x: 0.52, y: 0.5, kind: 'route', desc: 'Floresta com Monstrins de vários elementos.' },
    { id: 'pedraluz', name: 'Cidade Pedraluz', x: 0.8, y: 0.38, kind: 'locked', desc: 'Em breve.' },
    { id: 'monte', name: 'Monte Trovão', x: 0.72, y: 0.12, kind: 'locked', desc: 'Em breve. Dizem que o lendário Trovarion vive lá.' },
    { id: 'praia', name: 'Praia Coral', x: 0.36, y: 0.86, kind: 'locked', desc: 'Em breve.' },
  ],
  roads: [['vila_aurora', 'bosque'], ['bosque', 'pedraluz'], ['pedraluz', 'monte'], ['vila_aurora', 'praia']],
};

export const MAP_REGION_PLACE = {
  vila_aurora: 'vila_aurora', casa_jogador: 'vila_aurora', lab: 'vila_aurora', centro_monstrin: 'vila_aurora', mercado: 'vila_aurora', bosque: 'bosque',
};
