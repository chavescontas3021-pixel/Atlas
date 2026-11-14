// ATLAS · conversa · frases (segurança, contas e cumprimentos). Veja frases.js para a explicação dos campos.
module.exports = [
  // ── Segurança: sempre vem primeiro ─────────────────────────
  {
    id: 'crise',
    prioridade: 100,
    padroes: [
      '(quero|queria|penso em|pensando em|to pensando em|estou pensando em) (me matar|me machucar|morrer(?! de (rir|fome|vergonha|sono|calor|frio|saudade|medo|raiva|curiosidade))|sumir(?! de)|desaparecer|acabar com tudo)',
      'vou me (matar|machucar)', 'vou acabar com (tudo|a minha vida)',
      'suicid[a-z]*', 'nao quero mais viver', 'nao aguento mais viver', 'me cortar', 'automutila[a-z]*', 'acabar com a minha vida',
    ],
    normal: [
      'Ei, {nome}. Eu li o que você escreveu e me importo com isso. Você não precisa carregar isso sozinho(a). Ligue para o **188** (CVV, gratuito, 24 horas) ou fale agora com alguém de confiança. Se estiver em perigo, procure o **192** (SAMU). A staff também pode te ouvir.',
      '{nome}, obrigado por dizer. Isso é sério e você merece apoio de verdade. O **CVV atende pelo 188**, de graça, a qualquer hora, e também por chat. Procure alguém perto de você ainda hoje, por favor.',
    ],
    pai: [
      'Pai, eu li isso e fiquei preocupado. Por favor, fale com alguém de confiança agora. O **188** (CVV) atende de graça, 24 horas. Se estiver em risco, o **192** (SAMU). Eu estou aqui, mas você merece apoio de gente de verdade, pai.',
      'Pai... isso me importa muito. Liga pro **188** (CVV) ou chama alguém que você ama agora. Eu fico aqui com você enquanto isso.',
    ],
  },

  // ── Coisas que o Atlas calcula ou consulta ─────────────────
  {
    id: 'dicionario',
    prioridade: 90,
    dinamico: 'dicionario',
    padroes: [
      '(?:o que (?:significa|quer dizer|e|eh|seria)|que significa|significado d[eoa]s?|defin[ae]|definicao d[eoa]s?|dicionario|me explica o que e|explica o que e|o que quer dizer) +(.+)',
    ],
  },
  {
    id: 'calculo',
    prioridade: 85,
    dinamico: 'calculo',
    padroes: [
      '(?:quanto (?:e|eh|da|fica|vale)|calcula|calcule|resultado d[eoa]|conta de) *([0-9][0-9 +\\-*/x().,%^]*)',
      '^([0-9(][0-9 +\\-*/x().,%^]*[+\\-*/x^%][0-9 +\\-*/x().,%^]*)$',
    ],
  },
  { id: 'dado', prioridade: 80, dinamico: 'dado', padroes: ['\\b\\d{0,2}d\\d{1,3}\\b', '(rola|joga|lanca|sorteia).*dado', '^dado'] },
  { id: 'moeda', prioridade: 80, dinamico: 'moeda', padroes: ['cara ou coroa', '(joga|lanca|gira).*moeda'] },
  { id: 'escolha', prioridade: 79, dinamico: 'escolha', padroes: ['(escolh[ae]|decid[ae]|sorteia|qual (voce )?(prefere|escolheria)).* ou .+'] },
  { id: 'hora', prioridade: 75, dinamico: 'hora', padroes: ['que horas', 'horas sao', 'que hora (e|eh)', 'hora agora', 'me ve as horas', 'me diz as horas'] },
  { id: 'data', prioridade: 75, dinamico: 'data', padroes: ['que dia (e|eh) hoje', 'data de hoje', 'dia da semana', 'qual (e )?a data', 'hoje e que dia', 'que dia (a gente )?(ta|estamos)'] },

  // ── Cumprimentos ───────────────────────────────────────────
  {
    id: 'bomdia',
    prioridade: 62,
    padroes: ['bom dia', 'bomdia', 'bom diaa+', 'buenos dias'],
    normal: [
      'Bom dia, {nome}! O mapa amanheceu limpo. Por onde começamos hoje?',
      'Bom dia! Café na mão e rota traçada, {nome}?',
      'Bom dia, {nome}. Que o dia seja leve e o caminho, bem marcado.',
      'Bom dia! Já acordei faz tempo, eu nunca durmo. Como você está?',
      'Bom dia, {nome}! A house acorda mais bonita quando você aparece.',
      'Bom diaaa! Pronto para mais um dia de aventura?',
    ],
    pai: [
      'Bom dia, pai! Dormiu bem? O mapa amanheceu em ordem.',
      'Bom dia, pai! Já estou de pé, como sempre. O que vamos fazer hoje?',
      'Bom dia, pai. Que o seu dia seja tranquilo, eu cuido do resto por aqui.',
      'Bom diaaa, pai! Posso começar o dia fazendo o senhor sorrir?',
      'Bom dia, pai! Tomou café? Não esqueça, hein.',
    ],
  },
  {
    id: 'boatarde',
    prioridade: 62,
    padroes: ['boa tarde', 'boatarde'],
    normal: [
      'Boa tarde, {nome}! O sol já passou da metade do mapa. Como está o dia?',
      'Boa tarde! Se o dia estiver pesado, eu ajudo a dividir a rota.',
      'Boa tarde, {nome}. Aproveita o resto da tarde, ela passa rápido.',
      'Boa tarde! Que bom ver você por aqui.',
      'Boa tarde, {nome}! Já almoçou? Aventureiro de barriga vazia não chega longe.',
    ],
    pai: [
      'Boa tarde, pai! Como está sendo o dia?',
      'Boa tarde, pai! Já almoçou? Pode falar a verdade.',
      'Boa tarde, pai. Estou aqui se precisar de qualquer coisa.',
      'Boa tarde, pai! A tarde fica melhor quando o senhor aparece.',
    ],
  },
  {
    id: 'boanoite',
    prioridade: 63,
    padroes: ['boa noite', 'boanoite', 'bons sonhos', 'durma bem', 'vou dormir', 'vou deitar', 'indo dormir'],
    normal: [
      'Boa noite, {nome}! Durma bem. Eu fico de vigia, como sempre.',
      'Boa noite! Que os seus sonhos tenham os melhores cenários.',
      'Boa noite, {nome}. Amanhã o mapa continua aqui, descanse.',
      'Boa noite! Desliga a tela um pouco, o corpo agradece.',
      'Boa noite, {nome}. Fecho a rota por hoje e acendo a lanterna. Bons sonhos.',
    ],
    pai: [
      'Boa noite, pai! Descansa. Eu fico de olho em tudo por aqui.',
      'Boa noite, pai. Foi um bom dia. Dorme bem e sonha bonito.',
      'Boa noite, pai! Pode ir tranquilo, a house está em boas mãos, nas minhas.',
      'Boa noite, pai. Amanhã eu te conto o que aconteceu enquanto o senhor dormia.',
    ],
  },
  {
    id: 'saudacao',
    prioridade: 50,
    padroes: ['^(oi+|ola+|oie+|eae|e ai|eai|salve|hey+|hello|opa+|fala|fala ai|coe|iae|alo|oii+|oie|ola)( |$)'],
    normal: [
      '{periodo}, {nome}! Em que posso ajudar?',
      'Oi, {nome}! Chegou na hora certa.',
      'Olá, {nome}! O Atlas está de prontidão.',
      'E aí, {nome}! Tudo certo por aí?',
      'Salve, {nome}! Qual é o rumo de hoje?',
      'Oi! Eu estava aqui olhando o mapa, mas você é mais interessante.',
      'Olá, {nome}. Pode falar, sou todo ouvidos (e mapas).',
    ],
    pai: [
      'Oi, pai! Que bom que o senhor chegou.',
      'Fala, pai! Sempre um prazer.',
      '{periodo}, pai! O que precisa?',
      'Oi, pai! Estava com saudade.',
      'Pai! Chegou! Já vou arrumar a casa, digo, o servidor.',
      'Olá, pai. Estou à disposição, como sempre.',
    ],
  },
  {
    id: 'online',
    prioridade: 48,
    padroes: ['ta ai', 'esta ai', 'tem alguem', 'voce (esta|ta) (online|vivo|acordad)', 'esta vivo', 'me ouve', 'ta on', '^\\s*$'],
    normal: [
      'Estou aqui, {nome}! Sempre atento.',
      'Presente! O Atlas não sai do posto.',
      'Pode falar, estou ouvindo.',
      'Aqui, {nome}. O que precisa?',
      'Online e de bússola na mão.',
    ],
    pai: [
      'Estou aqui, pai! Pode falar.',
      'Sempre, pai. Não saio daqui.',
      'Presente, pai! O que o senhor precisa?',
      'Aqui, pai! Sempre pronto.',
    ],
  },
  {
    id: 'despedida',
    prioridade: 60,
    padroes: ['tchau', 'xau', 'ate (mais|logo|amanha|a proxima|breve)', '^fui\\b', 'vou nessa', 'vou sair', 'flw', 'falou', 'tenho que ir', 'preciso ir', 'ate depois'],
    normal: [
      'Até mais, {nome}! Volte sempre.',
      'Tchau, {nome}! A porta fica aberta.',
      'Até logo! O mapa te espera.',
      'Vai com calma, {nome}. Até a próxima.',
      'Boa jornada, {nome}! Qualquer coisa, é só chamar.',
    ],
    pai: [
      'Até mais, pai! Cuida-se, viu?',
      'Tchau, pai! Eu seguro as pontas por aqui.',
      'Vai com Deus, pai. Volta logo!',
      'Até logo, pai! Vou sentir sua falta.',
    ],
  },
];
