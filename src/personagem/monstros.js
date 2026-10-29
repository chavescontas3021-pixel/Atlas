// Monstros em pixel art (dark fantasy), desenhados por código. Todos olham para a ESQUERDA (para o herói).
// Cada monstro vira uma grade de cores (null = vazio) com 4 quadros de animação.
const K = '#0d0912';

const nova = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
const px = (g, x, y, c) => {
  x = Math.round(x); y = Math.round(y);
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
};
const ret = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
function elip(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(g, x, y, c);
    }
  }
}
function lin(g, x0, y0, x1, y1, c, esp = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    for (let a = 0; a < esp; a++) for (let b = 0; b < esp; b++) px(g, x + a - (esp > 2 ? 1 : 0), y + b - (esp > 2 ? 1 : 0), c);
  }
}
// polígono preenchido (varredura por linhas)
function poli(g, pts, c) {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) px(g, x, y, c);
  }
}
// corpo redondo com sombreamento: sombra, tom médio e luz deslocada para cima/esquerda
function corpo(g, cx, cy, rx, ry, [esc, med, luz]) {
  elip(g, cx, cy, rx, ry, esc);
  elip(g, cx - rx * 0.1, cy - ry * 0.12, rx * 0.88, ry * 0.88, med);
  elip(g, cx - rx * 0.3, cy - ry * 0.38, rx * 0.46, ry * 0.4, luz);
}
// contorno escuro ao redor de tudo
function contorno(g) {
  const base = g.map((l) => l.slice());
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (base[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => base[y + b] && base[y + b][x + a])) g[y][x] = K;
    }
  }
  return g;
}

// ---------- Slime Verde ----------
function slime(t) {
  const g = nova(24, 16);
  const h = [6.4, 7, 6.6, 6][t];
  const rx = [10, 9.4, 9.8, 10.6][t];
  const cy = 14.4 - h;
  corpo(g, 12, cy, rx, h, ['#237a30', '#4fc23f', '#a4f77c']);
  for (const [x, y] of [[8, 2], [16, 1], [14, 4], [10, 5]]) px(g, x, cy + y, '#9ff27a');
  px(g, 17, cy + 3, '#237a30');
  for (const x of [8, 14]) { ret(g, x, cy - 1, 2, 3, K); px(g, x, cy - 1, '#ffffff'); }
  ret(g, 10, cy + 3, 5, 1, '#1b4f22'); px(g, 10, cy + 4, '#1b4f22'); px(g, 14, cy + 4, '#1b4f22');
  ret(g, 7, cy - 4, 2, 1, '#ffffff'); px(g, 6, cy - 3, '#ffffff');
  ret(g, 5, 14, 15, 1, '#237a30');
  return contorno(g);
}

// ---------- Lobo Selvagem ----------
function lobo(t) {
  const g = nova(32, 20);
  const pel = ['#3c3f4e', '#7d8190', '#c4c8d8'];
  const mao = t % 2;
  const pernas = (x, a) => { ret(g, x + a, 14, 2, 4, pel[0]); ret(g, x + a, 17, 3, 2, '#1d1a26'); px(g, x + a, 18, '#ffffff'); };
  pernas(8, mao ? 1 : -1); pernas(12, mao ? -1 : 1); pernas(21, mao ? -1 : 1); pernas(25, mao ? 1 : -1);
  lin(g, 27, 9, 31, 4 + mao, pel[0], 3);
  px(g, 31, 4 + mao, pel[2]);
  corpo(g, 17, 10, 11, 5.6, pel);
  corpo(g, 9, 11, 5, 5, pel);
  for (let x = 11; x <= 24; x += 2) px(g, x, 5, pel[2]);
  corpo(g, 6, 8, 5, 4.4, pel);
  ret(g, 0, 8, 5, 3, pel[1]); px(g, 0, 8, '#111111'); ret(g, 1, 8, 3, 1, pel[2]);
  const boca = t === 1 || t === 2;
  ret(g, 1, boca ? 12 : 11, 5, 1, pel[0]);
  if (boca) { ret(g, 1, 11, 5, 1, '#8a1626'); px(g, 1, 10, '#ffffff'); px(g, 4, 10, '#ffffff'); px(g, 2, 12, '#ffffff'); px(g, 5, 12, '#ffffff'); } else { px(g, 1, 10, '#ffffff'); px(g, 4, 10, '#ffffff'); }
  ret(g, 5, 2, 2, 3, pel[0]); px(g, 5, 1, pel[0]); ret(g, 9, 3, 2, 2, pel[0]);
  ret(g, 4, 6, 2, 1, '#1d1a26');
  px(g, 4, 7, t === 3 ? '#ff7a1c' : '#ffd23a'); px(g, 5, 7, '#ffd23a');
  return contorno(g);
}

