// Efeitos de batalha em pixel art: arcos de golpe, faíscas, bola de fogo, chuva de flechas, pilar de luz,
// ataques próprios dos monstros (garra, mordida, fogo, veneno, sombra), tremor de tela e a queda do Boss.
// Cada golpe tem 4 quadros: 0 preparo, 1 ataque, 2 impacto, 3 efeito se dissipando.
const W = 84;
const H = 56;
const CHAO = 51;

const px = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c; };
const ret = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
function lin(g, x0, y0, x1, y1, c, esp = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n; const y = y0 + ((y1 - y0) * i) / n;
    for (let a = 0; a < esp; a++) for (let b = 0; b < esp; b++) px(g, x + a - (esp > 1 ? 0.5 : 0), y + b - (esp > 1 ? 0.5 : 0), c);
  }
}
function elip(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(g, x, y, c);
}
function aro(g, cx, cy, rx, ry, c) {
  const n = Math.max(12, Math.round((rx + ry) * 4));
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; px(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c); }
}

// ---------- Paletas ----------
const HEROI = { claro: '#ffffff', medio: '#ffe9a8', forte: '#ffb347', sombra: '#a8731a' };
const MONSTRO = { claro: '#ffffff', medio: '#ff9a9a', forte: '#e0455a', sombra: '#7a1a2a' };
const FOGO = ['#fff4b8', '#ffd24a', '#ff7a1c', '#c8340f', '#4a4058'];
const VENENO = ['#e8ffd0', '#9aff6a', '#4cd964', '#1f7a3a'];
const SOMBRA = ['#f0e6ff', '#c8b8ff', '#8a52d8', '#47246e'];
const LUZ = ['#ffffff', '#fff4b8', '#f2c230', '#a8731a'];

// ---------- Peças reutilizáveis ----------
// Arco em forma de lua crescente, afinando nas pontas (p = quanto do arco já foi desenhado)
function arco(g, cx, cy, r, a0, a1, p, s, esp, cor, nucleo, rot = 0) {
  const n = Math.max(10, Math.round(Math.abs(a1 - a0) * r * 1.6));
  const fim = Math.floor(n * p);
  for (let k = 0; k <= fim; k++) {
    const f = k / n;
    const a = a0 + (a1 - a0) * f;
    let dx = Math.cos(a) * r * s; let dy = Math.sin(a) * r;
    const rx = dx * Math.cos(rot) - dy * Math.sin(rot); const ry = dx * Math.sin(rot) + dy * Math.cos(rot);
    dx = rx; dy = ry;
    const e = Math.max(1, esp * Math.sin(Math.PI * Math.min(1, f)));
    elip(g, cx + dx, cy + dy, e / 2, e / 2, cor);
    if (nucleo && e >= 2.4) px(g, cx + dx, cy + dy, nucleo);
  }
}
function faiscas(g, x, y, i, cores, n = 10, alcance = 1) {
  if (i < 2) return;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.4 * (k % 2);
    const d = ([0, 0, 3.5, 7.5][i] + (k % 3) * 1.4) * alcance;
    px(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85 + (i === 3 ? 1.5 : 0), cores[(k + i) % cores.length]);
    if (i === 2) px(g, x + Math.cos(a) * (d - 1.4), y + Math.sin(a) * (d - 1.4) * 0.85, cores[(k + 1) % cores.length]);
  }
}
function estrela(g, x, y, r, c1, c2) {
  for (let k = -r; k <= r; k++) { px(g, x + k, y, c1); px(g, x, y + k, c1); }
  for (let k = 1; k < r; k++) { px(g, x + k, y + k, c2); px(g, x - k, y - k, c2); px(g, x + k, y - k, c2); px(g, x - k, y + k, c2); }
  px(g, x, y, '#ffffff');
}
function onda(g, x, y, i, cor, ry = 1, grande = 1) {
  if (i < 2) return;
  aro(g, x, y, (i === 2 ? 5 : 10) * grande, (i === 2 ? 5 : 10) * grande * ry, cor);
}
// "Clarão": um flash por tramado (não cria cores novas)
function clarao(g, x, y, r, cor = '#ffffff') {
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
    const d = Math.hypot(xx - x, (yy - y) * 1.1) / r;
    if (d < 1 && d > 0.55 && (xx + yy) % 2 === 0) px(g, xx, yy, cor); // só a borda: o monstro continua visível
  }
}
function rastro(g, x0, y0, x1, y1, cor) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) if (k % 2 === 0) px(g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, cor);
}
function espiral(g, x, y, i, cor, cor2, n = 6) {
  for (let k = 0; k < n; k++) {
    const a = k * 1.1 + i * 0.9;
    const yy = y + 8 - ((i * 3 + k * 2.2) % 15);
    px(g, x + Math.cos(a) * 6, yy, k % 2 ? cor : cor2);
    if (k % 2 === 0) px(g, x + Math.cos(a) * 6, yy - 1, cor);
  }
}

