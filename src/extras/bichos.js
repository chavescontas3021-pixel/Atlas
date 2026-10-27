// Bichinhos fofos em pixel art, com animação (pulinho + piscadinha + brilho).
// O GIF é montado aqui mesmo, sem precisar de nenhuma biblioteca extra.
const { AttachmentBuilder } = require('discord.js');

const ESCALA = 10; // cada pixel vira 10x10
const ATRASO = 45; // 0,45 s por quadro
const FUNDOS = [
  [255, 232, 243], // rosa
  [225, 240, 255], // azul
  [235, 255, 235], // verde
  [255, 247, 220], // creme
  [240, 232, 255], // lilás
];
const BRILHO = [255, 255, 255];

// Sprites 16x16. "." = fundo. Cada bicho tem sua paleta (letra -> cor).
// o contorno · c corpo · w claro · k olho · b brilho do olho · p bochecha · n nariz/bico
const BICHOS = {
  gatinho: {
    emoji: '🐱', nome: 'Gatinho',
    cores: { o: [92, 54, 38], c: [255, 170, 90], w: [255, 238, 214], k: [30, 24, 36], p: [255, 140, 170], n: [240, 100, 130], b: [255, 255, 255] },
    q: [
      '................',
      '..oo........oo..',
      '.ocpo......opco.',
      '.occcooooooccco.',
      'occcccccccccccco',
      'occcccccccccccco',
      'occkbcccccckbcco',
      'occkkcccccckkcco',
      'oppccccnnccccppo',
      '.occcccwwcccccco',
      '..oooooooooooo..',
      '.occwwwwwwwwcco.',
      '.occwwwwwwwwcco.',
      '.owwowwwwwowwwo.',
      '..oo.oooooo.oo..',
      '................',
    ],
  },
  coelhinho: {
    emoji: '🐰', nome: 'Coelhinho',
    cores: { o: [110, 86, 110], c: [250, 244, 250], w: [255, 255, 255], k: [34, 28, 44], p: [255, 160, 190], n: [240, 110, 140], b: [255, 255, 255] },
    q: [
      '...oo......oo...',
      '..opco....ocpo..',
      '..opco....ocpo..',
      '..opco....ocpo..',
      '..occo....occo..',
      '..ooccoooocco...',
      '.occcccccccccco.',
      'occkbcccccckbcco',
      'occkkcccccckkcco',
      'oppccccnnccccppo',
      '.occcccppcccccco',
      '..oooooooooooo..',
      '.occcccccccccco.',
      '.occcccccccccco.',
      '..oooo.oo.oooo..',
      '................',
    ],
  },
  pintinho: {
    emoji: '🐥', nome: 'Pintinho',
    cores: { o: [140, 90, 20], c: [255, 222, 90], w: [255, 240, 150], k: [30, 24, 36], p: [255, 150, 150], n: [255, 150, 50], b: [255, 255, 255] },
    q: [
      '................',
      '.......oo.......',
      '......occo......',
      '.....oocoo......',
      '....oocccccoo...',
      '...occccccccco..',
      '..occkbcccckbco.',
      '..occkkcccckkco.',
      '..oppcccnncccpo.',
      '..occccnnnccccpo',
      '..occcccccccccco',
      '..occcwwwwwcccco',
      '...occwwwwwccco.',
      '....ooccccccoo..',
      '.....onn..onn...',
      '................',
    ],
  },
  ursinho: {
    emoji: '🐻', nome: 'Ursinho',
    cores: { o: [78, 48, 34], c: [176, 118, 76], w: [240, 208, 170], k: [28, 22, 30], p: [255, 140, 160], n: [60, 36, 30], b: [255, 255, 255] },
    q: [
      '................',
      '.oooo......oooo.',
      'occwco....ocwcco',
      'occcccooooccccco',
      '.occcccccccccco.',
      'occcccccccccccco',
      'occkbcccccckbcco',
      'occkkcccccckkcco',
      'oppccwwwwwwccppo',
      '.occcwwnnwwccco.',
      '..occcwwwwcccco.',
      '..oooooooooooo..',
      '.occcwwwwwwccco.',
      '.occcwwwwwwccco.',
      '..ooo.oooo.ooo..',
      '................',
    ],
  },
  raposinha: {
    emoji: '🦊', nome: 'Raposinha',
    cores: { o: [96, 40, 20], c: [244, 120, 40], w: [255, 246, 236], k: [28, 22, 30], p: [255, 140, 160], n: [40, 28, 30], b: [255, 255, 255], d: [60, 40, 40] },
    q: [
      '................',
      '.oo..........oo.',
      '.ocdo......odco.',
      '.occcooooooccco.',
      '.occccccccccccco',
      'occcccccccccccco',
      'occkbccccccckbco',
      'owckkccccccckkwo',
      'owwwccccccccwwwo',
      '.owwwwcnnwwwwwo.',
      '..owwwwwwwwwwo..',
      '...ooowwwwooo...',
      '..occcowwocccco.',
      '.occccowwoccccco',
      '..ooo.oooo.oooo.',
      '................',
    ],
  },
  pinguim: {
    emoji: '🐧', nome: 'Pinguim',
    cores: { o: [20, 26, 48], c: [52, 66, 110], w: [250, 250, 255], k: [20, 20, 30], p: [255, 150, 170], n: [255, 170, 50], b: [255, 255, 255] },
    q: [
      '................',
      '.....oooooo.....',
      '....occccccoo...',
      '...occccccccco..',
      '..occwwcccwwcco.',
      '..occkbwwwkbcco.',
      '..occkkwnnkkcco.',
      '..opcwwwnnwwcpo.',
      '..occwwwwwwwcco.',
      '.oocwwwwwwwwcoo.',
      '.occwwwwwwwwwcco',
      '.occwwwwwwwwwcco',
      '..occwwwwwwwcco.',
      '...oooccccooo...',
      '..nnn.oooo.nnn..',
      '................',
    ],
  },
};

