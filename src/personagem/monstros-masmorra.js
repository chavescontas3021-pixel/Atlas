// Monstros das masmorras (pixel art, 4 quadros cada) e a ligação deles com os cenários.
// Os que reaproveitam o desenho de um monstro comum só ganham um nome novo (alias).
const M = require('./monstros');
const Cen = require('./cenarios');

const { K, nova, px, ret, elip, lin, poli, corpo, contorno } = M;

// ---------- Catacumbas ----------
function rato(t) {
  const g = nova(30, 18);
  const pel = ['#4a3d3a', '#8a7a72', '#cfc0b4'];
  const m = t % 2;
  lin(g, 24, 13, 28, 10 + m * 2, '#d08a9a', 1); lin(g, 28, 10 + m * 2, 29, 6 + m * 2, '#d08a9a', 1);
  for (const [x, a] of [[10, m], [15, -m], [21, -m], [6, m]]) ret(g, x + a, 15, 2, 3, pel[0]);
  corpo(g, 17, 11, 9, 5, pel);
  corpo(g, 8, 11, 5.4, 4.4, pel);
  ret(g, 1, 11, 5, 3, pel[1]); ret(g, 1, 11, 5, 1, pel[2]);
  px(g, 0, 12, '#ff7a9a'); px(g, 0, 11, '#ff7a9a');
  elip(g, 9, 6.4, 2.4, 2.6, pel[1]); elip(g, 9, 6.6, 1.3, 1.5, '#d08a9a');
  ret(g, 5, 9, 2, 2, '#ff3b3b'); px(g, 5, 9, '#ffffff');
  if (t === 1 || t === 2) { px(g, 2, 14, '#ffffff'); px(g, 4, 14, '#ffffff'); }
  for (const [x, y] of [[13, 7], [18, 6], [23, 8]]) px(g, x, y, pel[2]);
  return contorno(g);
}

function morcego(t) {
  const g = nova(32, 26);
  const wy = [3, 8, 14, 8][t];
  const mem = '#3a2a5a'; const osso = '#7a5aa0';
  poli(g, [[14, 11], [1, wy], [5, wy + 7], [9, 14], [13, 16]], mem);
  poli(g, [[18, 11], [31, wy], [27, wy + 7], [23, 14], [19, 16]], mem);
  lin(g, 14, 11, 1, wy, osso, 1); lin(g, 18, 11, 31, wy, osso, 1);
  lin(g, 14, 12, 5, wy + 7, osso, 1); lin(g, 18, 12, 27, wy + 7, osso, 1);
  corpo(g, 16, 14, 4, 5.4, ['#1a1226', '#3d2a55', '#6a4a8a']);
  corpo(g, 16, 8, 3.8, 3.4, ['#1a1226', '#3d2a55', '#6a4a8a']);
  poli(g, [[13, 6], [12, 0], [15, 5]], '#3d2a55'); poli(g, [[19, 6], [20, 0], [17, 5]], '#3d2a55');
  ret(g, 14, 8, 1, 2, '#ff3b3b'); ret(g, 18, 8, 1, 2, '#ff3b3b');
  px(g, 15, 11, '#ffffff'); px(g, 17, 11, '#ffffff');
  ret(g, 15, 19, 1, 3, '#1a1226'); ret(g, 17, 19, 1, 3, '#1a1226');
  return contorno(g);
}

