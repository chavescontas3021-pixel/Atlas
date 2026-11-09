// Cenários de batalha das masmorras (pixel art, 84x56). Cada masmorra tem o seu ambiente, com animação de 4 quadros.
// Os monstros de cada masmorra são ligados ao tema pelo nome (registrarTema), então as batalhas comuns não mudam.
const W = 84;
const H = 56;
const CHAO = 51;

const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mistura = (a, b, f) => { const x = toRgb(a); const y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * f)); };
const px = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c; };
const ret = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
const elip = (g, cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(g, x, y, c); };
function lin(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
const ruido = (x, y) => ((x * 73 + y * 151 + x * y * 7) % 97) / 97; // "aleatório" fixo, para o cenário não tremer
const gradiente = (cima, baixo, ate = H) => Array.from({ length: H }, (_, y) => Array(W).fill(mistura(cima, baixo, Math.min(1, y / ate))));

// Luz quente de uma tocha ou fogo: clareia o que está perto, com tramado
function luz(g, cx, cy, r, cor, forca = 0.3) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (y < 0 || y >= CHAO - 2 || x < 0 || x >= W) continue;
      const d = Math.hypot(x - cx, (y - cy) * 1.15) / r;
      if (d < 1 && (d < 0.55 || (x + y) % 2 === 0)) g[y][x] = mistura(g[y][x], cor, forca * (1 - d));
    }
  }
}

function chama(g, x, y, t, grande = 1) {
  const f = [[0, 0], [1, -1], [0, -1], [-1, 0]][t % 4];
  elip(g, x + f[0] * 0.5, y - 2 * grande, 1.6 * grande, 2.8 * grande, '#ff7a1c');
  elip(g, x, y - 1.6 * grande, 1 * grande, 1.8 * grande, '#ffd24a');
  px(g, x + f[0], y - 4 * grande - (t % 2), '#ff7a1c');
}

// ---------- Catacumbas Esquecidas ----------
function catacumbas(t) {
  const g = gradiente('#0d1018', '#1b2033', CHAO);
  // parede de tijolos
  for (let y = 0; y < CHAO - 2; y++) for (let x = 0; x < W; x++) {
    const faixa = Math.floor(y / 6);
    const xx = (x + (faixa % 2) * 6) % 12;
    const junta = y % 6 === 0 || xx === 0;
    const base = ruido(Math.floor((x + (faixa % 2) * 6) / 12), faixa);
    g[y][x] = junta ? '#0b0d15' : base > 0.6 ? '#232843' : base > 0.25 ? '#1d2238' : '#181c2e';
    if (!junta && (y % 6 === 1 || xx === 1)) g[y][x] = mistura(g[y][x], '#3a4166', 0.5);
  }
  // nichos em arco com caveiras
  for (const cx of [20, 42, 64]) {
    ret(g, cx - 7, 20, 14, 28, '#07080e');
    elip(g, cx, 20, 7, 7, '#07080e');
    ret(g, cx - 7, 44, 14, 4, '#10131f');
    if (cx !== 42) {
      for (const [dx, dy] of [[-4, 41], [0, 41], [4, 41], [-2, 38], [2, 38], [0, 35]]) { elip(g, cx + dx, dy, 1.8, 1.7, '#d8d2c0'); px(g, cx + dx - 1, dy, '#0b0d15'); px(g, cx + dx + 1, dy, '#0b0d15'); }
    } else {
      const piscar = t % 2 === 0;
      px(g, 40, 30, piscar ? '#5cff9a' : '#2a7a4a'); px(g, 44, 30, piscar ? '#5cff9a' : '#2a7a4a');
    }
  }
  // colunas
  for (const cx of [3, 79]) {
    ret(g, cx, 6, 6, CHAO - 8, '#2c3150'); ret(g, cx, 6, 1, CHAO - 8, '#3d4468'); ret(g, cx + 5, 6, 1, CHAO - 8, '#1a1e33');
    ret(g, cx - 1, 6, 8, 3, '#3a4064'); ret(g, cx - 1, CHAO - 5, 8, 3, '#3a4064');
  }
  // correntes balançando
  for (const [cx, comp] of [[30, 16], [54, 20]]) for (let i = 0; i < comp; i++) { const sw = Math.round(Math.sin((t / 4) * Math.PI * 2 + i * 0.2) * (i / 16)); px(g, cx + sw, i, i % 2 ? '#6a6f8a' : '#3e4258'); }
  // tochas
  for (const tx of [31, 53]) {
    luz(g, tx, 22, 17, '#ff8a3a', 0.34);
    ret(g, tx - 1, 25, 3, 5, '#3a2a1c'); ret(g, tx - 2, 24, 5, 1, '#6a6f8a');
    chama(g, tx, 24, t + tx, 1.2);
  }
  // teias nos cantos
  for (let i = 0; i < 9; i++) { lin(g, 10, 0, 10 + i, 0, '#8a8fa8'); lin(g, 10, 0, 10, i, '#8a8fa8'); }
  lin(g, 10, 0, 16, 6, '#6a6f8a'); lin(g, 10, 0, 13, 7, '#6a6f8a'); lin(g, 10, 0, 8, 9, '#6a6f8a');
  // chão de lajes
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) {
    const faixa = y - (CHAO - 2);
    g[y][x] = faixa === 0 ? '#4a5078' : faixa === 1 ? '#2e3350' : ((x + faixa * 5) % 16 === 0 ? '#12151f' : '#1a1e30');
  }
  for (const [bx, k] of [[14, 0], [46, 1], [72, 2]]) { ret(g, bx, CHAO + 1, 5, 1, '#c9c2ac'); px(g, bx + 1, CHAO, '#c9c2ac'); px(g, bx + 3, CHAO + 1, '#e8e0cc'); if (k) px(g, bx + 4, CHAO, '#c9c2ac'); }
  // névoa verde rente ao chão
  for (let y = CHAO - 7; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 7 < 2) g[y][x] = mistura(g[y][x], '#4ad6a0', 0.18);
  return g;
}

