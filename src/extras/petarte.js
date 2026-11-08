// Pixel art de todos os pets: cada espécie é desenhada por código (formas com sombreado automático,
// contorno colorido e sombras que puxam para o violeta), com animação de 6 quadros.
// O pet também ganha brilhos e uma aura conforme o nível. Sem imagens nem bibliotecas.
const { AttachmentBuilder } = require('discord.js');
const { montar } = require('./pixelgif');
const Bichos = require('./bichos');

const W = 24; // tamanho do desenho do pet
const H = 24;
const SW = 32; // tamanho da cena
const SH = 28;
const OX = 4;
const OY = 2;
const ESCALA = 9;
const ATRASO = 11; // centésimos de segundo por quadro
const QUADROS = 6;

// ---------- Cores ----------
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const tom = (hex, f) => toHex(toRgb(hex).map((v) => (f < 1 ? v * f : v + (255 - v) * (f - 1))));
const mistura = (a, b, f) => { const x = toRgb(a); const y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); };
const escuro = (hex) => mistura(tom(hex, 0.74), '#2a1560', 0.16);
const claro = (hex) => mistura(tom(hex, 1.25), '#fff0c4', 0.14);
const contorno = (hex) => mistura(tom(hex, 0.32), '#12081f', 0.4);

// Cada grupo de cor (m, s, a, g, r...) vira: 0 sombra, 1 base, 2 luz, e @x = contorno
function paleta(c) {
  const p = { W: '#ffffff', K: '#1a1022', N: c.n || '#e8708a', E: c.e || '#ffd24a', B: '#ffb4c4' };
  for (const [g, hex] of Object.entries(c)) {
    if (g.length !== 1 || ['n', 'e'].includes(g)) continue;
    p[`${g}1`] = hex;
    p[`${g}0`] = escuro(hex);
    p[`${g}2`] = claro(hex);
    p[`@${g}`] = contorno(hex);
  }
  return p;
}

// ---------- Desenho ----------
const nova = () => Array.from({ length: H }, () => Array(W).fill('.'));
const px = (g, x, y, c) => { const i = Math.round(x); const j = Math.round(y); if (j >= 0 && j < H && i >= 0 && i < W) g[j][i] = c; };
const ret = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };

// Sombreado: luz vinda de cima à direita
function tonalidade(nx, ny, g) {
  const l = nx * 0.6 - ny * 0.78;
  if (l > 0.5) return `${g}2`;
  if (l < -0.28 || ny > 0.62) return `${g}0`;
  return `${g}1`;
}

function ell(g, cx, cy, rx, ry, grupo, sombrear = true) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.02) px(g, x, y, sombrear && rx >= 2 && ry >= 2 ? tonalidade(nx, ny, grupo) : `${grupo}1`);
    }
  }
}

function poli(g, pts, grupo, sombrear = true) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2 || 1;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2 || 1;
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let dentro = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
      }
      if (dentro) px(g, x, y, sombrear ? tonalidade((x - cx) / rx, (y - cy) / ry, grupo) : `${grupo}1`);
    }
  }
}

// Linha grossa (caudas, pescoços)
function traco(g, pts, esp, grupo) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const y = y0 + ((y1 - y0) * k) / n;
      const e = typeof esp === 'function' ? esp(i + k / n) : esp;
      ell(g, x, y, e / 2, e / 2, grupo, false);
    }
  }
}

// Contorno colorido: cada pixel vazio ao lado de uma peça ganha um traço escuro da cor dela
function contornar(g) {
  const base = g.map((l) => l.slice());
  const cheio = (x, y) => y >= 0 && y < H && x >= 0 && x < W && base[y][x] !== '.' && !base[y][x].startsWith('@');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (base[y][x] !== '.') continue;
      for (const [a, b] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        if (cheio(x + a, y + b)) {
          const v = base[y + b][x + a];
          g[y][x] = /^[msagrx][012]$/.test(v) ? `@${v[0]}` : '@m';
          break;
        }
      }
    }
  }
}

// Olhos grandes e brilhantes (2x3), com brilho no canto de cima
function olho(g, x, y, f, cor = 'K') {
  if (f.piscar) { ret(g, x, y + 1, 2, 1, 'K'); return; }
  ret(g, x, y, 2, 3, cor);
  px(g, x + 1, y, 'W');
  if (cor !== 'K') px(g, x, y + 2, 'K');
}

const ESPECIES = {};
const def = (id, o) => { ESPECIES[id] = o; };

// ---------- Cena ----------
function fundoCena(esp, i, nivel) {
  const [a, b] = esp.fundo;
  const g = Array.from({ length: SH }, (_, y) => Array(SW).fill(mistura(a, b, y / (SH - 1))));
  // tramado suave no degradê
  for (let y = 1; y < SH - 1; y++) for (let x = 0; x < SW; x++) if ((x + y) % 2 === 0 && y % 7 === 0) g[y][x] = mistura(a, b, (y + 1) / (SH - 1));
  if (esp.noite) {
    const estrelas = [[3, 3], [9, 2], [27, 4], [22, 8], [5, 11], [29, 13], [14, 4], [2, 17]];
    estrelas.forEach(([x, y], k) => { const fase = (k * 2 + i) % QUADROS; g[y][x] = fase < 2 ? '#6e66a6' : fase < 4 ? '#cfc9ee' : '#ffffff'; });
  }
  // chão
  const chao = esp.chao || mistura(b, '#000000', 0.12);
  for (let y = SH - 4; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = y === SH - 4 ? mistura(chao, '#ffffff', 0.18) : chao;
  // aura dourada para pets de nível alto (três faixas suaves, sem tramado)
  if (nivel >= 20) {
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const d = Math.hypot((x - 16) / 13, (y - 14) / 12.5);
        if (d < 0.94) g[y][x] = mistura(g[y][x], '#ffd76a', d < 0.5 ? 0.3 : d < 0.74 ? 0.19 : 0.09);
      }
    }
  }
  return g;
}