// ---------- Golpes dos heróis ----------
function golpeCorte(g, i, para, s, P, crit, rot = 0.3) {
  const cx = para.x - s * 9; const cy = para.y;
  if (i === 1) arco(g, cx, cy, 12, -1.05, 1.05, 0.55, s, 3.4, P.forte, P.medio, rot);
  if (i === 2) { arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 3.6, P.medio, P.claro, rot); estrela(g, para.x + s * 2, para.y, crit ? 7 : 4, P.medio, P.forte); faiscas(g, para.x, para.y, i, [P.claro, P.medio, P.forte], 10); }
  if (i === 3) { arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 2, P.sombra, null, rot); faiscas(g, para.x, para.y, i, [P.medio, P.forte, P.sombra], 10); }
}
function golpeCruz(g, i, para, s, P) {
  const cx = para.x - s * 9; const cy = para.y;
  if (i === 1) { arco(g, cx, cy, 12, -1.05, 1.05, 0.6, s, 3.4, P.forte, P.medio, 0.6); }
  if (i === 2) {
    arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 3.4, P.medio, P.claro, 0.6); arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 3.4, P.medio, P.claro, -0.6);
    estrela(g, para.x + s * 2, para.y, 8, P.medio, P.forte); faiscas(g, para.x, para.y, i, [P.claro, P.medio, P.forte], 12);
    aro(g, para.x, CHAO, 6, 1.5, P.medio);
  }
  if (i === 3) {
    arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 2, P.sombra, null, 0.6); arco(g, cx, cy, 12, -1.05, 1.05, 1, s, 2, P.sombra, null, -0.6);
    aro(g, para.x, CHAO, 12, 2.6, P.forte); faiscas(g, para.x, para.y, i, [P.medio, P.sombra], 10);
  }
}
function golpeFogo(g, i, de, para, s) {
  if (i === 1) {
    const t = 0.55; const bx = de.x + (para.x - de.x) * t; const by = de.y + (para.y - de.y) * t - 2;
    rastro(g, de.x + s * 4, de.y, bx - s * 4, by, FOGO[2]); elip(g, bx - s * 4, by, 1.6, 1.6, FOGO[3]);
    elip(g, bx, by, 3.2, 3.2, FOGO[2]); elip(g, bx, by, 2, 2, FOGO[1]); elip(g, bx, by, 1, 1, FOGO[0]);
  }
  if (i === 2) {
    elip(g, para.x, para.y, 8, 8, FOGO[3]); elip(g, para.x, para.y, 6.4, 6.4, FOGO[2]); elip(g, para.x, para.y, 4.4, 4.4, FOGO[1]); elip(g, para.x, para.y, 2.2, 2.2, FOGO[0]);
    faiscas(g, para.x, para.y, i, [FOGO[0], FOGO[1], FOGO[2]], 14, 1.3);
    elip(g, para.x - 3, para.y - 9, 2.5, 2, FOGO[4]); elip(g, para.x + 3, para.y - 11, 2, 1.6, FOGO[4]);
  }
  if (i === 3) {
    aro(g, para.x, para.y, 10, 10, FOGO[3]);
    for (let k = 0; k < 7; k++) px(g, para.x - 8 + k * 2.6, para.y - 4 + ((k * 5) % 7) + 3, FOGO[k % 2 ? 2 : 1]);
    elip(g, para.x - 2, para.y - 13, 3, 2, FOGO[4]); elip(g, para.x + 4, para.y - 16, 2.2, 1.6, FOGO[4]);
  }
}
function golpeFlechas(g, i, de, para, s, P) {
  if (i === 0) return;
  for (let k = 0; k < 4; k++) {
    const x0 = de.x + s * 5; const y0 = de.y - 7 + k * 3;
    const x1 = para.x - s * 2; const y1 = para.y - 9 + k * 5;
    const t = i === 1 ? 0.5 : 1;
    const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t - 7 * Math.sin(Math.PI * t) * (i === 1 ? 1 : 0.1);
    if (i === 1) {
      rastro(g, x - s * 9, y + 1, x - s * 2, y, '#e8d9a0');
      lin(g, x - s * 5, y, x, y, '#e8d9a0', 1); px(g, x + s, y, '#ffffff'); px(g, x - s * 5, y - 1, P.forte); px(g, x - s * 5, y + 1, P.forte);
    } else {
      lin(g, x - s * 5, y, x, y, i === 2 ? '#e8d9a0' : '#8a7a50', 1); px(g, x, y, i === 2 ? '#ffffff' : '#b8a870'); px(g, x - s * 5, y - 1, '#c9a227'); px(g, x - s * 5, y + 1, '#c9a227');
    }
  }
  if (i >= 2) faiscas(g, para.x, para.y, i, [P.claro, P.medio, '#e8d9a0'], 8, 0.8);
}
function golpeLuz(g, i, para, de, P) {
  const alturas = [0, 2, 4, 3];
  if (i >= 1) {
    const w = alturas[i];
    for (let y = 2; y < para.y + 8; y++) { for (let x = -w; x <= w; x++) { const ax = Math.abs(x); const c = ax <= w - 3 ? LUZ[0] : ax <= w - 1 ? LUZ[1] : LUZ[2]; if (i === 3 && (x + y) % 2) continue; px(g, para.x + x, y, c); } }
    elip(g, para.x, para.y + 2, w + 3, 4, i === 2 ? LUZ[1] : LUZ[2]); elip(g, para.x, para.y + 2, w, 2.6, LUZ[0]);
    for (let k = 0; k < 8; k++) px(g, para.x - 8 + k * 2.3, para.y + 4 - ((i * 3 + k * 3) % 18), k % 2 ? LUZ[0] : LUZ[1]);
  }
  if (i === 2) aro(g, para.x, para.y + 8, 8, 2.4, LUZ[1]);
  if (i === 3) aro(g, para.x, para.y + 8, 14, 4, LUZ[2]);
}
function golpeFurtivo(g, i, de, para, s) {
  if (i === 1) {
    for (let k = 0; k < 3; k++) rastro(g, de.x + s * 6, para.y - 5 + k * 5, para.x - s * 6, para.y - 5 + k * 5, SOMBRA[k % 2 ? 1 : 2]);
    elip(g, (de.x + para.x) / 2, para.y, 3, 7, SOMBRA[3]);
  }
  if (i === 2) {
    lin(g, para.x - s * 7, para.y - 8, para.x + s * 7, para.y + 8, SOMBRA[0], 2); lin(g, para.x - s * 7, para.y + 8, para.x + s * 7, para.y - 8, SOMBRA[1], 2);
    elip(g, para.x, para.y, 4, 4, SOMBRA[2]); estrela(g, para.x, para.y, 5, SOMBRA[0], SOMBRA[1]);
    faiscas(g, para.x, para.y, i, [SOMBRA[0], SOMBRA[1], SOMBRA[2]], 10);
  }
  if (i === 3) {
    lin(g, para.x - s * 7, para.y - 8, para.x + s * 7, para.y + 8, SOMBRA[3], 1); lin(g, para.x - s * 7, para.y + 8, para.x + s * 7, para.y - 8, SOMBRA[2], 1);
    for (let k = 0; k < 6; k++) px(g, para.x - 6 + k * 2.4, para.y + 5 - ((k * 3) % 5), SOMBRA[3]);
  }
}