// Compressão LZW usada pelo formato GIF
function lzw(indices, minCode) {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let tam = minCode + 1;
  let prox = eoi + 1;
  let dic = new Map();
  const bytes = [];
  let acc = 0;
  let bits = 0;
  const emitir = (codigo) => {
    acc |= codigo << bits;
    bits += tam;
    while (bits >= 8) {
      bytes.push(acc & 255);
      acc >>>= 8;
      bits -= 8;
    }
  };
  emitir(clear);
  let atual = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const chave = atual * 256 + k;
    if (dic.has(chave)) {
      atual = dic.get(chave);
    } else {
      emitir(atual);
      if (prox === 4096) {
        emitir(clear);
        tam = minCode + 1;
        prox = eoi + 1;
        dic = new Map();
      } else {
        if (prox >= 1 << tam) tam++;
        dic.set(chave, prox++);
      }
      atual = k;
    }
  }
  emitir(atual);
  emitir(eoi);
  if (bits > 0) bytes.push(acc & 255);
  return bytes;
}

const u16 = (n) => [n & 255, (n >> 8) & 255];

// ---------- Quadros ----------
const BRILHINHO = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]; // uma estrelinha de 5 pixels
const chaves = Object.keys(BICHOS);

// Quadro 1: parado. Quadro 2: pulinho (1 pixel para baixo), olhos fechados e estrelinha.
function quadro(bicho, indice) {
  const grade = bicho.q.map((l) => l.split(''));
  if (indice === 0) return grade;
  const novo = grade.map((l) => l.map(() => '.'));
  for (let y = 0; y < grade.length; y++) {
    for (let x = 0; x < 16; x++) if (grade[y][x] !== '.' && y + 1 < grade.length) novo[y + 1][x] = grade[y][x];
  }
  // piscadinha: o olho vira um tracinho
  for (let y = 0; y < novo.length; y++) {
    const linha = novo[y];
    const temBrilho = linha.includes('b');
    for (let x = 0; x < 16; x++) {
      if (linha[x] === 'b') linha[x] = 'o';
      else if (linha[x] === 'k' && !temBrilho) {
        const vizinho = [linha[x - 1], linha[x + 1]].find((c) => c && c !== 'k' && c !== 'b' && c !== '.');
        linha[x] = vizinho || 'c';
      }
    }
  }
  // k da linha do brilho vira tracinho também
  for (const linha of novo) if (linha.includes('o') && linha.includes('k')) for (let x = 0; x < 16; x++) if (linha[x] === 'k' && linha.slice(Math.max(0, x - 1), x + 2).includes('o')) linha[x] = 'o';
  for (const [dx, dy] of BRILHINHO) if (novo[dy][dx] === '.') novo[dy][dx] = '*';
  return novo;
}

function montarGif(chave, fundoIdx) {
  const bicho = BICHOS[chave];
  const letras = Object.keys(bicho.cores);
  const paleta = [FUNDOS[fundoIdx % FUNDOS.length], ...letras.map((l) => bicho.cores[l]), BRILHO];
  const mapa = { '.': 0, '*': paleta.length - 1 };
  letras.forEach((l, i) => (mapa[l] = i + 1));

  const larg = 16 * ESCALA;
  const alt = 16 * ESCALA;
  const out = [];
  out.push(...Buffer.from('GIF89a'));
  out.push(...u16(larg), ...u16(alt), 0xf3, 0, 0); // tabela global de 16 cores
  for (let i = 0; i < 16; i++) out.push(...(paleta[i] || [0, 0, 0]));
  out.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0); // repete para sempre
  for (let q = 0; q < 2; q++) {
    const grade = quadro(bicho, q);
    const pixels = [];
    for (const linha of grade) {
      const expandida = [];
      for (const c of linha) for (let e = 0; e < ESCALA; e++) expandida.push(mapa[c] || 0);
      for (let e = 0; e < ESCALA; e++) pixels.push(...expandida);
    }
    out.push(0x21, 0xf9, 0x04, 0x04, ...u16(ATRASO), 0, 0);
    out.push(0x2c, 0, 0, 0, 0, ...u16(larg), ...u16(alt), 0);
    out.push(4);
    const dados = lzw(pixels, 4);
    for (let i = 0; i < dados.length; i += 255) {
      const parte = dados.slice(i, i + 255);
      out.push(parte.length, ...parte);
    }
    out.push(0);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

const cache = new Map();
function gif(chave, fundoIdx = 0) {
  const k = `${chave}:${fundoIdx % FUNDOS.length}`;
  if (!cache.has(k)) cache.set(k, montarGif(chave, fundoIdx));
  return cache.get(k);
}

// Sorteia (ou usa) um bichinho e devolve tudo pronto para mandar numa mensagem
function sortear(chave) {
  const c = chave && BICHOS[chave] ? chave : chaves[Math.floor(Math.random() * chaves.length)];
  const fundo = Math.floor(Math.random() * FUNDOS.length);
  const nome = `${c}.gif`;
  return { chave: c, emoji: BICHOS[c].emoji, nome: BICHOS[c].nome, arquivo: nome, url: `attachment://${nome}`, anexo: () => new AttachmentBuilder(gif(c, fundo), { name: nome }) };
}

module.exports = { BICHOS, chaves, gif, sortear };
