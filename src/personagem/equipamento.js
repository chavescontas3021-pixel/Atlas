// Equipamento e aura no personagem: a arma e a armadura que a pessoa usa no RPG aparecem no desenho,
// e o nível (e a classe) dão uma aura. Tudo por código, sem imagens.
const db = require('../db');

// Letras novas usadas só aqui: a A v n N (arma) · m M r x z (armadura)
const R = (g, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < g.length && i >= 0 && i < g[0].length) g[j][i] = c; };
const P = (g, x, y, c) => R(g, x, y, 1, 1, c);
const lin = (g, x0, y0, x1, y1, c) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) P(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
};
const fase = (f) => f.fase || 0;

// ---------- Armas ----------
// Lâmina padrão: coluna da luz (x=20) e da sombra (x=21), guarda e cabo na altura da mão
function espada(g, dy, c) {
  R(g, 20, 4, 1, 15, c.l); R(g, 21, 5, 1, 14, c.s); P(g, 20, 3, c.l);
  R(g, 18, 19 + dy, 5, 1, c.g); P(g, 18, 19 + dy, c.G); P(g, 22, 19 + dy, c.g);
  R(g, 20, 20 + dy, 2, 3, 'w'); P(g, 20, 21 + dy, 'W'); P(g, 21, 23 + dy, c.g); P(g, 20, 23 + dy, c.G);
}
const ARMAS = {
  lamina_ferro: {
    nome: 'Lâmina de Ferro', cores: { a: '#a9afbd', A: '#6a7080', v: '#e0e4ee' },
    desenhar(g, dy) { espada(g, dy, { l: 'a', s: 'A', g: 'A', G: 'A' }); P(g, 20, 7, 'v'); P(g, 20, 12, 'v'); },
  },
  lamina_aco: {
    nome: 'Lâmina de Aço', cores: { a: '#d0d8e8', A: '#8090a8', v: '#ffffff' },
    desenhar(g, dy) { espada(g, dy, { l: 'a', s: 'A', g: 'g', G: 'G' }); for (const y of [6, 10, 14]) P(g, 20, y, 'v'); P(g, 20, 2, 'v'); },
  },
  lamina_runica: {
    nome: 'Lâmina Rúnica', cores: { a: '#b8c8e0', A: '#6a82a8', v: '#ffffff', n: '#4fe3ff', N: '#1f8aa8' },
    desenhar(g, dy, f) {
      espada(g, dy, { l: 'a', s: 'A', g: 'g', G: 'G' });
      [7, 10, 13, 16].forEach((y, k) => P(g, 21, y, (k + fase(f)) % 2 ? 'n' : 'N'));
      P(g, 20, 21 + dy, 'n'); P(g, 19, 9, 'N'); P(g, 22, 14, 'N');
    },
  },
  lamina_estelar: {
    nome: 'Lâmina Estelar', cores: { a: '#e8f2ff', A: '#8ab0e8', v: '#ffffff', n: '#ffffff', N: '#9ac8ff' },
    desenhar(g, dy, f) {
      espada(g, dy, { l: 'a', s: 'A', g: 'g', G: 'G' }); P(g, 20, 18 + dy, 'n');
      [[18, 6], [23, 9], [18, 13], [23, 15], [19, 2]].forEach(([x, y], k) => {
        if ((fase(f) + k) % 4 < 2) { P(g, x, y, 'n'); if ((fase(f) + k) % 4 === 0) { P(g, x - 1, y, 'N'); P(g, x + 1, y, 'N'); P(g, x, y - 1, 'N'); P(g, x, y + 1, 'N'); } }
      });
    },
  },
  lamina_sombria: {
    nome: 'Lâmina Sombria', cores: { a: '#4a3a6e', A: '#241a40', v: '#8a6ad0', n: '#b45cff', N: '#6a2ab0' },
    desenhar(g, dy, f) {
      espada(g, dy, { l: 'a', s: 'A', g: 'A', G: 'A' });
      for (let y = 5; y < 18; y += 2) P(g, 19, y + (fase(f) % 2), 'N');
      P(g, 20, 19 + dy, 'n'); P(g, 20, 4, 'n');
      for (let k = 0; k < 3; k++) P(g, 19 + k, 2 - ((fase(f) + k) % 3), k % 2 ? 'n' : 'N'); // fumaça
    },
  },
  foice_ceifador: {
    nome: 'Foice do Ceifador', cores: { a: '#c8e0ff', A: '#7a9ac8', v: '#ffffff', n: '#7fffe0', N: '#2a8a7a' },
    desenhar(g, dy, f) {
      R(g, 20, 6, 1, 28 - dy, 'w'); R(g, 21, 7, 1, 27 - dy, 'W'); R(g, 20, 14, 2, 1, 'G');
      R(g, 16, 4, 6, 1, 'a'); R(g, 13, 5, 9, 1, 'a'); R(g, 12, 6, 5, 1, 'A'); R(g, 12, 7, 2, 1, 'A'); P(g, 12, 8, 'v');
      R(g, 17, 3, 4, 1, 'n'); P(g, 14, 4, 'n'); P(g, 12, 5, 'n');
      const k = fase(f) % 4;
      P(g, 14, 9 - k, 'n'); P(g, 18, 1 + ((k + 2) % 4), 'N'); // almas
    },
  },
  espada_vazio: {
    nome: 'Espada do Vazio', cores: { a: '#1a0f2a', A: '#0a0614', v: '#ffffff', n: '#b45cff', N: '#6a2ab0' },
    desenhar(g, dy, f) {
      espada(g, dy, { l: 'a', s: 'A', g: 'N', G: 'A' });
      [[20, 6], [21, 8], [20, 10], [21, 12], [20, 14], [21, 16]].forEach(([x, y], k) => { if ((k + fase(f)) % 3 !== 0) P(g, x, y, 'n'); });
      P(g, 20, 8, 'v'); P(g, 21, 13, 'v');
      for (let y = 4; y < 18; y += 2) P(g, 19, y, 'N');
      P(g, 22 + (fase(f) % 2), 5, 'N'); P(g, 18, 9 - (fase(f) % 3), 'N'); P(g, 22, 12 + (fase(f) % 2), 'n');
    },
  },
  lamina_rei_caido: {
    nome: 'Lâmina do Rei Caído', cores: { a: '#f0c850', A: '#a8791c', v: '#fff4b8', n: '#ff3b5c', N: '#c99a1c' },
    desenhar(g, dy, f) {
      R(g, 19, 5, 1, 13, 'v'); R(g, 20, 3, 1, 15, 'a'); R(g, 21, 4, 1, 14, 'A'); P(g, 20, 2, 'v');
      R(g, 17, 19 + dy, 7, 1, 'a'); for (const x of [17, 19, 21, 23]) P(g, x, 18 + dy, 'a'); P(g, 20, 18 + dy, 'n');
      R(g, 20, 20 + dy, 2, 3, 'w'); P(g, 20, 21 + dy, 'W'); R(g, 19, 23 + dy, 4, 1, 'N');
      [[17, 6], [23, 10], [17, 14], [23, 4]].forEach(([x, y], k) => { if ((fase(f) + k) % 3 === 0) { P(g, x, y, 'v'); P(g, x, y - 1, 'a'); } });
    },
  },
};