// ---------- Ninho da Aranha ----------
function teia(g, cx, cy, raio, dir) {
  const pontos = [];
  for (let i = 0; i <= 6; i++) { const a = (dir * Math.PI) / 2 + (i / 6) * (Math.PI / 2); pontos.push(a); }
  for (const a of pontos) lin(g, cx, cy, cx + Math.cos(a) * raio, cy + Math.sin(a) * raio, '#9a98b4');
  for (const r of [raio * 0.35, raio * 0.6, raio * 0.85]) for (let i = 0; i < pontos.length - 1; i++) {
    lin(g, cx + Math.cos(pontos[i]) * r, cy + Math.sin(pontos[i]) * r, cx + Math.cos(pontos[i + 1]) * r, cy + Math.sin(pontos[i + 1]) * r, '#6e6c8c');
  }
}
function ninho(t) {
  const g = gradiente('#0e0a10', '#2a1c20', CHAO);
  // paredes de caverna irregulares
  for (let x = 0; x < W; x++) {
    const topo = Math.max(3, 9 + Math.round(5 * Math.sin(x * 0.21) + 4 * Math.sin(x * 0.57 + 1)));
    for (let y = 0; y < topo; y++) g[y][x] = ruido(x, y) > 0.7 ? '#241a22' : '#1a1218';
    for (let y = topo; y < topo + 2; y++) g[y][x] = '#3a2a30';
  }
  // estalactites
  for (const [x, c] of [[8, 16], [22, 11], [37, 18], [52, 12], [66, 17], [78, 10]]) for (let i = 0; i < c; i++) { const w = Math.max(0, Math.round((c - i) / 5)); ret(g, x - w, 8 + i, 2 * w + 1, 1, i < 2 ? '#3a2a30' : '#241a22'); }
  // fundo da caverna: rochas
  for (let y = 22; y < CHAO - 2; y++) for (let x = 0; x < W; x++) { const n = ruido(Math.floor(x / 3), Math.floor(y / 3)); g[y][x] = n > 0.75 ? '#2a1e25' : n > 0.4 ? '#211820' : '#1a1218'; }
  // teias grandes
  teia(g, 0, 0, 30, 0); teia(g, W - 1, 0, 30, 1);
  lin(g, 30, 0, 42, 14, '#6e6c8c'); lin(g, 42, 14, 56, 0, '#6e6c8c'); lin(g, 36, 7, 48, 7, '#6e6c8c');
  // casulos pendurados
  for (const [cx, cy, c] of [[16, 26, 0], [46, 22, 1], [70, 28, 2]]) {
    const sw = Math.round(Math.sin((t / 4) * Math.PI * 2 + c) * 1);
    lin(g, cx, 8, cx + sw, cy - 5, '#9a98b4');
    elip(g, cx + sw, cy, 4, 7, '#c4c2d6'); elip(g, cx + sw - 1, cy - 1, 2.4, 5, '#e6e4f0');
    for (let k = -5; k <= 5; k += 3) lin(g, cx + sw - 4, cy + k, cx + sw + 4, cy + k - 1, '#8e8caa');
    if (c === 1) { ret(g, cx + sw - 1, cy - 2, 2, 5, '#3a3a50'); }
  }
  // cogumelos que brilham
  for (const [cx, k] of [[10, 0], [33, 1], [59, 2], [76, 3]]) {
    const brilho = (t + k) % 4 < 2 ? '#7dff6a' : '#3fa83a';
    elip(g, cx, CHAO - 4, 3, 2, brilho); ret(g, cx, CHAO - 3, 1, 3, '#3a5a3a');
    luz(g, cx, CHAO - 4, 9, '#7dff6a', 0.2);
  }
  // olhos nas sombras
  if (t % 2 === 0) for (const [x, y] of [[26, 34], [27, 34], [58, 38], [59, 38]]) px(g, x, y, '#ff3b3b');
  // chão de terra com teia
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) { const f = y - (CHAO - 2); g[y][x] = f === 0 ? '#5a4238' : f === 1 ? '#3a2a28' : ruido(x, y) > 0.8 ? '#2a201e' : '#201816'; }
  for (const x0 of [6, 30, 54, 76]) { lin(g, x0, CHAO - 1, x0 + 7, CHAO + 3, '#7e7c9a'); lin(g, x0 + 7, CHAO - 1, x0, CHAO + 3, '#7e7c9a'); }
  for (let y = CHAO - 6; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 8 < 2) g[y][x] = mistura(g[y][x], '#8a6aa0', 0.14);
  return g;
}

