// As 11 espécies de pet. Cada uma tem cores e uma função que desenha um quadro da animação.
const { def, ell, poli, traco, px, ret, olho } = require('./petarte');

const espelho = (pts) => pts.map(([x, y]) => [23 - x, y]);

// ================== Gato ==================
def('gato', {
  fundo: ['#ffe6d2', '#ffd0b0'], chao: '#e9b78f',
  cores: { m: '#ec9442', s: '#fff1de', a: '#ff9db1', n: '#e96a8a' },
  desenhar(g, f) {
    const dy = f.dy;
    traco(g, [[17, 20], [19.5, 18.5], [20.8, 15.5], [19.6 + f.osc * 1.8, 12.4]], 2.6, 'm'); // rabo balançando
    ell(g, 12, 17.6, 5.4, 4.6, 'm');
    ell(g, 12, 19, 3, 3.2, 's', false);
    ell(g, 9.2, 21.2, 2, 1.1, 's', false); ell(g, 14.8, 21.2, 2, 1.1, 's', false);
    ell(g, 12, 9.4 + dy, 7.2, 5.6, 'm');
    const orelha = [[5.2, 7 + dy], [5.4, 1.4 + dy], [10, 4.6 + dy]];
    poli(g, orelha, 'm'); poli(g, espelho(orelha), 'm');
    poli(g, [[6.3, 6 + dy], [6.4, 3.2 + dy], [8.6, 4.8 + dy]], 'a', false); poli(g, espelho([[6.3, 6 + dy], [6.4, 3.2 + dy], [8.6, 4.8 + dy]]), 'a', false);
    ell(g, 12, 11.8 + dy, 3.3, 2.1, 's', false);
    olho(g, 8, 8 + dy, f); olho(g, 14, 8 + dy, f);
    ret(g, 11, 11 + dy, 2, 1, 'N'); px(g, 11, 12 + dy, 'K'); px(g, 12, 12 + dy, 'K');
    ret(g, 11, 5 + dy, 2, 2, 'm0'); px(g, 9, 5 + dy, 'm0'); px(g, 14, 5 + dy, 'm0'); // listras da testa
    ret(g, 5, 10 + dy, 2, 1, 'm0'); ret(g, 17, 10 + dy, 2, 1, 'm0'); ret(g, 5, 12 + dy, 2, 1, 'm0'); ret(g, 17, 12 + dy, 2, 1, 'm0');
    px(g, 7, 12 + dy, 'B'); px(g, 16, 12 + dy, 'B');
  },
});

// ================== Cachorro ==================
def('cachorro', {
  fundo: ['#e6f1ff', '#cfe3fb'], chao: '#a9c7e8',
  cores: { m: '#c98a52', s: '#f6e6cf', a: '#7b4a2c', n: '#2a1b24' },
  desenhar(g, f) {
    const dy = f.dy;
    traco(g, [[17.5, 19.5], [19.5, 17.6], [20.4 + f.osc * 1.8, 14.6]], 2.6, 'm'); // rabo abanando
    ell(g, 12, 17.8, 5.4, 4.4, 'm');
    ell(g, 12, 19.2, 3, 3, 's', false);
    ell(g, 9, 21.2, 2, 1.1, 's', false); ell(g, 15, 21.2, 2, 1.1, 's', false);
    ell(g, 12, 9.6 + dy, 7, 5.8, 'm');
    const bal = Math.round(f.osc * 0.7);
    ell(g, 5.4, 10 + dy + bal, 2.3, 4.3, 'a'); ell(g, 18.6, 10 + dy - bal, 2.3, 4.3, 'a'); // orelhas caídas
    ell(g, 16, 8.6 + dy, 2.6, 2.5, 'a', false); // mancha no olho
    ell(g, 12, 12.4 + dy, 3.5, 2.5, 's', false);
    olho(g, 8, 8 + dy, f); olho(g, 14, 8 + dy, f);
    ret(g, 11, 10.6 + dy, 2, 1, 'K'); px(g, 11.4, 10.8 + dy, 'W');
    if (f.i >= 1 && f.i <= 3) ret(g, 11, 13.6 + dy, 2, 2, 'N'); // língua para fora
    px(g, 10, 13 + dy, 'K'); px(g, 13, 13 + dy, 'K');
  },
});