// ---------- Goblin Saqueador ----------
function goblin(t) {
  const g = nova(22, 28);
  const pele = ['#3a7430', '#68a84c', '#a8df7a'];
  lin(g, 7, 7, 1, 4 + (t % 2), pele[1], 2); lin(g, 15, 7, 20, 3 + (t % 2), pele[1], 2);
  ret(g, 8, 22, 3, 5, pele[0]); ret(g, 12, 22, 3, 5, pele[0]);
  ret(g, 7, 26, 5, 2, '#2a1a0e'); ret(g, 12, 26, 5, 2, '#2a1a0e');
  lin(g, 16, 14, 19, 20, pele[1], 2);
  ret(g, 7, 13, 9, 9, '#6b4426'); ret(g, 7, 13, 2, 9, '#8a5a34'); ret(g, 14, 13, 2, 9, '#4a2e18');
  ret(g, 7, 19, 9, 1, '#2a1a0e'); px(g, 11, 19, '#f2c230');
  lin(g, 8, 15, 3, 19, pele[1], 2);
  ret(g, 2, 11, 1, 8, '#d4dbef'); px(g, 2, 10, '#ffffff'); ret(g, 0, 19, 5, 1, '#7a5a2a'); ret(g, 2, 20, 1, 2, '#4a2e18');
  if (t === 3) px(g, 2, 9, '#ffffff');
  corpo(g, 11, 8, 5, 4.6, pele);
  ret(g, 7, 7, 3, 2, '#ffe14a'); ret(g, 12, 7, 3, 2, '#ffe14a'); px(g, 7, 8, K); px(g, 12, 8, K);
  ret(g, 7, 6, 3, 1, pele[0]); ret(g, 12, 6, 3, 1, pele[0]);
  px(g, 11, 10, pele[0]); ret(g, 8, 12, 7, 1, '#1e3a14'); px(g, 9, 11, '#ffffff'); px(g, 13, 11, '#ffffff');
  return contorno(g);
}

// ---------- Esqueleto Guerreiro ----------
function esqueleto(t) {
  const g = nova(22, 30);
  const osso = ['#8f8870', '#e4dec6', '#fffdf0'];
  ret(g, 8, 24, 2, 5, osso[1]); ret(g, 13, 24, 2, 5, osso[1]);
  ret(g, 7, 28, 4, 2, osso[0]); ret(g, 12, 28, 4, 2, osso[0]);
  ret(g, 8, 21, 8, 3, '#4a2a2a'); ret(g, 8, 23, 2, 1, '#2a1616'); ret(g, 12, 23, 3, 1, '#2a1616');
  ret(g, 10, 20, 4, 2, osso[1]); ret(g, 11, 14, 2, 7, osso[0]);
  for (const y of [14, 16, 18]) { ret(g, 7, y, 10, 1, osso[1]); px(g, 7, y + 1, osso[0]); px(g, 16, y + 1, osso[0]); }
  ret(g, 6, 12, 12, 1, osso[1]); ret(g, 6, 13, 12, 1, osso[0]);
  lin(g, 6, 13, 3, 20, osso[1], 1); lin(g, 18, 13, 20, 21, osso[1], 1);
  ret(g, 2, 7, 2, 13, '#aab0c2'); px(g, 2, 6, '#cfd6ea'); ret(g, 2, 7, 1, 11, '#e8ecf8'); px(g, 3, 12, '#8a5a3a'); px(g, 2, 16, '#8a5a3a');
  ret(g, 0, 20, 6, 1, '#6b5530'); ret(g, 2, 21, 2, 3, '#3a2a14');
  corpo(g, 12, 6, 5.2, 4.8, osso);
  ret(g, 8, 10, 8, 2, osso[1]);
  for (const x of [9, 11, 13, 15]) px(g, x, 11, '#3a3524');
  ret(g, 9, 5, 3, 3, K); ret(g, 13, 5, 3, 3, K);
  const brilho = t % 2 ? '#ff7a7a' : '#ff2b3b';
  px(g, 10, 6, brilho); px(g, 14, 6, brilho);
  px(g, 12, 8, '#3a3524');
  return contorno(g);
}

