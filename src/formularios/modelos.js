// Modelos dos formulários de staff. Para mudar perguntas, é só editar este arquivo.
//
// Regras do Discord para as janelas de resposta:
//   - no máximo 5 perguntas por janela (por isso cada formulário é dividido em "partes")
//   - "curto" (rótulo da pergunta na janela) tem no máximo 38 caracteres (o número entra na frente)
//   - "dica" (texto cinza dentro do campo) tem no máximo 100 caracteres
// O texto completo de cada pergunta ("pergunta") aparece na mensagem do formulário.
// Nada aqui usa emoji, de propósito.

const AREAS = {
  promotor: {
    nome: 'Promotor',
    intro:
      'O promotor é responsável por divulgar a nossa house no Discord, apresentar o servidor a novos membros e ' +
      'contribuir para o crescimento e a visibilidade da comunidade. Toda divulgação deve respeitar as regras de ' +
      'cada servidor e as orientações da equipe. É proibido fazer spam, divulgar em locais sem permissão ou ' +
      'desrespeitar as regras de outros servidores.',
    paginas: [
      [
        { id: 'p1', curto: 'Nome, idade e disponibilidade', dica: 'Nome do personagem, idade e horas por semana', longo: false, min: 5, max: 200,
          pergunta: 'Informe o nome do seu personagem, a sua idade e quantas horas por semana você pode dedicar à divulgação.' },
        { id: 'p2', curto: 'Motivo para ser promotor', dica: 'Explique com sinceridade', longo: true, min: 30, max: 800,
          pergunta: 'Explique por que você deseja ser promotor da house.' },
        { id: 'p3', curto: 'Como será sua postura', dica: 'Descreva sua postura diante de outros promotores e donos', longo: true, min: 30, max: 800,
          pergunta: 'Como séria sua postura em uma parceria? Entende que como Promotor você será o rosto da House?' },
        { id: 'p4', curto: 'Chamaria um superior', dica: 'Descreva o que faria', longo: true, min: 30, max: 800,
          pergunta: 'Caso alguém ficasse forçando uma aliança ou parceria no seu privado, o quê você faria?' },
        { id: 'p5', curto: 'Regra anti-panelinha', dica: 'Responda com as suas palavras', longo: true, min: 30, max: 800,
          pergunta: 'Caso um amigo seu quisesse fazer uma parceria que quebra as regras ou os requisitos da House, como você reagiria?' },
      ],
    ],
  },

  recepcionista: {
    nome: 'Recepcionista',
    intro:
      'Os recepcionistas são responsáveis por acompanhar a entrada de novos membros, supervisionar o atendimento ' +
      'automático e garantir que cada pessoa realize corretamente o processo de entrada na house. A recepção é feita ' +
      'por um bot: o recepcionista observa se tudo ocorre corretamente, assume o atendimento quando houver problema, ' +
      'troca o nome do membro, auxilia no fechamento da vaga e, antes de autorizar a verificação, confere se tudo está correto.',
    paginas: [
      [
        { id: 'r1', curto: 'Nome, idade e horários', dica: 'Nome do personagem, idade, dias e horários', longo: false, min: 5, max: 200,
          pergunta: 'Informe o nome do seu personagem, a sua idade e os dias e horários em que poderá acompanhar as recepções.' },
        { id: 'r2', curto: 'Motivo para ser recepcionista', dica: 'Explique com sinceridade', longo: true, min: 30, max: 800,
          pergunta: 'Explique por que você deseja ser recepcionista.' },
        { id: 'r3', curto: 'Experiência anterior', dica: 'Atendimento, moderação ou acolhimento', longo: true, min: 20, max: 800,
          pergunta: 'Você tem experiência com atendimento, moderação ou acolhimento de membros? Descreva.' },
        { id: 'r4', curto: 'Papel no atendimento automático', dica: 'Quando você deve intervir', longo: true, min: 30, max: 800,
          pergunta: 'A recepção é feita por um bot. Explique com as suas palavras qual é o seu papel ao acompanhar o atendimento automático e quando você deve intervir.' },
        { id: 'r5', curto: 'Assumir um atendimento', dica: 'Passo a passo, do início ao fim', longo: true, min: 40, max: 1000,
          pergunta: 'Um membro está com dificuldade e o atendimento automático não consegue ajudá-lo. Descreva, passo a passo, como você assumiria o atendimento e o que faria até o fim, inclusive com o canal da recepção.' },
      ],
      [
        { id: 'r6', curto: 'O que conferir antes de autorizar', dica: 'Liste os pontos que você analisaria', longo: true, min: 40, max: 1000,
          pergunta: 'Antes de autorizar uma verificação, o que você precisa conferir? Liste os pontos que analisaria.' },
        { id: 'r7', curto: 'Orientar um membro com erro', dica: 'Nome incorreto ou vaga fora do procedimento', longo: true, min: 40, max: 800,
          pergunta: 'Se o nome do membro não foi alterado corretamente ou a vaga não segue os procedimentos da house, como você o orientaria antes de autorizar?' },
        { id: 'r8', curto: 'Membro impaciente ou desrespeitoso', dica: 'Como você agiria', longo: true, min: 30, max: 800,
          pergunta: 'Como você lidaria com um membro impaciente ou desrespeitoso durante o atendimento?' },
        { id: 'r9', curto: 'Pedido de um amigo', dica: 'Relacione com a regra anti-panelinha', longo: true, min: 30, max: 800,
          pergunta: 'Um amigo seu pede para ser autorizado sem cumprir todos os procedimentos. O que você faz? Relacione a sua resposta com a regra anti-panelinha.' },
      ],
    ],
  },

  psicologo: {
    nome: 'Psicólogo',
    intro:
      'Os psicólogos oferecem aos membros um espaço privado, confortável e respeitoso para conversar sobre suas ' +
      'dificuldades sem medo de julgamentos. O atendimento é gratuito, acontece inteiramente no privado e cada membro ' +
      'escolhe o psicólogo que deseja. Tudo o que for compartilhado deve ser tratado com máxima privacidade e ' +
      'confidencialidade.\n\n' +
      'Este formulário é sério e a função envolve grande responsabilidade. Responda somente se estiver disposto a ' +
      'cumprir todas as regras da função, e responda com atenção, calma e total sinceridade. Respostas rasas, ' +
      'incompletas ou sem cuidado serão reprovadas.',
    paginas: [
      [
        { id: 's1', curto: 'Nome, idade e disponibilidade', dica: 'Nome do personagem, idade, dias e horários', longo: false, min: 5, max: 200,
          pergunta: 'Informe o nome do seu personagem, a sua idade e os dias e horários em que poderá atender.' },
        { id: 's2', curto: 'Motivo para atuar como psicólogo', dica: 'Explique com sinceridade', longo: true, min: 50, max: 1000,
          pergunta: 'Explique, com sinceridade, por que você deseja atuar como psicólogo na house.' },
        { id: 's3', curto: 'Experiência com acolhimento', dica: 'Dentro ou fora do Discord', longo: true, min: 40, max: 1000,
          pergunta: 'Descreva a sua experiência com acolhimento, escuta ou apoio a pessoas em dificuldade, dentro ou fora do Discord.' },
        { id: 's4', curto: 'Preparo emocional', dica: 'Inclua como você cuida do seu bem-estar', longo: true, min: 50, max: 1000,
          pergunta: 'Você se sente emocionalmente preparado para ouvir relatos difíceis com calma e sem julgamentos? Explique também como você cuida do seu próprio bem-estar.' },
        { id: 's5', curto: 'Início do atendimento', dica: 'Como você se apresentaria', longo: true, min: 40, max: 1000,
          pergunta: 'O atendimento é gratuito, feito inteiramente no privado, e o membro escolhe o psicólogo que deseja. Explique como você se apresentaria e conduziria o início de uma conversa.' },
      ],
      [
        { id: 's6', curto: 'Privacidade e confidencialidade', dica: 'O que você nunca poderá fazer', longo: true, min: 50, max: 1000,
          pergunta: 'Explique o que significa manter a privacidade e a confidencialidade em um atendimento e o que você nunca poderá fazer com aquilo que o membro compartilhar.' },
        { id: 's7', curto: 'Pedido de um amigo sobre um caso', dica: 'O que você responde e como age', longo: true, min: 40, max: 800,
          pergunta: 'Um amigo seu pergunta o que outro membro contou durante um atendimento. O que você responde e como age?' },
        { id: 's8', curto: 'Limites da função', dica: 'Quando encaminhar a ajuda profissional', longo: true, min: 50, max: 1000,
          pergunta: 'Quais são os limites da sua função? Em quais situações você entende que o membro deve procurar ajuda profissional?' },
        { id: 's9', curto: 'Situação de risco', dica: 'O que você faria e a quem comunicaria', longo: true, min: 60, max: 1000,
          pergunta: 'Um membro relata que está pensando em se machucar ou em acabar com a própria vida. Descreva exatamente como você agiria e a quem comunicaria.' },
        { id: 's10', curto: 'Conversa com alguém abalado', dica: 'Sem pressionar, julgar ou minimizar', longo: true, min: 50, max: 1000,
          pergunta: 'Como você conduziria uma conversa com alguém muito abalado, sem pressionar, julgar ou minimizar o que ele sente?' },
      ],
      [
        { id: 's11', curto: 'Uso indevido da posição', dica: 'Como você evita isso', longo: true, min: 50, max: 1000,
          pergunta: 'Como você garante que a sua posição nunca será usada para constranger, manipular, pressionar ou obter qualquer vantagem sobre um membro? Descreva também como se comunicaria com ele, sem linguagem agressiva ou palavrões.' },
        { id: 's12', curto: 'Problema durante uma consulta', dica: 'O que fazer e como proteger os dados', longo: true, min: 50, max: 1000,
          pergunta: 'Se ocorrer algum problema ou erro durante uma consulta, o que você faz e como evita expor desnecessariamente as informações pessoais do membro?' },
        { id: 's13', curto: 'Regra anti-panelinha', dica: 'Responda com as suas palavras', longo: true, min: 40, max: 800,
          pergunta: 'Explique com as suas palavras como a regra anti-panelinha se aplica ao atendimento, especialmente ao tratar todos os membros com igualdade.' },
        { id: 's14', curto: 'Declaração de compromisso', dica: 'Escreva: Li e aceito as regras da função', longo: false, min: 10, max: 200,
          pergunta: 'Declaração de compromisso: escreva "Li e aceito as regras da função de psicólogo, incluindo o sigilo dos atendimentos".' },
      ],
    ],
  },

  manager: {
    nome: 'Manager',
    intro:
      'O manager é o líder da staff e ocupa o cargo mais alto da equipe depois do dono. Sua função é organizar, ' +
      'supervisionar e coordenar os membros da staff, garantindo que todas as áreas da house funcionem corretamente, ' +
      'e auxiliar o dono na administração. O manager deve ser um exemplo para toda a equipe e agir com maturidade, ' +
      'imparcialidade e responsabilidade. A área de psicólogos é a única que não faz parte das responsabilidades do ' +
      'manager: sua administração, organização e supervisão são de responsabilidade exclusiva do dono.',
    paginas: [
      [
        { id: 'm1', curto: 'Nome, idade e tempo na house', dica: 'Nome do personagem, idade, tempo e disponibilidade', longo: false, min: 5, max: 200,
          pergunta: 'Informe o nome do seu personagem, a sua idade, há quanto tempo está na house e a sua disponibilidade semanal.' },
        { id: 'm2', curto: 'Motivo para ser manager', dica: 'Explique com sinceridade', longo: true, min: 40, max: 1000,
          pergunta: 'Explique por que você deseja ser manager.' },
        { id: 'm3', curto: 'Experiência em liderança', dica: 'Equipes, servidores ou projetos', longo: true, min: 40, max: 1000,
          pergunta: 'Descreva a sua experiência com liderança, organização de equipes ou administração de servidores.' },
        { id: 'm4', curto: 'Organização da equipe', dica: 'Como distribuiria as responsabilidades', longo: true, min: 40, max: 1000,
          pergunta: 'Como você organizaria e distribuiria as responsabilidades entre as áreas da staff?' },
        { id: 'm5', curto: 'Acompanhamento da equipe', dica: 'Desempenho e orientação', longo: true, min: 40, max: 1000,
          pergunta: 'Como você acompanharia o desempenho dos staffs e orientaria quem não está cumprindo bem as suas funções?' },
      ],
      [
        { id: 'm6', curto: 'Conflito entre staffs', dica: 'Como você intervém', longo: true, min: 40, max: 1000,
          pergunta: 'Dois integrantes da staff entram em conflito. Descreva como você intervém e busca uma solução justa.' },
        { id: 'm7', curto: 'Decisão contra um amigo', dica: 'Relacione com a regra anti-panelinha', longo: true, min: 40, max: 1000,
          pergunta: 'Uma decisão correta desagrada um amigo próximo da staff. O que você faz? Relacione a sua resposta com a regra anti-panelinha.' },
        { id: 'm8', curto: 'Auxílio ao dono', dica: 'Inclua como lida com divergências', longo: true, min: 40, max: 1000,
          pergunta: 'Explique como você auxiliaria o dono na administração da house e como lidaria com uma divergência com ele.' },
        { id: 'm9', curto: 'Área de psicólogos', dica: 'Como você agiria', longo: true, min: 40, max: 1000,
          pergunta: 'A área de psicólogos é de responsabilidade exclusiva do dono, e não do manager. Explique como você agiria diante disso caso soubesse de algum problema nessa área.' },
      ],
    ],
  },
};

// Mensagens fixas (sem emojis)
const TEXTOS = {
  aprovado: (area) => `Olá. O seu formulário para a área de ${area} foi aprovado. Aguarde as orientações da equipe.`,
  reprovado: (area) =>
    `Olá. Depois de analisar o seu formulário para a área de ${area}, a equipe decidiu não aprová-lo desta vez. ` +
    'Agradecemos o seu interesse e a sua dedicação.',
};

module.exports = { AREAS, TEXTOS };