function zumbi(t) {
  const g = nova(24, 36);
  const pele = ['#4a5a3a', '#7e9460', '#b0c48a'];
  const m = t % 2;
  ret(g, 8, 26, 4, 9, '#2e2e42'); ret(g, 13, 26, 4, 9, '#2e2e42'); ret(g, 7 - m, 33, 5, 3, '#1a1426'); ret(g, 13 + m, 33, 5, 3, '#1a1426');
  corpo(g, 12, 20, 5.8, 7.6, ['#3e2616', '#7a5030', '#a87a50']);
  for (const y of [18, 21]) { ret(g, 9, y, 5, 1, '#d8d2c0'); }
  lin(g, 8, 15, 1, 16 + m, pele[1], 2); lin(g, 7, 19, 0, 21 - m, pele[1], 2);
  px(g, 0, 16 + m, pele[2]); px(g, 0, 21 - m, pele[2]);
  corpo(g, 12 + (t === 1 ? 1 : 0), 9, 5, 5.2, pele);
  ret(g, 10, 7, 2, 2, K); px(g, 10, 7, '#ffd23a'); ret(g, 14, 7, 2, 2, '#ffd23a');
  ret(g, 10, 12, 6, 2, K); px(g, 11, 12, '#d8d2c0'); px(g, 13, 12, '#d8d2c0'); px(g, 15, 12, '#d8d2c0');
  for (const [x, y] of [[8, 4], [11, 3], [15, 4]]) px(g, x, y, '#2a2a22');
  px(g, 15, 15, '#a01830'); px(g, 9, 24, '#a01830');
  return contorno(g);
}

// ---------- Ninho da Aranha ----------
// Aranha vista de lado: abdômen à direita, cabeça à esquerda, oito patas que se alternam
function aranhaBase(t, c) {
  const g = nova(c.w, c.h);
  const chao = c.h - 1;
  const patas = [[c.hx + 1, c.hy + 1], [c.hx + 3, c.hy + 2], [c.ax - 3, c.ay + 1], [c.ax + 1, c.ay + 2]];
  patas.forEach(([ax, ay], i) => {
    for (const lado of [-1, 1]) {
      const alt = (i + t + (lado > 0 ? 1 : 0)) % 2;
      const jx = ax + lado * c.L * 0.55; const jy = ay - c.L * 0.55 - alt;
      const fx = ax + lado * c.L * (1.15 + 0.12 * alt); const fy = chao - alt;
      const cor = lado > 0 ? c.pal[0] : c.pal[1];
      lin(g, ax, ay, jx, jy, cor, c.th); lin(g, jx, jy, fx, fy, cor, c.th);
    }
  });
  corpo(g, c.ax, c.ay, c.ar, c.ar * 0.82, c.pal2);
  corpo(g, c.hx, c.hy, c.hr, c.hr * 0.85, c.pal2);
  ret(g, c.hx - c.hr, c.hy + 1, 2, 2, c.dente);
  const ol = c.olhos;
  ol.forEach(([dx, dy]) => px(g, c.hx + dx, c.hy + dy, c.olho));
  if (c.extra) c.extra(g, t);
  return contorno(g);
}
function aranhaTecela(t) {
  return aranhaBase(t, {
    w: 30, h: 20, ax: 20, ay: 11, ar: 7, hx: 8, hy: 12, hr: 4, L: 8, th: 1,
    pal: ['#3a2a32', '#5a4450'], pal2: ['#2b1f2e', '#6a4a5a', '#b08aa0'], olho: '#ff3b3b', dente: '#e8e0f0', olhos: [[-2, -1], [0, -2], [-1, 0], [1, -1]],
    extra: (g) => { for (const [x, y] of [[17, 8], [21, 7], [24, 11], [19, 13]]) px(g, x, y, '#d8c0e0'); },
  });
}
function aranhaCacadora(t) {
  return aranhaBase(t, {
    w: 38, h: 26, ax: 26, ay: 14, ar: 9, hx: 10, hy: 16, hr: 5.4, L: 11, th: 2,
    pal: ['#2a3a1e', '#4a5e30'], pal2: ['#1e2a16', '#5a7a3a', '#9ac060'], olho: '#ffd23a', dente: '#f4f0d0', olhos: [[-3, -2], [-1, -3], [-2, 0], [1, -2], [-3, 1], [0, 1]],
    extra: (g, t2) => { for (let x = 21; x <= 31; x += 3) ret(g, x, 8, 1, 12, '#2a3a1e'); px(g, 5, 20 + (t2 % 2), '#7dff6a'); },
  });
}
function viuva(t) {
  return aranhaBase(t, {
    w: 42, h: 30, ax: 29, ay: 17, ar: 10.4, hx: 11, hy: 19, hr: 6, L: 13, th: 2,
    pal: ['#14101c', '#2a2438'], pal2: ['#0a0810', '#1e1a2c', '#4a4468'], olho: '#ff2a2a', dente: '#ffffff', olhos: [[-3, -2], [-1, -3], [-2, 0], [1, -2], [-4, 0], [0, 1]],
    extra: (g) => { poli(g, [[27, 12], [32, 12], [30, 17], [32, 22], [27, 22], [29, 17]], '#d81830'); px(g, 30, 17, '#ff6a6a'); },
  });
}
function escorpiao(t) {
  const g = nova(38, 24);
  const pal = ['#1e1630', '#4a3a6a', '#8a70c0'];
  const ab = t === 1 || t === 2;
  for (let i = 0; i < 4; i++) { const x = 12 + i * 4; lin(g, x, 17, x - 2 + (i + t) % 2 * 2, 23, pal[0], 1); lin(g, x + 1, 17, x + 3 + (i + t) % 2, 23, pal[1], 1); }
  corpo(g, 20, 16, 9, 4.6, pal);
  for (const x of [15, 19, 23, 27]) ret(g, x, 12, 1, 8, pal[0]);
  // cauda curvada com ferrão
  const cauda = [[27, 14], [32, 11], [34, 6], [31, 2 + (t % 2)], [27, 3 + (t % 2)]];
  for (let i = 0; i < cauda.length - 1; i++) lin(g, cauda[i][0], cauda[i][1], cauda[i + 1][0], cauda[i + 1][1], pal[1], 3);
  poli(g, [[27, 1 + (t % 2)], [27, 6 + (t % 2)], [23, 4 + (t % 2)]], '#d8d0f0');
  px(g, 24, 8 + (t % 2) * 2, '#7dff6a');
  // pinças
  const ab2 = ab ? 2 : 0;
  lin(g, 11, 14, 5, 12 - ab2, pal[1], 2); lin(g, 11, 17, 5, 18 + ab2, pal[1], 2);
  poli(g, [[5, 11 - ab2], [0, 12 - ab2], [5, 14]], pal[2]); poli(g, [[5, 17], [0, 17 + ab2], [5, 19 + ab2]], pal[2]);
  corpo(g, 12, 15, 3.4, 3.2, pal);
  ret(g, 9, 13, 2, 1, '#ff3b3b');
  return contorno(g);
}