// ================== Coelho ==================
def('coelho', {
  fundo: ['#fff0f6', '#f9d6e6'], chao: '#e7b9cf',
  cores: { m: '#f3eaf6', s: '#ffffff', a: '#ffb3c8', n: '#ec7a96' },
  desenhar(g, f) {
    const dy = f.dy;
    ell(g, 18.4, 19.6, 1.9, 1.9, 's', false); // rabinho
    ell(g, 8.6, 4.4 + dy, 2, 5.4, 'm'); ell(g, 8.7, 4.8 + dy, 1, 3.7, 'a', false);
    const t = f.osc * 1.1;
    ell(g, 15.4 + t * 0.6, 4.4 + dy + Math.abs(t) * 0.4, 2, 5.4, 'm'); ell(g, 15.3 + t * 0.6, 4.8 + dy + Math.abs(t) * 0.4, 1, 3.7, 'a', false); // orelha que mexe
    ell(g, 12, 18.3, 5.2, 4, 'm');
    ell(g, 12, 19.4, 3, 2.8, 's', false);
    ell(g, 8.8, 21.4, 2.6, 1.2, 'm'); ell(g, 15.2, 21.4, 2.6, 1.2, 'm');
    ell(g, 12, 11.8 + dy, 6.6, 5.2, 'm');
    olho(g, 8, 10 + dy, f); olho(g, 14, 10 + dy, f);
    ret(g, 11, 13 + dy, 2, 1, 'N'); px(g, 11, 14 + dy, 'K'); px(g, 12, 14 + dy, 'K');
    px(g, 7, 13 + dy, 'B'); px(g, 8, 13 + dy, 'B'); px(g, 15, 13 + dy, 'B'); px(g, 16, 13 + dy, 'B');
  },
});

// ================== Raposa ==================
def('raposa', {
  fundo: ['#fff1e0', '#ffd9b3'], chao: '#e8b685',
  cores: { m: '#e8742a', s: '#fff4e6', a: '#2e1d24', n: '#2a1b24' },
  desenhar(g, f) {
    const sw = f.osc * 1.8;
    traco(g, [[16.5, 20], [19.5, 18.5], [21.4, 15.4], [20.4 + sw, 11.8]], (k) => 3.2 + k * 0.7, 'm'); // rabo fofo
    ell(g, 20.5 + sw, 11.2, 1.9, 1.9, 's', false); // ponta branca
    ell(g, 12, 18, 5, 4.4, 'm');
    ell(g, 12, 17.6, 2.8, 3.2, 's', false);
    ell(g, 9.2, 21.2, 2, 1.2, 'a'); ell(g, 14.8, 21.2, 2, 1.2, 'a');
    ell(g, 12, 9.6 + dy(f), 6.7, 5, 'm');
    const o = [[4.8, 8.6 + dy(f)], [5.6, 0.8 + dy(f)], [10.6, 4.8 + dy(f)]];
    poli(g, o, 'm'); poli(g, espelho(o), 'm');
    poli(g, [[6.2, 6.6 + dy(f)], [6.3, 3.4 + dy(f)], [8.8, 5 + dy(f)]], 'a', false); poli(g, espelho([[6.2, 6.6 + dy(f)], [6.3, 3.4 + dy(f)], [8.8, 5 + dy(f)]]), 'a', false);
    ell(g, 8.8, 12 + dy(f), 2.5, 1.8, 's', false); ell(g, 15.2, 12 + dy(f), 2.5, 1.8, 's', false); // bochechas brancas
    ell(g, 12, 12.6 + dy(f), 2.9, 2, 's', false);
    olho(g, 8, 8.4 + dy(f), f); olho(g, 14, 8.4 + dy(f), f);
    ret(g, 11, 11.4 + dy(f), 2, 1, 'K'); px(g, 11, 12.4 + dy(f), 'K'); px(g, 12, 12.4 + dy(f), 'K');
  },
});
function dy(f) { return f.dy; }

