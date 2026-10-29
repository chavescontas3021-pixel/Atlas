// Personagens especiais (únicos): desenhados à mão, em tela maior e com muito mais detalhe.
// O primeiro é o REI: roupas pretas, calça cargo, botas, coroa dourada, capa de pele de tigre albino e cajado.
const { montar } = require('../extras/pixelgif');
const Arte = require('./arte');

const { novo, ret: R, pt: P, carimbo: S, escuro, claro } = Arte;

const CW = 32; // largura do personagem
const CH = 46; // altura do personagem
const SW = 48; // largura da cena
const SH = 50; // altura da cena
const OX = 8; // posição do personagem na cena
const OY = 3;
const ESCALA = 5;

// desenha em dois lados ao mesmo tempo (espelhado em torno do centro, colunas 0..31)
const Rm = (g, x, y, w, h, c) => { R(g, x, y, w, h, c); R(g, CW - x - w, y, w, h, c); };
const Pm = (g, x, y, c) => Rm(g, x, y, 1, 1, c);

// ---------- Capa de pele de tigre albino ----------
function capa(g, dy, bal) {
  const topo = 18 + dy;
  const fim = 36;
  const borda = (y) => {
    const t = (y - topo) / (fim - topo);
    const e = Math.round(6 - 2 * t) - (t > 0.5 ? bal : 0);
    return [e, CW - 1 - e];
  };
  for (let y = topo; y <= fim; y++) {
    const [e, d] = borda(y);
    R(g, e, y, d - e + 1, 1, 'f');
    R(g, d - 2, y, 3, 1, 'F'); // lado na sombra
    R(g, e, y, 1, 1, 'w'); // luz da borda esquerda
    if (y % 5 === 2) { P(g, e - 1, y, 'f'); P(g, d + 1, y, 'F'); } // pelos soltos
    if (y % 5 === 4) { P(g, e - 1, y, 'F'); }
  }
  // dobras: duas linhas suaves de cada lado
  for (let y = topo + 8; y <= fim; y += 1) {
    const [e, d] = borda(y);
    if (y % 4 !== 0) { P(g, e + 3, y, 'F'); P(g, d - 5, y, 'D'); }
  }
  // barra de pelos em dentes
  const [e, d] = borda(fim);
  for (let x = e; x <= d; x++) {
    const dente = (x * 5 + 1) % 4;
    R(g, x, fim + 1, 1, dente < 2 ? 2 : 1, dente === 0 ? 'F' : 'f');
  }
  // listras de tigre: pretas, grossas na borda e afinando para dentro
  const listras = [[22, 5], [26, 6], [30, 5]];
  listras.forEach(([y0, len], i) => {
    for (const lado of [0, 1]) {
      const yy = y0 + (lado ? 2 : 0);
      const [eb, db] = borda(yy);
      for (let k = 0; k < len; k++) {
        const x = lado ? db - k : eb + k;
        const y = yy + Math.floor(k * 0.5);
        const espessura = k < 3 ? 2 : 1;
        for (let t = 0; t < espessura; t++) P(g, x, y + t, k === len - 1 ? 'A' : 'a');
      }
    }
  });
}

// ---------- Manto de pele nos ombros (gola e lapelas da frente) ----------
function manto(g, dy) {
  // gola alta de pelos e ombros
  const linhas = [[10, 21], [8, 23], [6, 25], [5, 26]];
  linhas.forEach(([a, b], i) => {
    const y = 17 + i + dy;
    R(g, a, y, b - a + 1, 1, 'f');
    R(g, b - 1, y, 2, 1, 'F');
    P(g, a, y, 'w');
    if (i === 0) for (let x = a; x <= b; x += 3) P(g, x, y - 1, 'f');
    if (i > 0) { P(g, a - 1, y, 'f'); P(g, b + 1, y, 'F'); }
  });
  // lapelas de pele descendo pela frente (4 de largura, borda interna em dentes)
  for (let i = 0; i < 11; i++) {
    const y = 21 + i + dy;
    const larg = i < 8 ? 4 : 3 - (i - 8);
    Rm(g, 8 + (i > 7 ? 1 : 0), y, Math.max(1, larg), 1, 'f');
    if (i % 3 === 1) Pm(g, 8, y, 'w');
    if (i % 2) Pm(g, 8 + larg, y, 'f'); // dente da borda interna
  }
  P(g, 11, 31 + dy, 'F'); P(g, 20, 31 + dy, 'F');
  // lado na sombra das lapelas
  R(g, 11, 22 + dy, 1, 7, 'F'); R(g, 23, 22 + dy, 1, 7, 'F');
  // listras do manto
  const ls = [[6, 18], [10, 19], [12, 22], [8, 25], [9, 28]];
  ls.forEach(([x, y]) => {
    for (let k = 0; k < 3; k++) { P(g, x + k, y + dy + (k > 1 ? 1 : 0), k === 2 ? 'A' : 'a'); P(g, CW - 1 - x - k, y + dy + 1 + (k > 1 ? 1 : 0), k === 2 ? 'A' : 'a'); }
  });
  // corrente de ouro entre as lapelas, com broches de rubi
  [[12, 23], [13, 24], [14, 24], [15, 25], [16, 25], [17, 24], [18, 24], [19, 23]].forEach(([x, y]) => P(g, x, y + dy, (x + y) % 2 ? 'g' : 'G'));
  Rm(g, 11, 22 + dy, 2, 2, 'g'); Pm(g, 11, 22 + dy, 'i'); Pm(g, 12, 23 + dy, 'r');
}

