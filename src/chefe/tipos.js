// Tipos de chefe: cada um usa um monstro grande desenhado em pixel art.
const TIPOS = {
  dragao: { nome: 'Dragão Negro', emoji: '🐲', rotulo: 'Dragão Negro' },
  lobo: { nome: 'Lobo Infernal', emoji: '🐺', rotulo: 'Lobo Infernal' },
  aranha: { nome: 'Aranha Gigante', emoji: '🕷️', rotulo: 'Aranha Gigante' },
  rei_esqueleto: { nome: 'Rei Esqueleto', emoji: '💀', rotulo: 'Rei Esqueleto' },
  hidra: { nome: 'Hidra Abissal', emoji: '🐍', rotulo: 'Hidra Abissal' },
  golem: { nome: 'Golem de Pedra', emoji: '🗿', rotulo: 'Golem de Pedra' },
  lich: { nome: 'Lich Ancião', emoji: '☠️', rotulo: 'Lich Ancião' },
  cavaleiro: { nome: 'Cavaleiro das Trevas', emoji: '🥷', rotulo: 'Cavaleiro das Trevas' },
  devorador: { nome: 'Devorador de Almas', emoji: '👻', rotulo: 'Devorador de Almas' },
};

const PADRAO = 'dragao';
const info = (tipo) => TIPOS[tipo] || TIPOS[PADRAO];
const escolhas = () => Object.entries(TIPOS).map(([value, t]) => ({ name: t.rotulo, value }));

module.exports = { TIPOS, PADRAO, info, escolhas };
// fim do arquivo
