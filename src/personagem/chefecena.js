// Cena do chefe em grupo (GIF): o chefe gigante à direita e, à esquerda, o personagem de cada
// participante atacando (até 6, os que atacaram por último). Reaproveita golpes e números da batalha.
const { AttachmentBuilder } = require('discord.js');
const { montar } = require('../extras/pixelgif');
const B = require('./batalha');
const M = require('./monstros');

const W = 152;
const H = 96;
const CHAO = 90;
const ESCALA = 4;
const BX = 108; // centro do chefe
const ARQUIVO = 'chefe.gif';
const { px, ret, mistura, tintar, dissolver, K } = B;

// posições dos heróis (x do centro, deslocamento vertical): fila da frente e fila de trás
const VAGAS = [
  { x: 56, dy: 0 }, { x: 38, dy: 0 }, { x: 20, dy: 0 },
  { x: 47, dy: -6 }, { x: 29, dy: -6 }, { x: 11, dy: -6 },
];
const MAX_HEROIS = VAGAS.length;

function ampliar(g, s) {
  if (s === 1) return g;
  const out = [];
  for (const l of g) { const r = []; for (const c of l) for (let i = 0; i < s; i++) r.push(c); for (let i = 0; i < s; i++) out.push(r.slice()); }
  return out;
}