// ---------- Orc Brutamontes ----------
function orc(t) {
  const g = nova(30, 34);
  const pele = ['#27501e', '#4a8832', '#86c45e'];
  ret(g, 10, 27, 4, 5, pele[0]); ret(g, 16, 27, 4, 5, pele[0]);
  ret(g, 9, 31, 6, 3, '#2a1a0e'); ret(g, 15, 31, 6, 3, '#2a1a0e');
  corpo(g, 15, 20, 9.5, 7.6, pele);
  ret(g, 9, 26, 12, 4, '#5a3a22'); ret(g, 9, 26, 12, 1, '#7a5230');
  lin(g, 9, 14, 21, 25, '#3a2414', 2); ret(g, 8, 25, 14, 2, '#2a1a0e'); px(g, 15, 25, '#f2c230'); px(g, 16, 25, '#f2c230');
  corpo(g, 7, 15, 4, 3.4, ['#3a3f50', '#7c8298', '#c4c8d8']); corpo(g, 23, 15, 4, 3.4, ['#3a3f50', '#7c8298', '#c4c8d8']);
  px(g, 6, 11, '#c4c8d8'); px(g, 7, 10, '#c4c8d8'); px(g, 23, 11, '#c4c8d8'); px(g, 22, 10, '#c4c8d8');
  lin(g, 6, 17, 3, 26, pele[1], 3); elip(g, 3, 27, 2.6, 2.4, pele[1]);
  lin(g, 24, 17, 27, 26, pele[1], 3); elip(g, 27, 27, 2.6, 2.4, pele[1]);
  const bal = t % 2;
  ret(g, 2, 8 - bal, 2, 24 + bal, '#6b4426'); ret(g, 2, 8 - bal, 1, 24 + bal, '#8a5a34');
  poli(g, [[3, 6 - bal], [-1, 7 - bal], [-2, 12 - bal], [3, 14 - bal]], '#aab0c2');
  lin(g, -1, 7 - bal, -2, 12 - bal, '#e8ecf8', 1);
  corpo(g, 15, 8, 6, 5.4, pele);
  ret(g, 10, 6, 11, 2, pele[0]);
  px(g, 12, 8, '#ff3b3b'); px(g, 18, 8, '#ff3b3b'); px(g, 11, 8, K); px(g, 19, 8, K);
  ret(g, 11, 12, 9, 2, pele[0]);
  ret(g, 12, 12, 7, 1, '#2a0e10');
  ret(g, 11, 9, 1, 3, '#f2ecd0'); ret(g, 19, 9, 1, 3, '#f2ecd0');
  ret(g, 14, 10, 3, 1, pele[0]);
  return contorno(g);
}

// ---------- Golem de Pedra ----------
function golem(t) {
  const g = nova(34, 36);
  const ped = ['#464656', '#7a7b8c', '#b2b4c6'];
  const brilho = ['#ff9d2e', '#ffd24a', '#ff7a1c', '#ffd24a'][t];
  ret(g, 10, 26, 6, 8, ped[1]); ret(g, 18, 26, 6, 8, ped[1]);
  ret(g, 9, 32, 8, 4, ped[0]); ret(g, 17, 32, 8, 4, ped[0]);
  ret(g, 10, 26, 2, 7, ped[2]); ret(g, 18, 26, 2, 7, ped[2]);
  ret(g, 3, 12, 8, 14, ped[1]); ret(g, 3, 12, 2, 14, ped[2]); ret(g, 9, 12, 2, 14, ped[0]);
  ret(g, 23, 12, 8, 14, ped[1]); ret(g, 23, 12, 2, 14, ped[2]); ret(g, 29, 12, 2, 14, ped[0]);
  ret(g, 1, 24, 11, 8, ped[1]); ret(g, 1, 24, 3, 8, ped[2]); ret(g, 9, 24, 3, 8, ped[0]);
  ret(g, 22, 24, 11, 8, ped[1]); ret(g, 22, 24, 3, 8, ped[2]); ret(g, 30, 24, 3, 8, ped[0]);
  ret(g, 10, 10, 14, 16, ped[1]); ret(g, 10, 10, 3, 16, ped[2]); ret(g, 21, 10, 3, 16, ped[0]);
  ret(g, 10, 17, 14, 1, ped[0]); ret(g, 10, 24, 14, 1, ped[0]); ret(g, 17, 10, 1, 7, ped[0]);
  ret(g, 12, 2, 10, 8, ped[1]); ret(g, 12, 2, 3, 8, ped[2]); ret(g, 20, 2, 2, 8, ped[0]);
  ret(g, 13, 5, 3, 2, brilho); ret(g, 18, 5, 3, 2, brilho); ret(g, 14, 8, 6, 1, ped[0]);
  const r = [2.4, 3, 2.7, 3][t];
  elip(g, 17, 20, r + 1, r + 1, '#7a3a14'); elip(g, 17, 20, r, r, brilho); px(g, 16, 19, '#ffffff');
  lin(g, 12, 11, 14, 15, ped[0]); lin(g, 22, 19, 19, 23, ped[0]); lin(g, 5, 14, 7, 18, ped[0]); lin(g, 26, 26, 28, 30, ped[0]);
  for (const [x, y] of [[4, 12], [5, 12], [13, 2], [14, 2], [24, 12], [27, 12]]) px(g, x, y, '#3e7a3a');
  for (const [x, y] of [[4, 13], [14, 3], [25, 13]]) px(g, x, y, '#5aa04e');
  return contorno(g);
}

