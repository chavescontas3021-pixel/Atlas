// ATLAS · conversa · quando nenhum assunto casa: ele responde ao TIPO da frase (pergunta ou comentário)
// em vez de só dizer que não entendeu. "não entendi" fica para teclada aleatória.
module.exports = {
  pergunta: {
    normal: [
      'Boa pergunta, {nome}! Essa eu não sei, mas se você me ensinar eu aprendo rapidinho (a staff usa /conversa ensinar).',
      'Hmm, boa essa! Eu sei de piadas, curiosidades, contas e dicionário. Quer tentar uma dessas?',
      'Se eu soubesse, falaria! Mas posso te contar uma curiosidade pra compensar. É só pedir.',
      'Pergunta difícil, {nome}. Pergunta de novo de outro jeito, ou pede "atlas, ajuda".',
    ],
    forte: ['Que pergunta do caralho, {nome}! Eu não sei, mas adorei.', 'Puta pergunta! Eu não sei a resposta, mas posso contar uma piada.'],
    pai: [
      'Pai, boa pergunta! Essa eu não sei. Me ensina com `/conversa ensinar`?',
      'Pai, essa eu não sei, mas se você me ensinar, eu aprendo rápido. Prometo.',
    ],
    fortePai: ['Pai, que pergunta difícil da porra! Me ensina?'],
    alvo: ['Que pergunta é essa, porra? Eu não sou enciclopédia, vai pesquisar.', 'Pergunta idiota pede resposta idiota: não sei. Satisfeito?'],
  },
  comentario: {
    normal: [
      'Hm, entendi, {nome}! E aí, o que mais?',
      'Interessante! Continua, que eu tô ouvindo.',
      'Faz sentido. Quer que eu faça alguma coisa, ou é só papo mesmo?',
      'Ahh, tá. Se precisar de algo, é só chamar.',
      'Tô acompanhando! Conta mais, {nome}.',
    ],
    forte: ['Que porra interessante, {nome}! Continua.', 'Caralho, faz sentido. E aí?'],
    pai: ['Hm, entendi, pai! Conta mais.', 'Pai, tô acompanhando! Quer que eu faça algo?', 'Interessante, pai! E o que mais?'],
    fortePai: ['Pai, que porra interessante! Continua.'],
    alvo: ['Nossa, que fascinante. Tô morrendo de sono, porra.', 'Tá, e daí? Fala logo o que você quer.', 'Anotei. Não vou fazer nada com isso, mas anotei.'],
  },
};