// ================== Coruja ==================
def('coruja', {
  fundo: ['#ece7ff', '#cfc6f5'], chao: '#b5a9e3',
  cores: { m: '#9a6b45', s: '#f0dcc0', a: '#c9a064', g: '#ffc83d', n: '#e8a030' },
  desenhar(g, f) {
    const dy = f.dy;
    const asa = f.i === 2 || f.i === 3 ? -1 : 0;
    ell(g, 12, 15.6, 6.4, 7, 'm');
    ell(g, 12, 17.2, 4, 4.8, 's', false);
    for (const [x, y] of [[10, 15], [13, 15], [11.5, 17.5], [9.5, 18.5], [13.5, 18.5], [11.5, 20]]) px(g, x, y, 'a1'); // penas da barriga
    ell(g, 6.2 + asa * 0.6, 16 + asa, 2.4, 5, 'm'); ell(g, 17.8 - asa * 0.6, 16 + asa, 2.4, 5, 'm'); // asas
    for (const y of [15, 17, 19]) { px(g, 6, y + asa, 'a1'); px(g, 18, y + asa, 'a1'); }
    ell(g, 12, 8.8 + dy, 7, 5.2, 'm');
    const tufo = [[6.4, 6 + dy], [5.4, 1.8 + dy], [9.4, 4.6 + dy]];
    poli(g, tufo, 'm'); poli(g, espelho(tufo), 'm');
    ell(g, 9.2, 9 + dy, 3.3, 3.3, 's', false); ell(g, 14.8, 9 + dy, 3.3, 3.3, 's', false);
    if (f.piscar) { ret(g, 8, 9 + dy, 3, 1, 'K'); ret(g, 13, 9 + dy, 3, 1, 'K'); } else {
      ell(g, 9.2, 9 + dy, 2, 2, 'g', false); ell(g, 14.8, 9 + dy, 2, 2, 'g', false);
      ret(g, 9, 9 + dy, 2, 2, 'K'); ret(g, 14, 9 + dy, 2, 2, 'K'); px(g, 10, 8.6 + dy, 'W'); px(g, 15, 8.6 + dy, 'W');
    }
    poli(g, [[11, 10.6 + dy], [13, 10.6 + dy], [12, 13 + dy]], 'g', false);
    ret(g, 9, 21, 2, 1, 'g1'); ret(g, 13, 21, 2, 1, 'g1'); // garras
  },
});

// ================== Dragãozinho ==================
def('dragao', {
  fundo: ['#e4f7e6', '#c3e8c9'], chao: '#9fd0a8',
  cores: { m: '#59b86a', s: '#f3e3a6', a: '#e0554f', g: '#ffd25a', r: '#ff8a2a', e: '#ffd24a', n: '#3a6b45' },
  desenhar(g, f) {
    const dy = f.dy;
    const voo = f.osc * 1.8;
    poli(g, [[7, 13], [0.8, 9 + voo], [2.4, 15], [6.6, 16.4]], 'a'); poli(g, espelho([[7, 13], [0.8, 9 + voo], [2.4, 15], [6.6, 16.4]]), 'a'); // asas
    traco(g, [[3.2, 10.4 + voo], [2.6, 14.6]], 1, 'a0'); traco(g, [[20.8, 10.4 + voo], [21.4, 14.6]], 1, 'a0');
    traco(g, [[16.5, 20], [20, 19.4], [21.8 + f.osc * 0.8, 16.8]], (k) => 3 - k * 0.6, 'm'); // rabo
    poli(g, [[21, 16.6], [23, 14.8 + f.osc * 0.6], [23.2, 18]], 'a', false);
    ell(g, 12, 17.8, 5.2, 4.6, 'm');
    ell(g, 12, 19, 3, 3.4, 's', false);
    ell(g, 9.2, 21.2, 2, 1.2, 'm'); ell(g, 14.8, 21.2, 2, 1.2, 'm');
    ell(g, 12, 9.6 + dy, 6.4, 5.2, 'm');
    ell(g, 12, 12.4 + dy, 3.5, 2.4, 'm');
    const chifre = [[7.8, 6 + dy], [6, 1.8 + dy], [9.6, 4.6 + dy]];
    poli(g, chifre, 'g', false); poli(g, espelho(chifre), 'g', false);
    olho(g, 8, 8 + dy, f, 'E'); olho(g, 14, 8 + dy, f, 'E');
    px(g, 10.6, 11.6 + dy, 'n'); px(g, 12.6, 11.6 + dy, 'n');
    ret(g, 11, 13.6 + dy, 2, 1, 'K');
    if (f.i === 3 || f.i === 4) { px(g, 15, 14 + dy, 'r2'); px(g, 16, 14.6 + dy, 'r1'); px(g, 17, 14 + dy, 'r2'); px(g, 16, 13.4 + dy, 'r1'); }
    for (const x of [10, 12, 14]) px(g, x, 4.6 + dy - (x === 12 ? 1 : 0), 'g1'); // espinhos
  },
});

