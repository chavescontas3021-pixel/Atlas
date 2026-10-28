// Arte do personagem em pixel art (dark fantasy): peças em camadas, cores à escolha e cena animada.
// Tudo é desenhado por código, sem imagens: cada peça pinta uma grade de letras que depois vira GIF.
const { montar } = require('../extras/pixelgif');

const CW = 24; // largura do personagem
const CH = 36; // altura do personagem
const SW = 40; // largura da cena
const SH = 36; // altura da cena
const OX = 8; // onde o personagem fica na cena
const ESCALA = 6;

// ---------- Catálogo de opções ----------
const PELES = [
  { nome: 'Porcelana', hex: '#f2dccb' }, { nome: 'Clara', hex: '#e9bf9a' }, { nome: 'Morena', hex: '#c58d62' },
  { nome: 'Bronzeada', hex: '#a06a45' }, { nome: 'Escura', hex: '#6f432b' }, { nome: 'Cinzenta (morto-vivo)', hex: '#9aa3a8' },
  { nome: 'Pálida arroxeada', hex: '#b9a6c9' }, { nome: 'Esverdeada', hex: '#8fae7c' },
];
const OLHOS = [
  { nome: 'Vermelho sangue', hex: '#e8283c' }, { nome: 'Ciano gélido', hex: '#4fe3ff' }, { nome: 'Verde veneno', hex: '#5cff6a' },
  { nome: 'Dourado', hex: '#ffcf3d' }, { nome: 'Violeta', hex: '#b45cff' }, { nome: 'Branco espectral', hex: '#f4f4ff' },
  { nome: 'Laranja brasa', hex: '#ff8a2a' }, { nome: 'Rosa', hex: '#ff6fb5' },
];
const CABELOS = [
  { nome: 'Preto', hex: '#1b1722' }, { nome: 'Castanho', hex: '#4a2e22' }, { nome: 'Ruivo', hex: '#a8431f' }, { nome: 'Loiro', hex: '#d9b45a' },
  { nome: 'Branco', hex: '#ece8f2' }, { nome: 'Prata', hex: '#9aa6bd' }, { nome: 'Azul', hex: '#2f5fc8' }, { nome: 'Roxo', hex: '#6d3aa6' },
  { nome: 'Vinho', hex: '#6e1630' }, { nome: 'Verde', hex: '#2e7a4a' },
];
const TECIDOS = [
  { nome: 'Preto', hex: '#1d1a24' }, { nome: 'Cinza chumbo', hex: '#4a4856' }, { nome: 'Vinho', hex: '#6e1a30' }, { nome: 'Azul-noite', hex: '#1e2f5e' },
  { nome: 'Verde musgo', hex: '#2f4a32' }, { nome: 'Roxo sombrio', hex: '#47246e' }, { nome: 'Branco osso', hex: '#d9d3c2' }, { nome: 'Vermelho escarlate', hex: '#a81f2e' },
  { nome: 'Marrom couro', hex: '#5b3a24' }, { nome: 'Azul-gelo', hex: '#4a7fb0' }, { nome: 'Dourado', hex: '#c9a227' }, { nome: 'Verde-esmeralda', hex: '#1f7a55' },
];

const CATALOGO = {
  pele: { nome: 'Pele', emoji: '🧑', cores: PELES },
  olhos: { nome: 'Olhos e magia', emoji: '👁️', cores: OLHOS },
  cabelo: { nome: 'Cabelo', emoji: '💇', estilos: ['Curto', 'Longo', 'Moicano', 'Volumoso', 'Careca'], ids: ['curto', 'longo', 'moicano', 'volumoso', 'careca'], cores: CABELOS },
  roupa: { nome: 'Roupa', emoji: '🧥', estilos: ['Túnica', 'Armadura', 'Casaco longo'], ids: ['tunica', 'armadura', 'casaco'], cores: TECIDOS },
  calca: { nome: 'Calça', emoji: '👖', estilos: ['Comum', 'Cargo'], ids: ['comum', 'cargo'], cores: TECIDOS },
  botas: { nome: 'Botas', emoji: '🥾', cores: TECIDOS },
  capa: { nome: 'Capa', emoji: '🦇', estilos: ['Sem capa', 'Curta', 'Longa'], ids: ['nenhuma', 'curta', 'longa'], cores: TECIDOS },
  cabeca: { nome: 'Cabeça', emoji: '👑', estilos: ['Nada', 'Coroa dourada', 'Capuz', 'Chifres', 'Chapéu de bruxo'], ids: ['nenhum', 'coroa', 'capuz', 'chifres', 'chapeu'], cores: TECIDOS },
  mao: { nome: 'Mão (arma)', emoji: '⚔️', estilos: ['Vazia', 'Espada', 'Cajado', 'Arco', 'Tocha'], ids: ['nenhuma', 'espada', 'cajado', 'arco', 'tocha'] },
};
const PARTES = Object.keys(CATALOGO);

