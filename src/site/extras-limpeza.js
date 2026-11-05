// Campos do site para a limpeza de recepções paradas (aba Recepção)
const Limpeza = require('../recepcao/limpeza');

const G = 'Recepção';
const DEPOIS = 'config.recepcao.mensagens.sucesso.texto';
const B = 'config.recepcaolimpeza';

function specs() {
  return [
    {
      grupo: G, caminho: `${B}.ligado`, tipo: 'bool', padrao: false, depois: DEPOIS,
      rotulo: 'Limpeza de recepções paradas ligada',
      dica: 'Precisa do canal do aviso (abaixo). Não mexe em recepção assumida pela staff, aguardando autorização ou de teste.',
    },
    { grupo: G, caminho: `${B}.lembreteHoras`, tipo: 'numero', min: 1, max: 720, padrao: 12, depois: DEPOIS, rotulo: 'Limpeza: horas parada até o lembrete no canal' },
    { grupo: G, caminho: `${B}.avisoHoras`, tipo: 'numero', min: 1, max: 720, padrao: 24, depois: DEPOIS, rotulo: 'Limpeza: horas parada até avisar a staff', dica: 'Precisa ser maior que o tempo do lembrete.' },
    { grupo: G, caminho: `${B}.apagarHoras`, tipo: 'numero', min: 1, max: 720, padrao: 48, depois: DEPOIS, rotulo: 'Limpeza: horas parada até apagar o canal', dica: 'Precisa ser maior que o tempo do aviso.' },
    { grupo: G, caminho: `${B}.canalAviso`, tipo: 'canal', padrao: null, depois: DEPOIS, rotulo: 'Limpeza: canal da staff que recebe o aviso' },
    { grupo: G, caminho: `${B}.cargoAviso`, tipo: 'cargo', padrao: null, depois: DEPOIS, rotulo: 'Limpeza: cargo marcado no aviso (vazio = cargo de staff da recepção)' },
    {
      grupo: G, caminho: `${B}.textoLembrete`, tipo: 'longo', max: 1000, padrao: Limpeza.TEXTO_PADRAO, depois: DEPOIS,
      rotulo: 'Limpeza: texto do lembrete no canal', dica: 'Variáveis: {usuario} {parado}',
    },
  ];
}

module.exports = { specs };