// ---------- Ataques dos monstros ----------
function ataqueGarra(g, i, para, s) {
  for (let k = 0; k < 3; k++) {
    const ox = k * 4 * s; const oy = (k - 1) * 3;
    const x0 = para.x - 8 * s + ox; const y0 = para.y - 11 + oy; const x1 = para.x + 3 * s + ox; const y1 = para.y + 9 + oy;
    if (i === 1) lin(g, x0, y0, x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.5, MONSTRO.forte, 2);
    if (i === 2) { lin(g, x0, y0, x1, y1, MONSTRO.medio, 3); lin(g, x0, y0, x1, y1, MONSTRO.claro, 1); }
    if (i === 3) lin(g, x0, y0, x1, y1, MONSTRO.sombra, 1);
  }
  if (i >= 2) faiscas(g, para.x, para.y, i, [MONSTRO.claro, MONSTRO.medio, MONSTRO.forte], 8);
}
function ataqueMordida(g, i, para, s) {
  const y = para.y;
  const abre = i === 1 ? 9 : i === 2 ? 1 : 4;
  if (i >= 1 && i <= 3) {
    for (let k = -3; k <= 3; k++) {
      const x = para.x + k * 2.4;
      const cor = i === 3 ? MONSTRO.sombra : '#ffffff';
      lin(g, x, y - abre - 3 + Math.abs(k % 2) * 2, x + 1, y - abre + 1, cor, 1);
      lin(g, x, y + abre + 3 - Math.abs(k % 2) * 2, x + 1, y + abre - 1, cor, 1);
    }
    ret(g, para.x - 8, y - abre - 4, 17, 1, MONSTRO.forte); ret(g, para.x - 8, y + abre + 4, 17, 1, MONSTRO.forte);
  }
  if (i === 2) faiscas(g, para.x, y, i, [MONSTRO.claro, MONSTRO.medio, MONSTRO.forte], 8);
  if (i === 3) for (let k = 0; k < 3; k++) px(g, para.x - 4 + k * 4, y + 6 + (k % 2) * 2, MONSTRO.forte);
}
function ataqueFogo(g, i, de, para, s) {
  const ax = de.x + s * 7; const ay = de.y - 3;
  if (i === 1 || i === 2) {
    const alc = i === 1 ? 0.6 : 1;
    for (let k = 0; k < 22; k++) {
      const t = (k / 21) * alc;
      const x = ax + (para.x - ax) * t; const y = ay + (para.y - ay) * t;
      const espalha = Math.sin(k * 2.3) * (1 + t * 6);
      const r = 1 + t * 2;
      elip(g, x, y + espalha, r, r, FOGO[Math.min(3, Math.floor(t * 4.5))]);
    }
  }
  if (i === 2) { elip(g, para.x, para.y, 6, 6, FOGO[2]); elip(g, para.x, para.y, 3.6, 3.6, FOGO[1]); faiscas(g, para.x, para.y, i, [FOGO[0], FOGO[1], FOGO[2]], 12, 1.2); }
  if (i === 3) { for (let k = 0; k < 7; k++) px(g, para.x - 8 + k * 2.6, para.y - 3 + ((k * 5) % 8), FOGO[k % 2 ? 2 : 1]); elip(g, para.x, para.y - 11, 3, 2, FOGO[4]); }
}
function ataqueVeneno(g, i, de, para, s) {
  const ax = de.x + s * 6; const ay = de.y - 4;
  if (i === 1) {
    const t = 0.55; const x = ax + (para.x - ax) * t; const y = ay + (para.y - ay) * t - 8 * Math.sin(Math.PI * t);
    elip(g, x, y, 2.6, 2.6, VENENO[2]); elip(g, x, y, 1.4, 1.4, VENENO[1]); px(g, x - 1, y - 1, VENENO[0]);
    for (let k = 1; k <= 3; k++) px(g, x - s * k * 2.4, y + k * 0.8, VENENO[2]);
  }
  if (i === 2) {
    elip(g, para.x, para.y, 7, 5, VENENO[2]); elip(g, para.x, para.y, 4.6, 3, VENENO[1]); px(g, para.x - 1, para.y - 1, VENENO[0]);
    faiscas(g, para.x, para.y, i, [VENENO[0], VENENO[1], VENENO[2]], 12);
  }
  if (i === 3) {
    elip(g, para.x, para.y, 5, 3.4, VENENO[3]);
    for (let k = 0; k < 4; k++) { const x = para.x - 6 + k * 4; ret(g, x, para.y + 1, 1, 3 + (k % 2) * 2, VENENO[2]); px(g, x, para.y + 5 + (k % 2) * 2, VENENO[1]); }
  }
}
function ataqueSombra(g, i, de, para, s) {
  const ax = de.x + s * 6; const ay = de.y - 4;
  if (i === 1) {
    for (let k = 0; k < 14; k++) {
      const t = (k / 13) * 0.65; const x = ax + (para.x - ax) * t; const y = ay + (para.y - ay) * t + Math.sin(k * 1.4) * 4;
      px(g, x, y, SOMBRA[k % 2 ? 1 : 2]); px(g, x, y + 1, SOMBRA[3]);
    }
  }
  if (i === 2) {
    elip(g, para.x, para.y, 7, 7, SOMBRA[3]); elip(g, para.x, para.y, 5, 5, SOMBRA[2]); elip(g, para.x, para.y, 2.4, 2.4, SOMBRA[0]);
    for (let k = 0; k < 4; k++) lin(g, para.x, para.y, para.x + Math.cos(k * 1.6 + 0.5) * 11, para.y + Math.sin(k * 1.6 + 0.5) * 11, SOMBRA[1], 1);
    faiscas(g, para.x, para.y, i, [SOMBRA[0], SOMBRA[1], SOMBRA[2]], 10);
  }
  if (i === 3) { aro(g, para.x, para.y, 9, 9, SOMBRA[2]); for (let k = 0; k < 6; k++) px(g, para.x - 7 + k * 2.8, para.y - 3 + ((k * 3) % 6), SOMBRA[k % 2 ? 1 : 3]); }
}
// O golpe devastador do Boss: arcos enormes, onda de choque no chão e rachaduras
function ataqueDevastador(g, i, para, s) {
  const cx = para.x - s * 10; const cy = para.y;
  if (i === 1) arco(g, cx, cy, 15, -1.15, 1.15, 0.55, s, 6, MONSTRO.forte, MONSTRO.medio, 0.5);
  if (i === 2) {
    arco(g, cx, cy, 15, -1.15, 1.15, 1, s, 7, MONSTRO.medio, MONSTRO.claro, 0.5); arco(g, cx, cy, 15, -1.15, 1.15, 1, s, 7, MONSTRO.medio, MONSTRO.claro, -0.5);
    estrela(g, para.x, para.y, 9, MONSTRO.medio, MONSTRO.forte); faiscas(g, para.x, para.y, i, [MONSTRO.claro, MONSTRO.medio, MONSTRO.forte], 14, 1.3);
    aro(g, para.x, CHAO, 8, 2, MONSTRO.medio);
  }
  if (i === 3) {
    arco(g, cx, cy, 15, -1.15, 1.15, 1, s, 2, MONSTRO.sombra, null, 0.5); arco(g, cx, cy, 15, -1.15, 1.15, 1, s, 2, MONSTRO.sombra, null, -0.5);
    aro(g, para.x, CHAO, 16, 3.6, MONSTRO.forte);
    lin(g, para.x - 10, CHAO + 1, para.x - 4, CHAO + 3, MONSTRO.sombra, 1); lin(g, para.x - 4, CHAO + 3, para.x + 2, CHAO + 1, MONSTRO.sombra, 1); lin(g, para.x + 2, CHAO + 1, para.x + 9, CHAO + 3, MONSTRO.sombra, 1);
  }
}