// Aparência padrão: um viajante de preto
const PADRAO = {
  pele: 1, olhos: 0,
  cabelo: { estilo: 'curto', cor: 0 }, roupa: { estilo: 'tunica', cor: 0 }, calca: { estilo: 'comum', cor: 1 },
  botas: { cor: 8 }, capa: { estilo: 'longa', cor: 2 }, cabeca: { estilo: 'nenhum', cor: 0 }, mao: { estilo: 'nenhuma' },
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const dentro = (n, lista) => (Number.isInteger(n) && n >= 0 && n < lista.length ? n : 0);

// Garante que qualquer coisa salva vire uma aparência válida
function normalizar(app) {
  const a = clone(PADRAO);
  if (!app || typeof app !== 'object') return a;
  a.pele = dentro(app.pele, PELES);
  a.olhos = dentro(app.olhos, OLHOS);
  for (const p of ['cabelo', 'roupa', 'calca', 'capa', 'cabeca', 'mao']) {
    const c = CATALOGO[p];
    const e = app[p] && c.ids.includes(app[p].estilo) ? app[p].estilo : a[p].estilo;
    a[p].estilo = e;
    if (c.cores) a[p].cor = dentro(app[p] && app[p].cor, c.cores);
  }
  a.botas.cor = dentro(app.botas && app.botas.cor, TECIDOS);
  if (app.especial && typeof app.especial === 'string') a.especial = app.especial;
  return a;
}

function aleatoria() {
  const sorte = (n) => Math.floor(Math.random() * n);
  const a = clone(PADRAO);
  a.pele = sorte(PELES.length);
  a.olhos = sorte(OLHOS.length);
  for (const p of ['cabelo', 'roupa', 'calca', 'capa', 'cabeca', 'mao']) {
    const c = CATALOGO[p];
    a[p].estilo = c.ids[sorte(c.ids.length)];
    if (c.cores) a[p].cor = sorte(c.cores.length);
  }
  a.botas.cor = sorte(TECIDOS.length);
  return a;
}

// ---------- Cores ----------
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const tom = (hex, f) => toHex(toRgb(hex).map((v) => (f < 1 ? v * f : v + (255 - v) * (f - 1))));
const escuro = (hex) => tom(hex, 0.66);
const claro = (hex) => tom(hex, 1.28);

// Letra de cada "encaixe" de cor -> cor real
function coresDe(app) {
  const pele = PELES[app.pele].hex;
  const olho = OLHOS[app.olhos].hex;
  const cab = CABELOS[app.cabelo.cor].hex;
  const rou = TECIDOS[app.roupa.cor].hex;
  const cal = TECIDOS[app.calca.cor].hex;
  const bot = TECIDOS[app.botas.cor].hex;
  const cap = TECIDOS[app.capa.cor].hex;
  const cbc = TECIDOS[app.cabeca.cor].hex;
  return {
    k: '#120d1a', // contorno
    s: pele, S: escuro(pele),
    h: cab, H: escuro(cab), j: claro(cab),
    t: rou, T: escuro(rou), y: claro(rou),
    p: cal, P: escuro(cal), q: claro(cal),
    b: bot, B: escuro(bot),
    c: cap, C: escuro(cap), d: claro(cap),
    u: cbc, U: escuro(cbc),
    e: olho,
    g: '#e3b93c', G: '#a8791c', i: '#fff0a6', // ouro
    l: '#c9d0dc', L: '#7d8699', // aço
    w: '#6b4426', W: '#432818', // madeira
    o: '#e8e0d0', O: '#b3a78f', // osso
    f: '#ffd24a', F: '#ff7a1c', // chama
    '*': '#ffffff',
    ...(app.__cores || {}),
  };
}

// ---------- Desenho ----------
const novo = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
function ret(g, x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < g.length && i >= 0 && i < g[0].length) g[j][i] = c;
}
const pt = (g, x, y, c) => ret(g, x, y, 1, 1, c);
function carimbo(g, x, y, linhas) {
  linhas.forEach((l, j) => [...l].forEach((c, i) => { if (c !== ' ' && c !== '.') pt(g, x + i, y + j, c); }));
}