// ---------- Corpo ----------
function torso(g, dy) {
  const y0 = 18 + dy;
  // jaqueta preta
  R(g, 9, y0, 14, 14, 'b');
  Rm(g, 6, y0, 3, 12, 'b'); // mangas
  R(g, 9, y0 + 14, 14, 1, 'B');
  // luz da esquerda e sombra da direita
  R(g, 9, y0, 1, 14, 'n'); R(g, 6, y0 + 1, 1, 10, 'n');
  R(g, 22, y0, 1, 14, 'B'); R(g, 25, y0 + 1, 1, 10, 'B');
  // gola alta e botões
  R(g, 12, y0 - 1, 8, 2, 'm'); R(g, 12, y0 - 1, 8, 1, 'g'); P(g, 12, y0 - 1, 'i');
  R(g, 15, y0 + 1, 2, 13, 'B');
  for (const y of [3, 6, 9, 12]) { P(g, 15, y0 + y, 'g'); P(g, 16, y0 + y, 'G'); }
  // dobras da jaqueta
  R(g, 11, y0 + 3, 1, 5, 'm'); R(g, 20, y0 + 3, 1, 5, 'B'); R(g, 12, y0 + 9, 2, 1, 'm'); R(g, 19, y0 + 9, 2, 1, 'B');
  // cinto com fivela dourada
  R(g, 9, y0 + 11, 14, 2, 'u'); R(g, 14, y0 + 10, 4, 4, 'G'); R(g, 15, y0 + 11, 2, 2, 'g'); P(g, 15, y0 + 11, 'i');
  // punhos dourados e luvas
  Rm(g, 6, y0 + 10, 3, 1, 'g'); Pm(g, 6, y0 + 10, 'i');
  Rm(g, 6, y0 + 11, 3, 3, 'B'); Rm(g, 6, y0 + 11, 1, 3, 'n');
  Pm(g, 8, y0 + 13, 'm');
  // ombros: ombreiras de ouro pequenas sob o manto
  Pm(g, 6, y0, 'G');
}

function cabeca(g, dy, olhos, piscar) {
  const y = 7 + dy;
  // pescoço e rosto
  R(g, 13, y + 10, 6, 1, 'S');
  R(g, 11, y, 10, 9, 's'); R(g, 12, y + 9, 8, 1, 's'); R(g, 13, y + 10, 6, 1, 'S');
  Rm(g, 11, y + 5, 1, 3, 'S'); // lados do rosto na sombra
  Pm(g, 12, y + 8, 'S');
  Pm(g, 10, y + 4, 's'); Pm(g, 10, y + 5, 'S'); // orelhas
  // cabelo curto: franja irregular e costeletas (a coroa cobre o topo)
  R(g, 11, y, 10, 2, 'h');
  Rm(g, 11, y + 2, 2, 1, 'h'); Pm(g, 11, y + 3, 'h'); Pm(g, 11, y + 4, 'H');
  P(g, 14, y + 2, 'h'); P(g, 17, y + 2, 'h'); P(g, 15, y + 1, 'H'); P(g, 16, y + 1, 'H');
  P(g, 13, y, 'j'); P(g, 17, y, 'j');
  // sobrancelhas grossas e sérias
  R(g, 13, y + 3, 3, 1, 'H'); R(g, 17, y + 3, 3, 1, 'H'); P(g, 15, y + 3, 'S'); P(g, 16, y + 3, 'S');
  // olhos
  for (const x of [13, 18]) {
    if (piscar) R(g, x, y + 5, 2, 1, 'E');
    else { R(g, x, y + 4, 2, 1, 'E'); P(g, x, y + 5, 'e'); P(g, x + 1, y + 5, 'M'); }
  }
  // nariz e boca
  P(g, 15, y + 5, 'S'); P(g, 16, y + 6, 'S'); P(g, 15, y + 6, 'S');
  R(g, 14, y + 8, 4, 1, 'S');
}

