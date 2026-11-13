// ─────────────────────────────────────────────────────────────
//  ATLAS · identidade visual
//  Tudo que dá "cara" ao bot mora aqui. Mudou aqui, mudou em todo lugar.
//
//  Conceito: o Atlas é um mapa. Então toda mensagem tem uma TRILHA
//  (Atlas / Ajuda / Membros), como um caminho no mapa, e os textos
//  usam poucos símbolos tipográficos em vez de emojis.
// ─────────────────────────────────────────────────────────────

// Cor da barrinha lateral do embed.
// 0x2b2d31 = mesma cor do fundo do Discord escuro: a barra "some" e o painel
// fica limpo, quase preto. Quer preto puro? Troque por 0x000000.
const COR = {
  base: 0x2b2d31,
  perigo: 0xed4245, // só para ações destrutivas (banir, apagar...)
};

// Símbolos oficiais do Atlas. Preferir estes aos emojis coloridos.
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
  lock: '⌁', // marca de "só staff"
};

// Emojis permitidos nos botões (poucos e discretos). Use `null` para não ter emoji.
const E = {
  anterior: '‹',
  proxima: '›',
  inicio: '«',
  fim: '»',
};

const MARCA = 'ATLAS';

// Separa as partes com um espaço fino e uma barra: "Atlas / Ajuda / Membros"
const trilha = (...partes) => [MARCA, ...partes.filter(Boolean)].join('  /  ');

// Barra de progresso minimalista: ▰▰▰▱▱ (0 a 1)
function barra(valor, tamanho = 10) {
  const v = Math.max(0, Math.min(1, Number(valor) || 0));
  const cheio = Math.round(v * tamanho);
  return '▰'.repeat(cheio) + '▱'.repeat(tamanho - cheio);
}

// Corta texto sem estourar o limite do Discord
const corta = (texto, n) => {
  const s = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

// Tira emojis do COMEÇO de um texto: "🔨 Banimento" vira "Banimento".
// (Emojis de teclado como 1️⃣ e emojis personalizados <:nome:id> ficam como estão.)
const tirarEmoji = (texto) => String(texto ?? '').replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u, '');

// Timestamp do Discord (<t:...>)
const quando = (ms, estilo = 'R') => `<t:${Math.floor(Number(ms) / 1000)}:${estilo}>`;

module.exports = { COR, S, E, MARCA, trilha, barra, corta, quando, tirarEmoji };
