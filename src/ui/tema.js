const COR = {
  base: 0x2b2d31,
  perigo: 0xed4245,
};

const S = {
  ponto: '●',
  vazio: '○',
  seta: '▸',
  filho: '↳',
  sep: '·',
  tracoLongo: '—',
  cheio: '█',
  meio: '▒',
  fino: '░',
  lock: '⌁',
};

const E = {
  anterior: '‹',
  proxima: '›',
  inicio: '«',
  fim: '»',
};

const MARCA = 'ATLAS';

const trilha = (...partes) => [MARCA, ...partes.filter(Boolean)].join('  /  ');

function barra(valor, tamanho = 10) {
  const v = Math.max(0, Math.min(1, Number(valor) || 0));
  const cheio = Math.round(v * tamanho);
  return '▰'.repeat(cheio) + '▱'.repeat(tamanho - cheio);
}

const corta = (texto, n) => {
  const s = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

const tirarEmoji = (texto) => String(texto ?? '').replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u, '');

const quando = (ms, estilo = 'R') => `<t:${Math.floor(Number(ms) / 1000)}:${estilo}>`;

module.exports = { COR, S, E, MARCA, trilha, barra, corta, quando, tirarEmoji };