// ---------- Armaduras ----------
// estilo: o formato do corpo (tunica | armadura | casaco). cores: o que troca de cor. detalhe: o que é desenhado por cima.
const ARMADURAS = {
  couro: {
    nome: 'Couro Curtido', estilo: 'tunica',
    cores: { t: '#8a5a30', T: '#583618', y: '#b8824a', m: '#c9a063', M: '#6a4020', x: '#d4b04a' },
    detalhe(g, dy) {
      const y0 = 13 + dy;
      lin(g, 8, y0 + 1, 15, y0 + 6, 'M'); lin(g, 8, y0 + 2, 14, y0 + 6, 'm'); P(g, 11, y0 + 3, 'x');
      for (const [x, y] of [[7, 3], [7, 6], [16, 3], [16, 6]]) P(g, x, y0 + y, 'M');
      R(g, 14, y0 + 7, 3, 2, 'M'); R(g, 14, y0 + 7, 3, 1, 'm');
      R(g, 5, y0, 2, 2, 'm'); R(g, 17, y0, 2, 2, 'm'); P(g, 5, y0 + 1, 'M');
    },
  },
  malha: {
    nome: 'Cota de Malha', estilo: 'armadura',
    cores: { t: '#6a7488', T: '#3a4254', y: '#9aa3b8', m: '#a9b2c4', M: '#5a6478', x: '#d4dae8' },
    detalhe(g, dy) {
      const y0 = 13 + dy;
      for (let y = y0 + 1; y <= y0 + 5; y++) for (let x = 8; x <= 15; x++) if ((x + y) % 2 === 0) P(g, x, y, 'M');
      for (const x of [4, 6, 17, 19]) P(g, x, y0, 'x');
    },
  },
  placas: {
    nome: 'Armadura de Placas', estilo: 'armadura',
    cores: { t: '#7d8699', T: '#434a5c', y: '#aab2c4', m: '#d4dae8', M: '#7f8aa6', x: '#e3b93c' },
    detalhe(g, dy) {
      const y0 = 13 + dy;
      R(g, 8, y0 + 1, 8, 1, 'x'); R(g, 11, y0 + 2, 2, 4, 'x'); R(g, 4, y0 + 1, 4, 1, 'x'); R(g, 16, y0 + 1, 4, 1, 'x');
      R(g, 3, y0 - 1, 1, 3, 'M'); R(g, 20, y0 - 1, 1, 3, 'M'); P(g, 11, y0 + 6, 'x'); P(g, 12, y0 + 6, 'x');
      R(g, 8, y0 + 7, 8, 1, 'x');
    },
  },
  manto_estelar: {
    nome: 'Manto Estelar', estilo: 'casaco',
    cores: { t: '#27408f', T: '#141f55', y: '#4864c8', x: '#cfd8f0', z: '#ffffff' },
    detalhe(g, dy, f) {
      const y0 = 13 + dy;
      R(g, 10, y0 + 1, 1, 12, 'x'); R(g, 13, y0 + 1, 1, 12, 'x'); R(g, 7, y0 + 12, 10, 1, 'x');
      [[8, 3], [15, 5], [9, 9], [14, 10], [7, 7], [16, 8]].forEach(([x, y], k) => {
        if ((fase(f) + k) % 3 !== 0) P(g, x, y0 + y, 'z');
        if ((fase(f) + k) % 4 === 0) { P(g, x - 1, y0 + y, 'x'); P(g, x + 1, y0 + y, 'x'); }
      });
    },
  },
  couraca_obsidiana: {
    nome: 'Couraça de Obsidiana', estilo: 'armadura',
    cores: { t: '#1f1a2c', T: '#0e0a16', y: '#3a2e4c', m: '#2f2640', M: '#171221', x: '#6a4a7a', z: '#ff3b3b' },
    detalhe(g, dy, f) {
      const y0 = 13 + dy;
      const brilho = fase(f) % 2 ? 'z' : 'x';
      lin(g, 9, y0 + 1, 11, y0 + 4, brilho); lin(g, 11, y0 + 4, 10, y0 + 6, brilho); lin(g, 14, y0 + 2, 13, y0 + 5, brilho);
      for (const [x, y] of [[4, -2], [5, -3], [6, -2], [19, -2], [18, -3], [17, -2]]) P(g, x, y0 + y, 'M');
      P(g, 5, y0 - 3, 'z'); P(g, 18, y0 - 3, 'z');
    },
  },
  manto_abissal: {
    nome: 'Manto Abissal', estilo: 'casaco',
    cores: { t: '#10404f', T: '#082630', y: '#1f7a8a', x: '#0a1c24', z: '#4fe3ff' },
    detalhe(g, dy, f) {
      const y0 = 13 + dy;
      R(g, 8, y0 - 1, 8, 1, 'z'); R(g, 7, y0 + 12, 10, 1, 'z'); P(g, 5, y0 + 4, 'z'); P(g, 18, y0 + 4, 'z');
      for (const k of [8, 11, 14]) P(g, k, y0 + 13 + ((fase(f) + k) % 2), 'z');
      P(g, 11, y0 + 5, 'z'); P(g, 12, y0 + 6, 'z');
    },
  },
  armadura_draconica: {
    nome: 'Armadura Dracônica', estilo: 'armadura',
    cores: { t: '#8a2a22', T: '#4a1410', y: '#c8452a', m: '#c8382a', M: '#7a1a1a', x: '#e3b93c', r: '#e8e0d0' },
    detalhe(g, dy) {
      const y0 = 13 + dy;
      for (let y = y0 + 1; y <= y0 + 5; y++) for (let x = 8; x <= 15; x++) if ((x + (y % 2) * 2) % 4 === 0) P(g, x, y, 'M');
      for (const [x, y] of [[5, -2], [5, -3], [4, -4], [18, -2], [18, -3], [19, -4]]) P(g, x, y0 + y, 'r');
      R(g, 11, y0 + 1, 2, 5, 'x'); R(g, 4, y0 + 1, 4, 1, 'x'); R(g, 16, y0 + 1, 4, 1, 'x'); P(g, 11, y0 + 6, 'x'); P(g, 12, y0 + 6, 'x');
    },
  },
  vestes_rei_caido: {
    nome: 'Vestes do Rei Caído', estilo: 'casaco',
    cores: { t: '#1b1522', T: '#0c0810', y: '#33283e', x: '#e3b93c', r: '#ff3b5c' },
    detalhe(g, dy, f) {
      const y0 = 13 + dy;
      R(g, 10, y0 + 1, 1, 12, 'x'); R(g, 13, y0 + 1, 1, 12, 'x'); R(g, 7, y0 + 12, 10, 1, 'x');
      R(g, 8, y0 - 1, 3, 1, 'x'); R(g, 13, y0 - 1, 3, 1, 'x'); R(g, 4, y0, 3, 2, 'x'); R(g, 17, y0, 3, 2, 'x');
      for (const [x, y] of [[10, 2], [13, 2], [11, 3], [12, 3]]) P(g, x, y0 + y, 'x'); P(g, 11, y0 + 2, 'r'); P(g, 12, y0 + 2, 'x');
      P(g, 3, y0 + 4 - (fase(f) % 4), 'x'); P(g, 20, y0 + 6 - ((fase(f) + 2) % 4), 'x');
    },
  },
};