// Brilhinhos que aparecem conforme o nível
function brilhos(g, i, nivel) {
  if (nivel < 8) return;
  const pontos = nivel >= 15 ? [[4, 6], [27, 9], [6, 20], [26, 18]] : [[4, 6], [27, 9]];
  pontos.forEach(([x, y], k) => {
    const fase = (i + k * 2) % QUADROS;
    if (fase < 3) {
      const c = fase === 1 ? '#ffffff' : '#ffe9a3';
      g[y][x] = c;
      if (fase === 1) { g[y - 1][x] = '#ffe9a3'; g[y + 1][x] = '#ffe9a3'; g[y][x - 1] = '#ffe9a3'; g[y][x + 1] = '#ffe9a3'; }
    }
  });
}

function quadroPet(esp, i) {
  const f = {
    i,
    dy: [0, 0, 1, 1, 1, 0][i],
    piscar: i === 4,
    osc: Math.sin((i / QUADROS) * Math.PI * 2),
    fase: i,
  };
  const g = nova();
  esp.desenhar(g, f);
  contornar(g);
  return g;
}

function gradeCena(chave, i, nivel = 1) {
  const esp = ESPECIES[chave];
  const cores = paleta(esp.cores);
  const g = fundoCena(esp, i, nivel);
  // sombra no chão
  for (let x = OX + 6; x <= OX + 17; x++) g[OY + 22][x] = mistura(g[OY + 22][x], '#000000', 0.2);
  for (let x = OX + 8; x <= OX + 15; x++) g[OY + 23][x] = mistura(g[OY + 23][x], '#000000', 0.18);
  const p = quadroPet(esp, i);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y][x] !== '.' && cores[p[y][x]]) g[OY + y][OX + x] = cores[p[y][x]];
  brilhos(g, i, nivel);
  return g;
}

const camadaNivel = (nivel) => (nivel >= 20 ? 3 : nivel >= 15 ? 2 : nivel >= 8 ? 1 : 0);
const cache = new Map();
function gif(chave, nivel = 1) {
  const k = `${chave}:${camadaNivel(nivel)}`;
  if (!cache.has(k)) {
    const n = [1, 8, 15, 20][camadaNivel(nivel)];
    cache.set(k, montar(Array.from({ length: QUADROS }, (_, i) => gradeCena(chave, i, n)), { escala: ESCALA, atraso: ATRASO * 10 }));
  }
  return cache.get(k);
}

const tem = (chave) => !!ESPECIES[chave];

// Vitrine: todos os pets lado a lado, animados (usada em /pet lista)
const vitrines = new Map();
function vitrine(ids) {
  const chave = ids.join(',');
  if (!vitrines.has(chave)) {
    const cols = 4;
    const lin = Math.ceil(ids.length / cols);
    const cw = W + 4;
    const ch = H + 3;
    const quadros = [];
    for (let i = 0; i < QUADROS; i++) {
      const g = Array.from({ length: lin * ch }, (_, y) => Array(cols * cw).fill(mistura('#2e2548', '#3f3260', y / (lin * ch))));
      ids.forEach((id, k) => {
        const esp = ESPECIES[id];
        const cores = paleta(esp.cores);
        const x0 = (k % cols) * cw + 2;
        const y0 = Math.floor(k / cols) * ch + 1;
        for (let x = x0 + 5; x <= x0 + 18; x++) g[y0 + 22][x] = '#241d3a';
        const p = quadroPet(esp, i);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y][x] !== '.' && cores[p[y][x]]) g[y0 + y][x0 + x] = cores[p[y][x]];
      });
      quadros.push(g);
    }
    vitrines.set(chave, montar(quadros, { escala: 6, atraso: ATRASO * 10 }));
  }
  return new AttachmentBuilder(vitrines.get(chave), { name: 'pets.gif' });
}

// Mesma interface do bichos.js: { url, anexo() }. Espécies sem arte nova caem no bichos.js (ex.: Dragonfox).
function anexoDe(chave, nivel = 1) {
  if (!tem(chave)) return Bichos.anexoDe(chave);
  const nome = `${chave}.gif`;
  return { url: `attachment://${nome}`, anexo: () => new AttachmentBuilder(gif(chave, nivel), { name: nome }) };
}

module.exports = { ESPECIES, def, tem, anexoDe, vitrine, gif, gradeCena, ell, poli, traco, px, ret, olho, paleta, W, H, SW, SH, QUADROS };
require('./petarte-especies');
// fim do arquivo