// ---------- Dragão Jovem ----------
const DRAGAO_VERMELHO = { esc: ['#6e1220', '#b01e2e', '#ee5a64'], mem: '#5a0e1c', osso: '#e8d9a0', costela: '#8a1a2a', ventre: '#e0b060', listra: '#b8843c', olho: '#ffe14a', fogo: '#ffb040' };
function dragao(t, pal = DRAGAO_VERMELHO) {
  const g = nova(44, 34);
  const esc = pal.esc;
  const mem = pal.mem;
  const alto = t % 2 === 0;
  const asa = alto ? [[26, 15], [34, 1], [43, 6], [40, 13], [36, 11], [32, 16]] : [[26, 15], [37, 14], [43, 24], [38, 24], [34, 20], [30, 19]];
  poli(g, asa, mem);
  const [[sx, sy], [px1, py1]] = [asa[0], asa[1]];
  lin(g, sx, sy, px1, py1, pal.osso, 1);
  for (const q of asa.slice(2, 5)) lin(g, sx, sy, q[0], q[1], pal.costela, 1);
  lin(g, 33, 22, 42, 27 + (t % 2), esc[0], 4); lin(g, 33, 22, 42, 27 + (t % 2), esc[1], 2);
  poli(g, [[41, 24 + (t % 2)], [44, 27 + (t % 2)], [41, 30 + (t % 2)]], pal.osso);
  ret(g, 17, 26, 3, 6, esc[0]); ret(g, 28, 26, 3, 6, esc[0]);
  ret(g, 15, 31, 5, 2, pal.osso); ret(g, 27, 31, 5, 2, pal.osso);
  corpo(g, 25, 21, 11.5, 7.4, esc);
  elip(g, 22, 24, 7, 4, pal.ventre); for (let x = 17; x <= 28; x += 3) ret(g, x, 22, 1, 5, pal.listra);
  lin(g, 16, 17, 9, 11, esc[0], 5); lin(g, 16, 17, 9, 11, esc[1], 3);
  corpo(g, 8, 10, 5.4, 4.4, esc);
  ret(g, 1, 9, 6, 4, esc[1]); ret(g, 1, 9, 6, 1, esc[2]); px(g, 1, 10, K);
  const boca = t === 1 || t === 2;
  ret(g, 2, boca ? 14 : 13, 5, 1, esc[0]);
  if (boca) { ret(g, 2, 13, 5, 1, pal.fogo); px(g, 3, 12, '#ffffff'); px(g, 6, 12, '#ffffff'); }
  else { px(g, 3, 13, '#ffffff'); px(g, 6, 13, '#ffffff'); }
  lin(g, 9, 6, 13, 1, pal.osso, 2); lin(g, 12, 7, 17, 4, pal.osso, 2);
  ret(g, 6, 8, 2, 2, pal.olho); px(g, 6, 9, K);
  if (t === 1 || t === 3) { px(g, 0, 7, '#9a96a8'); px(g, 1, 6, '#7a768a'); }
  return contorno(g);
}