// O que está valendo agora (respeita o botão "ocultar equipamento")
function ativo(app) {
  if (!app || app.mostrarEquip === false || !app.equip) return {};
  return { arma: ARMAS[app.equip.arma] ? app.equip.arma : null, armadura: ARMADURAS[app.equip.armadura] ? app.equip.armadura : null };
}
function coresEquip(app) {
  const e = ativo(app);
  return { ...(e.arma ? ARMAS[e.arma].cores : {}), ...(e.armadura ? ARMADURAS[e.armadura].cores : {}) };
}

// ---------- Aura ----------
const AURAS = {
  guerreiro: ['#ffb347', '#d98a1c'], mago: ['#c47cff', '#8a46d0'], arqueiro: ['#5cff9a', '#2faa6a'],
  curandeiro: ['#fff4b8', '#d4b84a'], ladino: ['#d8c8ff', '#8a6ae0'],
};
const nivelAura = (app) => {
  const n = Number(app && app.nivel) || 0;
  return n >= 40 ? 4 : n >= 30 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0;
};

// Desenha a aura atrás do personagem. Só usa 2 cores fixas (tramado), então não pesa no GIF.
function aura(g, cx, cy, app, f, { rx = 13, ry = 19 } = {}) {
  if (!app || app.mostrarEquip === false) return;
  const t = nivelAura(app);
  if (!t) return;
  const [c1, c2] = AURAS[app.classe] || ['#ffd76a', '#c99a1c'];
  const H = g.length; const W = g[0].length;
  const px = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c; };
  const p = f % 8;
  // halo: borda em tramado
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const pulso = 0.9 + 0.05 * Math.sin((p / 8) * Math.PI * 2);
    if (d <= pulso && d > pulso - 0.16 && (x + y) % 2 === 0) px(x, y, c2);
    if (t >= 4 && d <= pulso - 0.2 && d > pulso - 0.34 && (x + y) % 2 === 1) px(x, y, c2);
  }
  // faíscas girando em volta
  if (t >= 2) for (let k = 0; k < (t >= 4 ? 5 : 3); k++) {
    const a = (p / 8) * Math.PI * 2 + (k / (t >= 4 ? 5 : 3)) * Math.PI * 2;
    const x = cx + Math.cos(a) * (rx + 1); const y = cy + Math.sin(a) * (ry * 0.75);
    px(x, y, c1); px(x + 1, y, c2); px(x, y - 1, c2);
  }
  // chamas subindo dos lados
  if (t >= 3) for (let k = 0; k < 6; k++) {
    const lado = k % 2 ? 1 : -1;
    const x = cx + lado * (rx * 0.62 + (k % 3));
    const y = cy + ry * 0.7 - ((p * 2 + k * 5) % Math.round(ry * 1.6));
    px(x, y, c1); px(x, y - 1, c2); if (k % 2) px(x + lado, y, c2);
  }
  // anel no chão e runas
  if (t >= 4) {
    for (let a = 0; a < 40; a++) { const ang = (a / 40) * Math.PI * 2; px(cx + Math.cos(ang) * (rx + 2), cy + ry + 1 + Math.sin(ang) * 2.2, a % 2 ? c1 : c2); }
    for (let k = 0; k < 3; k++) {
      const a = -(p / 8) * Math.PI * 2 + k * 2.1; const x = cx + Math.cos(a) * (rx + 4); const y = cy - ry * 0.3 + Math.sin(a) * 5;
      px(x, y, c1); px(x - 1, y, c2); px(x + 1, y, c2); px(x, y - 1, c2); px(x, y + 1, c2);
    }
  }
}

// ---------- Integração ----------
// Junta o equipamento e o nível salvos no RPG à aparência (só para desenhar; nada disso é salvo no personagem)
function enriquecer(uid, app) {
  const j = db.get(`rpg.jogadores.${uid}`, null);
  const a = { ...app };
  if (j) {
    a.equip = { arma: (j.equip && j.equip.arma) || null, armadura: (j.equip && j.equip.armadura) || null };
    a.nivel = j.nivel;
    a.classe = j.classe;
  }
  return a;
}
const limpar = (app) => { const { equip, nivel, classe, ...resto } = app || {}; return resto; };

module.exports = { ARMAS, ARMADURAS, AURAS, ativo, coresEquip, nivelAura, aura, enriquecer, limpar };
// fim do arquivo