// ================== Corvo Agourento ==================
def('corvo', {
  fundo: ['#241b3d', '#3d2b63'], chao: '#2a2045', noite: true,
  cores: { m: '#3d3868', s: '#6f68a0', a: '#948eb8', x: '#9a74ff', e: '#ff4455', n: '#6a6485' },
  desenhar(g, f) {
    const dy = f.dy;
    const sh = f.osc * 0.7;
    poli(g, [[9, 19], [15, 19], [12, 23.4]], 'm', false); // cauda
    ell(g, 12, 15.4, 5.6, 6.4, 'm');
    ell(g, 6.6 - sh, 15.6, 2.4, 5.4, 'm'); ell(g, 17.4 + sh, 15.6, 2.4, 5.4, 'm'); // asas
    for (const y of [13, 15, 17]) { px(g, 6 - sh, y, 's1'); px(g, 18 + sh, y, 's1'); }
    ell(g, 12, 8.6 + dy, 5.8, 5.2, 'm');
    poli(g, [[10.2, 9.8 + dy], [13.8, 9.8 + dy], [12, 14 + dy]], 'a');
    olho(g, 8, 7.4 + dy, f, 'E'); olho(g, 14, 7.4 + dy, f, 'E');
    px(g, 11, 11 + dy, 'K'); px(g, 12, 11 + dy, 'K');
    ret(g, 10, 21, 1, 2, 'a1'); ret(g, 13, 21, 1, 2, 'a1'); px(g, 9, 22, 'a1'); px(g, 14, 22, 'a1');
    px(g, 8.5, 5 + dy, 's1'); px(g, 9.5, 4.4 + dy, 's1'); px(g, 15, 5 + dy, 's1');
    // fiapos de magia sombria
    [[3, 12, 0], [20, 8, 2], [21, 17, 4], [2, 19, 1]].forEach(([x, y, k]) => { const fa = (f.i + k) % 6; if (fa < 4) px(g, x, y - Math.floor(fa / 2), fa === 1 ? 'x2' : 'x1'); });
  },
});

// ================== Lobo Espectral ==================
def('lobo', {
  fundo: ['#16203f', '#2c3f78'], chao: '#22305e', noite: true,
  cores: { m: '#8fb8e8', s: '#e8f4ff', a: '#3e5fa6', g: '#7fffe0', e: '#7ffbff', n: '#1b2a55' },
  desenhar(g, f) {
    const dy = f.dy;
    const ch = f.osc * 1.4;
    // rabo de chama espectral
    traco(g, [[16.5, 19.5], [19.5, 17.5], [21 + ch * 0.4, 14.5], [20 + ch, 11.6]], (k) => 3.4 - k * 0.5, 'g');
    ell(g, 12, 18, 5.4, 4.4, 'm');
    ell(g, 12, 17.6, 2.8, 3.2, 's', false);
    ell(g, 9.2, 21.2, 2, 1.1, 'm'); ell(g, 14.8, 21.2, 2, 1.1, 'm');
    // juba que balança
    ell(g, 12, 14.6 + dy, 6.6, 2.4, 's', false);
    for (const [x, y, k] of [[6.6, 15.6, -1], [8.4, 16.8, -1], [15.6, 16.8, 1], [17.4, 15.6, 1]]) poli(g, [[x - 1.2, y - 1.2 + dy], [x + k * (1.4 + ch * 0.25), y + 1.8 + dy], [x + 1.2, y - 1.2 + dy]], 's', false);
    ell(g, 12, 9.8 + dy, 6.8, 5.4, 'm');
    const o = [[5.4, 8 + dy], [5.8, 1.2 + dy], [10.2, 5 + dy]];
    poli(g, o, 'm'); poli(g, espelho(o), 'm');
    poli(g, [[6.4, 6.6 + dy], [6.6, 3.2 + dy], [8.8, 5.2 + dy]], 'a', false); poli(g, espelho([[6.4, 6.6 + dy], [6.6, 3.2 + dy], [8.8, 5.2 + dy]]), 'a', false);
    ell(g, 12, 12.8 + dy, 3.3, 2.5, 's', false);
    olho(g, 8, 8.2 + dy, f, 'E'); olho(g, 14, 8.2 + dy, f, 'E');
    ret(g, 11, 11.6 + dy, 2, 1, 'K'); px(g, 11, 13.4 + dy, 'K'); px(g, 12, 13.4 + dy, 'K');
    // faíscas flutuando
    [[3, 9, 0], [21, 6, 3], [2, 17, 2], [22, 20, 5]].forEach(([x, y, k]) => { const fa = (f.i + k) % 6; if (fa < 4) px(g, x, y - Math.floor(fa / 2), fa === 1 ? 'g2' : 'g1'); });
  },
});