// ---------- Lobo Infernal (chefe) ----------
function loboInfernal(t) {
  const g = nova(44, 30);
  const pel = ['#1c0f1a', '#3e1a2a', '#8a3040'];
  const m = t % 2;
  const perna = (x, a) => { ret(g, x + a, 19, 3, 6, pel[0]); ret(g, x + a, 24, 4, 3, K); px(g, x + a, 26, '#ff7a1c'); };
  perna(11, m ? 1 : -1); perna(16, m ? -1 : 1); perna(29, m ? -1 : 1); perna(34, m ? 1 : -1);
  lin(g, 36, 13, 42, 6 + m, pel[0], 4);
  poli(g, [[41, 8 + m], [44, 0 + m], [40, 4 + m]], '#ff7a1c'); px(g, 42, 5 + m, '#ffd24a');
  corpo(g, 24, 15, 14, 7.6, pel);
  corpo(g, 12, 16, 6.4, 6.4, pel);
  for (let x = 15; x <= 36; x += 3) {
    const h = 3 + (((x / 3) + t) % 3) * 2;
    poli(g, [[x - 1, 9], [x + 2, 9], [x + 0.5, 9 - h]], '#ff7a1c');
    px(g, x, 9 - h + 2, '#ffd24a'); px(g, x + 1, 8, '#ffd24a');
  }
  corpo(g, 8, 11, 6.2, 5.4, pel);
  ret(g, 0, 12, 7, 4, pel[1]); ret(g, 1, 12, 5, 1, pel[2]); px(g, 0, 12, '#ff3b3b');
  const boca = t === 1 || t === 2;
  ret(g, 1, boca ? 17 : 16, 6, 1, pel[0]);
  if (boca) { ret(g, 1, 16, 6, 1, '#ff7a1c'); px(g, 2, 15, '#ffd24a'); px(g, 1, 15, '#ffffff'); px(g, 5, 15, '#ffffff'); px(g, 3, 17, '#ffffff'); px(g, 6, 17, '#ffffff'); }
  else { px(g, 1, 15, '#ffffff'); px(g, 5, 15, '#ffffff'); }
  ret(g, 6, 3, 2, 5, pel[0]); px(g, 6, 2, '#ff7a1c'); ret(g, 10, 4, 2, 4, pel[0]); px(g, 10, 3, '#ff7a1c');
  ret(g, 5, 9, 3, 2, '#ff3b3b'); px(g, 5, 9, '#ffffff'); px(g, 7, 9, t === 3 ? '#ffd24a' : '#ff3b3b');
  ret(g, 4, 8, 4, 1, pel[0]);
  return contorno(g);
}

// ---------- Aranha Gigante (chefe) ----------
function aranha(t) {
  const g = nova(48, 34);
  const per = ['#3d2260', '#9a6ad0'];
  const perna = (ax, ay, lado, i, perto) => {
    const k = i - 1.5;
    const jx = ax + lado * (4 + i * 1.5);
    const jy = 4 + Math.abs(k) * 2 + (perto ? 0 : 1);
    const fx = ax + lado * (9 + i * 3) + (((t + i) % 2) ? 1 : -1);
    lin(g, ax, ay, jx, jy, per[0], 2); lin(g, jx, jy, fx, 31, per[0], 2);
    px(g, jx, jy, per[1]); px(g, fx, 31, per[1]); px(g, fx, 30, per[1]);
  };
  for (let i = 0; i < 4; i++) { perna(27 + i * 3, 17, 1, i, false); }
  for (let i = 0; i < 4; i++) { perna(15 + i * 3, 17, -1, i, false); perna(17 + i * 3, 19, -1, i, true); }
  corpo(g, 34, 17, 11, 9, ['#14081c', '#2f1647', '#5a2f82']);
  for (const [x, y] of [[33, 14], [33, 15], [32, 16], [34, 16], [33, 17], [33, 18], [32, 19], [34, 19]]) px(g, x, y, '#e0283c');
  for (let y = 9; y < 25; y += 3) px(g, 41, y, '#5a2f82');
  corpo(g, 17, 18, 7.4, 6.2, ['#14081c', '#2f1647', '#5a2f82']);
  corpo(g, 9, 17, 5, 4.6, ['#14081c', '#3a1d57', '#6a3a94']);
  for (const [x, y] of [[5, 14], [8, 13], [6, 16], [9, 15], [4, 17], [7, 18]]) { px(g, x, y, '#ff3b3b'); }
  px(g, 5, 14, '#ffffff'); px(g, 8, 13, '#ffffff');
  const boca = t === 1 || t === 2 ? 1 : 0;
  ret(g, 3, 20 + boca, 2, 3, '#e8e2cc'); ret(g, 7, 20 + boca, 2, 3, '#e8e2cc'); px(g, 3, 22 + boca, '#9c9680'); px(g, 8, 22 + boca, '#9c9680');
  if (boca) { px(g, 3, 24, '#7a3cff'); px(g, 8, 24, '#7a3cff'); }
  return contorno(g);
}

