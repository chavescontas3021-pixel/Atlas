// Cenas de batalha em pixel art (GIF): herói contra monstro ou herói contra herói.
// Cada turno vira um GIF com o golpe, o número de dano, o tremor do alvo e as barras de vida.
const { AttachmentBuilder } = require('discord.js');
const { montar } = require('../extras/pixelgif');
const A = require('./arte');
const { ESPECIAIS } = require('./especiais');
const M = require('./monstros');

const W = 84;
const H = 56;
const CHAO = 51; // linha dos pés
const D = CHAO - 47; // deslocamento do cenário
const ESCALA = 5;
const CX = { e: 20, d: 61 }; // centro de cada lado
const K = '#0d0912';
const ARQUIVO = 'batalha.gif';

// ---------- utilitários ----------
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mistura = (a, b, f) => { const x = toRgb(a); const y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); };
const px = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
const ret = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
function lin(g, x0, y0, x1, y1, c, esp = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n; const y = y0 + ((y1 - y0) * i) / n;
    for (let a = 0; a < esp; a++) for (let b = 0; b < esp; b++) px(g, x + a, y + b, c);
  }
}
function elip(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(g, x, y, c);
}
function anel(g, cx, cy, r, c, espessura = 1) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r && d > r - espessura) px(g, x, y, c);
  }
}

// ---------- sprites ----------
const cacheHeroi = new Map();
function gradeHeroi(app, t) {
  const a = A.normalizar(app);
  const chave = `${JSON.stringify(a)}:${t % 4}`;
  if (!cacheHeroi.has(chave)) {
    if (cacheHeroi.size > 120) cacheHeroi.delete(cacheHeroi.keys().next().value);
    const esp = a.especial && ESPECIAIS[a.especial] && ESPECIAIS[a.especial].sprite ? ESPECIAIS[a.especial] : null;
    const letras = esp ? esp.sprite(a, esp.quadros[t % 4]) : A.desenharPersonagem(a, A.QUADROS[t % 4]);
    const cores = esp ? esp.cores(a) : A.coresDe(a);
    cacheHeroi.set(chave, letras.map((l) => l.map((c) => (c === '.' ? null : cores[c] || null))));
  }
  return cacheHeroi.get(chave);
}
const gradeAtor = (ator, t) => (ator.tipo === 'monstro' ? M.grade(ator.nome, t) : gradeHeroi(ator.app, t));
const espelhar = (g) => g.map((l) => l.slice().reverse());
const tintar = (g, cor, f = 1) => g.map((l) => l.map((c) => (c && c !== K ? mistura(c, cor, f) : c)));
function dissolver(g, p) {
  const alt = g.length;
  return g.map((l, y) => l.map((c, x) => {
    if (!c) return c;
    const h = ((x * 37 + y * 17) % 23) / 23;
    const sobe = 1 - y / alt; // as partes de cima somem primeiro
    return h * 0.7 + (1 - sobe) * 0.3 < p ? null : c;
  }));
}