// ---------- cenário ----------
const CEU = ['#0a0716', '#0f0b24', '#150e30', '#1d1342', '#281a56', '#331f66', '#3d2478'];
const cacheFundo = [];
function fundo(t) {
  if (cacheFundo[t % 4]) return cacheFundo[t % 4].map((l) => l.slice());
  const g = Array.from({ length: H }, (_, y) => Array(W).fill(CEU[Math.min(CEU.length - 1, Math.floor(y / 13))]));
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 46; i++) { const x = Math.floor(rnd() * W); const y = Math.floor(rnd() * 56); g[y][x] = (i + t) % 3 === 0 ? '#8f86c4' : '#e6e1ff'; }
  for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
    const d = Math.hypot(x, y); const X = 126 + x; const Y = 17 + y;
    if (d <= 7.4) g[Y][X] = '#eee9f7'; else if (d <= 9 && (x + y + 40) % 2 === 0) g[Y][X] = '#3a2d6a';
  }
  for (const [x, y] of [[-2, -2], [2, 2], [-3, 2], [3, -3], [0, 4], [-4, -3], [4, 1]]) { px(g, 126 + x, 17 + y, '#c6bedb'); px(g, 127 + x, 17 + y, '#c6bedb'); }
  for (let x = 0; x < W; x++) {
    const h1 = CHAO - 42 + Math.round(3.4 * Math.sin(x * 0.18) + 2 * Math.sin(x * 0.5 + 1));
    for (let y = h1; y < CHAO - 2; y++) g[y][x] = '#1a1230';
    const h2 = CHAO - 30 + Math.round(2.4 * Math.sin(x * 0.3 + 2) + 1.5 * Math.sin(x * 0.9));
    for (let y = h2; y < CHAO - 2; y++) g[y][x] = '#120c22';
  }
  const cor = '#0a0614';
  for (const [x, y, w, h] of [[2, 28, 6, 40], [10, 40, 4, 28], [15, 24, 6, 44], [4, 56, 14, 12], [24, 50, 5, 18]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (const [x, y] of [[2, 26], [5, 26], [10, 38], [13, 38], [15, 22], [18, 22], [20, 22]]) { px(g, x, y, cor); px(g, x, y + 1, cor); }
  px(g, 5, 40, t % 2 ? '#f2c15a' : '#b8892f'); px(g, 17, 34, '#f2c15a'); px(g, 12, 50, '#b8892f'); px(g, 6, 62, '#f2c15a');
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = y === CHAO - 2 ? '#3a3050' : y === CHAO - 1 ? '#2a2238' : '#1c1628';
  for (let y = CHAO; y < H; y++) for (let x = 0; x < W; x++) if ((x + y * 3) % 12 === 0) g[y][x] = '#2e2644';
  for (let y = CHAO - 8; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 5 === 0) g[y][x] = '#40366a';
  cacheFundo[t % 4] = g;
  return g.map((l) => l.slice());
}

function sombra(g, cx, w) {
  for (let x = Math.round(cx - w * 0.4); x <= Math.round(cx + w * 0.4); x++) px(g, x, CHAO + 1, '#0c0813');
  for (let x = Math.round(cx - w * 0.3); x <= Math.round(cx + w * 0.3); x++) px(g, x, CHAO + 2, '#0c0813');
}

function poe(g, spr, cx, dx, dy) {
  const w = spr[0].length; const h = spr.length;
  const x0 = Math.round(cx - w / 2 + dx);
  const y0 = CHAO - h + 1 + dy;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (spr[y][x]) px(g, x0 + x, y0 + y, spr[y][x]);
  return { x: x0 + w / 2, y: y0 + h * 0.55, topo: y0, w, h, esq: x0 };
}

// luz de contorno: realça as bordas de cima/esquerda para o chefe escuro não sumir no fundo
function luz(g) {
  return g.map((l, y) => l.map((c, x) => {
    if (!c || c === K) return c;
    const cima = y === 0 || !g[y - 1][x]; const esq = x === 0 || !g[y][x - 1];
    return cima || esq ? mistura(c, '#c9b8ff', 0.42) : c;
  }));
}

function barraChefe(g, hp, hpMax) {
  const w = 76; const x = W - w - 5;
  ret(g, x - 1, 2, w + 2, 7, K); ret(g, x, 3, w, 5, '#2a1020');
  const n = Math.round(w * Math.max(0, Math.min(1, hp / hpMax)));
  const cor = hp / hpMax > 0.3 ? '#e0455a' : '#ff2b3b';
  if (n > 0) { ret(g, x, 3, n, 5, cor); ret(g, x, 3, n, 2, mistura(cor, '#ffffff', 0.35)); }
}

function quadro(cfg, f, fase) {
  const g = fundo(f);
  const boss0 = M.grade(cfg.boss, f);
  const s = boss0[0].length * 2 <= 100 ? 2 : 1;
  let boss = luz(ampliar(boss0, s));
  const bx = Math.min(BX, W - 3 - Math.floor(boss[0].length / 2));
  const herois = cfg.herois.slice(0, MAX_HEROIS);
  const estados = herois.map((h, k) => {
    if (fase.parados) return { i: -1, dx: 0 };
    const inicio = (k * 2) % 8;
    const i = (f - inicio + 8) % 8;
    return i < 4 ? { i, dx: [-1, 4, 9, 3][i] } : { i: -1, dx: 0 };
  });
  const acertou = estados.some((e) => e.i === 2);
  if (fase.flash) boss = tintar(boss, '#ffffff', fase.flash);
  else if (acertou) boss = tintar(boss, '#ff6a6a', 0.45);
  if (fase.dissolve) boss = dissolver(boss, fase.dissolve);
  const bob = (f % 2 === 0 ? 0 : 1) * (s === 2 ? 2 : 1);
  sombra(g, bx, boss[0].length);
  const bi = poe(g, boss, bx, acertou ? -1 : 0, fase.dissolve ? 0 : -bob);
  // heróis: fila de trás primeiro
  const ordem = herois.map((h, k) => k).sort((a, b) => VAGAS[a].dy - VAGAS[b].dy);
  const info = [];
  for (const k of ordem) {
    const spr = B.gradeHeroi(herois[k].app, f);
    sombra(g, VAGAS[k].x + estados[k].dx, spr[0].length * 0.9);
    const r = poe(g, spr, VAGAS[k].x, estados[k].dx, VAGAS[k].dy);
    info[k] = { ...r, lado: 'e' };
  }
  herois.forEach((h, k) => {
    const e = estados[k];
    if (e.i < 0) return;
    const alvo = { x: bi.esq + 16 + (k % 3) * 5, y: bi.topo + bi.h * 0.55 + ((k % 2) * 8 - 4) };
    const ev = { tipo: h.forte ? 'hab' : 'atq', visual: h.forte ? (h.visual || 'cruz') : 'corte', crit: h.crit, dano: h.dano };
    B.efeito(g, ev, e.i, info[k], alvo, 1);
    if (e.i === 2 && h.dano != null) {
      B.numero(g, bi.esq + 22 + (k % 3) * 18, Math.max(12, bi.topo + 8 + (k % 2) * 9), `${h.dano}${h.crit ? '!' : ''}`, h.crit ? '#ffdd33' : '#ffffff');
    }
  });
  barraChefe(g, cfg.hp, cfg.hpMax);
  return g;
}

function gif(cfg) {
  const quadros = []; const atrasos = [];
  const temHerois = cfg.herois && cfg.herois.length;
  const n = temHerois ? 8 : 4;
  for (let f = 0; f < n; f++) { quadros.push(quadro({ ...cfg, herois: cfg.herois || [] }, f, { parados: !temHerois })); atrasos.push(temHerois ? 11 : 24); }
  if (cfg.fim) {
    [0.25, 0.55, 0.85, 1].forEach((p, k) => {
      quadros.push(quadro({ ...cfg, herois: cfg.herois || [] }, n + k, { parados: true, dissolve: p, flash: Math.max(0, 0.7 - k * 0.2) }));
      atrasos.push(k === 3 ? 300 : 14);
    });
  } else {
    atrasos[atrasos.length - 1] = 40;
  }
  return montar(quadros, { escala: ESCALA, atraso: atrasos });
}

const anexo = (cfg) => new AttachmentBuilder(gif(cfg), { name: ARQUIVO });

module.exports = { ARQUIVO, MAX_HEROIS, gif, anexo };
// fim do arquivo