// ================== Fênix Carmesim ==================
def('fenix', {
  fundo: ['#3b1530', '#7a2438'], chao: '#4a1a28', noite: true,
  cores: { m: '#e0302a', s: '#ff9f43', a: '#ffe27a', g: '#ffd25a', e: '#fff3b0', n: '#ffb347' },
  desenhar(g, f) {
    const dy = f.dy;
    const bat = f.osc * 2.2;
    const asa = [[7.6, 12.4], [0.4, 6.4 + bat], [1.6, 12.6], [3.6, 16.8], [8, 17]];
    poli(g, asa, 'm'); poli(g, espelho(asa), 'm');
    for (const [x, y] of [[2.6, 9 + bat * 0.7], [3.4, 12.2 + bat * 0.3], [4.8, 15]]) { traco(g, [[x, y], [x + 3, y + 1.4]], 1, 's1'); traco(g, [[23 - x, y], [20 - x, y + 1.4]], 1, 's1'); }
    // cauda de chamas
    const fl = f.osc * 0.9;
    traco(g, [[12, 19], [8.4 + fl, 22.2], [7.4 + fl, 23.6]], 2.4, 'm'); traco(g, [[12, 19], [12, 23.6]], 2.6, 'a'); traco(g, [[12, 19], [15.6 - fl, 22.2], [16.6 - fl, 23.6]], 2.4, 'm');
    ell(g, 12, 15, 4.6, 5.4, 'm');
    ell(g, 12, 16, 2.8, 3.8, 's', false);
    ell(g, 12, 8.2 + dy, 4.8, 4.4, 'm');
    // penacho de fogo
    const alt = [0, 1, 0, -1, 0, 1][f.i];
    poli(g, [[10.2, 4.6 + dy], [9.2, 0.6 + dy - alt], [11.6, 3.6 + dy]], 'a', false);
    poli(g, [[11, 4.2 + dy], [12, -0.4 + dy + alt], [13, 4.2 + dy]], 's', false);
    poli(g, [[12.4, 3.6 + dy], [14.8, 0.6 + dy - alt], [13.8, 4.6 + dy]], 'a', false);
    poli(g, [[11.2, 4.4 + dy], [12, 1.4 + dy], [12.8, 4.4 + dy]], 'm', false);
    olho(g, 8.6, 7.4 + dy, f, 'K'); olho(g, 13.4, 7.4 + dy, f, 'K');
    poli(g, [[11, 9.6 + dy], [13, 9.6 + dy], [12, 12 + dy]], 'g', false);
    // brasas subindo
    [[3, 20, 0], [21, 18, 2], [6, 12, 4], [19, 10, 1]].forEach(([x, y, k]) => { const fa = (f.i + k) % 6; px(g, x, y - fa, fa < 2 ? 'a2' : fa < 4 ? 's1' : 'm1'); });
  },
});

// ================== Wyvern das Trevas ==================
def('wyvern', {
  fundo: ['#1b1230', '#3a2260'], chao: '#2b1a4d', noite: true,
  cores: { m: '#6b56b8', s: '#b3a2f0', a: '#e0457a', g: '#f2ecff', x: '#c4b2ff', e: '#ff3355', n: '#2a1d4a' },
  desenhar(g, f) {
    const dy = f.dy;
    const bat = f.osc * 2.6;
    const asa = [[7, 12.4], [0.2, 4 + bat], [1.6, 9.4], [0.4, 13.4], [3.2, 13.6], [2.8, 17.4], [7.2, 16.6]];
    poli(g, asa, 'a'); poli(g, espelho(asa), 'a');
    traco(g, [[6.6, 12.8], [0.8, 4.8 + bat]], 1.4, 'm'); traco(g, [[17.4, 12.8], [23.2, 4.8 + bat]], 1.4, 'm');
    traco(g, [[5.6, 11.6 + bat * 0.3], [2.2, 10.2 + bat * 0.6]], 1, 'm0'); traco(g, [[18.4, 11.6 + bat * 0.3], [21.8, 10.2 + bat * 0.6]], 1, 'm0');
    // rabo comprido com ponta de flecha
    const sw = f.osc * 1.4;
    traco(g, [[16, 19.6], [20, 20.6 + sw * 0.4], [22.2, 18 + sw]], (k) => 3.2 - k * 0.7, 'm');
    poli(g, [[21.2, 17.4 + sw], [23.4, 15.8 + sw], [23.4, 19.6 + sw]], 'a', false);
    ell(g, 12, 16.6, 5.4, 5, 'm');
    ell(g, 12, 17.6, 3.2, 3.8, 's', false);
    ell(g, 9, 21, 2.2, 1.4, 'm'); ell(g, 15, 21, 2.2, 1.4, 'm');
    ell(g, 12, 8.8 + dy, 5.8, 4.6, 'm');
    ell(g, 12, 11.4 + dy, 3.5, 2.4, 'm');
    const ch = [[7.6, 6 + dy], [4.6, 1.6 + dy], [8.6, 4.4 + dy]];
    poli(g, ch, 'g', false); poli(g, espelho(ch), 'g', false);
    olho(g, 8, 7.6 + dy, f, 'E'); olho(g, 14, 7.6 + dy, f, 'E');
    px(g, 10.6, 10.8 + dy, 'n'); px(g, 12.6, 10.8 + dy, 'n'); px(g, 10, 12.6 + dy, 'W'); px(g, 14, 12.6 + dy, 'W'); // presas
    for (const x of [10, 12, 14]) px(g, x, 4 + dy, 'g1');
    [[10, 13, 0], [13, 13, 3]].forEach(([x, y, k]) => { const fa = (f.i + k) % 6; if (fa > 0 && fa < 4) px(g, x + (x < 12 ? -fa : fa) * 0.5, y + 1 + fa * 0.5 + dy, fa === 2 ? 'x2' : 'x1'); }); // fumaça
  },
});