function coroa(g, dy) {
  const y = dy;
  S(g, 10, y + 0, ['.....ii.....']);
  S(g, 10, y + 1, ['.g...gg...g.']);
  S(g, 10, y + 2, ['.gg.gggg.gg.']);
  S(g, 10, y + 3, ['.gggggggggg.']);
  S(g, 10, y + 4, ['gggggggggggg']);
  S(g, 10, y + 5, ['GgNggrrggNgG']);
  S(g, 10, y + 6, ['GGGGGGGGGGGG']);
  // brilhos e sombras no ouro
  for (const [x, yy] of [[11, 1], [11, 2], [12, 3], [14, 3], [16, 3], [11, 4], [13, 4]]) P(g, x, y + yy, 'i');
  for (const [x, yy] of [[20, 2], [20, 3], [19, 3], [18, 4], [20, 4], [21, 4]]) P(g, x, y + yy, 'Y');
  P(g, 16, y + 5, 'R'); P(g, 15, y + 5, 'r'); P(g, 15, y + 4, 'w');
  P(g, 11, y + 5, 'q'); P(g, 20, y + 5, 'q');
  P(g, 12, y + 5, 'N'); P(g, 19, y + 5, 'N');
}

function calca(g) {
  const y0 = 31;
  R(g, 10, y0, 12, 8, 'p');
  R(g, 15, y0 + 1, 2, 7, 'P'); // vão entre as pernas
  R(g, 10, y0, 1, 8, 'o'); R(g, 21, y0, 1, 8, 'P');
  // bolsos cargo com aba, costuras e botão
  for (const x0 of [10, 18]) {
    R(g, x0 + 1, y0 + 2, 4, 4, 'P'); R(g, x0 + 1, y0 + 2, 4, 1, 'o');
    R(g, x0 + 1, y0 + 3, 4, 2, 'p'); P(g, x0 + 2, y0 + 3, 'x'); P(g, x0 + 3, y0 + 3, 'x');
    for (const xx of [x0 + 1, x0 + 3]) P(g, xx, y0 + 5, 'z');
    P(g, x0 + 5, y0 + 3, 'z'); P(g, x0, y0 + 3, 'z');
  }
  // correias com fivela no joelho
  Rm(g, 10, y0 + 6, 5, 1, 'u'); Pm(g, 12, y0 + 6, 'x');
  R(g, 10, y0 + 7, 12, 1, 'P'); // elástico do tornozelo
  // vincos
  P(g, 12, y0 + 1, 'z'); P(g, 19, y0 + 1, 'z'); P(g, 11, y0 + 6, 'o');
}

function botas(g) {
  for (const x0 of [10, 16]) {
    R(g, x0, 38, 6, 4, 'u'); R(g, x0, 38, 6, 1, 'v'); // cano
    R(g, x0 + 2, 39, 2, 3, 'U'); // língua
    for (const [dx, dy] of [[1, 39], [4, 39], [1, 41], [4, 41]]) P(g, x0 + dx, dy, 'x');
    P(g, x0 + 2, 40, 'v'); P(g, x0 + 3, 40, 'v'); P(g, x0 + 2, 39, 'v'); // cadarço cruzado
    R(g, x0, 42, 6, 1, 'u'); // base
  }
  // bico e sola grossa
  R(g, 8, 41, 8, 2, 'u'); R(g, 16, 41, 8, 2, 'u');
  R(g, 8, 41, 2, 1, 'v'); R(g, 22, 41, 2, 1, 'v');
  R(g, 8, 43, 8, 1, 'U'); R(g, 16, 43, 8, 1, 'U');
  P(g, 12, 38, 'x'); P(g, 19, 38, 'x');
  R(g, 10, 40, 1, 2, 'v');
}

// ---------- Cajado com orbe ----------
function cajado(g, dy, brilho) {
  // haste
  R(g, 27, 8 + dy, 1, 36 - dy, 'T'); R(g, 28, 8 + dy, 1, 36 - dy, 't');
  for (const y of [13, 21, 33]) { R(g, 26, y + dy, 4, 1, 'g'); R(g, 26, y + dy + 1, 4, 1, 'G'); P(g, 26, y + dy, 'i'); }
  R(g, 27, 41, 2, 3, 'G'); P(g, 27, 41, 'g');
  // berço de ouro
  S(g, 25, 5 + dy, ['g.gggg.g']);
  S(g, 25, 6 + dy, ['gGg..gGg'.replace(/\./g, 'e')]);
  S(g, 26, 7 + dy, ['.GggG.']);
  S(g, 27, 8 + dy, ['gg']);
  // orbe
  const cor = brilho ? 'l' : 'e';
  const sombra = brilho ? 'e' : 'M';
  S(g, 25, 0 + dy, [
    '..eeee..',
    '.eewwee.',
    'eewleeee',
    'eeeeeeee',
    'eeeeeMMe',
    '.eeMMMe.',
  ].map((l) => l.replace(/e/g, cor).replace(/M/g, sombra)));
  P(g, 27, 1 + dy, 'w'); P(g, 28, 1 + dy, 'w');
}