// ---------- Fortaleza do Rei Caído ----------
function soldado(t) {
  const g = nova(26, 36);
  const m = t % 2;
  const ferro = ['#3a3e4e', '#7a8094', '#b8bfd4'];
  // lança para frente (esquerda)
  const lx = t === 1 || t === 2 ? 0 : 2;
  ret(g, lx, 17, 14, 1, '#6b4426'); poli(g, [[lx - 1, 15], [lx - 1, 20], [lx - 5 < 0 ? 0 : lx - 3, 17.5]], '#d4dbef');
  // pernas
  ret(g, 9, 26, 4, 9, '#2a2434'); ret(g, 14, 26, 4, 9, '#2a2434'); ret(g, 8 - m, 33, 5, 3, '#3a2a1e'); ret(g, 14 + m, 33, 5, 3, '#3a2a1e');
  // capa esfarrapada
  poli(g, [[18, 14], [24, 20 + m], [22, 32], [17, 26]], '#6e1a30');
  corpo(g, 13, 20, 5.6, 7, ferro);
  ret(g, 9, 24, 8, 1, '#3a2418');
  // escudo redondo
  elip(g, 16, 21, 4.4, 5.4, '#5a3a24'); elip(g, 16, 21, 3.2, 4.2, '#8a5a34'); px(g, 16, 21, '#d4a830');
  lin(g, 10, 15, lx + 8, 17, ferro[1], 2);
  // capacete e rosto de caveira
  corpo(g, 12, 9, 5, 5, ferro);
  ret(g, 8, 8, 8, 5, '#1a1624'); ret(g, 9, 9, 2, 2, '#7dff9a'); ret(g, 13, 9, 2, 2, '#7dff9a'); ret(g, 10, 12, 5, 1, '#d8d2c0');
  ret(g, 11, 3, 2, 3, '#a01830');
  return contorno(g);
}
function armadura(t) {
  const g = nova(28, 38);
  const fer = ['#2a2e44', '#5a6488', '#9aa6cc'];
  const fl = t % 2;
  // chamas azuis na base (não tem pernas)
  for (let i = 0; i < 6; i++) { const x = 6 + i * 3; const a = 4 + ((i + t) % 3); poli(g, [[x, 37], [x + 1.5, 37 - a], [x + 3, 37]], i % 2 ? '#4ab8ff' : '#2a78e0'); }
  ret(g, 9, 28, 10, 5, fer[0]);
  corpo(g, 14, 22, 7, 8, fer);
  ret(g, 12, 16, 4, 12, fer[0]); ret(g, 13, 19, 2, 6, '#2a78e0');
  // ombreiras
  elip(g, 6, 15, 4, 3.4, fer[1]); elip(g, 22, 15, 4, 3.4, fer[1]); px(g, 5, 14, fer[2]); px(g, 21, 14, fer[2]);
  // braços e espada
  lin(g, 5, 17, 2, 25, fer[1], 3); lin(g, 23, 17, 25, 25, fer[1], 3);
  ret(g, 1, 8 + fl, 2, 20, '#c8d0e8'); ret(g, 1, 8 + fl, 1, 20, '#ffffff'); ret(g, 0, 28 + fl, 4, 1, '#c9a227');
  // elmo vazio com olhos de chama
  corpo(g, 14, 8, 5.6, 6, fer);
  ret(g, 10, 7, 9, 5, '#05060c'); ret(g, 11, 8, 2, 2, '#6ad0ff'); ret(g, 16, 8, 2, 2, '#6ad0ff'); px(g, 11, 7, '#ffffff'); px(g, 16, 7, '#ffffff');
  poli(g, [[11, 3], [14, 0 - fl], [17, 3]], '#4ab8ff');
  return contorno(g);
}
function arqueiro(t) {
  const g = nova(26, 36);
  const osso = ['#7a7060', '#d8d2c0', '#f4efe0'];
  const m = t % 2;
  const puxa = t === 2 || t === 3;
  ret(g, 9, 26, 3, 9, osso[1]); ret(g, 14, 26, 3, 9, osso[1]); ret(g, 8 - m, 34, 5, 2, osso[0]); ret(g, 14 + m, 34, 5, 2, osso[0]);
  ret(g, 17, 6, 4, 14, '#5a3a24'); ret(g, 18, 4, 1, 3, '#c9a227'); px(g, 19, 3, '#c9a227'); // aljava
  corpo(g, 13, 19, 4.4, 7, osso);
  for (const y of [15, 18, 21]) ret(g, 10, y, 7, 1, '#2a2434');
  ret(g, 12, 13, 2, 14, osso[0]);
  // arco
  for (let y = 6; y <= 28; y++) { const x = 2 + Math.round(2.6 * Math.sin(((y - 6) / 22) * Math.PI)); px(g, x, y, '#6b4426'); px(g, x + 1, y, '#8a5a34'); }
  lin(g, 2, 6, puxa ? 11 : 4, 17, '#e8e0cc', 1); lin(g, 2, 28, puxa ? 11 : 4, 17, '#e8e0cc', 1);
  lin(g, 9, 14, 3, 17, osso[1], 2);
  if (puxa) { lin(g, 11, 17, 0, 17, '#e8d9a0', 1); poli(g, [[0, 15.5], [0, 18.5], [-1, 17]], '#d4dbef'); lin(g, 11, 15, 12, 17, osso[1], 2); }
  corpo(g, 14, 9, 4.8, 5, osso);
  ret(g, 11, 7, 2, 3, K); ret(g, 15, 7, 2, 3, K); px(g, 11, 8, '#7dff9a'); px(g, 15, 8, '#7dff9a');
  ret(g, 12, 12, 5, 1, K); for (const x of [12, 14, 16]) px(g, x, 12, osso[2]);
  return contorno(g);
}

