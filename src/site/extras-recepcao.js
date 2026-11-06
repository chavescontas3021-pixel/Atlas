// Campos do site para as funções novas da recepção:
// confirmação do personagem, "sou apenas representante", avisos de assumir/devolver
// e a mensagem de "Deem boas-vindas" (autorização da staff).
const T = require('../recepcao/textos');
const A = require('../recepcao/aprovacao');

const G = 'Recepção';
const DEPOIS = 'config.recepcao.mensagens.sucesso.texto'; // os campos entram logo depois deste, na aba Recepção
const M = (tipo) => `config.recepcao.mensagens.${tipo}`;

function texto(tipo, rotulo, vars) {
  return {
    grupo: G, caminho: `${M(tipo)}.texto`, rotulo: `${rotulo} — texto`, tipo: 'longo', max: 2000,
    padrao: T.PADROES.mensagens[tipo].texto, dica: vars ? `Variáveis: ${vars}` : 'Sem variáveis.', depois: DEPOIS,
  };
}
function titulo(tipo, rotulo, vars) {
  return {
    grupo: G, caminho: `${M(tipo)}.titulo`, rotulo: `${rotulo} — título`, tipo: 'texto', max: 200,
    padrao: T.PADROES.mensagens[tipo].titulo, dica: vars ? `Variáveis: ${vars}` : 'Sem variáveis.', depois: DEPOIS,
  };
}

function specs() {
  const lista = [
    // ----- Primeira mensagem do canal -----
    texto('inicio', 'Primeira mensagem do canal (texto simples, sem embed)', '{usuario} {servidor}'),

    // ----- Confirmação do personagem -----
    {
      grupo: G, caminho: 'config.recepcao.confirmarPersonagem', tipo: 'bool', padrao: true, depois: DEPOIS,
      rotulo: 'Perguntar "é esse mesmo?" antes de aceitar o nome do personagem',
      dica: 'Evita o Atlas tratar uma conversa qualquer como se fosse o personagem. Desligado, ele aceita o nome na hora.',
    },
    texto('confirmarPersonagem', 'Pergunta do personagem', '{personagem} {usuario}'),
    texto('dicaPersonagem', 'Dica do personagem (mostrada uma vez)', '{usuario}'),
    texto('dicaEmoji', 'Dica do emoji (mostrada uma vez)'),

    // ----- Apenas representante -----
    {
      grupo: G, caminho: 'config.recepcao.rep.ativo', tipo: 'bool', padrao: true, depois: DEPOIS,
      rotulo: 'Botão "Sou apenas representante" ligado',
      dica: 'O botão só aparece se pelo menos um dos canais abaixo estiver definido.',
    },
    { grupo: G, caminho: 'config.recepcao.rep.canalParceria', rotulo: 'Representante: canal de parceria', tipo: 'canal', padrao: null, depois: DEPOIS },
    { grupo: G, caminho: 'config.recepcao.rep.canalAlianca', rotulo: 'Representante: canal de aliança', tipo: 'canal', padrao: null, depois: DEPOIS },
    titulo('repConfirmar', 'Representante: confirmação', '{usuario} {servidor}'),
    texto('repConfirmar', 'Representante: confirmação', '{usuario} {servidor}'),
    titulo('rep', 'Representante: canais', '{usuario} {servidor} {canalParceria} {canalAlianca} {segundos}'),
    texto('rep', 'Representante: canais', '{usuario} {servidor} {canalParceria} {canalAlianca} {segundos}'),

    // ----- Staff assumiu / devolveu -----
    texto('assumiu', 'Staff assumiu o atendimento', '{staff} {usuario}'),
    texto('devolveu', 'Staff devolveu ao Atlas', '{usuario}'),
    texto('assumido', 'Aviso ao membro enquanto a staff está com o atendimento'),

    // ----- Autorização da staff e "Deem boas-vindas" -----
    {
      grupo: G, caminho: 'config.recepcao.aprovacao.ativo', tipo: 'bool', padrao: false, depois: DEPOIS,
      rotulo: 'Autorização da staff ligada (a staff aprova cada verificação)',
      dica: 'Desligado, o Atlas verifica sozinho. Precisa do canal da staff abaixo.',
    },
    { grupo: G, caminho: 'config.recepcao.aprovacao.canal', rotulo: 'Autorização: canal da staff que recebe os pedidos', tipo: 'canal', padrao: null, depois: DEPOIS },
    { grupo: G, caminho: 'config.recepcao.aprovacao.canalBoasVindas', rotulo: 'Autorização: canal da mensagem "Deem boas-vindas"', tipo: 'canal', padrao: null, depois: DEPOIS },
    { grupo: G, caminho: 'config.recepcao.aprovacao.cargoPing', rotulo: 'Autorização: cargo marcado ("membro novo")', tipo: 'cargo', padrao: null, depois: DEPOIS },
    {
      grupo: G, caminho: 'config.recepcao.aprovacao.mensagem', rotulo: 'Autorização: mensagem de "Deem boas-vindas"', tipo: 'longo', max: 1500,
      padrao: A.MSG_PADRAO, depois: DEPOIS, dica: 'Variáveis: {cargo} {membro} {nick} {personagem} {servidor} {staff}',
    },
  ];
  return lista;
}

module.exports = { specs };