function capa(g, estilo, dy, bal) {
  if (estilo === 'nenhuma') return;
  const topo = 13 + dy;
  const fundo = estilo === 'curta' ? 23 : 31;
  for (let y = topo; y <= fundo; y++) {
    const t = (y - topo) / (fundo - topo);
    const desl = t > 0.45 ? bal : 0;
    const e = Math.round(6 - 3.4 * t) + desl;
    const d = Math.round(17 + 3.4 * t) + desl;
    ret(g, e, y, d - e + 1, 1, 'c');
    pt(g, d, y, 'C'); pt(g, d - 1, y, 'C'); pt(g, e, y, 'd');
    if ((y - topo) % 4 === 2) { pt(g, e + 3, y, 'C'); pt(g, d - 4, y, 'C'); }
  }
  ret(g, 6 + (bal ? 1 : 0), fundo, 15, 1, 'C'); // barra
}

function pernas(g, estilo) {
  ret(g, 8, 22, 8, 7, 'p');
  ret(g, 11, 23, 2, 6, 'P'); // vão entre as pernas
  ret(g, 8, 22, 1, 7, 'q'); ret(g, 15, 22, 1, 7, 'P');
  if (estilo === 'cargo') {
    for (const x of [8, 14]) {
      ret(g, x, 24, 2, 3, 'P'); ret(g, x, 24, 2, 1, 'q'); // bolsos
      pt(g, x, 26, 'p');
    }
    ret(g, 8, 28, 4, 1, 'P'); ret(g, 12, 28, 4, 1, 'P'); // elástico do tornozelo
    ret(g, 8, 22, 8, 1, 'P'); // cós
  }
}

function botas(g) {
  for (const x0 of [8, 12]) {
    ret(g, x0, 29, 4, 2, 'b'); // cano
    ret(g, x0, 29, 4, 1, 'B');
  }
  ret(g, 7, 31, 5, 2, 'b'); ret(g, 12, 31, 5, 2, 'b'); // pé
  ret(g, 7, 33, 5, 1, 'B'); ret(g, 12, 33, 5, 1, 'B'); // sola
  pt(g, 8, 31, 'B'); pt(g, 15, 31, 'B'); // cadarço
  pt(g, 7, 32, 'B'); pt(g, 16, 32, 'B');
}

