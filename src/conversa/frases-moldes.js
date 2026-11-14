// ATLAS · conversa · tom padrão (guia elegante): resposta de "não entendi" e moldes das respostas calculadas.
// Quando não entende
const NAO_ENTENDI = {
  normal: [
    'Hmm, essa eu não consegui ler no mapa, {nome}. Tente de outro jeito, ou veja o que eu sei fazer pelos atalhos abaixo.',
    'Não entendi muito bem. Eu sei conversar sobre cumprimentos, ânimo, piadas, curiosidades, dicionário e contas. Quer tentar um?',
    'Essa me pegou, {nome}! Ainda estou aprendendo. Tente algo como "atlas, me conta uma curiosidade".',
    'Não achei essa rota. Se quiser, peça "atlas, ajuda" para ver o que eu faço.',
    'Perdi o norte aqui. Pode dizer de outro jeito? Ou veja os atalhos abaixo.',
  ],
  pai: [
    'Pai, essa eu não entendi. Pode explicar de outro jeito? Ainda estou aprendendo.',
    'Pai, me perdoa, não captei. Tente de novo? Ou me ensine com `/conversa ensinar`.',
    'Pai, essa me escapou. Se o senhor quiser, pode me ensinar uma resposta nova.',
    'Pai, não entendi, mas anotei que preciso aprender. Obrigado pela paciência.',
  ],
};

// Moldes para respostas calculadas (hora, data, dado, moeda, escolha, conta, dicionário)
const MOLDES = {
  normal: {
    hora: ['Agora são **{r}**, em Brasília.', 'São **{r}** no meu relógio, {nome}.', 'O relógio marca **{r}**.'],
    data: ['Hoje é **{r}**.', 'Estamos em **{r}**, {nome}.', 'No mapa de hoje: **{r}**.'],
    dado: ['Rolei {q}: **{r}**.', 'O dado caiu: **{r}** ({q}).', 'Resultado de {q}: **{r}**.'],
    moeda: ['Joguei a moeda: deu **{r}**.', 'A moeda girou e caiu em **{r}**.', 'Resultado: **{r}**!'],
    escolha: ['Eu escolho **{r}**.', 'Meu mapa aponta para **{r}**.', 'Vai de **{r}**, {nome}.'],
    calculo: ['{q} = **{r}**', 'A conta dá **{r}** ({q}).', 'Resultado: **{r}**'],
    dicionario_ok: ['Achei, {nome}:', 'Aqui está o que encontrei:', 'Consultei o dicionário:'],
    dicionario_nada: ['Não encontrei **{r}** no dicionário, {nome}. Confere a escrita?', 'Procurei por **{r}**, mas não achei. Tente a forma sem plural ou com acento.'],
    dicionario_erro: ['O dicionário não respondeu agora. Tente de novo daqui a pouco.', 'Não consegui consultar o dicionário agora. Pode tentar mais tarde?'],
    calculo_erro: ['Essa conta eu não consegui resolver, {nome}. Use números e + - * / ^ ( ).'],
    escolha_erro: ['Para escolher eu preciso de opções: "atlas, escolhe pizza ou hambúrguer".'],
  },
  pai: {
    hora: ['Pai, são **{r}** em Brasília.', 'Pai, agora são **{r}**. Não esqueça de se cuidar!', 'Pai, o relógio marca **{r}**.'],
    data: ['Pai, hoje é **{r}**.', 'Pai, estamos em **{r}**.', 'No mapa de hoje, pai: **{r}**.'],
    dado: ['Pai, rolei {q}: **{r}**.', 'Pai, o dado caiu: **{r}** ({q}).'],
    moeda: ['Pai, joguei a moeda: deu **{r}**.', 'Pai, a moeda caiu em **{r}**!'],
    escolha: ['Pai, eu escolho **{r}**.', 'Pai, o meu mapa aponta para **{r}**.'],
    calculo: ['Pai, {q} = **{r}**.', 'Pai, a conta dá **{r}** ({q}).'],
    dicionario_ok: ['Pesquisei pro senhor, pai:', 'Pai, achei aqui:', 'Consultei o dicionário, pai:'],
    dicionario_nada: ['Pai, não achei **{r}** no dicionário. Pode conferir a escrita?', 'Pai, procurei **{r}**, mas não encontrei.'],
    dicionario_erro: ['Pai, o dicionário não respondeu agora. Tento de novo daqui a pouco?', 'Pai, não consegui consultar o dicionário agora, desculpa.'],
    calculo_erro: ['Pai, essa conta eu não consegui resolver. Use números e + - * / ^ ( ).'],
    escolha_erro: ['Pai, para escolher eu preciso de opções: "atlas, escolhe pizza ou hambúrguer".'],
  },
};

module.exports = { NAO_ENTENDI, MOLDES };