// mão enluvada segurando a haste
function maoNoCajado(g, dy) {
  const y = 28 + dy;
  R(g, 24, y, 5, 3, 'B'); R(g, 24, y, 5, 1, 'n');
  P(g, 27, y + 1, 'm'); P(g, 28, y + 1, 'm'); P(g, 29, y + 1, 'B'); P(g, 29, y, 'B'); P(g, 29, y + 2, 'B');
  for (const x of [25, 26, 27, 28]) P(g, x, y + 2, 'B');
}

function reiPersonagem(app, f = {}) {
  const dy = f.dy || 0;
  const g = novo(CW, CH);
  capa(g, dy, f.bal || 0);
  cajado(g, dy, f.brilho);
  calca(g);
  botas(g);
  torso(g, dy);
  manto(g, dy);
  cabeca(g, dy, app.olhos, !!f.piscar);
  coroa(g, dy);
  maoNoCajado(g, dy);
  // contorno automático
  const base = g.map((l) => l.slice());
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (base[y][x] !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => base[y + b] && base[y + b][x + a] && base[y + b][x + a] !== '.')) g[y][x] = 'k';
    }
  }
  return g;
}

// ---------- Cores do rei (as da pessoa entram na pele, no cabelo e nos olhos) ----------
function coresRei(app) {
  const c = Arte.coresDe(app);
  const olho = Arte.OLHOS[app.olhos].hex;
  return {
    k: '#0d0912', s: c.s, S: c.S, h: c.h, H: c.H, j: c.j, e: olho, l: claro(olho), M: escuro(olho), E: '#120d1a',
    g: '#f2c230', G: '#a8731a', i: '#fff4b8', Y: '#d99a22', N: '#3b6bff', q: '#9fc0ff', v: '#8a86a0', r: '#e0283c', R: '#7d1020',
    b: '#1d1b25', B: '#100e16', n: '#383545', m: '#2a2833', u: '#2a2636', U: '#0a080e', x: '#9aa0b4', z: '#555268',
    p: '#34323f', P: '#1c1a24', o: '#4d4a5e',
    w: '#ffffff',
    f: '#f6f3ee', F: '#d6d9e4', D: '#aab1c8', a: '#26262f', A: '#55556a',
    W: '#2c1b12', T: '#6b4630', t: '#2f1d13',
  };
}
// 'w' é usado como branco brilhante (pelos e orbe) e também como madeira escura do cajado; separamos:
const MADEIRA = '#4a3022';