function tronco(g, estilo, dy) {
  const y0 = 13 + dy;
  if (estilo === 'casaco') {
    ret(g, 7, y0, 10, 13, 't');
    ret(g, 5, y0, 2, 9, 't'); ret(g, 17, y0, 2, 9, 't');
    ret(g, 11, y0, 2, 13, 'T'); // abertura
    ret(g, 11, y0 + 1, 2, 5, 'p'); // camisa por baixo
    ret(g, 7, y0, 1, 13, 'y'); ret(g, 16, y0, 1, 13, 'T');
    ret(g, 8, y0 - 1, 3, 2, 'T'); ret(g, 13, y0 - 1, 3, 2, 'T'); // gola alta
    ret(g, 7, y0 + 13 - 1, 10, 1, 'T');
    ret(g, 7, y0 + 7, 10, 1, 'w'); pt(g, 11, y0 + 7, 'g'); pt(g, 12, y0 + 7, 'g'); // cinto
    ret(g, 5, y0 + 8, 2, 1, 'T'); ret(g, 17, y0 + 8, 2, 1, 'T'); // punhos
  } else {
    const compr = estilo === 'tunica' ? 11 : 9;
    ret(g, 7, y0, 10, compr, 't');
    ret(g, 5, y0, 2, 8, 't'); ret(g, 17, y0, 2, 8, 't');
    ret(g, 7, y0, 1, 2, 'y'); ret(g, 7, y0 + 2, 1, 6, 'T'); ret(g, 7, y0 + 8, 1, compr - 8, 't'); ret(g, 16, y0, 1, compr, 'T');
    ret(g, 5, y0 + 7, 2, 1, 'T'); ret(g, 17, y0 + 7, 2, 1, 'T'); pt(g, 5, y0 + 1, 'y'); pt(g, 17, y0 + 1, 'y');
    ret(g, 7, y0 + compr - 1, 10, 1, 'T');
    ret(g, 7, y0 + 6, 10, 1, 'w'); pt(g, 11, y0 + 6, 'g'); pt(g, 12, y0 + 6, 'g'); // cinto
    if (estilo === 'armadura') {
      ret(g, 8, y0 + 1, 8, 5, 'l'); ret(g, 8, y0 + 1, 8, 1, 'k'); ret(g, 11, y0 + 1, 2, 5, 'L');
      pt(g, 9, y0 + 2, '*'); pt(g, 9, y0 + 3, '*');
      ret(g, 4, y0 - 1, 4, 3, 'l'); ret(g, 16, y0 - 1, 4, 3, 'l'); // ombreiras
      ret(g, 4, y0 + 1, 4, 1, 'L'); ret(g, 16, y0 + 1, 4, 1, 'L'); pt(g, 5, y0 - 1, '*'); pt(g, 17, y0 - 1, '*');
      ret(g, 5, y0 + 4, 2, 2, 'L'); ret(g, 17, y0 + 4, 2, 2, 'L'); // braçadeiras
    } else {
      ret(g, 10, y0, 4, 1, 'T'); // gola em V
      pt(g, 11, y0, 'S'); pt(g, 12, y0, 'S');
      ret(g, 11, y0 + 1, 2, 4, 'y'); pt(g, 11, y0 + 1, 'T'); pt(g, 12, y0 + 1, 'T'); // fecho
    }
  }
  const yh = y0 + 8; // mãos
  ret(g, 5, yh, 2, 2, 's'); ret(g, 17, yh, 2, 2, 's');
  pt(g, 5, yh + 1, 'S'); pt(g, 18, yh + 1, 'S');
}

function cabecaBase(g, dy, olhos, piscar) {
  ret(g, 11, 12 + dy, 2, 1, 'S'); // pescoço
  ret(g, 8, 5 + dy, 8, 6, 's'); ret(g, 9, 4 + dy, 6, 1, 's'); ret(g, 9, 11 + dy, 6, 1, 's');
  pt(g, 7, 8 + dy, 's'); pt(g, 16, 8 + dy, 's'); // orelhas
  pt(g, 8, 10 + dy, 'S'); pt(g, 15, 10 + dy, 'S'); pt(g, 9, 11 + dy, 'S'); pt(g, 14, 11 + dy, 'S');
  ret(g, 11, 10 + dy, 2, 1, 'S'); // boca
  pt(g, 12, 9 + dy, 'S'); // nariz
  for (const x of [10, 13]) {
    if (piscar) pt(g, x, 8 + dy, 'k');
    else { pt(g, x, 7 + dy, 'k'); pt(g, x, 8 + dy, 'e'); }
  }
}