// ================== Quimera Ancestral ==================
def('quimera', {
  fundo: ['#2b1840', '#5a2f73'], chao: '#3c2158', noite: true,
  cores: { m: '#d9a441', s: '#f2e1b3', a: '#7a3a8c', g: '#e8e8f4', r: '#58b86a', e: '#ff5a3c', n: '#3a1d2a' },
  desenhar(g, f) {
    const dy = f.dy;
    const bat = f.osc * 1.8;
    const asa = [[7, 13], [0.4, 8.4 + bat], [1.8, 14.6], [6.4, 16]];
    poli(g, asa, 'a'); poli(g, espelho(asa), 'a');
    // cauda de serpente
    const sw = f.osc * 1.2;
    traco(g, [[17, 20], [20.6, 19], [21.8, 16], [20.6 + sw, 13.4]], 2, 'r');
    ell(g, 20.4 + sw, 12.4, 1.8, 1.5, 'r');
    px(g, 20 + sw, 12 + 0, 'W'); if (f.i === 2 || f.i === 3) { px(g, 20.6 + sw, 10.6, 'N'); px(g, 21.6 + sw, 10, 'N'); }
    ell(g, 12, 18.6, 6, 3.8, 'm');
    ell(g, 12, 19.6, 3.2, 2.6, 's', false);
    ell(g, 8.8, 21.4, 2.4, 1.2, 'm'); ell(g, 15.2, 21.4, 2.4, 1.2, 'm');
    // juba roxa que tremula
    const jb = f.i % 2 === 0 ? 0 : 0.5;
    ell(g, 12, 10.4 + dy, 8.4 + jb, 7.2, 'a');
    for (const [x, y] of [[4, 6], [20, 6], [3.4, 11], [20.6, 11], [5, 16], [19, 16], [12, 2.6]]) poli(g, [[x - 1.2, y + 1.2 + dy], [x, y - 1.2 + dy - jb], [x + 1.2, y + 1.2 + dy]], 'a', false);
    ell(g, 5.6, 5.8 + dy, 1.6, 1.6, 'm'); ell(g, 18.4, 5.8 + dy, 1.6, 1.6, 'm');
    ell(g, 12, 10.6 + dy, 5.6, 4.8, 'm');
    ell(g, 12, 13 + dy, 3.2, 2.2, 's', false);
    // chifres de bode
    traco(g, [[8.2, 6 + dy], [6.4, 3 + dy], [7.6, 0.8 + dy]], 1.6, 'g'); traco(g, [[15.8, 6 + dy], [17.6, 3 + dy], [16.4, 0.8 + dy]], 1.6, 'g');
    olho(g, 8.4, 8.6 + dy, f, 'E'); olho(g, 13.6, 8.6 + dy, f, 'E');
    ret(g, 11, 11.6 + dy, 2, 1, 'K'); px(g, 11, 13.6 + dy, 'W'); px(g, 12, 13.6 + dy, 'W');
  },
});