// ---------- Covil do Dragão Negro ----------
function dragonete(t) {
  const g = nova(38, 28);
  const es = ['#2a0a10', '#7a1a1c', '#d8452a'];
  const asa = [3, 8, 13, 8][t];
  poli(g, [[22, 14], [24, asa], [34, asa + 4], [30, 16], [25, 18]], '#8a1a2a');
  lin(g, 22, 14, 24, asa, '#e0703a', 1); lin(g, 24, 15, 34, asa + 4, '#e0703a', 1); lin(g, 26, 16, 31, asa + 9 > 18 ? 18 : asa + 9, '#e0703a', 1);
  lin(g, 25, 19, 34, 23 + (t % 2), es[1], 3); poli(g, [[33, 21 + (t % 2)], [37, 22 + (t % 2)], [34, 26]], es[2]);
  ret(g, 14, 22, 3, 5, es[0]); ret(g, 22, 22, 3, 5, es[0]); ret(g, 12, 26, 5, 2, '#d8d0b8'); ret(g, 21, 26, 5, 2, '#d8d0b8');
  corpo(g, 20, 17, 8, 7, es);
  elip(g, 19, 19, 4, 5, '#e8b060');
  corpo(g, 10, 11, 5.6, 4.6, es); ret(g, 1, 11, 6, 4, es[1]); ret(g, 1, 11, 6, 1, es[2]);
  poli(g, [[11, 8], [14, 1], [14, 8]], '#d8d0b8'); poli(g, [[8, 8], [8, 2], [11, 8]], '#d8d0b8');
  ret(g, 6, 9, 2, 2, '#ffd23a'); px(g, 6, 9, '#ffffff');
  px(g, 2, 11, K); px(g, 4, 11, K);
  if (t >= 2) { for (const [x, y, c] of [[0, 13, '#ff7a1c'], [-1, 14, '#ffd24a']]) px(g, Math.max(0, x), y, c); ret(g, 0, 13, 2, 2, '#ff7a1c'); px(g, 0, 14, '#ffd24a'); }
  return contorno(g);
}
function cultista(t) {
  const g = nova(26, 38);
  const rob = ['#2a0a14', '#6e1a30', '#a8302a'];
  const fl = t % 2;
  poli(g, [[6, 14], [20, 14], [24, 36 - fl], [2, 36 - fl]], rob[1]);
  poli(g, [[6, 14], [10, 14], [6, 36 - fl], [2, 36 - fl]], rob[0]);
  for (const x of [8, 13, 18]) ret(g, x, 22, 1, 13, rob[2]);
  ret(g, 8, 20, 11, 2, '#c9a227');
  // braços erguidos com bola de fogo
  lin(g, 7, 17, 2, 12, rob[1], 3); lin(g, 19, 17, 23, 12, rob[1], 3);
  const r = 3 + fl;
  elip(g, 1, 7, r, r, '#ff7a1c'); elip(g, 1, 7, r - 1.4, r - 1.4, '#ffd24a'); px(g, 1, 7, '#ffffff');
  px(g, 3, 3 - fl, '#ff7a1c'); px(g, -1, 2, '#ff7a1c');
  corpo(g, 13, 9, 5.4, 6, rob);
  ret(g, 9, 6, 9, 7, K);
  ret(g, 10, 8, 2, 2, '#ff6a1c'); ret(g, 15, 8, 2, 2, '#ff6a1c'); ret(g, 12, 12, 4, 1, '#d8d0b8');
  poli(g, [[8, 5], [5, -0.5 < 0 ? 0 : 0], [10, 3]], '#d8d0b8'); poli(g, [[18, 5], [21, 0], [16, 3]], '#d8d0b8');
  return contorno(g);
}
function guardiao(t) {
  const g = nova(34, 42);
  const es = ['#3a1410', '#9a3a22', '#e0703a'];
  const m = t % 2;
  lin(g, 24, 28, 32, 36 + m, es[1], 4); poli(g, [[30, 34 + m], [33, 35 + m], [31, 39 + m]], es[2]);
  ret(g, 13, 30, 5, 10, es[0]); ret(g, 20, 30, 5, 10, es[0]); ret(g, 11 - m, 39, 7, 3, '#d8d0b8'); ret(g, 20 + m, 39, 7, 3, '#d8d0b8');
  corpo(g, 19, 23, 8, 9, es);
  for (let y = 16; y < 30; y += 3) for (let x = 13; x < 25; x += 3) px(g, x + ((y / 3) % 2), y, es[2]);
  ret(g, 13, 29, 12, 2, '#c9a227');
  // escudo grande e espada
  poli(g, [[3, 15], [13, 15], [13, 30], [8, 36], [3, 30]], '#5a3a24'); poli(g, [[4.5, 16.5], [11.5, 16.5], [11.5, 29], [8, 33], [4.5, 29]], '#d8452a'); ret(g, 7, 20, 2, 7, '#ffd24a'); ret(g, 5, 23, 6, 2, '#ffd24a');
  lin(g, 26, 18, 31, 8 - m, '#c8d0e8', 2); ret(g, 29, 14, 4, 1, '#c9a227'); px(g, 31, 6 - m, '#ffffff');
  corpo(g, 17, 10, 6, 5.6, es);
  ret(g, 5, 9, 7, 5, es[1]); ret(g, 5, 9, 7, 1, es[2]);
  poli(g, [[12, 6], [10, -1 < 0 ? 0 : 0], [15, 5]], '#d8d0b8'); poli(g, [[20, 6], [23, 0], [17, 5]], '#d8d0b8');
  ret(g, 13, 8, 2, 2, '#ffd23a'); px(g, 13, 8, '#ffffff');
  ret(g, 5, 13, 6, 1, K); for (const x of [6, 8, 10]) px(g, x, 12, '#ffffff');
  return contorno(g);
}

