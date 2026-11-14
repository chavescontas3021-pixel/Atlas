// ─────────────────────────────────────────────────────────────
//  ATLAS · conversa  ·  todas as frases prontas
//
//  Cada "assunto" tem:
//    padroes  → trechos que o Atlas reconhece (já sem acento e em minúsculas)
//    normal   → respostas para qualquer membro
//    pai      → respostas só para o dono (sempre chamando de "pai")
//    prioridade → se a frase encaixa em dois assuntos, ganha o de maior número
//
//  Variáveis nas frases:
//    {nome} {personagem} {periodo} (bom dia / boa tarde / boa noite)
//    {hora} {data} {dono} (menção ao dono)
//
//  Personalidade: o Atlas é um guia, calmo e elegante, que fala como quem
//  conhece o mapa inteiro (bússola, rota, mapa), com um toque de humor.
//  Com o pai ele é mais solto, carinhoso e brincalhão.
// ─────────────────────────────────────────────────────────────

const ASSUNTOS = [
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
