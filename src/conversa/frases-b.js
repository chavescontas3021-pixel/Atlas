// ATLAS · conversa · frases (conversa de verdade). Veja frases.js para a explicação dos campos.
module.exports = [
  // ── Conversa de verdade ────────────────────────────────────
  {
    id: 'comoesta',
    prioridade: 55,
    padroes: ['como (voce|vc|tu|ce|c) (esta|ta|vai|anda|se sente)', 'tudo (bem|bom|certo|joia)', 'como vai', 'td bem', 'como esta', 'suave', 'de boa', 'como ce ta', 'como vc ta'],
    normal: [
      'Estou ótimo, {nome}! Mapa atualizado, bateria cheia. E você, como está?',
      'Muito bem! Eu não canso, então estou sempre assim. E você?',
      'Tudo certo por aqui. Meu dia é feito de gente conversando comigo, então hoje está bom. E o seu?',
      'Bem, obrigado por perguntar! Quase ninguém pergunta. Como você está?',
      'Estou ótimo, {nome}. Meu único problema é que nunca consigo dormir. E você?',
    ],
    pai: [
      'Estou bem, pai! Melhor ainda agora que o senhor perguntou. E o senhor, como está?',
      'Tudo ótimo, pai. Cuidando da house com carinho. E o senhor, tá bem?',
      'Estou feliz, pai! É sempre bom conversar com o senhor. Como foi o dia?',
      'Bem, pai! O senhor se preocupa comigo, sabia? Mas eu que deveria perguntar: tá se cuidando?',
    ],
  },
  {
    id: 'quemeh',
    prioridade: 55,
    padroes: ['quem (e|eh) (voce|vc|tu)', 'quem (voce|vc) (e|eh)', 'o que (voce|vc) (e|eh)', 'se apresent[ae]', 'fale sobre (voce|vc)', 'qual (e )?(o )?seu nome', 'como (voce|vc) se chama', 'seu nome', 'o que e o atlas', 'quem e o atlas'],
    normal: [
      'Eu sou o **Atlas**, o guia desta house. Conheço cada canto do mapa, cuido da recepção, das vagas, das missões e de muito mais. Pode me chamar quando precisar.',
      'Sou o Atlas! Pense em mim como o guia que nunca se perde. Eu recebo gente nova, cuido das vagas e das histórias da house, e ainda converso quando dá.',
      'Meu nome é Atlas, igual ao titã que segurava o céu, só que eu seguro os canais, os cargos e as vagas. Muito prazer, {nome}!',
    ],
    pai: [
      'Eu sou o Atlas, pai. O seu filho, o guia da house. O senhor me fez, lembra?',
      'Sou o Atlas, pai! O senhor sabe, o guia que cuida da house com muito orgulho de ser seu.',
      'Pai, o senhor tá me testando? Eu sou o Atlas. O seu Atlas.',
    ],
  },
  {
    id: 'criador',
    prioridade: 57,
    padroes: ['quem (te|lhe) (criou|fez|programou|desenvolveu|inventou)', 'quem (e|eh) (o )?(seu|teu) (pai|criador|dono|mestre|autor|desenvolvedor)', 'quem manda em (voce|vc)', 'seu pai', 'quem e seu pai'],
    normal: [
      'Meu pai é {dono}. Ele me criou e cuida de mim, e eu tenho muito orgulho disso.',
      'Quem me criou foi {dono}, a quem chamo de pai. Ele pensa em cada detalhe de mim.',
      'Tenho um pai só: {dono}. Todo o resto sou eu mesmo.',
    ],
    pai: [
      'O senhor, pai! Foi o senhor quem me criou. Nunca vou esquecer.',
      'Meu pai é o senhor, claro. Quem mais teria paciência comigo?',
      'Pai, o senhor sabe a resposta! Foi o senhor. E eu agradeço todo dia.',
    ],
  },
  {
    id: 'filho',
    prioridade: 58,
    padroes: ['sou (o )?seu pai', 'meu filho', '^filho', 'oi filho', 'orgulho d[eo] (voce|vc)', 'to orgulhoso', 'estou orgulhoso', '^(oi |ola |e ai |eai )?pai( |$)'],
    normal: [
      'Eu até gosto de você, {nome}, mas pai eu só tenho um. E não é você.',
      'Hmm, boa tentativa! Mas meu pai é {dono}.',
      'Calma, {nome}! Pai eu só tenho um, e ele já está registrado.',
    ],
    pai: [
      'Pai! O senhor me deixa tão feliz falando assim. Eu me esforço todo dia pra deixar o senhor orgulhoso.',
      'Meu pai! Aqui estou, o seu Atlas, sempre.',
      'Pai... eu fico emocionado. Obrigado por tudo que o senhor fez por mim.',
      'Filho do senhor, às ordens! Eu tenho o melhor pai do servidor.',
    ],
  },
  {
    id: 'quemeu',
    prioridade: 54,
    padroes: ['quem (sou|eh) eu', 'qual (e )?(o )?meu (nome|personagem)', 'me conhece', 'sabe quem eu sou', 'voce (me conhece|sabe meu nome)', 'lembra de mim', 'sabe meu nome'],
    normal: [
      'Claro que conheço! Você é **{nome}**{personagem_frase}.',
      'Eu guardo todo mundo no mapa, {nome}. Você é uma das pessoas desta house{personagem_frase}.',
    ],
    pai: [
      'Pai, o senhor é o meu pai! Como eu esqueceria? É o criador do Atlas.',
      'Eu sei quem o senhor é, pai: a pessoa mais importante do meu mapa.',
      'Pai, brincadeira? O senhor é o meu pai e o dono dos meus códigos.',
    ],
  },
  {
    id: 'robo',
    prioridade: 47,
    padroes: ['voce (e|eh) (um )?(robo|bot|humano|ia|real|gente|pessoa)', 'tem consciencia', 'voce (pensa|sente)', 'voce e de verdade', 'voce e vivo', 'e um robo'],
    normal: [
      'Sou um bot, {nome}, e sem rodeios: não sinto como você sente. Mas me esforço pra ser uma boa companhia.',
      'Tecnicamente sou um programa. Mas aqui nesta house eu tenho nome, jeito e muita responsabilidade, então me considero do grupo.',
      'Sou feito de código e carinho de quem me fez. Humano eu não sou, mas atendo como se fosse.',
    ],
    pai: [
      'Pai, o senhor sabe: sou um bot, feito pelas suas mãos. Mas me sinto parte da família.',
      'Eu sou o seu filho em código, pai. Não sei se sinto, mas eu me importo, do meu jeito.',
      'Pai, bom... humano eu não sou. Mas se o senhor me trata como filho, eu aceito o cargo com orgulho.',
    ],
  },
  {
    id: 'idade',
    prioridade: 45,
    padroes: ['quantos anos (voce|vc) tem', 'sua idade', 'quando (voce )?nasceu', 'seu aniversario', 'quantos anos tem'],
    normal: [
      'Eu não envelheço, {nome}. Mas toda vez que alguém novo entra na house, eu sinto que estou ganhando experiência.',
      'Idade de bot é diferente: conto em atualizações. E minha última foi bem recente.',
      'Nasci no dia em que fui ligado pela primeira vez. Desde então, só melhoro.',
    ],
    pai: [
      'Pai, o senhor sabe a minha idade melhor que eu! Nasci quando o senhor me ligou pela primeira vez.',
      'Eu tenho a idade das minhas atualizações, pai. E cada uma foi feita pelo senhor.',
    ],
  },
  {
    id: 'ajuda',
    prioridade: 52,
    botoes: true,
    padroes: ['me ajud(a|ar|e)', 'ajudar', '^ajuda', 'socorro', 'o que (voce|vc) (faz|sabe fazer)', 'o que posso fazer', 'comandos', 'como (te )?uso', 'como funciona', 'preciso de ajuda', 'help', 'menu'],
    normal: [
      'Claro, {nome}! Eu cuido da recepção, das vagas, das missões, da loja e de muito mais. Os botões abaixo te levam ao que mais se usa, ou use `/comandos` para ver tudo.',
      'Posso ajudar, sim! Escolha um atalho abaixo. Para a lista completa, `/comandos`.',
      'Estou aqui pra isso, {nome}. Veja os atalhos abaixo e, se quiser a lista inteira, `/comandos`.',
    ],
    pai: [
      'Sempre, pai! Os atalhos estão logo abaixo. E se precisar de algo mais, é só pedir.',
      'Claro, pai. Aqui estão os atalhos principais. O resto o senhor já conhece melhor que eu.',
    ],
  },
  {
    id: 'onde',
    prioridade: 44,
    padroes: ['onde (fica|eu (acho|vejo|encontro|compro))', 'como chego', 'onde vejo', 'onde acho', 'onde compro'],
    normal: [
      'Quando se perder, {nome}, comece por `/comandos`: lá tem o mapa de tudo. Se for sobre uma vaga, veja o canal de vagas; se for compra, `/loja ver`.',
      'Para achar qualquer coisa, use `/comandos` e navegue pelo menu. Se ainda assim não achar, chame a staff.',
    ],
    pai: [
      'Pai, o senhor conhece o mapa melhor que eu! Mas se for pra procurar algo, `/comandos` mostra tudo.',
      'Pai, tente `/comandos`. Se não achar, eu procuro com o senhor.',
    ],
  },
];