// ---------- Registro ----------
// [nome novo, tema, desenho]
const NOVOS = [
  ['Rato das Catacumbas', 'catacumbas', rato], ['Morcego Sombrio', 'catacumbas', morcego], ['Zumbi Podre', 'catacumbas', zumbi],
  ['Aranha Tecelã', 'ninho', aranhaTecela], ['Escorpião das Sombras', 'ninho', escorpiao], ['Aranha Caçadora', 'ninho', aranhaCacadora], ['Viúva Sombria', 'ninho', viuva],
  ['Soldado Caído', 'fortaleza', soldado], ['Armadura Assombrada', 'fortaleza', armadura], ['Arqueiro Esquelético', 'fortaleza', arqueiro],
  ['Dragonete de Brasa', 'covil', dragonete], ['Cultista do Dragão', 'covil', cultista], ['Guardião Draconiano', 'covil', guardiao],
];
// Monstros comuns que ganham um nome da masmorra (mesmo desenho)
const ALIAS = [
  ['Esqueleto da Cripta', 'catacumbas', 'Esqueleto Guerreiro'], ['Orc Carcereiro', 'catacumbas', 'Orc Brutamontes'],
  ['Golem de Teia', 'ninho', 'Golem de Pedra'],
  ['Lich Cortesão', 'fortaleza', 'Lich Ancião'], ['Cavaleiro Real Maldito', 'fortaleza', 'Cavaleiro das Trevas'],
  ['Hidra das Brasas', 'covil', 'Hidra Abissal'], ['Espectro de Cinzas', 'covil', 'Devorador de Almas'],
];
// Os chefes combatem no cenário da própria masmorra
const CHEFES = [['Lobo Infernal', 'catacumbas'], ['Aranha Gigante', 'ninho'], ['Rei Esqueleto', 'fortaleza'], ['Dragão Negro', 'covil']];

for (const [nome, tema, fn] of NOVOS) { M.registrar(nome, fn); Cen.registrarTema(nome, tema); }
for (const [nome, tema, de] of ALIAS) { M.registrar(nome, (t) => M.ARTE[de](t)); Cen.registrarTema(nome, tema); }
for (const [nome, tema] of CHEFES) Cen.registrarTema(nome, tema);

module.exports = { NOVOS, ALIAS, CHEFES };
// fim do arquivo