// ---------- cenário ----------
const CEU = ['#0a0716', '#0f0b24', '#150e30', '#1d1342', '#281a56', '#331f66'];
const ESTRELAS = [[3, 2], [9, 6], [15, 1], [22, 4], [29, 2], [38, 5], [44, 3], [53, 8], [60, 2], [6, 12], [19, 10], [33, 9], [26, 14], [47, 13], [58, 15], [12, 16], [41, 10], [66, 5], [74, 3], [80, 9], [70, 18], [78, 14], [64, 14]];
const cacheFundo = [];
function fundo(t) {
  if (cacheFundo[t % 4]) return cacheFundo[t % 4].map((l) => l.slice());
  const g = Array.from({ length: H }, (_, y) => Array(W).fill(CEU[Math.min(CEU.length - 1, Math.floor(y / 8))]));
  ESTRELAS.forEach(([x, y], i) => { g[y][x] = (i + t) % 3 === 0 ? '#8f86c4' : '#e6e1ff'; });
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    const d = Math.hypot(x, y); const X = 70 + x; const Y = 12 + y;
    if (d <= 5) g[Y][X] = '#eee9f7'; else if (d <= 6.4 && (x + y + 30) % 2 === 0) g[Y][X] = '#3a2d6a';
  }
  for (const [x, y] of [[-1, -1], [1, 1], [-2, 1], [2, -2], [0, 3]]) g[12 + y][70 + x] = '#c6bedb';
  for (let x = 0; x < W; x++) {
    const h1 = 31 + D + Math.round(2.6 * Math.sin(x * 0.4) + 1.6 * Math.sin(x * 1.1 + 1));
    for (let y = h1; y < CHAO - 2; y++) g[y][x] = '#1a1230';
    const h2 = 36 + D + Math.round(1.8 * Math.sin(x * 0.7 + 2) + 1.2 * Math.sin(x * 1.7));
    for (let y = h2; y < CHAO - 2; y++) g[y][x] = '#120c22';
  }
  const cor = '#0a0614';
  for (const [x, y, w, h] of [[1, 24 + D, 4, 16], [6, 28 + D, 3, 12], [10, 21 + D, 4, 19], [3, 34 + D, 8, 6], [15, 32 + D, 3, 8]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (const [x, y] of [[1, 23], [3, 23], [6, 27], [8, 27], [10, 20], [12, 20], [13, 20]]) g[y + D][x] = cor;
  g[26 + D][2] = t % 2 ? '#f2c15a' : '#b8892f'; g[25 + D][12] = '#f2c15a'; g[32 + D][7] = '#b8892f';
  // segundo castelo, à direita, bem longe
  for (const [x, y, w, h] of [[76, 30 + D, 4, 10], [80, 33 + D, 3, 7]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = y === CHAO - 2 ? '#3a3050' : y === CHAO - 1 ? '#2a2238' : '#1c1628';
  for (let y = CHAO; y < H; y++) for (let x = 0; x < W; x++) if ((x + y * 3) % 12 === 0) g[y][x] = '#2e2644';
  for (let y = CHAO - 6; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 5 === 0) g[y][x] = '#40366a';
  cacheFundo[t % 4] = g;
  return g.map((l) => l.slice());
}

// ---------- números de dano (fonte 3x5) ----------
const FONTE = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000', '!': '010010010000010' };
function numero(g, cx, y, txt, cor) {
  const larg = txt.length * 4 - 1;
  const x0 = Math.round(cx - larg / 2);
  const pontos = [];
  [...txt].forEach((ch, i) => { const f = FONTE[ch]; if (f) for (let k = 0; k < 15; k++) if (f[k] === '1') pontos.push([x0 + i * 4 + (k % 3), y + Math.floor(k / 3)]); });
  for (const [x, yy] of pontos) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) px(g, x + a, yy + b, K);
  for (const [x, yy] of pontos) px(g, x, yy, cor);
}

// ---------- efeitos de golpe ----------
function corte(g, x, y, prog, s, cor, esp = 2) {
  const x0 = x - 6 * s; const y0 = y - 7; const x1 = x + 6 * s; const y1 = y + 7;
  lin(g, x0, y0, x0 + (x1 - x0) * prog, y0 + (y1 - y0) * prog, cor, esp);
  if (prog > 0.5) lin(g, x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3, x0 + (x1 - x0) * prog, y0 + (y1 - y0) * prog, '#ffffff', 1);
}
function raios(g, x, y, cor) {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    lin(g, x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + Math.cos(a) * 7, y + Math.sin(a) * 7, cor, 1);
  }
}
function brilhos(g, x, y, t, cor) {
  const pts = [[-6, 2], [5, -3], [-3, -9], [7, 4], [0, -14], [-8, -6]];
  pts.forEach(([a, b], i) => { const yy = y + b - ((t * 2 + i) % 5); px(g, x + a, yy, i % 2 ? '#ffffff' : cor); if (i % 2 === 0) { px(g, x + a - 1, yy, cor); px(g, x + a + 1, yy, cor); px(g, x + a, yy - 1, cor); px(g, x + a, yy + 1, cor); } });
}

// visual: corte | cruz | explosao | flechas | luz | furtivo
function efeito(g, ev, i, de, para, s) {
  const crit = ev.crit;
  const alvoY = para.y;
  const cor = de.lado === 'e' ? '#ffe9a8' : '#ff8a8a';
  const v = ev.visual || 'corte';
  if (ev.tipo === 'def') {
    if (i >= 1) {
      const sx = de.x + s * 10; const sy = de.y;
      for (let a = -9; a <= 9; a++) { const xx = sx + s * Math.round(3 - Math.abs(a) * 0.33); px(g, xx, sy + a, i === 3 ? '#4a78b0' : '#8fd0ff'); px(g, xx + s, sy + a, '#2a4a7a'); }
      px(g, sx + s * 3, sy, '#ffffff');
    }
    return;
  }
  if (ev.tipo === 'poc') { brilhos(g, de.x, de.y - 2, i, '#5cff6a'); return; }
  if (ev.esq) {
    if (i >= 1) { for (let k = 0; k < 3; k++) lin(g, para.x - s * (4 + k * 3), alvoY - 4 + k * 4, para.x - s * (1 + k * 3), alvoY - 4 + k * 4, '#9fd0ff', 1); }
    return;
  }
  if (v === 'corte') { if (i === 1) corte(g, para.x, alvoY, 0.5, s, cor); if (i === 2) { corte(g, para.x, alvoY, 1, s, cor); if (crit) raios(g, para.x, alvoY, '#ffdd33'); } if (i === 3) corte(g, para.x, alvoY, 1, s, mistura(cor, '#2a1a40', 0.6), 1); }
  if (v === 'cruz') {
    if (i === 1) corte(g, para.x, alvoY, 0.6, s, '#ffd24a', 3);
    if (i >= 2) { corte(g, para.x, alvoY, 1, s, i === 2 ? '#ffd24a' : '#a8731a', 3); corte(g, para.x, alvoY, 1, -s, i === 2 ? '#fff4b8' : '#a8731a', 2); if (i === 2) raios(g, para.x, alvoY, '#ffdd33'); }
  }
  if (v === 'explosao') {
    if (i === 1) { const ox = de.x + (para.x - de.x) * 0.55; elip(g, ox, alvoY, 3, 3, '#ff7a1c'); elip(g, ox, alvoY, 1.6, 1.6, '#ffe14a'); }
    if (i === 2) { elip(g, para.x, alvoY, 7, 7, '#ff5a1c'); elip(g, para.x, alvoY, 5, 5, '#ffa01c'); elip(g, para.x, alvoY, 2.6, 2.6, '#fff4b8'); raios(g, para.x, alvoY, '#ff3b1c'); }
    if (i === 3) { anel(g, para.x, alvoY, 9, '#a83a1c', 1); px(g, para.x - 3, alvoY - 9, '#ff7a1c'); px(g, para.x + 4, alvoY - 8, '#ff7a1c'); px(g, para.x, alvoY - 11, '#ffa01c'); }
  }
  if (v === 'flechas') {
    for (let k = 0; k < 4; k++) {
      const yy = alvoY - 14 + (i >= 1 ? (i === 1 ? 4 : 12) : 0) + k * 2;
      const xx = para.x - s * 4 + k * 3 * s;
      if (i >= 1) { lin(g, xx - s * 2, yy - 5, xx, yy, '#e8d9a0', 1); px(g, xx, yy, '#ffffff'); px(g, xx - s * 2, yy - 5, '#c9a227'); }
    }
    if (i === 2) { raios(g, para.x, alvoY, '#ffe9a8'); }
  }
  if (v === 'luz') {
    if (i >= 1) { ret(g, para.x - 2, 4, 5, alvoY, i === 2 ? '#fff4b8' : '#f2c230'); ret(g, para.x - 1, 4, 3, alvoY, '#ffffff'); }
    if (i === 2) { elip(g, para.x, alvoY, 6, 6, '#fff4b8'); }
    if (i === 3) anel(g, para.x, alvoY, 8, '#f2c230', 1);
  }
  if (v === 'furtivo') {
    if (i === 1) { corte(g, para.x, alvoY, 0.7, s, '#c8b8ff', 1); }
    if (i >= 2) { corte(g, para.x, alvoY - 1, 1, s, i === 2 ? '#ffffff' : '#7a52b8', 1); corte(g, para.x + s * 2, alvoY + 2, 1, s, i === 2 ? '#c8b8ff' : '#47246e', 1); }
    if (i === 3) for (let k = 0; k < 5; k++) px(g, para.x - 4 + k * 2, alvoY + 4 - (k % 2), '#47246e');
  }
  if (ev.cura && i >= 1) brilhos(g, de.x, de.y - 2, i, v === 'luz' ? '#ffe14a' : '#5cff6a');
}

function barras(g, hp, max) {
  const desenhar = (x, w, v, m, cor) => {
    ret(g, x - 1, 1, w + 2, 5, K); ret(g, x, 2, w, 3, '#2a1020');
    const f = Math.max(0, Math.min(1, v / m));
    const n = Math.round(w * f);
    if (n > 0) { ret(g, x, 2, n, 3, cor); ret(g, x, 2, n, 1, mistura(cor, '#ffffff', 0.35)); }
  };
  desenhar(3, 30, hp.a, max.a, '#4cd964');
  desenhar(W - 33, 30, hp.b, max.b, hp.b / max.b > 0.3 ? '#e0455a' : '#ff2b3b');
}

// ---------- montagem do quadro ----------
function poe(g, spr, cx, dx, dy, bola) {
  if (!spr) return;
  const w = spr[0].length; const h = spr.length;
  const x0 = Math.round(cx - w / 2 + dx);
  const y0 = CHAO - h + 1 + dy;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (spr[y][x]) px(g, x0 + x, y0 + y, spr[y][x]);
  return { x: x0 + w / 2, y: y0 + h * 0.55, topo: y0, w, h };
}
function sombra(g, cx, w) {
  for (let x = Math.round(cx - w * 0.38); x <= Math.round(cx + w * 0.38); x++) g[CHAO + 1][x] = '#0c0813';
  for (let x = Math.round(cx - w * 0.28); x <= Math.round(cx + w * 0.28); x++) g[CHAO + 2][x] = '#0c0813';
}

function quadro(cfg, o) {
  const g = fundo(o.t);
  const sprs = { e: gradeAtor(cfg.esq, o.t), d: gradeAtor(cfg.dir, o.t) };
  if (cfg.dir.tipo === 'heroi') sprs.d = espelhar(sprs.d);
  const bob = (o.t % 2 === 0 ? 0 : 1);
  for (const l of ['e', 'd']) {
    const est = o.est[l];
    let spr = sprs[l];
    if (est.flash) spr = tintar(spr, est.flash[0], est.flash[1]);
    if (est.dissolve) spr = dissolver(spr, est.dissolve);
    est.sprite = spr;
  }
  const info = {};
  for (const l of ['e', 'd']) {
    const est = o.est[l];
    sombra(g, CX[l] + est.dx, sprs[l][0].length);
    const r = poe(g, est.sprite, CX[l], est.dx, (est.dy || 0) + (est.parado ? 0 : bob * (cfg[l === 'e' ? 'esq' : 'dir'].tipo === 'monstro' ? 1 : 0)), false);
    info[l] = { ...r, lado: l };
  }
  if (o.ev) {
    const de = info[o.ev.por === 'a' ? 'e' : 'd'];
    const para = info[o.ev.por === 'a' ? 'd' : 'e'];
    const s = o.ev.por === 'a' ? 1 : -1;
    efeito(g, o.ev, o.i, de, para, s);
    if (o.i >= 2 && !o.ev.esq && o.ev.tipo !== 'def') {
      const rise = o.i === 2 ? 0 : 3;
      if (o.ev.tipo === 'poc') numero(g, de.x, Math.max(8, de.topo - 7 - rise), `+${o.ev.cura || 0}`, '#6dff7a');
      else if (o.ev.dano != null) numero(g, para.x, Math.max(8, para.topo - 7 - rise - (o.ev.crit ? 1 : 0)), `${o.ev.dano}${o.ev.crit ? '!' : ''}`, o.ev.crit ? '#ffdd33' : (o.ev.por === 'a' ? '#ffffff' : '#ff6a6a'));
    }
  }
  barras(g, o.hp, cfg.hpMax);
  return g;
}

const ATRASOS = [9, 7, 11, 18];

function gif(cfg) {
  const eventos = cfg.eventos || [];
  const hp = { a: cfg.hpIni.a, b: cfg.hpIni.b };
  const quadros = []; const atrasos = [];
  let t = 0;
  const base = () => ({ e: { dx: 0, dy: 0 }, d: { dx: 0, dy: 0 } });
  const empilha = (o, atraso) => { quadros.push(quadro(cfg, { ...o, t, hp: { ...hp } })); atrasos.push(atraso); t++; };

  if (!eventos.length && !cfg.fim) {
    for (let k = 0; k < 4; k++) empilha({ est: base(), ev: null, i: 0 }, 24);
  }
  for (const ev of eventos) {
    const ladoA = ev.por === 'a' ? 'e' : 'd';
    const ladoB = ev.por === 'a' ? 'd' : 'e';
    const s = ev.por === 'a' ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const est = base();
      if (ev.tipo === 'atq' || ev.tipo === 'hab') est[ladoA].dx = s * [-1, 4, 6, 2][i];
      if (ev.tipo === 'hab' && i >= 1 && i <= 2) est[ladoA].dy = -1;
      if (ev.tipo === 'def' && i >= 1) est[ladoA].dx = -s * 1;
      if ((ev.tipo === 'atq' || ev.tipo === 'hab') && i >= 2) {
        if (ev.esq) est[ladoB].dx = s * [0, 0, 5, 4][i];
        else { est[ladoB].dx = s * [0, 0, 2, 1][i]; est[ladoB].flash = i === 2 ? ['#ffffff', ev.crit ? 0.9 : 0.7] : ['#ff4040', 0.45]; }
      }
      if (i >= 2 && ev.hpA != null) { hp.a = ev.hpA; hp.b = ev.hpB; }
      empilha({ est, ev, i }, ATRASOS[i]);
    }
  }
  if (cfg.fim) {
    const lad = cfg.perdedor === 'a' ? 'e' : 'd';
    [0.25, 0.55, 0.85, 1].forEach((p, k) => {
      const est = base();
      est[lad].dissolve = p; est[lad].parado = true;
      est[lad].flash = ['#ffffff', Math.max(0, 0.7 - k * 0.2)];
      empilha({ est, ev: null, i: 0 }, k === 3 ? 220 : 14);
    });
  } else if (atrasos.length) {
    atrasos[atrasos.length - 1] = 45;
  }
  return montar(quadros, { escala: ESCALA, atraso: atrasos });
}

const anexo = (cfg) => new AttachmentBuilder(gif(cfg), { name: ARQUIVO });

module.exports = { ARQUIVO, W, H, gif, anexo, gradeHeroi, efeito, numero, mistura, tintar, dissolver, px, ret, elip, lin, anel, K };
// fim do arquivo