// Que tipo de ataque o monstro usa (pelo nome)
function ataqueDe(nome, ev) {
  if (ev && ev.forte) return 'devastador';
  const n = String(nome || '');
  if (/Drag|Fênix|Fenix|Cultista|Wyvern|Dragonete/i.test(n)) return 'fogo';
  if (/Aranha|Viúva|Escorpi|Hidra|Slime/i.test(n)) return 'veneno';
  if (/Lich|Espectro|Rei Esqueleto|Fantasma|Devorador/i.test(n)) return 'sombra';
  if (/Lobo|Rato|Morcego/i.test(n)) return 'mordida';
  if (/Zumbi|Goblin|Garra/i.test(n)) return 'garra';
  if (/Arqueiro/i.test(n)) return 'flechas';
  return 'corte';
}

// ---------- Ponto de entrada ----------
function efeito(g, ev, i, de, para, s, ataque) {
  const crit = !!ev.crit;
  if (ev.tipo === 'def') {
    if (i >= 1) {
      const sx = de.x + s * 10; const sy = de.y;
      for (let a = -9; a <= 9; a++) { const xx = sx + s * Math.round(3 - Math.abs(a) * 0.33); px(g, xx, sy + a, i === 3 ? '#4a78b0' : '#8fd0ff'); px(g, xx + s, sy + a, '#2a4a7a'); }
      px(g, sx + s * 3, sy, '#ffffff');
    }
    return;
  }
  if (ev.tipo === 'poc') {
    espiral(g, de.x, de.y, i, '#5cff6a', '#c8ffd0');
    if (i >= 1) aro(g, de.x, CHAO, 4 + i * 3, 1 + i * 0.6, '#5cff6a');
    return;
  }
  if (ev.esq) {
    if (i >= 1) { for (let k = 0; k < 3; k++) rastro(g, para.x - s * (12 + k * 2), para.y - 6 + k * 6, para.x - s * (2 + k * 2), para.y - 6 + k * 6, '#9fd0ff'); }
    return;
  }
  const P = de.lado === 'e' ? HEROI : MONSTRO;
  const v = ataque || ev.visual || 'corte';
  if (v === 'corte') golpeCorte(g, i, para, s, P, crit);
  else if (v === 'cruz') golpeCruz(g, i, para, s, P);
  else if (v === 'explosao') golpeFogo(g, i, de, para, s);
  else if (v === 'flechas') golpeFlechas(g, i, de, para, s, P);
  else if (v === 'luz') golpeLuz(g, i, para, de, P);
  else if (v === 'furtivo') golpeFurtivo(g, i, de, para, s);
  else if (v === 'garra') ataqueGarra(g, i, para, s);
  else if (v === 'mordida') ataqueMordida(g, i, para, s);
  else if (v === 'fogo') ataqueFogo(g, i, de, para, s);
  else if (v === 'veneno') ataqueVeneno(g, i, de, para, s);
  else if (v === 'sombra') ataqueSombra(g, i, de, para, s);
  else if (v === 'devastador') ataqueDevastador(g, i, para, s);
  else golpeCorte(g, i, para, s, P, crit);
  if (ev.cura && i >= 1) espiral(g, de.x, de.y, i, v === 'luz' ? '#ffe14a' : '#5cff6a', '#ffffff');
  // clarão no impacto de críticos e do golpe devastador
  if (i === 2 && (crit || ev.forte)) clarao(g, para.x, para.y, ev.forte ? 20 : 13, '#ffffff');
}

