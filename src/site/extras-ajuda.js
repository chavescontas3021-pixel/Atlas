// Campos do site para o botão "Solicitar ajuda" da recepção (aba Recepção)
const Ajuda = require('../recepcao/ajuda');

const G = 'Recepção';
const DEPOIS = 'config.recepcao.mensagens.sucesso.texto';
const B = 'config.recepcao.ajuda';

function specs() {
  return [
    {
      grupo: G, caminho: `${B}.ativo`, tipo: 'bool', padrao: true, depois: DEPOIS,
      rotulo: 'Botão "Solicitar ajuda" ligado',
      dica: 'Vale para recepções novas. A marcação usa o cargo de staff da recepção.',
    },
    {
      grupo: G, caminho: `${B}.cooldownMin`, tipo: 'numero', min: 0, max: 1440, padrao: 10, depois: DEPOIS,
      rotulo: 'Ajuda: minutos de espera entre um pedido e outro (0 = sem espera)',
    },
    {
      grupo: G, caminho: `${B}.texto`, tipo: 'longo', max: 1000, padrao: Ajuda.TEXTO_PADRAO, depois: DEPOIS,
      rotulo: 'Ajuda: mensagem que marca a staff no canal', dica: 'Variáveis: {staff} {usuario}',
    },
    {
      grupo: G, caminho: `${B}.resposta`, tipo: 'longo', max: 1000, padrao: Ajuda.RESPOSTA_PADRAO, depois: DEPOIS,
      rotulo: 'Ajuda: resposta que só o membro vê depois de apertar',
    },
  ];
}

module.exports = { specs };
