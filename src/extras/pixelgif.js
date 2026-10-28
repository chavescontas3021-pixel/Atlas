// Gerador de GIF animado em pixel art, sem bibliotecas: usado pelos personagens e (depois) pelos combates.
// Cada quadro é uma grade de cores "#rrggbb"; o GIF é ampliado pela escala (pixels grandes e nítidos).

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
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

// quadros: [grade, grade, ...] onde grade = array de linhas, cada linha = array de "#rrggbb"
// atraso em centésimos de segundo (ex.: 40 = 0,4 s)
function montar(quadros, { escala = 6, atraso = 40 } = {}) {
  const alt = quadros[0].length;
  const larg = quadros[0][0].length;
  const paleta = [];
  const indice = new Map();
  for (const g of quadros) {
    for (const linha of g) {
      for (const c of linha) {
        if (!indice.has(c)) {
          if (paleta.length >= 256) throw new Error('Cores demais para um GIF (máx. 256).');
          indice.set(c, paleta.length);
          paleta.push(c);
        }
      }
    }
  }
  let bits = 2;
  while (1 << bits < paleta.length) bits++;
  const W = larg * escala;
  const H = alt * escala;
  const out = [];
  out.push(...Buffer.from('GIF89a'));
  out.push(...u16(W), ...u16(H), 0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0);
  for (let i = 0; i < 1 << bits; i++) out.push(...(paleta[i] ? rgb(paleta[i]) : [0, 0, 0]));
  out.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0); // repete para sempre
  for (const g of quadros) {
    const pixels = new Array(W * H);
    let p = 0;
    for (const linha of g) {
      const exp = [];
      for (const c of linha) {
        const i = indice.get(c);
        for (let e = 0; e < escala; e++) exp.push(i);
      }
      for (let e = 0; e < escala; e++) for (let x = 0; x < W; x++) pixels[p++] = exp[x];
    }
    out.push(0x21, 0xf9, 0x04, 0x00, ...u16(atraso), 0, 0);
    out.push(0x2c, 0, 0, 0, 0, ...u16(W), ...u16(H), 0);
    out.push(bits);
    const dados = lzw(pixels, bits);
    for (let i = 0; i < dados.length; i += 255) {
      const parte = dados.slice(i, i + 255);
      out.push(parte.length, ...parte);
    }
    out.push(0);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

module.exports = { montar, rgb };
// fim do arquivo