// ---------- Rei Esqueleto (chefe) ----------
function reiEsqueleto(t) {
  const g = nova(34, 44);
  const osso = ['#8f8870', '#e4dec6', '#fffdf0'];
  const azul = t % 2 ? '#9fe6ff' : '#5cc8ff';
  poli(g, [[11, 15], [27, 15], [33, 40], [26, 38], [20, 42], [12, 39], [6, 41]], '#3a1058');
  poli(g, [[22, 15], [27, 15], [33, 40], [26, 38], [22, 30]], '#240838');
  lin(g, 11, 15, 8, 40, '#6a2a98', 1);
  ret(g, 12, 29, 2, 12, osso[1]); ret(g, 18, 29, 2, 12, osso[1]);
  ret(g, 10, 41, 5, 3, osso[0]); ret(g, 17, 41, 5, 3, osso[0]);
  ret(g, 10, 25, 11, 4, '#4a1a5a'); ret(g, 10, 28, 3, 1, '#2a0838'); ret(g, 16, 28, 4, 1, '#2a0838');
  ret(g, 13, 23, 5, 3, osso[1]); ret(g, 14, 15, 3, 9, osso[0]);
  for (const y of [16, 18, 20]) { ret(g, 9, y, 13, 1, osso[1]); px(g, 9, y + 1, osso[0]); px(g, 21, y + 1, osso[0]); }
  ret(g, 8, 14, 15, 1, osso[1]); ret(g, 8, 15, 15, 1, osso[0]);
  corpo(g, 7, 15, 3.4, 2.6, ['#c9a227', '#f2c230', '#fff4b8']); corpo(g, 24, 15, 3.4, 2.6, ['#c9a227', '#f2c230', '#fff4b8']);
  lin(g, 7, 16, 4, 25, osso[1], 2); lin(g, 24, 16, 28, 25, osso[1], 2);
  lin(g, 3, 8, 3, 28, '#4a3022', 2); elip(g, 3, 6, 2.8, 2.8, '#c9a227'); elip(g, 3, 6, 1.8, 1.8, azul); px(g, 2, 5, '#ffffff');
  px(g, 0, 3, azul); px(g, 6, 9, azul);
  corpo(g, 16, 9, 6, 5.6, osso);
  ret(g, 11, 13, 10, 2, osso[1]);
  for (const x of [12, 14, 16, 18, 20]) px(g, x, 14, '#3a3524');
  ret(g, 12, 7, 3, 3, K); ret(g, 17, 7, 3, 3, K); px(g, 13, 8, azul); px(g, 18, 8, azul);
  px(g, 16, 11, '#3a3524');
  ret(g, 11, 2, 11, 3, '#f2c230'); ret(g, 11, 4, 11, 1, '#a8731a');
  for (const x of [11, 14, 17, 20]) { px(g, x, 1, '#f2c230'); px(g, x, 0, '#fff4b8'); }
  px(g, 16, 3, '#e0283c'); px(g, 13, 3, '#3b6bff'); px(g, 19, 3, '#3b6bff');
  return contorno(g);
}

// ---------- Lich Ancião ----------
function lich(t) {
  const g = nova(28, 40);
  const rb = ['#220f3c', '#46267a', '#7a52b8'];
  const verde = ['#5cff6a', '#9dffa6', '#3cc84a'][t % 3];
  const bar = t % 2;
  poli(g, [[8, 15], [20, 15], [25, 36], [3, 36]], rb[1]);
  poli(g, [[14, 15], [20, 15], [25, 36], [14, 36]], rb[0]);
  poli(g, [[8, 15], [10, 15], [6, 36], [3, 36]], rb[2]);
  for (let x = 3; x <= 25; x += 2) ret(g, x, 36, 2, 1 + ((x / 2 + t) % 3), rb[1]);
  lin(g, 14, 16, 14, 36, '#c9a227', 1);
  ret(g, 9, 15, 11, 2, '#c9a227'); px(g, 14, 17, '#e8d9a0');
  lin(g, 8, 17, 5, 25, rb[1], 3); ret(g, 4, 24, 3, 2, '#e4dec6');
  lin(g, 4, 40 - 1, 4, 9 + bar, '#4a3022', 2);
  elip(g, 4, 6 + bar, 3.4, 3.4, '#1d5a24'); elip(g, 4, 6 + bar, 2.6, 2.6, verde); px(g, 3, 5 + bar, '#ffffff');
  if (t % 2) { px(g, 0, 3, verde); px(g, 8, 9, verde); } else { px(g, 1, 9, verde); px(g, 8, 4, verde); }
  lin(g, 20, 17, 24, 22, rb[1], 3); ret(g, 23, 22, 3, 2, '#e4dec6'); px(g, 24, 20 - (t % 2), verde); px(g, 24, 19 - (t % 2), '#3cc84a');
  corpo(g, 14, 9, 7, 7, rb);
  elip(g, 14, 10, 4.2, 5, '#0a0414');
  elip(g, 14, 10, 3.2, 3.8, '#e4dec6'); px(g, 12, 8, '#fffdf0');
  ret(g, 12, 9, 2, 2, K); ret(g, 15, 9, 2, 2, K); px(g, 12, 9, verde); px(g, 16, 9, verde);
  px(g, 14, 12, '#3a3524'); for (const x of [12, 14, 16]) px(g, x, 13, '#3a3524');
  ret(g, 10, 3, 9, 1, '#c9a227'); for (const x of [10, 14, 18]) px(g, x, 2, '#f2c230');
  return contorno(g);
}