// Aviso do Boss: um "!" vermelho e uma aura pulsando em cima dele, no fim do turno em que ele se prepara
function avisoBoss(g, i, info) {
  if (i < 2) return;
  const cor = i % 2 ? '#ff4040' : '#ff9a9a';
  aro(g, info.x, info.y, info.w * 0.62, info.h * 0.58, cor);
  if (i === 3) aro(g, info.x, info.y, info.w * 0.72, info.h * 0.66, '#e0455a');
}

// Tremor de tela: desloca a cena inteira (as barras de vida são desenhadas depois, então ficam paradas)
function tremor(g, ev, i) {
  if (!ev || ev.esq || ev.tipo === 'poc' || ev.tipo === 'def' || ev.dano == null) return g;
  const amp = [0, 0, ev.forte ? 3 : ev.crit ? 2 : 1, ev.forte ? 2 : ev.crit ? 1 : 0][i];
  if (!amp) return g;
  const dx = (i % 2 ? -1 : 1) * amp; const dy = amp >= 2 ? (i === 2 ? 1 : -1) : 0;
  const out = g.map((l) => l.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y][x] = g[Math.max(0, Math.min(H - 1, y - dy))][Math.max(0, Math.min(W - 1, x - dx))];
  return out;
}

// Queda de quem perdeu: almas subindo; o Boss solta ondas de choque e deixa moedas
function fim(g, k, info, boss) {
  if (!info) return;
  for (let j = 0; j < 7; j++) {
    const x = info.x + (j - 3) * (info.w / 8) + Math.sin(j * 2 + k) * 1.4;
    const y = info.y + info.h * 0.3 - (k + 1) * (3 + (j % 3)) - j;
    px(g, x, y, j % 2 ? '#f0e6ff' : '#c8b8ff'); px(g, x, y + 1, '#8a52d8');
  }
  if (k === 0) {
    faiscas(g, info.x, info.y, 2, ['#ffffff', '#ffe9a8', '#ffb347'], boss ? 16 : 8, boss ? 1.8 : 1.1);
    if (boss) { clarao(g, info.x, info.y, 24, '#ffffff'); aro(g, info.x, info.y, 12, 12, '#ffe9a8'); }
  }
  if (boss) {
    if (k === 1) { aro(g, info.x, info.y, 18, 18, '#ffb347'); aro(g, info.x, CHAO, 22, 4, '#ffe9a8'); }
    if (k >= 2) for (let j = 0; j < 9; j++) { const x = info.x - 14 + j * 3.4; const y = info.topo + 6 + ((j * 7 + k * 6) % 22); px(g, x, y, j % 2 ? '#ffd24a' : '#fff0a0'); px(g, x + 1, y, '#c99a1c'); }
  }
}
function tremorFim(g, k, boss) {
  if (!boss || k > 1) return g;
  const amp = k === 0 ? 3 : 2;
  const dx = (k % 2 ? -1 : 1) * amp; const dy = k === 0 ? 1 : -1;
  const out = g.map((l) => l.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y][x] = g[Math.max(0, Math.min(H - 1, y - dy))][Math.max(0, Math.min(W - 1, x - dx))];
  return out;
}
// Quem venceu comemora com estrelinhas piscando
function vitoria(g, k, info) {
  if (!info || k < 1) return;
  for (const [dx, dy, ph] of [[-8, -4, 0], [9, -8, 1], [0, -14, 2]]) {
    if ((k + ph) % 3 === 0) estrela(g, info.x + dx, info.topo + 6 + dy, 2, '#ffe9a8', '#fff4b8');
    else px(g, info.x + dx, info.topo + 6 + dy, '#ffd24a');
  }
}

module.exports = { efeito, ataqueDe, avisoBoss, tremor, tremorFim, fim, vitoria, clarao, estrela };
// fim do arquivo