// ---------- Cena do castelo em ruínas ----------
function cena(frame) {
  const g = Array.from({ length: SH }, () => Array(SW).fill('#000000'));
  const ceu = ['#0a0716', '#0f0b24', '#150e30', '#1d1342', '#281a56', '#331f66'];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = ceu[Math.min(ceu.length - 1, Math.floor(y / 8))];
  const est = [[3, 2], [9, 6], [15, 1], [22, 4], [29, 2], [44, 14], [6, 12], [19, 10], [40, 3], [12, 15], [33, 8], [26, 13], [46, 7], [1, 18]];
  est.forEach(([x, y], i) => { g[y][x] = (i + frame) % 3 === 0 ? '#8f86c4' : '#e6e1ff'; });
  // lua grande
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    const d = Math.hypot(x, y);
    const X = 38 + x; const Y = 10 + y;
    if (d <= 5) g[Y][X] = '#eee9f7'; else if (d <= 6.4 && (x + y + 30) % 2 === 0) g[Y][X] = '#3a2d6a';
  }
  for (const [x, y] of [[-1, -1], [1, 1], [-2, 1], [2, -2], [0, 3], [-3, -2]]) g[10 + y][38 + x] = '#c6bedb';
  // montanhas
  for (let x = 0; x < SW; x++) {
    const h1 = 26 + Math.round(3 * Math.sin(x * 0.4) + 1.8 * Math.sin(x * 1.1 + 1));
    for (let y = h1; y < 44; y++) g[y][x] = '#1a1230';
    const h2 = 31 + Math.round(2 * Math.sin(x * 0.7 + 2) + 1.3 * Math.sin(x * 1.7));
    for (let y = h2; y < 44; y++) g[y][x] = '#120c22';
  }
  // castelo
  const cor = '#0a0614';
  for (const [x, y, w, h] of [[1, 20, 4, 14], [6, 24, 3, 10], [10, 17, 4, 17], [3, 29, 8, 6], [15, 27, 3, 7]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (const [x, y] of [[1, 19], [3, 19], [6, 23], [8, 23], [10, 16], [12, 16], [13, 16]]) g[y][x] = cor;
  g[16][11] = '#0a0614'; g[22][2] = frame % 2 ? '#f2c15a' : '#b8892f'; g[21][12] = '#f2c15a'; g[27][7] = '#b8892f';
  // chão de pedra
  for (let y = 44; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = y === 44 ? '#3a3050' : y === 45 ? '#2a2238' : '#1c1628';
  for (let y = 46; y < SH; y++) for (let x = 0; x < SW; x++) if ((x + y * 3) % 12 === 0) g[y][x] = '#2e2644';
  // neblina rasteira
  for (let y = 40; y <= 44; y++) for (let x = 0; x < SW; x++) if ((x + y * 2 + frame * 2) % 5 === 0) g[y][x] = '#40366a';
  // brasas: dois braseiros com fogo
  for (const bx of [2, 44]) {
    R(g, bx, 41, 3, 1, '#2a2030'); R(g, bx + 1, 42, 1, 3, '#2a2030'); R(g, bx - 1, 44, 5, 1, '#2a2030');
    const f1 = frame % 2 ? ['#ffd24a', '#ff7a1c', '#c43c10'] : ['#ff7a1c', '#ffd24a', '#c43c10'];
    P(g, bx + 1, 40, f1[0]); P(g, bx, 40, f1[1]); P(g, bx + 2, 40, f1[1]); P(g, bx + 1, 39, f1[1]); P(g, bx + (frame % 2 ? 1 : 2), 38, f1[2]);
  }
  // brilho atrás do rei
  for (let y = 0; y < 44; y++) for (let x = 0; x < SW; x++) {
    const d = Math.hypot((x - (OX + 16)) / 15, (y - 23) / 22);
    if (d < 0.8 && (d < 0.58 || (x + y) % 2 === 0)) g[y][x] = '#2b2150';
  }
  // chão iluminado sob o rei
  for (let y = 44; y < SH; y++) for (let x = 0; x < SW; x++) {
    const d = Math.hypot((x - (OX + 16)) / 14, (y - 46) / 4.2);
    if (d < 1 && (d < 0.7 || (x + y) % 2 === 0)) g[y][x] = '#4a3f68';
  }
  // sombra
  for (let x = OX + 8; x <= OX + 24; x++) g[49][x] = '#0c0813';
  for (let x = OX + 10; x <= OX + 22; x++) g[48][x] = '#0c0813';
  return g;
}

const QUADROS = [
  { dy: 0, bal: 0, piscar: false, brilho: false },
  { dy: 1, bal: 1, piscar: false, brilho: true },
  { dy: 0, bal: 0, piscar: true, brilho: true },
  { dy: 1, bal: 1, piscar: false, brilho: false },
];
// fagulhas mágicas ao redor do orbe (mudam a cada quadro)
const FAGULHAS = [[[33, 4], [31, 9]], [[34, 7], [30, 2]], [[32, 1], [34, 10]], [[30, 8], [33, 5]]];

function gradeRei(app, i) {
  const cores = coresRei(app);
  const g = cena(i);
  const p = reiPersonagem(app, QUADROS[i]);
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      const c = p[y][x];
      if (c === '.') continue;
      let cor = cores[c];
      if (c === 'W') cor = MADEIRA;
      if (cor) g[OY + y][OX + x] = cor;
    }
  }
  for (const [x, y] of FAGULHAS[i]) g[OY + y + QUADROS[i].dy][OX + x] = i % 2 ? cores.l : '#ffffff';
  return g;
}

function gifRei(app) {
  return montar([0, 1, 2, 3].map((i) => gradeRei(app, i)), { escala: ESCALA, atraso: 42 });
}

const ESPECIAIS = {
  rei: { nome: 'O Rei de Pele Branca', emoji: '👑', grade: gradeRei, gif: gifRei, sprite: reiPersonagem, cores: coresRei, quadros: QUADROS },
};

module.exports = { ESPECIAIS, gradeRei, gifRei, CW, CH, SW, SH };
// fim do arquivo