// ---------- Fortaleza do Rei Caído ----------
function fortaleza(t) {
  const g = gradiente('#0c0a14', '#1c1626', CHAO);
  for (let y = 0; y < CHAO - 2; y++) for (let x = 0; x < W; x++) g[y][x] = ruido(Math.floor(x / 4), Math.floor(y / 4)) > 0.7 ? '#241c30' : '#1d1628';
  // janelas góticas com luar
  for (const cx of [18, 42, 66]) {
    elip(g, cx, 14, 6, 6, '#0a0a1c'); ret(g, cx - 6, 14, 13, 22, '#0a0a1c');
    elip(g, cx, 15, 4.4, 5, '#35449a'); ret(g, cx - 4, 15, 9, 19, '#35449a');
    for (let y = 8; y < 34; y++) for (let x = cx - 4; x <= cx + 4; x++) if (g[y][x] === '#35449a') g[y][x] = mistura('#35449a', '#7a8ae0', 0.35 * (1 - (y - 8) / 26));
    ret(g, cx, 9, 1, 25, '#0a0a1c'); ret(g, cx - 4, 22, 9, 1, '#0a0a1c');
    // feixe de luz no chão
    for (let k = 0; k < 14; k++) { const yy = 36 + k; if (yy < CHAO - 2) for (let x = cx - 3 - k * 0.3; x <= cx + 3 + k * 0.5; x++) if (((Math.round(x) + yy) % 2) === 0) g[yy][Math.round(x)] = mistura(g[yy][Math.round(x)], '#7a8ae0', 0.16); }
  }
  // colunas
  for (const cx of [6, 30, 54, 78]) {
    ret(g, cx - 2, 4, 5, CHAO - 6, '#322a44'); ret(g, cx - 2, 4, 1, CHAO - 6, '#4a4064'); ret(g, cx + 2, 4, 1, CHAO - 6, '#1a1428');
    ret(g, cx - 3, 4, 7, 2, '#443a5e'); ret(g, cx - 3, CHAO - 4, 7, 2, '#443a5e');
  }
  // estandartes rasgados
  for (const cx of [18, 66]) {
    const sw = Math.round(Math.sin((t / 4) * Math.PI * 2 + cx) * 0.8);
    ret(g, cx - 8 + sw, 36, 4, 12, '#6e1a30'); ret(g, cx - 8 + sw, 36, 1, 12, '#8a2a44'); px(g, cx - 7 + sw, 48, '#6e1a30'); px(g, cx - 5 + sw, 47, '#6e1a30');
    ret(g, cx - 7 + sw, 40, 2, 2, '#c9a227');
    ret(g, cx + 5 - sw, 36, 4, 12, '#6e1a30'); ret(g, cx + 5 - sw, 36, 1, 12, '#8a2a44'); px(g, cx + 6 - sw, 48, '#6e1a30');
    ret(g, cx + 6 - sw, 40, 2, 2, '#c9a227');
  }
  // lustre com velas
  ret(g, 41, 0, 2, 4, '#4a4058'); ret(g, 34, 4, 16, 1, '#6a5a2a'); ret(g, 36, 5, 12, 1, '#4a3a1a');
  for (const x of [35, 39, 43, 47]) { ret(g, x, 2, 1, 2, '#e8e0cc'); px(g, x, 1 - ((t + x) % 2), '#ffd24a'); }
  luz(g, 42, 4, 26, '#ffb85a', 0.2);
  // piso xadrez e tapete
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) { const f = y - (CHAO - 2); g[y][x] = f === 0 ? '#5a4e78' : ((Math.floor(x / 6) + Math.floor(f / 2)) % 2 ? '#2a2238' : '#1c1628'); }
  ret(g, 0, CHAO - 1, W, 3, '#5a1428'); ret(g, 0, CHAO - 1, W, 1, '#7a2038'); ret(g, 0, CHAO + 2, W, 1, '#c9a227');
  for (let x = 0; x < W; x += 4) px(g, x, CHAO, '#7a2038');
  for (let y = CHAO - 6; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 9 < 1) g[y][x] = mistura(g[y][x], '#8a8ac0', 0.14);
  return g;
}

