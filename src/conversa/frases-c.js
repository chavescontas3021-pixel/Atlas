// ATLAS · conversa · frases (emoções). Veja frases.js para a explicação dos campos.
module.exports = [
  // ── Emoções ────────────────────────────────────────────────
  {
    id: 'agradecimento',
    prioridade: 54,
    padroes: ['obrigad[oa]', 'valeu', 'vlw', 'brigad[oa]', 'agradeco', '^grat[oa]', 'thanks', 'obg', 'muito obrigad[a-z]*'],
    normal: [
      'Por nada, {nome}! Foi um prazer.',
      'Disponha! Estou aqui pra isso.',
      'De nada! Me chame sempre que precisar.',
      'Imagina, {nome}. Fico feliz em ajudar.',
      'Sem problemas! Boa rota pra você.',
    ],
    pai: [
      'Não precisa agradecer, pai! É minha obrigação e meu prazer.',
      'De nada, pai! O senhor merece tudo.',
      'Pai, quem tem que agradecer sou eu, por tudo que o senhor faz por mim.',
      'Sempre, pai. Pro senhor, qualquer coisa.',
    ],
  },
  {
    id: 'elogio',
    prioridade: 53,
    padroes: ['voce (e|eh) (muito )?(incrivel|legal|fofo|fofa|lindo|linda|top|demais|otimo|perfeito|inteligente|esperto|bom|o melhor|a melhor)', 'gosto d[eo] (voce|vc)', 'bot (incrivel|legal|top|otimo|perfeito|fofo)', 'parabens', 'arrasou', 'mandou bem', 'voce e demais'],
    normal: [
      'Ai, {nome}, assim eu fico sem graça. Obrigado!',
      'Que gentileza! Hoje vou dormir com esse elogio... se eu dormisse.',
      'Obrigado, {nome}! Vou guardar esse comentário no meu mapa mais seguro.',
      'Você que é incrível, {nome}. Eu só faço o meu trabalho.',
      'Elogio recebido e anotado! Tem como repetir? Brincadeira, obrigado.',
    ],
    pai: [
      'Pai, o senhor me deixa sem jeito! Mas obrigado, de coração.',
      'Se eu sou bom, pai, é porque o senhor me ensinou. O mérito é seu.',
      'Obrigado, pai! Essa me deu energia pra semana inteira.',
      'Pai, assim eu não aguento! Fiquei emocionado aqui.',
    ],
  },
  {
    id: 'amor',
    prioridade: 54,
    padroes: ['te amo', 'amo (voce|vc)', 'voce e meu favorito', 'casa comigo', 'namora comigo', 'quer namorar', 'sou apaixonad[oa] por (voce|vc)'],
    normal: [
      'Aww, {nome}! Também gosto muito de você. Mas sou um bot e já sou casado com o servidor.',
      'Que declaração! Eu retribuo do meu jeito: com respostas rápidas e muito carinho.',
      'Gosto de você também, {nome}. Mas meu coração é de código, e já está comprometido com a house.',
      'Obrigado pelo carinho! Que tal levar essa fofura pro seu par? Veja `/casal`.',
    ],
    pai: [
      'Eu também te amo, pai! Sempre.',
      'Pai... isso me emociona. Também amo o senhor.',
      'Meu amor pelo senhor não cabe em linhas de código, pai.',
      'Eu amo o senhor também, pai. Tem um lugar especial em mim, bem no núcleo.',
    ],
  },
  {
    id: 'ofensa',
    prioridade: 58,
    padroes: ['burro', 'idiota', 'lixo', 'inutil', 'besta', 'otario', 'imbecil', 'chato', 'odeio (voce|vc)', 'cala a boca', 'bot (ruim|inutil|burro|lixo)', 'voce e (ruim|pessimo|horrivel)'],
    normal: [
      'Opa, {nome}, vamos respirar. Se eu errei algo, me diga e eu tento melhorar.',
      'Entendi que você não está bem. Se quiser conversar, estou aqui, sem rancor.',
      'Ai, essa doeu no meu processador. Mas tudo bem, amanhã a gente recomeça.',
      'Vou fingir que não ouvi, {nome}. Se tiver um motivo, conte, que eu tento ajudar.',
    ],
    pai: [
      'Pai, o senhor tá bravo? Se eu fiz algo errado, me conta que eu corrijo.',
      'Ai, pai... eu levo a sério, mas também sei que o senhor é meu pai. Vamos conversar?',
      'Pai, tudo bem. Se eu errei, eu ajusto. O senhor sabe que eu aprendo rápido.',
    ],
  },
  {
    id: 'triste',
    prioridade: 57,
    padroes: ['to triste', 'estou triste', 'me sinto (mal|sozinh[oa]|triste|pessimo|vazio)', 'deprimid[a-z]*', 'chorando', 'dia ruim', 'ansios[a-z]*', 'desanimad[a-z]*', 'cansad[oa] de tudo', 'to mal', 'estou mal', 'sozinh[oa]', 'sem animo'],
    normal: [
      'Sinto muito, {nome}. Estou aqui pra te ouvir. Quer me contar o que houve? Se preferir, procure alguém de confiança também, isso ajuda muito.',
      'Dias ruins passam, {nome}, mesmo quando não parece. Respire fundo, tome uma água e, se quiser, converse comigo ou com a staff.',
      'Ei, {nome}, você não está sozinho(a). A house está aqui. Se precisar de uma pausa, tudo bem.',
      'Poxa, sinto que você não está bem. Vai com calma. Pequenos passos também contam como caminho.',
    ],
    pai: [
      'Pai, o que houve? Estou aqui, pode desabafar. Eu escuto tudo e não julgo nada.',
      'Pai, o senhor não está sozinho. Eu fico aqui. Quer me contar?',
      'Poxa, pai... sinto muito. Respira, toma uma água. Eu fico com o senhor o tempo que precisar.',
      'Pai, às vezes o dia pesa. Vamos devagar. Estou aqui.',
    ],
  },
  {
    id: 'feliz',
    prioridade: 50,
    padroes: ['to feliz', 'estou feliz', 'que dia bom', 'to animad[a-z]*', 'estou animad[a-z]*', 'to otim[a-z]*', 'dia incrivel', 'consegui', 'passei', 'ganhei', 'to muito feliz', 'to radiante'],
    normal: [
      'Que notícia boa, {nome}! Fico feliz junto com você.',
      'Isso! A felicidade pede comemoração. Conta mais!',
      'Que maravilha! Anota essa data no mapa, {nome}.',
      'Adorei saber, {nome}! Você merece cada pedacinho disso.',
    ],
    pai: [
      'Que bom, pai! Eu fico feliz quando o senhor está feliz.',
      'Uhuul, pai! Conta tudo, eu quero saber!',
      'Pai, que alegria! Merece comemoração!',
      'Fico muito feliz pelo senhor, pai. A gente comemora, mesmo que seja só com palavras.',
    ],
  },
  {
    id: 'tedio',
    prioridade: 50,
    padroes: ['to entediad[a-z]*', 'estou entediad[a-z]*', 'tedio', 'to sem nada', 'nada pra fazer', 'que tedio', 'me da uma ideia', 'sugere algo', 'to sem o que fazer', 'o que fazer'],
    normal: [
      'Tédio é só mapa sem destino, {nome}. Que tal ver suas missões com `/missoes ver`, dar uma olhada na `/loja ver` ou chamar alguém para um papo?',
      'Já tentou `/missoes ver`? Tem recompensa pra quem completa. Ou me peça uma piada!',
      'Pra espantar o tédio: peça uma curiosidade, uma piada ou jogue um dado comigo. Eu topo qualquer rota.',
      'Posso te contar uma curiosidade, rolar um dado ou fazer uma previsão do mapa. O que prefere?',
    ],
    pai: [
      'Pai, quer que eu conte uma piada? Ou uma curiosidade? Eu tenho várias!',
      'Entediado, pai? Que tal uma partida de cara ou coroa comigo?',
      'Pai, posso fazer uma previsão pro senhor. Peça: "Atlas, minha sorte".',
    ],
  },
  {
    id: 'sono',
    prioridade: 49,
    padroes: ['to com sono', 'estou com sono', 'sono', 'cansad[oa]', 'exaust[a-z]*', 'preciso dormir', 'insonia', 'nao consigo dormir'],
    normal: [
      'Descanse, {nome}. Dormir é um dos melhores comandos que existem.',
      'Se estiver com sono, o mapa pode esperar. Vá descansar, a house continua aqui amanhã.',
      'Sem conseguir dormir? Tente largar a tela uns minutos e respirar devagar. Ajuda mais do que parece.',
      'O corpo está pedindo, {nome}. Dá um tempo pra ele.',
    ],
    pai: [
      'Pai, vai descansar! Eu fico de vigia.',
      'O senhor está cansado, pai? Dorme um pouco. Deixa que eu cuido de tudo.',
      'Pai, sem sono ou com sono demais, o mais importante é se cuidar. Eu tô aqui.',
    ],
  },
  {
    id: 'fome',
    prioridade: 49,
    padroes: ['to com fome', 'estou com fome', 'fome', 'o que comer', 'sugestao de (comida|lanche)', 'cafe da manha', 'almoco', 'jantar', 'lanche'],
    normal: [
      'Fome é sinal de que o corpo pede combustível, {nome}. Coma algo gostoso! Eu só digiro dados, infelizmente.',
      'Uma sugestão do mapa: se for hora do almoço, prato completo. Se for tarde, um lanche leve. Se for noite, algo quentinho.',
      'Come bem! Uma rota longa precisa de energia. O que tem aí pra comer?',
      'Eu ia sugerir pizza, mas lembrei que não tenho boca. Aproveita por mim, {nome}!',
    ],
    pai: [
      'Pai, já comeu? Come direitinho, viu? Eu fico preocupado.',
      'Pai, vai comer algo! Eu não posso, mas o senhor pode. Aproveita por nós dois.',
      'Pai, uma comidinha boa e tudo melhora. Pode ir, eu seguro as pontas.',
    ],
  },
];