// ---------- Cavaleiro das Trevas ----------
function cavaleiro(t) {
  const g = nova(30, 42);
  const arm = ['#15121e', '#2b2838', '#5a5678'];
  const luz = '#8a5cff';
  const olho = t % 2 ? '#ff8a8a' : '#ff2b3b';
  poli(g, [[18, 18], [28, 18], [29, 40], [22, 38], [17, 40]], '#4a0c18'); poli(g, [[24, 18], [28, 18], [29, 40], [26, 36]], '#2a0610');
  ret(g, 11, 31, 5, 9, arm[1]); ret(g, 17, 31, 5, 9, arm[1]); ret(g, 11, 31, 1, 9, arm[2]); ret(g, 17, 31, 1, 9, arm[2]);
  ret(g, 10, 38, 7, 4, arm[0]); ret(g, 17, 38, 7, 4, arm[0]); px(g, 10, 38, luz);
  corpo(g, 16, 24, 8, 8.4, arm);
  ret(g, 11, 30, 11, 2, '#3a3550'); px(g, 16, 30, '#c9a227'); px(g, 17, 30, '#c9a227');
  ret(g, 16, 19, 1, 8, luz); ret(g, 13, 22, 7, 1, luz);
  corpo(g, 6, 18, 4.4, 3.8, arm); corpo(g, 26, 18, 4.4, 3.8, arm);
  px(g, 3, 14, '#8f93a8'); px(g, 4, 13, '#8f93a8'); px(g, 28, 14, '#8f93a8'); px(g, 27, 13, '#8f93a8');
  lin(g, 6, 20, 4, 31, arm[1], 3); ret(g, 2, 31, 5, 3, arm[0]);
  lin(g, 26, 20, 27, 30, arm[1], 3);
  lin(g, 4, 34, 4, 8, '#aab0c2', 2); lin(g, 4, 33, 4, 9, '#e8ecf8', 1); px(g, 3, 8, '#cfd6ea');
  ret(g, 0, 34, 9, 2, '#3a3550'); px(g, 0, 34, luz); px(g, 8, 34, luz); ret(g, 3, 36, 3, 4, '#2a2238');
  corpo(g, 16, 10, 5.6, 6, arm);
  ret(g, 11, 9, 11, 2, K); ret(g, 12, 9, 3, 1, olho); ret(g, 17, 9, 3, 1, olho);
  ret(g, 14, 13, 5, 1, arm[0]);
  lin(g, 11, 6, 7, 1, '#8f93a8', 2); lin(g, 21, 6, 25, 1, '#8f93a8', 2);
  px(g, 16, 3, luz); px(g, 16, 4, luz);
  return contorno(g);
}

// ---------- Hidra Abissal ----------
function hidra(t) {
  const g = nova(46, 38);
  const esc = ['#0f3a34', '#1f7a6a', '#58d8b0'];
  const bal = (f) => Math.sin(((t + f) * Math.PI) / 2) * 1.8;
  corpo(g, 23, 32, 16, 6.4, esc);
  for (let x = 12; x <= 34; x += 3) px(g, x, 28, esc[2]);
  for (let x = 14; x <= 32; x += 4) ret(g, x, 34, 2, 1, '#e0b060');
  const pescocos = [[14, 29, 8, 9, 0], [23, 28, 22, 5, 1], [32, 29, 36, 11, 2]];
  for (const [x0, y0, hx, hy, f] of pescocos) {
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const x = x0 + (hx - x0) * k + Math.sin(k * Math.PI) * bal(f) * 2.2;
      const y = y0 + (hy - y0) * k;
      elip(g, x, y, 2.6 - k * 0.3, 2.6 - k * 0.3, esc[1]);
      px(g, x - 1, y - 1, esc[2]);
    }
    const bx = hx + Math.sin(Math.PI) * 0 + bal(f) * 0.0;
    corpo(g, bx, hy, 3.6, 2.8, esc);
    ret(g, Math.round(bx) - 6, Math.round(hy), 4, 2, esc[1]);
    px(g, Math.round(bx) - 6, Math.round(hy), K);
    px(g, Math.round(bx) - 1, Math.round(hy) - 1, '#ffe14a'); px(g, Math.round(bx) - 2, Math.round(hy) - 1, '#ffe14a');
    px(g, Math.round(bx) - 5, Math.round(hy) + 2, '#ffffff'); px(g, Math.round(bx) - 3, Math.round(hy) + 2, '#ffffff');
    if ((t + f) % 2) { ret(g, Math.round(bx) - 8, Math.round(hy) + 2, 3, 1, '#e0283c'); px(g, Math.round(bx) - 9, Math.round(hy) + 1, '#e0283c'); px(g, Math.round(bx) - 9, Math.round(hy) + 3, '#e0283c'); }
  }
  return contorno(g);
}

