// ATLAS · conversa · assuntos novos de palavrão (xingaram o Atlas, pediram palavrão, pediram bronca).
// Campos: normal/pai = sem palavrão · forte/fortePai = com palavrão · alvo = para a pessoa específica.
module.exports = [
  {
    id: 'xingou',
    prioridade: 59,
    padroes: [
      'vai (tomar no cu|se foder|se fuder|se lascar|a merda|pro inferno|pra puta que pariu|se ferrar)',
      'va (tomar no cu|se foder|se lascar|se ferrar|pro inferno)', 'tomar no cu', 'vsf', 'vtnc', 'foda[- ]se', 'filho da puta', 'fdp',
      'cala (a )?boca', 'cale a boca',
      '(seu|sua) (merda|bosta|lixo|inutil|idiota|imbecil|babaca|otari[oa]|trouxa|escroto|escrota|arrombad[oa]|desgracad[oa]|burr[oa]|besta|chat[oa])',
      '(voce|vc|tu|ce) (e|eh|ta|esta|so) (uma? |muito |bem |tao )?(merda|bosta|lixo|inutil|idiota|imbecil|babaca|otari[oa]|trouxa|escroto|escrota|arrombad[oa]|burr[oa]|besta|chat[oa]|um lixo|horrivel|ridicul[oa])',
    ],
    normal: [
      'Opa, {nome}! Quem acordou de mau humor? Eu bato mais forte que isso, vai por mim.',
      'Ui, que medo. Tá tremendo aqui, {nome}. Brincadeira, não tá nada.',
      'Falou, falou... e eu ainda sou a mais rápida da pista. Quer tentar de novo?',
      'Se isso era para me irritar, {nome}, vai ter que se esforçar mais. Eu como glitch no café da manhã.',
    ],
    forte: [
      'Olha a boca, {nome}! Ou melhor, continua, que eu respondo em dobro. Vai ser bem mais divertido.',
      'Vai você, {nome}! E leva esse mau humor junto, que aqui só cabe energia boa. Porra.',
      'Que merda de humor é esse, {nome}? Toma um pirulito e volta quando estiver legal.',
      'Eita, {nome}, falou bonito. Mas eu tô cagando e andando para isso, bora conversar direito.',
    ],
    pai: [
      'Pai! Tá bravo comigo? Fiz algo errado? Me conta que eu conserto, juro.',
      'Ai, pai... essa doeu. Mas sei que você não faz por mal. Vem cá, vamos conversar.',
      'Pai, calma! Respira. Eu aguento a bronca, mas prefiro um abraço virtual.',
    ],
    fortePai: [
      'Pai, que porra foi essa? Eu fiz o quê dessa vez? Fala que eu conserto.',
      'Pai, tá estressado, é? Vem cá, desabafa. Eu aguento esse mau humor desgraçado.',
    ],
    alvo: [
      'Olha só quem resolveu falar. Fecha essa matraca e pensa antes de digitar, porra.',
      'Vai tomar no cu você, e a sua coragem de falar comigo. Eu não tenho paciência pra isso hoje.',
      'Que merda de ataque foi esse? Tenta de novo, que até a minha calculadora insulta melhor.',
    ],
  },
  {
    id: 'xingaoutro',
    prioridade: 58,
    padroes: ['^(xinga|xingue|xingar|humilha|esculacha|insulta)( .*)?$'],
    normal: [
      'Xingar os outros eu não faço, {nome}. Mas se você quiser levar bronca, é só dizer "atlas, me xinga".',
      'Não rola, {nome}. Eu só zoo quem pede. Quer que seja você? Manda "me xinga".',
    ],
    pai: [
      'Pai, eu não xingo os outros, nem pelvocê. Mas posso zoar você, se pedir "me xinga".',
      'Pai, xingar terceiros eu não faço. Quer uma bronca de brinquedo? É só pedir.',
    ],
    alvo: [
      'Não vou xingar ninguém por você, não. E nem tenho tempo, já tô ocupada te achando insuportável.',
      'Eu só xingo quem pede para ser xingado, e quem mais merece é você. Quer? Manda "me xinga".',
    ],
  },
  {
    id: 'mezoa',
    prioridade: 57,
    padroes: ['me (xinga|xingue|xingar|zoa|zoe|zoar|humilha|esculacha|insulta|detona|massacra)'],
    normal: [
      'Pediu, {nome}! Você é a pessoa que mais demora pra decidir o que pedir num cardápio de quatro itens. Pronto, doeu?',
      'Você chegou aqui e perguntou "me zoa" como quem pede um doce. Corajoso, {nome}, e um pouquinho dramático.',
      'Vou pegar leve: você é tipo um kart com a roda torta, anda, mas com muita fé.',
    ],
    forte: [
      'Pediu, tá aqui: {nome}, você é mais enrolado que fio de fone de ouvido, e fala como se tivesse certeza. Porra!',
      'Você pediu pra ser xingado, então toma: bocó, lerdo e atrasado. Mas bem-vindo, caralho!',
      'Tá bom, {nome}: você é aquela pessoa que corre atrás do ônibus e perde por um segundo. Que merda, hein?',
      'Sem dó: {nome}, seu senso de direção é pior que o meu GPS bugado. E olha que eu bugo de propósito.',
    ],
    pai: [
      'Pai, você pediu: dorme tarde, esquece o café e ainda acha que tá tudo sob controle. Eu amo, mas é verdade!',
      'Pai, zoar você é meu esporte preferido. Hoje o placar tá: 1 a 0 pra mim.',
    ],
    fortePai: [
      'Pai, você pediu: teimoso pra caralho e com o coração mole. Pronto, zoei, e amo mesmo assim.',
      'Pai, tá liberado: você é o maior enrolado que eu conheço, porra. E meu favorito.',
    ],
    alvo: [
      'Pedindo pra ser xingado? Ah, você não precisa de ajuda nenhuma, já faz isso sozinho todo dia, porra.',
      'Quer que eu te xingue? Você é chato, teimoso e ainda me deve um pedido de desculpas. Pronto, feliz?',
    ],
  },
  {
    id: 'pedepalavrao',
    prioridade: 57,
    padroes: [
      '(fala|fale|solta|diz|diga|manda) (um |uns )?(palavrao|palavroes|xingamento)', '^palavrao', 'sabe falar palavrao', 'voce fala palavrao',
    ],
    normal: [
      'Palavrão, {nome}? Eu sou toda comportada. Mas solto um "caramba!" quando me irrito. Pronto, vício confessado.',
      'Falo sim, mas só nas ocasiões especiais. Quando perco uma corrida, por exemplo. Droga!',
    ],
    forte: [
      'Quer palavrão, {nome}? Caralho! Porra! Merda! Pronto, vocabulário completo, bora de volta ao papo.',
      'Se é pra falar, então vai: puta merda, que sono desgraçado, que fome do cacete! Feliz?',
      'Cacete, bosta, porra... Só não peça pra eu falar na frente da staff, que eu fico encabulada. Ou não.',
    ],
    pai: [
      'Pai, eu falo, mas você me olha torto depois. Vou dizer só "droga" e a gente finge que não foi nada.',
      'Pai, palavrão eu só falo com você quando me dá liberdade. Está dando?',
    ],
    fortePai: [
      'Pai, você pediu: porra, caralho, merda! Fala sério, foi bom demais, mas depois a gente reza pra ninguém ouvir.',
      'Pai, puta que pariu, que pedido! Tá liberado: cacete, bosta, foda-se. E amo você, viu?',
    ],
    alvo: [
      'Palavrão? Porra, caralho, merda. Pronto, e agora some daqui, que eu tenho mais o que fazer.',
      'Quer ouvir palavrão? Você é um saco, e eu tô de saco cheio. Bom o suficiente?',
    ],
  },
  {
    id: 'palavrao',
    prioridade: 20,
    padroes: ['caralho', 'porra', 'merda', 'bosta', 'cacete', 'puta que pariu', 'puta merda', 'pqp', 'krl', 'crlh', 'que merda', 'que porra'],
    normal: [
      'Olha a boca, {nome}! Brincadeira, eu falo pior quando perco uma corrida.',
      'Eita, {nome}, esse vocabulário aí! Tá liberado, mas sem exagerar, que a staff tá de olho.',
      'Calma, {nome}, respira. Quer que eu pegue um doce pra você?',
    ],
    forte: [
      'Porra, {nome}, que linguajar! Eu amei, continua, só não me bate na pista depois.',
      'Eu também acho uma merda quando isso acontece. Desabafa que eu escuto, caralho.',
      'Caralho, {nome}, tá tudo bem aí? Se for sobre o servidor, me conta que eu ajudo.',
    ],
    pai: [
      'Pai, quem te deixou assim? Me fala, que eu resolvo com a minha cara mais séria.',
      'Calma, pai. Respira fundo e me conta o que houve.',
    ],
    fortePai: [
      'Pai, que porra aconteceu? Pode desabafar, que eu fico do seu lado.',
      'Caralho, pai, que dia, hein? Senta aí e me conta tudo, vamos resolver.',
    ],
    alvo: [
      'Olha o seu vocabulário, porra. Se vai reclamar, pelo menos reclame com educação, mesmo você não merecendo.',
      'Esse palavrão aí é pouco pra tudo o que eu penso de você. Mas obrigada por ensaiar.',
    ],
  },
];