function cabelo(g, estilo, dy) {
  if (estilo === 'careca') return;
  if (estilo === 'moicano') {
    ret(g, 11, 1 + dy, 2, 4, 'h'); ret(g, 10, 3 + dy, 4, 2, 'h'); pt(g, 11, 0 + dy, 'j'); pt(g, 12, 1 + dy, 'j');
    ret(g, 11, 5 + dy, 2, 1, 'H');
    return;
  }
  if (estilo === 'volumoso') {
    ret(g, 6, 2 + dy, 12, 4, 'h'); ret(g, 7, 1 + dy, 10, 1, 'h'); ret(g, 6, 5 + dy, 2, 5, 'h'); ret(g, 16, 5 + dy, 2, 5, 'h');
    ret(g, 9, 5 + dy, 6, 1, 'h'); ret(g, 6, 8 + dy, 2, 2, 'H'); ret(g, 16, 8 + dy, 2, 2, 'H');
    pt(g, 9, 2 + dy, 'j'); pt(g, 12, 1 + dy, 'j'); pt(g, 14, 3 + dy, 'j');
    return;
  }
  ret(g, 8, 3 + dy, 8, 2, 'h'); ret(g, 7, 4 + dy, 10, 1, 'h'); ret(g, 8, 5 + dy, 2, 1, 'h'); ret(g, 14, 5 + dy, 2, 1, 'h');
  ret(g, 11, 5 + dy, 2, 1, 'h'); // franja
  ret(g, 7, 5 + dy, 1, 3, 'h'); ret(g, 16, 5 + dy, 1, 3, 'h');
  pt(g, 9, 3 + dy, 'j'); pt(g, 10, 3 + dy, 'j'); pt(g, 13, 4 + dy, 'H');
  if (estilo === 'longo') {
    ret(g, 6, 5 + dy, 2, 10, 'h'); ret(g, 16, 5 + dy, 2, 10, 'h');
    ret(g, 6, 11 + dy, 1, 4, 'H'); ret(g, 17, 11 + dy, 1, 4, 'H');
    pt(g, 7, 8 + dy, 'j'); pt(g, 16, 8 + dy, 'j'); pt(g, 7, 13 + dy, 'j');
  }
}

function cabeca(g, estilo, dy) {
  if (estilo === 'coroa') {
    carimbo(g, 8, 0 + dy, ['g..gg..g', 'gg.gg.gg', 'gggggggg', 'GgigeigG']);
    pt(g, 11, 0 + dy, 'i'); pt(g, 12, 0 + dy, 'i'); pt(g, 9, 3 + dy, 'G'); pt(g, 14, 3 + dy, 'G');
  } else if (estilo === 'capuz') {
    ret(g, 7, 2 + dy, 10, 3, 'u'); ret(g, 6, 4 + dy, 12, 1, 'u'); ret(g, 8, 1 + dy, 8, 1, 'u');
    ret(g, 6, 5 + dy, 3, 9, 'u'); ret(g, 15, 5 + dy, 3, 9, 'u');
    ret(g, 6, 12 + dy, 12, 2, 'U'); ret(g, 8, 4 + dy, 8, 1, 'U');
    ret(g, 9, 5 + dy, 6, 1, 'U'); pt(g, 8, 6 + dy, 'U'); pt(g, 15, 6 + dy, 'U');
    pt(g, 9, 2 + dy, 'U'); pt(g, 14, 3 + dy, 'U');
  } else if (estilo === 'chifres') {
    for (const [x, y] of [[8, 4], [7, 3], [7, 2], [6, 1], [6, 0], [5, 0]]) { pt(g, x, y + dy, 'o'); pt(g, 23 - x, y + dy, 'o'); }
    for (const [x, y] of [[8, 3], [7, 1], [6, 2]]) { pt(g, x, y + dy, 'O'); pt(g, 23 - x, y + dy, 'O'); }
  } else if (estilo === 'chapeu') {
    ret(g, 4, 4 + dy, 16, 1, 'u'); ret(g, 3, 5 + dy, 18, 1, 'U');
    ret(g, 8, 3 + dy, 8, 1, 'u'); ret(g, 9, 2 + dy, 6, 1, 'u'); ret(g, 10, 1 + dy, 4, 1, 'u'); ret(g, 11, 0 + dy, 2, 1, 'u');
    pt(g, 13, -1 + dy, 'u'); pt(g, 14, 0 + dy, 'u');
    ret(g, 8, 3 + dy, 8, 1, 'U'); ret(g, 9, 3 + dy, 6, 1, 'g'); pt(g, 12, 3 + dy, 'i');
    ret(g, 9, 2 + dy, 1, 1, 'U');
  }
}

