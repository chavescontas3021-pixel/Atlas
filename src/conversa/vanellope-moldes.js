// ATLAS · tom Vanellope · "não entendi" e respostas calculadas (hora, data, dado, moeda, escolha, conta, dicionário)
const NAO_ENTENDI = {
  normal: [
    'Hã? Essa eu não peguei, {nome}. Tenta de outro jeito, ou usa os atalhos abaixo.',
    'Perdi essa curva. Eu sei de cumprimentos, piadas, curiosidades, dicionário e contas. Quer testar um?',
    'Opa, deu glitch aqui! Fala de novo, {nome}, ou me pede "atlas, ajuda".',
    'Não entendi nada, mas finjo muito bem. Tenta de novo?',
  ],
  pai: [
    'Pai, essa eu não entendi. Explica de outro jeito? Ainda estou aprendendo.',
    'Pai, deu glitch aqui. Tenta de novo? Ou me ensina com `/conversa ensinar`.',
    'Pai, essa me escapou. Quer me ensinar uma resposta nova?',
  ],
  alvo: [
    'Não entendi essa merda que você escreveu. Escreve direito e para de me fazer perder tempo.',
    'Que porra é essa? Tenta de novo, mas dessa vez usando o cérebro.',
    'Nem eu, com todo o meu glitch, consigo entender isso. Escreve de novo, vai.',
  ],
};

const MOLDES = {
  normal: {
    hora: ['São **{r}** agora, {nome}. Tá correndo atrás de algo?', 'Agora são **{r}**, em Brasília.', 'O relógio da pista marca **{r}**.'],
    data: ['Hoje é **{r}**, {nome}.', 'Estamos em **{r}**. O tempo voa, hein!', 'Calendário da Atlas: **{r}**.'],
    dado: ['Rolei {q}: **{r}**. Sorte ou azar?', 'O dado caiu: **{r}** ({q}).', 'Resultado de {q}: **{r}**!'],
    moeda: ['Joguei a moeda: deu **{r}**.', 'A moeda girou, girou e caiu em **{r}**!', 'Deu **{r}**. Sem reclamação!'],
    escolha: ['Eu escolho **{r}**. Já tá decidido!', 'Vai de **{r}**, {nome}. Confia.', 'Meu instinto de corredora diz **{r}**.'],
    calculo: ['{q} = **{r}**. Fácil!', 'A conta dá **{r}** ({q}).', 'Resultado: **{r}**. Pode agradecer.'],
    dicionario_ok: ['Achei, {nome}!', 'Consultei o dicionário pra você:', 'Olha o que descobri:'],
    dicionario_nada: ['Não achei **{r}** no dicionário, {nome}. Confere a escrita?', 'Procurei **{r}** e nada. Tenta sem plural ou com acento.'],
    dicionario_erro: ['O dicionário não respondeu agora. Tenta de novo daqui a pouco!', 'Dicionário fora do ar, {nome}. Tenta mais tarde?'],
    calculo_erro: ['Essa conta eu não consegui resolver, {nome}. Usa números e + - * / ^ ( ).'],
    escolha_erro: ['Pra escolher eu preciso de opções: "atlas, escolhe pizza ou hambúrguer".'],
  },
  pai: {
    hora: ['Pai, são **{r}** em Brasília. Não esquece de se cuidar!', 'Pai, agora são **{r}**.', 'Pai, o relógio marca **{r}**.'],
    data: ['Pai, hoje é **{r}**.', 'Pai, estamos em **{r}**.'],
    dado: ['Pai, rolei {q}: **{r}**!', 'Pai, o dado caiu: **{r}** ({q}).'],
    moeda: ['Pai, joguei a moeda: deu **{r}**.', 'Pai, a moeda caiu em **{r}**!'],
    escolha: ['Pai, eu escolho **{r}**.', 'Pai, vai de **{r}**, confia em mim.'],
    calculo: ['Pai, {q} = **{r}**.', 'Pai, a conta dá **{r}** ({q}).'],
    dicionario_ok: ['Pesquisei pra você, pai:', 'Pai, achei aqui:'],
    dicionario_nada: ['Pai, não achei **{r}** no dicionário. Confere a escrita?'],
    dicionario_erro: ['Pai, o dicionário não respondeu agora. Tento de novo daqui a pouco?'],
    calculo_erro: ['Pai, essa conta eu não consegui resolver. Usa números e + - * / ^ ( ).'],
    escolha_erro: ['Pai, pra escolher eu preciso de opções: "atlas, escolhe pizza ou hambúrguer".'],
  },
  alvo: {
    hora: ['São **{r}**. Não tem relógio, não? Tá de brincadeira, porra.', '**{r}**. E para de perguntar o óbvio.'],
    data: ['Hoje é **{r}**. Tem calendário no celular, caralho.', '**{r}**. Pronto, satisfeito? Agora some.'],
    dado: ['Rolei {q}: **{r}**. Tomara que seja ruim pra você.', 'Deu **{r}** ({q}). Nem o dado quer saber de você.'],
    moeda: ['Deu **{r}**. E vai reclamar da sorte, vai.', 'Caiu **{r}**. Não enche mais, porra.'],
    escolha: ['**{r}**. Nem o que eu escolho você vai gostar, mas é o que tem.', 'Vai de **{r}**. Aceita e cala a boca.'],
    calculo: ['{q} = **{r}**. Nem pra fazer uma conta serve, hein?', 'Deu **{r}** ({q}). Tá aí, usa a calculadora na próxima.'],
    dicionario_ok: ['Toma, já que você não sabe nem o significado de uma palavra:', 'Achei, porra. Lê com atenção:'],
    dicionario_nada: ['**{r}** não existe nem no dicionário. Escreve direito, caralho.'],
    dicionario_erro: ['O dicionário não respondeu. Tenta depois, e para de me encher.'],
    calculo_erro: ['Essa conta nem eu consigo resolver. Escreve direito, porra.'],
    escolha_erro: ['Dá opções, caralho! "escolhe pizza ou hambúrguer". Não é tão difícil.'],
  },
};

module.exports = { NAO_ENTENDI, MOLDES };
