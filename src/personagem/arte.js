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
// Sombras puxam para o violeta e luzes para o quente (em vez de só escurecer/clarear): é o que dá "vida" ao pixel art.
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const tom = (hex, f) => toHex(toRgb(hex).map((v) => (f < 1 ? v * f : v + (255 - v) * (f - 1))));
const mistura = (a, b, f) => { const x = toRgb(a); const y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); };
const escuro = (hex) => mistura(tom(hex, 0.72), '#2a1560', 0.17);
const claro = (hex) => mistura(tom(hex, 1.24), '#fff0c4', 0.15);
const contorno = (hex) => mistura(tom(hex, 0.34), '#0c0614', 0.4); // traço escuro com um toque da cor da peça
const brilho = (hex) => mistura(tom(hex, 1.14), '#8f84d8', 0.2); // luz fria da lua na borda direita

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
  const m = {
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
  // Variantes automáticas: "@x" = contorno colorido ao lado da peça x; "^x" = borda iluminada pela lua
  const SEM_BORDA = new Set(['k', '*', 'i', 'f', 'F', 'e']);
  const SEM_LUZ = new Set(['s', 'S']); // a pele não leva borda de luz (fica estranha)
  for (const L of Object.keys(m)) {
    if (SEM_BORDA.has(L)) continue;
    m[`@${L}`] = contorno(m[L]);
    if (!SEM_LUZ.has(L)) m[`^${L}`] = brilho(m[L]);
  }
  return m;
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

// A luz vem da lua (direita): lado esquerdo na sombra, lado direito iluminado.
function capa(g, estilo, dy, bal) {
  if (estilo === 'nenhuma') return;
  const topo = 13 + dy;
  const fundo = estilo === 'curta' ? 23 : 31;
  for (let y = topo; y <= fundo; y++) {
    const t = (y - topo) / (fundo - topo);
    const desl = t > 0.45 ? Math.round(bal * Math.min(1, (t - 0.45) * 2.2)) : 0; // a barra balança mais que o ombro
    const e = Math.round(6 - 3.4 * t) + desl;
    const d = Math.round(17 + 3.4 * t) + desl;
    ret(g, e, y, d - e + 1, 1, 'c');
    pt(g, e, y, 'C'); pt(g, e + 1, y, 'C'); pt(g, d, y, 'd');
    if ((y - topo) % 4 === 2) { pt(g, e + 3, y, 'C'); pt(g, d - 4, y, 'C'); pt(g, d - 3, y, 'd'); }
  }
  ret(g, 6 + Math.round(bal), fundo, 15, 1, 'C'); // barra
}

function pernas(g, estilo) {
  for (const x0 of [8, 13]) {
    ret(g, x0, 22, 3, 7, 'p');
    ret(g, x0, 22, 1, 7, 'P'); // lado da sombra
    ret(g, x0 + 2, 22, 1, 7, 'q'); // lado da luz
  }
  ret(g, 11, 22, 2, 3, 'P'); // entreperna (embaixo fica vazio: o contorno separa as pernas)
  if (estilo === 'cargo') {
    for (const x of [8, 13]) {
      ret(g, x, 24, 2, 3, 'P'); ret(g, x, 24, 2, 1, 'q'); // bolsos
      pt(g, x, 26, 'p');
      ret(g, x, 28, 3, 1, 'P'); // elástico do tornozelo
    }
    ret(g, 8, 22, 8, 1, 'P'); // cós
  }
}

function botas(g) {
  for (const x0 of [8, 13]) {
    ret(g, x0, 29, 3, 2, 'b'); // cano
    ret(g, x0, 29, 3, 1, 'B');
  }
  ret(g, 6, 31, 5, 2, 'b'); ret(g, 13, 31, 5, 2, 'b'); // pés com a ponta para fora
  ret(g, 6, 33, 5, 1, 'B'); ret(g, 13, 33, 5, 1, 'B'); // sola
  pt(g, 6, 32, 'B'); pt(g, 17, 32, 'B'); // biqueira
  pt(g, 9, 31, 'B'); pt(g, 14, 31, 'B'); // cadarço
  pt(g, 10, 32, 'B'); pt(g, 13, 32, 'B');
}

// Forma do corpo: ombros largos, cintura mais fina e saia que abre de novo
function corpo(g, y0, compr, flare) {
  for (let r = 0; r < compr; r++) {
    let xl = 7; let xr = 16;
    if (r >= 4 && r <= 6) { xl = 8; xr = 15; }
    if (r >= 7) { xl = flare && r >= compr - 2 ? 7 : 8; xr = flare && r >= compr - 2 ? 16 : 15; }
    ret(g, xl, y0 + r, xr - xl + 1, 1, 't');
    pt(g, xl, y0 + r, 'T'); // sombra à esquerda
    pt(g, xr, y0 + r, 'y'); // luz à direita
  }
}

function tronco(g, estilo, dy) {
  const y0 = 13 + dy;
  const compr = estilo === 'casaco' ? 13 : estilo === 'tunica' ? 11 : 9;
  corpo(g, y0, compr, estilo !== 'armadura');

  // braços
  ret(g, 5, y0, 2, 8, 't'); ret(g, 17, y0, 2, 8, 't');
  ret(g, 5, y0, 1, 8, 'T'); ret(g, 18, y0, 1, 8, 'y');
  ret(g, 5, y0 + 7, 2, 1, 'T'); ret(g, 17, y0 + 7, 2, 1, 'T'); // punhos
  pt(g, 18, y0 + 7, 'y');

  if (estilo === 'casaco') {
    ret(g, 11, y0, 2, 13, 'T'); // abertura
    ret(g, 11, y0 + 1, 2, 5, 'p'); // camisa por baixo
    ret(g, 8, y0 - 1, 3, 2, 'T'); ret(g, 13, y0 - 1, 3, 2, 'T'); pt(g, 15, y0 - 1, 'y'); // gola alta
    ret(g, 7, y0 + 12, 10, 1, 'T');
    ret(g, 8, y0 + 7, 8, 1, 'w'); pt(g, 11, y0 + 7, 'g'); pt(g, 12, y0 + 7, 'i'); // cinto
    ret(g, 8, y0 + 9, 2, 1, 'T'); ret(g, 14, y0 + 9, 2, 1, 'T'); // bolsos
  } else {
    ret(g, 7, y0 + compr - 1, 10, 1, 'T');
    ret(g, 8, y0 + 6, 8, 1, 'w'); pt(g, 11, y0 + 6, 'g'); pt(g, 12, y0 + 6, 'i'); // cinto
    if (estilo === 'armadura') {
      ret(g, 8, y0 + 1, 8, 5, 'l'); ret(g, 8, y0 + 1, 8, 1, 'L'); ret(g, 11, y0 + 1, 2, 5, 'L');
      pt(g, 14, y0 + 2, '*'); pt(g, 14, y0 + 3, '*'); pt(g, 9, y0 + 5, 'L');
      ret(g, 4, y0 - 1, 4, 3, 'l'); ret(g, 16, y0 - 1, 4, 3, 'l'); // ombreiras
      ret(g, 4, y0 + 1, 4, 1, 'L'); ret(g, 16, y0 + 1, 4, 1, 'L'); pt(g, 18, y0 - 1, '*'); pt(g, 19, y0, '*');
      ret(g, 5, y0 + 4, 2, 2, 'L'); ret(g, 17, y0 + 4, 2, 2, 'L'); pt(g, 18, y0 + 4, 'l'); // braçadeiras
      pt(g, 8, y0 + 6, 'g'); pt(g, 15, y0 + 6, 'g'); // rebites do cinto
      ret(g, 8, y0 + 7, 3, 2, 'L'); ret(g, 13, y0 + 7, 3, 2, 'l'); // couraça da saia
    } else {
      ret(g, 10, y0, 4, 1, 'T'); // gola em V
      pt(g, 11, y0, 'S'); pt(g, 12, y0, 'S');
      ret(g, 11, y0 + 1, 2, 4, 'y'); pt(g, 11, y0 + 1, 'T'); pt(g, 12, y0 + 1, 'T'); // fecho
    }
  }
  // mãos (punho fechado, com dedos)
  const yh = y0 + 8;
  ret(g, 5, yh, 2, 3, 's'); ret(g, 17, yh, 2, 3, 's');
  ret(g, 5, yh + 2, 1, 1, 'S'); pt(g, 6, yh + 1, 'S'); pt(g, 17, yh + 1, 'S'); pt(g, 18, yh + 2, 'S');
}

function cabecaBase(g, dy, olhos, piscar) {
  ret(g, 11, 12 + dy, 2, 1, 'S'); // pescoço
  ret(g, 8, 5 + dy, 8, 6, 's'); ret(g, 9, 4 + dy, 6, 1, 's'); ret(g, 9, 11 + dy, 6, 1, 's');
  pt(g, 7, 8 + dy, 'S'); pt(g, 16, 8 + dy, 's'); pt(g, 16, 9 + dy, 's'); // orelhas (a esquerda na sombra)
  pt(g, 8, 9 + dy, 'S'); pt(g, 8, 10 + dy, 'S'); pt(g, 9, 11 + dy, 'S'); pt(g, 10, 11 + dy, 'S'); pt(g, 14, 11 + dy, 'S'); // sombra do queixo
  ret(g, 11, 10 + dy, 2, 1, 'S'); // boca
  pt(g, 12, 9 + dy, 'S'); // nariz
  pt(g, 14, 6 + dy, 's'); pt(g, 15, 7 + dy, 's');
  for (const x of [10, 13]) {
    pt(g, x, 6 + dy, 'H'); // sobrancelha
    if (piscar) pt(g, x, 8 + dy, 'k');
    else { pt(g, x, 7 + dy, 'k'); pt(g, x, 8 + dy, 'e'); }
  }
}

function cabelo(g, estilo, dy, bal) {
  if (estilo === 'careca') return;
  const vento = bal ? 1 : 0;
  if (estilo === 'moicano') {
    ret(g, 11, 1 + dy, 2, 4, 'h'); ret(g, 10, 3 + dy, 4, 2, 'h'); pt(g, 12, 0 + dy, 'j'); pt(g, 12, 1 + dy, 'j');
    ret(g, 11, 5 + dy, 2, 1, 'H'); pt(g, 11, 2 + dy, 'H'); pt(g, 10, 4 + dy, 'H');
    return;
  }
  if (estilo === 'volumoso') {
    ret(g, 6, 2 + dy, 12, 4, 'h'); ret(g, 7, 1 + dy, 10, 1, 'h'); ret(g, 6, 5 + dy, 2, 5, 'h'); ret(g, 16, 5 + dy, 2, 5, 'h');
    ret(g, 9, 5 + dy, 6, 1, 'h'); ret(g, 6, 7 + dy, 2, 3, 'H'); ret(g, 16, 8 + dy, 2, 2, 'H');
    ret(g, 6, 2 + dy, 2, 3, 'H');
    pt(g, 13, 2 + dy, 'j'); pt(g, 14, 1 + dy, 'j'); pt(g, 15, 3 + dy, 'j'); pt(g, 16, 5 + dy, 'j'); pt(g, 12, 3 + dy, 'j');
    return;
  }
  ret(g, 8, 3 + dy, 8, 2, 'h'); ret(g, 7, 4 + dy, 10, 1, 'h'); ret(g, 8, 5 + dy, 2, 1, 'h'); ret(g, 14, 5 + dy, 2, 1, 'h');
  ret(g, 11, 5 + dy, 2, 1, 'h'); // franja
  ret(g, 7, 5 + dy, 1, 3, 'h'); ret(g, 16, 5 + dy, 1, 3, 'h');
  pt(g, 7, 4 + dy, 'H'); pt(g, 7, 6 + dy, 'H'); pt(g, 9, 5 + dy, 'H'); pt(g, 11, 5 + dy, 'H');
  pt(g, 13, 3 + dy, 'j'); pt(g, 14, 3 + dy, 'j'); pt(g, 15, 4 + dy, 'j'); pt(g, 12, 3 + dy, 'j');
  if (estilo === 'longo') {
    ret(g, 6, 5 + dy, 2, 6, 'h'); ret(g, 16, 5 + dy, 2, 6, 'h');
    ret(g, 6 + vento, 11 + dy, 2, 5, 'h'); ret(g, 16 + vento, 11 + dy, 2, 5, 'h'); // pontas ao vento
    ret(g, 6, 7 + dy, 1, 4, 'H'); ret(g, 6 + vento, 11 + dy, 1, 5, 'H'); ret(g, 17 + vento, 11 + dy, 1, 5, 'H');
    pt(g, 17, 7 + dy, 'j'); pt(g, 16 + vento, 12 + dy, 'j'); pt(g, 17 + vento, 14 + dy, 'j');
  }
}

function cabeca(g, estilo, dy) {
  if (estilo === 'coroa') {
    carimbo(g, 8, 0 + dy, ['g..gg..g', 'gg.gg.gg', 'gggggggg', 'GgigeigG']);
    pt(g, 11, 0 + dy, 'i'); pt(g, 12, 0 + dy, 'i'); pt(g, 9, 3 + dy, 'G'); pt(g, 14, 3 + dy, 'G'); pt(g, 15, 2 + dy, 'i');
  } else if (estilo === 'capuz') {
    ret(g, 7, 2 + dy, 10, 3, 'u'); ret(g, 6, 4 + dy, 12, 1, 'u'); ret(g, 8, 1 + dy, 8, 1, 'u');
    ret(g, 6, 5 + dy, 3, 9, 'u'); ret(g, 15, 5 + dy, 3, 9, 'u');
    ret(g, 6, 12 + dy, 12, 2, 'U'); ret(g, 8, 4 + dy, 8, 1, 'U');
    ret(g, 9, 5 + dy, 6, 1, 'U'); pt(g, 8, 6 + dy, 'U'); pt(g, 15, 6 + dy, 'U');
    pt(g, 9, 2 + dy, 'U'); pt(g, 14, 3 + dy, 'U'); ret(g, 6, 5 + dy, 1, 7, 'U');
  } else if (estilo === 'chifres') {
    for (const [x, y] of [[8, 4], [7, 3], [7, 2], [6, 1], [6, 0], [5, 0]]) { pt(g, x, y + dy, 'o'); pt(g, 23 - x, y + dy, 'o'); }
    for (const [x, y] of [[8, 3], [7, 1], [6, 2]]) { pt(g, x, y + dy, 'O'); pt(g, 23 - x, y + dy, 'O'); }
    pt(g, 7, 4 + dy, 'O'); pt(g, 7, 5 + dy, 'O');
  } else if (estilo === 'chapeu') {
    ret(g, 4, 4 + dy, 16, 1, 'u'); ret(g, 3, 5 + dy, 18, 1, 'U');
    ret(g, 8, 3 + dy, 8, 1, 'u'); ret(g, 9, 2 + dy, 6, 1, 'u'); ret(g, 10, 1 + dy, 4, 1, 'u'); ret(g, 11, 0 + dy, 2, 1, 'u');
    pt(g, 13, -1 + dy, 'u'); pt(g, 14, 0 + dy, 'u');
    ret(g, 8, 3 + dy, 8, 1, 'U'); ret(g, 9, 3 + dy, 6, 1, 'g'); pt(g, 12, 3 + dy, 'i');
    ret(g, 9, 2 + dy, 1, 1, 'U'); ret(g, 8, 4 + dy, 1, 1, 'U');
  }
}

function arma(g, estilo, dy, fl) {
  if (estilo === 'espada') {
    ret(g, 20, 4, 1, 15, 'l'); ret(g, 21, 5, 1, 14, 'L'); pt(g, 20, 3, 'l'); pt(g, 20, 2, '*'); pt(g, 20, 5, '*'); pt(g, 20, 6, '*'); pt(g, 20, 10, '*');
    ret(g, 18, 19 + dy, 5, 1, 'g'); pt(g, 18, 19 + dy, 'G'); pt(g, 22, 19 + dy, 'i');
    ret(g, 20, 20 + dy, 2, 3, 'w'); pt(g, 20, 21 + dy, 'W'); pt(g, 21, 23 + dy, 'g'); pt(g, 20, 23 + dy, 'G');
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

const BRILHANTES = new Set(['.', 'k', '*', 'i', 'f', 'F', 'e']);
const SEM_LUZ = new Set(['s', 'S']);

// Monta o personagem inteiro numa grade de letras.
// Contorno colorido (cada peça ganha um traço escuro da própria cor) e borda iluminada pela lua à direita.
function desenharPersonagem(app, f = {}) {
  const dy = f.dy || 0;
  const g = novo(CW, CH);
  capa(g, app.capa.estilo, dy, f.bal || 0);
  pernas(g, app.calca.estilo);
  botas(g);
  tronco(g, app.roupa.estilo, dy);
  cabecaBase(g, dy, app.olhos, !!f.piscar);
  cabelo(g, app.cabelo.estilo, dy, f.bal || 0);
  cabeca(g, app.cabeca.estilo, dy);
  arma(g, app.mao.estilo, dy, f.chama || 0);

  const base = g.map((l) => l.slice());
  const cheio = (x, y) => y >= 0 && y < CH && x >= 0 && x < CW && base[y][x] !== '.';
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (base[y][x] === '.') {
        // contorno: usa a cor da peça vizinha (de baixo, esquerda, direita, cima)
        let viz = null;
        for (const [a, b] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          if (cheio(x + a, y + b)) { viz = base[y + b][x + a]; break; }
        }
        if (viz) g[y][x] = BRILHANTES.has(viz) ? 'k' : `@${viz}`;
      } else if (!BRILHANTES.has(base[y][x]) && !SEM_LUZ.has(base[y][x]) && f.luz !== false) {
        // borda iluminada: o lado direito vira a versão "lua" da cor
        if (!cheio(x + 1, y)) g[y][x] = `^${base[y][x]}`;
      }
    }
  }
  return g;
}

// ---------- Cena ----------
const B2 = [[0.125, 0.625], [0.875, 0.375]]; // tramado para misturar duas cores sem criar cores novas
const CEU = ['#07051a', '#0c0824', '#120b30', '#1a0f40', '#24164f', '#33205f', '#47306e'];
const BRILHO_LUA = ['#241a58', '#2f2370', '#3b2e86'];
const ESTRELAS = [[3, 2], [9, 5], [14, 1], [20, 4], [25, 2], [37, 12], [5, 10], [17, 8], [34, 3], [12, 12], [27, 9], [1, 6], [22, 11], [38, 6]];
const VAGALUMES = [[6, 26, 0], [16, 29, 2], [35, 27, 4], [28, 21, 1], [3, 22, 3]];

function fundo(frame) {
  const g = Array.from({ length: SH }, () => Array(SW).fill('#000000'));
  // céu em degradê, misturado por tramado
  for (let y = 0; y < SH; y++) {
    const pos = Math.min(1, y / 26) * (CEU.length - 1);
    const i = Math.min(CEU.length - 2, Math.floor(pos));
    const fr = pos - i;
    for (let x = 0; x < SW; x++) g[y][x] = fr > B2[y & 1][x & 1] ? CEU[i + 1] : CEU[i];
  }
  // estrelas que piscam (o ciclo fecha em 8 quadros)
  ESTRELAS.forEach(([x, y], k) => {
    const fase = (k * 3 + frame) % 8;
    g[y][x] = fase < 2 ? '#6e66a6' : fase < 6 ? '#cfc9ee' : '#ffffff';
    if (fase >= 6 && x > 0 && x < SW - 1 && y > 0) { g[y][x - 1] = '#8f86c4'; g[y][x + 1] = '#8f86c4'; g[y - 1][x] = '#8f86c4'; g[y + 1][x] = '#8f86c4'; }
  });
  // lua com brilho suave
  const lx = 31;
  const ly = 8;
  for (let y = -10; y <= 10; y++) {
    for (let x = -10; x <= 10; x++) {
      const px = lx + x;
      const py = ly + y;
      if (px < 0 || px >= SW || py < 0 || py >= SH) continue;
      const d = Math.hypot(x, y);
      if (d <= 4.3) {
        const luz = (x - y) * 0.7;
        g[py][px] = luz < -3.4 ? '#9a92c0' : luz < -1.7 ? '#b9b2d6' : '#eae6f4';
      } else if (d <= 9) {
        const v = (1 - (d - 4.3) / 4.7) * 3 + (B2[py & 1][px & 1] - 0.5) * 0.9;
        const lv = Math.floor(v);
        if (lv >= 1) g[py][px] = BRILHO_LUA[Math.min(lv, 3) - 1];
      }
    }
  }
  for (const [x, y] of [[-1, -1], [1, 1], [-2, 1], [2, -2]]) g[ly + y][lx + x] = '#c6bedb';
  // três camadas de montanhas, cada uma com uma borda de luz no topo
  const camadas = [
    { base: 20, a: 2.6, b: 1.6, f1: 0.45, f2: 1.1, p: 0, cor: '#241a4a', topo: '#3b2f6e' },
    { base: 24, a: 1.8, b: 1.2, f1: 0.7, f2: 1.7, p: 2, cor: '#1a1236', topo: '#2c2358' },
  ];
  for (const c of camadas) {
    for (let x = 0; x < SW; x++) {
      const h = c.base + Math.round(c.a * Math.sin(x * c.f1 + c.p) + c.b * Math.sin(x * c.f2 + c.p / 2 + 1));
      for (let y = h; y < 31; y++) g[y][x] = y === h ? c.topo : c.cor;
    }
  }
  // castelo distante, com janelas que tremeluzem
  const cor = '#0a0614';
  for (const [x, y, w, h] of [[2, 17, 3, 9], [6, 19, 2, 7], [9, 15, 3, 11], [4, 22, 5, 5]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = cor;
  for (const [x, y] of [[2, 16], [4, 16], [6, 18], [7, 18], [9, 14], [11, 14]]) g[y][x] = cor;
  g[16][10] = frame % 4 < 2 ? '#f2c15a' : '#a8812e';
  g[20][3] = frame % 8 < 5 ? '#f2c15a' : '#a8812e';
  // chão de pedra
  for (let y = 31; y < SH; y++) for (let x = 0; x < SW; x++) g[y][x] = y === 31 ? '#463a66' : y === 32 ? '#2f2648' : '#1c1628';
  for (let x = 0; x < SW; x++) {
    if ((x * 7 + 3) % 11 === 0) g[33][x] = '#2e2644';
    if ((x * 5 + 1) % 9 === 0) g[34][x] = '#241d36';
    if ((x * 3 + 2) % 13 === 0) g[32][x] = '#3a2f58';
  }
  // neblina que se arrasta (o padrão se repete a cada 8 quadros)
  for (let y = 28; y <= 31; y++) for (let x = 0; x < SW; x++) if ((x + y * 2 + frame) % 8 < 2) g[y][x] = y < 30 ? '#352b60' : '#40366a';
  // luz da lua no chão, para os pés não sumirem
  for (let x = OX + 2; x <= OX + 22; x++) {
    const d = Math.abs(x - (OX + 12)) / 10;
    if (d < 1) { g[33][x] = d < 0.6 ? '#34295a' : '#2a2148'; if (d < 0.4) g[32][x] = '#3d3168'; }
  }
  // brilho fraco atrás do personagem, para destacar a silhueta
  for (let y = 0; y < 31; y++) {
    for (let x = 0; x < SW; x++) {
      const d = Math.hypot((x - (OX + 12)) / 12, (y - 18) / 17);
      if (d < 0.55) g[y][x] = '#30255c';
      else if (d < 0.8 && (x + y) % 2 === 0) g[y][x] = '#2b2150';
    }
  }
  // sombra do personagem
  for (let x = OX + 7; x <= OX + 17; x++) g[35][x] = '#0c0813';
  for (let x = OX + 9; x <= OX + 15; x++) g[34][x] = '#0c0813';
  // vaga-lumes
  VAGALUMES.forEach(([x, y, k]) => {
    const a = (frame / 8) * Math.PI * 2 + k;
    const px = x + Math.round(Math.sin(a) * 1.6);
    const py = y + Math.round(Math.cos(a) * 1.1);
    if (py >= 0 && py < SH && px >= 0 && px < SW) g[py][px] = (frame + k) % 4 === 0 ? '#7a8a3a' : '#d8f06a';
  });
  return g;
}

// Quadros da animação curta (usados também pelas batalhas)
const QUADROS = [
  { dy: 0, bal: 0, piscar: false, chama: 0 },
  { dy: 1, bal: 1, piscar: false, chama: 1 },
  { dy: 0, bal: 0, piscar: true, chama: 0 },
  { dy: 1, bal: 1, piscar: false, chama: 1 },
];
// Animação da cena: 8 quadros (respiração lenta, capa e cabelo ao vento, piscada)
const QUADROS_CENA = [
  { dy: 0, bal: 0, piscar: false, chama: 0 },
  { dy: 0, bal: 1, piscar: false, chama: 1 },
  { dy: 1, bal: 1, piscar: false, chama: 0 },
  { dy: 1, bal: 2, piscar: false, chama: 1 },
  { dy: 1, bal: 1, piscar: false, chama: 0 },
  { dy: 0, bal: 1, piscar: false, chama: 1 },
  { dy: 0, bal: 0, piscar: true, chama: 0 },
  { dy: 0, bal: 0, piscar: false, chama: 1 },
];

function gradeCena(app, i, extra) {
  const cores = coresDe(app);
  const q = QUADROS_CENA[i % QUADROS_CENA.length];
  const g = fundo(i);
  const p = (extra && extra.personagem) ? extra.personagem(app, q) : desenharPersonagem(app, q);
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
  return montar(QUADROS_CENA.map((_, i) => gradeCena(a, i, extra)), { escala: ESCALA, atraso: 38 });
}

module.exports = { CW, CH, SW, SH, OX, CATALOGO, PARTES, PADRAO, PELES, OLHOS, CABELOS, TECIDOS, normalizar, aleatoria, coresDe, desenharPersonagem, gradeCena, gifDe, fundo, QUADROS, QUADROS_CENA, novo, ret, pt, carimbo, escuro, claro, tom };
// fim do arquivo