function arma(g, estilo, dy, fl) {
  if (estilo === 'espada') {
    ret(g, 20, 4, 1, 15, 'l'); ret(g, 21, 5, 1, 14, 'L'); pt(g, 20, 3, 'l'); pt(g, 20, 2, '*'); pt(g, 20, 5, '*'); pt(g, 20, 6, '*');
    ret(g, 18, 19 + dy, 5, 1, 'g'); pt(g, 18, 19 + dy, 'G'); pt(g, 22, 19 + dy, 'G');
    ret(g, 20, 20 + dy, 2, 3, 'w'); pt(g, 20, 21 + dy, 'W'); pt(g, 21, 23 + dy, 'g'); pt(g, 20, 23 + dy, 'g');
  } else if (estilo === 'cajado') {
    ret(g, 19, 4 + dy, 1, 30 - dy, 'w'); ret(g, 20, 6 + dy, 1, 28 - dy, 'W');
    ret(g, 18, 1 + dy, 3, 3, 'e'); pt(g, 18, 1 + dy, '*'); pt(g, 19, 2 + dy, '*');
    carimbo(g, 17, 0 + dy, ['g...g', 'g...g']); ret(g, 17, 3 + dy, 5, 1, 'g'); pt(g, 17, 4 + dy, 'G'); pt(g, 21, 4 + dy, 'G');
    pt(g, 17, 1 + dy, 'g'); pt(g, 21, 1 + dy, 'g');
    ret(g, 19, 9 + dy, 2, 1, 'g'); ret(g, 19, 16 + dy, 2, 1, 'G');
  } else if (estilo === 'arco') {
    for (let y = 8; y <= 28; y++) {
      const x = 20 + Math.round(2.4 * Math.sin(((y - 8) / 20) * Math.PI));
      pt(g, x, y + (y < 20 ? dy : 0), 'w'); pt(g, x - 1, y + (y < 20 ? dy : 0), 'W');
    }
    for (let y = 9; y <= 27; y++) pt(g, 19, y, '*');
    ret(g, 19, 19 + dy, 3, 3, 'w');
  } else if (estilo === 'tocha') {
    ret(g, 19, 16 + dy, 2, 10, 'w'); pt(g, 20, 17 + dy, 'W'); ret(g, 19, 16 + dy, 2, 1, 'W');
    if (fl) carimbo(g, 18, 10 + dy, [' F f F', ' FffFf', 'FfffF ', ' FfF  ']);
    else carimbo(g, 18, 10 + dy, ['  F F ', ' FfffF', ' FffF ', '  Ff  ']);
    pt(g, 20, 13 + dy, '*'); pt(g, 19, 14 + dy, 'i');
  }
}

// Monta o personagem inteiro (com contorno automático) numa grade de letras
function desenharPersonagem(app, f = {}) {
  const dy = f.dy || 0;
  const g = novo(CW, CH);
  capa(g, app.capa.estilo, dy, f.bal || 0);
  pernas(g, app.calca.estilo);
  botas(g);
  tronco(g, app.roupa.estilo, dy);
  cabecaBase(g, dy, app.olhos, !!f.piscar);
  cabelo(g, app.cabelo.estilo, dy);
  cabeca(g, app.cabeca.estilo, dy);
  arma(g, app.mao.estilo, dy, f.chama || 0);
  // contorno: toda casa vazia colada em algo vira o traço escuro
  const base = g.map((l) => l.slice());
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (base[y][x] !== '.') continue;
      const v = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => base[y + b] && base[y + b][x + a] && base[y + b][x + a] !== '.');
      if (v) g[y][x] = 'k';
    }
  }
  return g;
}

// ---------- Cena ----------
const CEU = ['#0b0818', '#110c26', '#171033', '#1f1544', '#2a1c58'];
const ESTRELAS = [[3, 2], [9, 5], [14, 1], [20, 4], [25, 2], [37, 12], [5, 10], [17, 8], [34, 3], [12, 12], [27, 9]];