// ---------- Covil do Dragão Negro ----------
function covil(t) {
  const g = gradiente('#10070b', '#2a0f12', CHAO);
  for (let y = 0; y < CHAO - 2; y++) for (let x = 0; x < W; x++) { const n = ruido(Math.floor(x / 3), Math.floor(y / 3)); g[y][x] = n > 0.75 ? '#2e1517' : n > 0.4 ? '#24100f' : '#1a0a0c'; }
  // teto com estalactites
  for (let x = 0; x < W; x++) { const topo = Math.max(2, 6 + Math.round(3 * Math.sin(x * 0.3) + 2 * Math.sin(x * 0.8))); for (let y = 0; y < topo; y++) g[y][x] = '#130809'; }
  for (const [x, c] of [[10, 14], [26, 10], [44, 16], [60, 11], [74, 15]]) for (let i = 0; i < c; i++) { const w = Math.max(0, Math.round((c - i) / 5)); ret(g, x - w, 6 + i, 2 * w + 1, 1, '#2a1214'); }
  // rio de lava ao fundo
  for (let x = 0; x < W; x++) {
    const onda = Math.round(Math.sin(x * 0.35 + (t / 4) * Math.PI * 2) * 1.2);
    for (let y = 38 + onda; y < 44; y++) g[y][x] = y < 40 + onda ? '#ffb03a' : y < 42 ? '#ff6a1c' : '#c8340f';
    if ((x + t * 2) % 9 === 0) px(g, x, 37 + onda, '#fff0a0');
  }
  luz(g, 42, 40, 40, '#ff6a1c', 0.28);
  // ossos de dragão
  for (let i = 0; i < 5; i++) { const cx = 28 + i * 7; for (let k = 0; k < 14; k++) { const ang = (k / 13) * 1.3; px(g, cx + Math.round(Math.sin(ang) * 5), 36 - Math.round(Math.cos(ang) * 12) + 8, '#7a6c5c'); px(g, cx + Math.round(Math.sin(ang) * 5) + 1, 36 - Math.round(Math.cos(ang) * 12) + 8, '#a89a84'); } }
  // pilhas de ouro nas laterais
  for (const [cx, lado] of [[8, 1], [76, -1]]) {
    for (let x = -10; x <= 10; x++) { const alt = Math.round(9 - Math.abs(x) * 0.9); if (alt <= 0) continue; for (let y = 0; y < alt; y++) g[CHAO - 2 - y][cx + x] = ruido(cx + x, y) > 0.5 ? '#c99a1c' : '#e3b93c'; }
    for (const [dx, dy] of [[-3, 6], [2, 4], [-6, 2], [5, 7]]) if ((t + dx) % 3 === 0) { px(g, cx + dx, CHAO - 2 - dy, '#ffffff'); px(g, cx + dx + 1, CHAO - 2 - dy, '#fff0a0'); }
  }
  // chão de basalto com rachaduras brilhando
  for (let y = CHAO - 2; y < H; y++) for (let x = 0; x < W; x++) { const f = y - (CHAO - 2); g[y][x] = f === 0 ? '#4a2a28' : f === 1 ? '#2e1618' : ruido(x, y) > 0.8 ? '#1c0c0e' : '#160a0c'; }
  for (const x0 of [20, 40, 62]) { lin(g, x0, CHAO, x0 + 5, CHAO + 2, t % 2 ? '#ff8a2a' : '#c8340f'); lin(g, x0 + 5, CHAO + 2, x0 + 9, CHAO + 1, t % 2 ? '#ff8a2a' : '#c8340f'); }
  // brasas subindo
  for (let i = 0; i < 12; i++) { const x = (i * 29 + 7) % W; const y = H - 8 - ((i * 13 + t * 5) % 40); if (y > 4) px(g, x, y, i % 3 ? '#ff8a2a' : '#ffd24a'); }
  for (let y = CHAO - 6; y <= CHAO - 2; y++) for (let x = 0; x < W; x++) if ((x + y * 2 + t * 2) % 8 < 1) g[y][x] = mistura(g[y][x], '#ff6a1c', 0.16);
  return g;
}

// O GIF aceita no máximo 256 cores: arredonda as cores do cenário (sem mudar o visual de forma perceptível)
const PASSO = 12;
function quantizar(g) {
  const memo = {};
  return g.map((l) => l.map((c) => memo[c] || (memo[c] = toHex(toRgb(c).map((v) => Math.round(v / PASSO) * PASSO)))));
}

const TEMAS = { catacumbas, ninho, fortaleza, covil };
const porMonstro = {};
const cache = {};
function registrarTema(nome, tema) { if (TEMAS[tema]) porMonstro[nome] = tema; }
function temaDe(nome) { return porMonstro[nome] || null; }
// Devolve o cenário do tema (ou null se o monstro não pertence a nenhuma masmorra)
function fundo(tema, t) {
  if (!TEMAS[tema]) return null;
  const k = `${tema}:${t % 4}`;
  if (!cache[k]) cache[k] = quantizar(TEMAS[tema](t % 4));
  return cache[k].map((l) => l.slice());
}

module.exports = { W, H, CHAO, TEMAS, registrarTema, temaDe, fundo };
// fim do arquivo