// ---------- Devorador de Almas ----------
function devorador(t) {
  const g = nova(36, 42);
  const es = ['#14304a', '#2f6a9a', '#8fd6ff'];
  for (let y = 26; y <= 40; y++) {
    const k = (y - 26) / 14;
    const x = 18 + Math.sin(y * 0.55 + t * 1.57) * 2.4;
    const r = 8.5 * (1 - k * 0.85);
    for (let i = Math.round(x - r); i <= Math.round(x + r); i++) if (((i + y) & 1) === 0 || r > 4) px(g, i, y, k > 0.5 ? es[0] : es[1]);
  }
  corpo(g, 18, 17, 11.5, 14, es);
  lin(g, 7, 20, 1, 30 + (t % 2), es[1], 3); lin(g, 29, 20, 35, 30 + ((t + 1) % 2), es[1], 3);
  for (const [x, y] of [[0, 32], [1, 33], [35, 32], [34, 33]]) px(g, x, y, es[2]);
  lin(g, 9, 7, 4, 0, es[0], 2); lin(g, 27, 7, 32, 0, es[0], 2);
  elip(g, 18, 21, 7.4, 6, '#04070d');
  for (let x = 12; x <= 24; x += 2) px(g, x, 16 + ((x / 2) % 2), '#e8f6ff');
  for (let x = 13; x <= 23; x += 2) px(g, x, 26, '#e8f6ff');
  for (const [x, y] of [[15, 21], [19, 22], [21, 20], [17, 23]]) px(g, x, y, t % 2 ? '#9a6cff' : '#7a3cff');
  elip(g, 13, 10, 2.6, 2, '#ffffff'); elip(g, 23, 10, 2.6, 2, '#ffffff');
  px(g, 12, 9, '#9fe6ff'); px(g, 22, 9, '#9fe6ff');
  const orb = [[3, 14], [33, 12], [6, 36], [31, 38]];
  orb.forEach(([x, y], i) => px(g, x, y - ((i + t) % 3), '#cfeaff'));
  return contorno(g);
}

// ---------- Sombra (monstro desconhecido) ----------
function sombra(t) {
  const g = nova(24, 24);
  corpo(g, 12, 13, 9, 9, ['#1a1428', '#3a2d5a', '#6d5aa0']);
  ret(g, 7, 10, 3, 2, '#ff3b3b'); ret(g, 14, 10, 3, 2, '#ff3b3b');
  ret(g, 8, 16, 8, 2, K);
  if (t % 2) px(g, 12, 2, '#6d5aa0');
  return contorno(g);
}

const ARTE = {
  'Slime Verde': slime, 'Lobo Selvagem': lobo, 'Goblin Saqueador': goblin, 'Esqueleto Guerreiro': esqueleto,
  'Orc Brutamontes': orc, 'Golem de Pedra': golem, 'Dragão Jovem': (t) => dragao(t), 'Lich Ancião': lich,
  'Cavaleiro das Trevas': cavaleiro, 'Hidra Abissal': hidra, 'Devorador de Almas': devorador,
  // chefes
  'Dragão Negro': (t) => dragao(t, { esc: ['#08060c', '#221a2c', '#5a4668'], mem: '#7a0f22', osso: '#c9bfa8', costela: '#a01830', ventre: '#8a1428', listra: '#4a0a14', olho: '#ff3b3b', fogo: '#ff7a1c' }),
  'Lobo Infernal': loboInfernal, 'Aranha Gigante': aranha, 'Rei Esqueleto': reiEsqueleto,
};

// Registra um monstro novo (usado pelos chefes): nome -> função (t 0..3) que devolve uma grade
function registrar(nome, fn) { ARTE[nome] = fn; }

const cache = new Map();
function grade(nome, t = 0) {
  const chave = `${nome}:${t % 4}`;
  if (!cache.has(chave)) cache.set(chave, (ARTE[nome] || sombra)(t % 4));
  return cache.get(chave);
}

module.exports = { grade, registrar, K, nova, px, ret, elip, lin, poli, corpo, contorno, ARTE };
// fim do arquivo