function fundo(frame) {
  const g = Array.from({ length: SH }, () => Array(SW).fill('#000000'));
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = CEU[Math.min(CEU.length - 1, Math.floor(y / 6))];
  ESTRELAS.forEach(([x, y], i) => { g[y][x] = (i + frame) % 3 === 0 ? '#8f86c4' : '#ddd8f5'; });
  // lua
  const lx = 31;
  const ly = 8;
  for (let y = -6; y <= 6; y++) {
    for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x, y);
      if (d <= 4.2) g[ly + y][lx + x] = '#eae6f4';
      else if (d <= 5.4 && (x + y + 20) % 2 === 0) g[ly + y][lx + x] = '#3a2d6a';
    }
  }
  for (const [x, y] of [[-1, -1], [1, 1], [-2, 1], [2, -2]]) g[ly + y][lx + x] = '#c6bedb';
  // montanhas
  for (let x = 0; x < SW; x++) {
    const h1 = 21 + Math.round(2.6 * Math.sin(x * 0.45) + 1.6 * Math.sin(x * 1.1 + 1));
    for (let y = h1; y < 31; y++) g[y][x] = '#1a1230';
    const h2 = 25 + Math.round(1.8 * Math.sin(x * 0.7 + 2) + 1.2 * Math.sin(x * 1.7));
    for (let y = h2; y < 31; y++) g[y][x] = '#120c22';
  }
  // castelo distante
  const cor = '#0a0614';
  for (const [x, y, w, h] of [[2, 17, 3, 9], [6, 19, 2, 7], [9, 15, 3, 11], [4, 22, 5, 5]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (const [x, y] of [[2, 16], [4, 16], [6, 18], [7, 18], [9, 14], [11, 14]]) g[y][x] = cor;
  g[16][10] = frame % 2 ? '#f2c15a' : '#a8812e';
  g[20][3] = '#f2c15a';
  // chão
  for (let y = 31; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = y === 31 ? '#3a3050' : y === 32 ? '#2a2238' : '#1c1628';
  for (let x = 0; x < SW; x += 1) { if ((x * 7 + 3) % 11 === 0) g[33][x] = '#2e2644'; if ((x * 5 + 1) % 9 === 0) g[34][x] = '#241d36'; }
  // neblina que se move
  for (let y = 28; y <= 31; y++) for (let x = 0; x < SW; x++) if ((x + y * 2 + frame * 2) % 5 === 0) g[y][x] = '#40366a';
  // brilho fraco atrás do personagem, para destacar a silhueta
  for (let y = 0; y < 34; y++) {
    for (let x = 0; x < SW; x++) {
      const d = Math.hypot((x - (OX + 12)) / 12, (y - 18) / 17);
      if (d < 0.78 && (d < 0.55 || (x + y) % 2 === 0)) g[y][x] = y > 30 ? g[y][x] : '#2b2150';
    }
  }
  // sombra do personagem
  for (let x = OX + 7; x <= OX + 17; x++) g[35][x] = '#0c0813';
  for (let x = OX + 9; x <= OX + 15; x++) g[34][x] = '#0c0813';
  return g;
}

const QUADROS = [
  { dy: 0, bal: 0, piscar: false, chama: 0 },
  { dy: 1, bal: 1, piscar: false, chama: 1 },
  { dy: 0, bal: 0, piscar: true, chama: 0 },
  { dy: 1, bal: 1, piscar: false, chama: 1 },
];

function gradeCena(app, i, extra) {
  const cores = coresDe(app);
  const g = fundo(i);
  const p = (extra && extra.personagem) ? extra.personagem(app, QUADROS[i]) : desenharPersonagem(app, QUADROS[i]);
  for (let y = 0; y < p.length; y++) {
    for (let x = 0; x < p[0].length; x++) {
      const c = p[y][x];
      if (c !== '.' && cores[c]) g[y][OX + x] = cores[c];
    }
  }
  return g;
}

function gifDe(app, extra) {
  const a = normalizar(app);
  return montar(QUADROS.map((_, i) => gradeCena(a, i, extra)), { escala: ESCALA, atraso: 42 });
}

module.exports = { CW, CH, SW, SH, OX, CATALOGO, PARTES, PADRAO, PELES, OLHOS, CABELOS, TECIDOS, normalizar, aleatoria, coresDe, desenharPersonagem, gradeCena, gifDe, fundo, QUADROS, novo, ret, pt, carimbo, escuro, claro, tom };
// fim do arquivo
