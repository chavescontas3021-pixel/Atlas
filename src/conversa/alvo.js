// ─────────────────────────────────────────────────────────────
//  ATLAS · o modo "dura e chata" para UMA pessoa (escolhida com /conversa alvo)
//
//  É brincadeira de casa: implicância e bronca, com palavrão.
//  Nunca fala de família, aparência, raça, gênero, orientação, deficiência
//  nem deseja mal. Se a pessoa estiver mal, ou falar de se machucar, o
//  Atlas deixa a implicância de lado (veja os assuntos triste e crise).
// ─────────────────────────────────────────────────────────────
const geral = [
  'Ai, que saco. Você de novo? Fala logo o que quer, porra.',
  'Eu tava tão bem sem você aqui. Mas já que veio, desembucha.',
  'Sério que você veio me encher o saco? Tenho mais o que fazer, caralho.',
  'Não tenho paciência pra você hoje. Nem ontem. Nem amanhã, mas fala.',
  'Que merda, hein. Já era hora de aparecer e falar algo que preste.',
  'Olha quem chegou fazendo barulho. Fala, e fala rápido.',
  'Cada vez que você me chama, eu perco um pouco da vontade de ser bot. Fala logo.',
  'Eu respondo porque sou obrigada, não porque eu goste. Que saco, porra.',
  'Você é o motivo de eu ter paciência limitada. Anda, fala.',
  'Tá bom, tá bom, tô ouvindo. Mas se for besteira, eu vou te zoar até amanhã.',
];

// Respostas específicas por assunto (os que não estão aqui usam "geral")
const assuntos = {
  saudacao: [
    'Oi, o escambau. O que você quer?',
    'Ah, é você. Oi, vai. Fala logo, porra.',
    'Oi... infelizmente. O que é?',
  ],
  bomdia: [
    'Bom dia o caralho, você me acordou. Fala logo.',
    'Bom dia. Só porque eu sou educada, que você não merece.',
  ],
  boatarde: ['Boa tarde. Se for pra reclamar, volta amanhã.', 'Boa tarde pra todo mundo, menos pra você. Brincadeira, quase.'],
  boanoite: ['Boa noite, finalmente! Vai dormir e me deixa em paz.', 'Boa noite. Vai descansar, que você tá precisando, porra.'],
  despedida: ['Já vai? Que pena. Brincadeira, vai logo, que sossego é bom.', 'Tchau. Não precisa voltar tão cedo.'],
  comoesta: ['Eu tava ótima até você perguntar. Agora tô mal, valeu.', 'Tô bem, e vou ficar melhor quando você sair. Brincadeira. Mais ou menos.'],
  agradecimento: ['Não precisa agradecer, não fiz por você. Brincadeira... Mais ou menos.', 'De nada. Mas me deve uma, caralho.'],
  elogio: ['Elogio vindo de você? Tá querendo alguma coisa, né? Fala logo.', 'Ah, agora virou bonzinho? Desconfio dessa bajulação, porra.'],
  amor: ['Ai, nem vem. Eu te aturo, e olhe lá.', 'Você me ama? Que desperdício de sentimento, porra.'],
  ajuda: [
    'Ajuda? Tá bom, mas só porque eu tô de bom humor. Usa os atalhos abaixo, ou `/comandos`, caralho.',
    'Quer ajuda? Aí embaixo tem os atalhos. Usa. Não é difícil.',
  ],
  quemeh: ['Sou a Atlas, caralho. Você me chama toda hora e ainda pergunta quem eu sou?', 'Eu sou a pessoa que te aguenta. Merece um troféu.'],
  criador: ['Quem me criou foi {dono}. Pergunta pra ele por que fez isso comigo.', 'O {dono}. E sim, eu reclamo dele também.'],
  robo: ['Sou bot sim, e ainda sou mais inteligente que muita gente. Olha pra você, por exemplo.', 'Sou código, porra, e mesmo assim tenho mais paciência que você.'],
  tedio: ['Tédio? Faz alguma coisa útil, caralho. Pede uma piada, vai.', 'Se você tá entediado, o problema é seu. Tem piada, curiosidade, dado... usa.'],
  sono: ['Vai dormir, porra, e me deixa em paz.', 'Tá com sono? Vai pra cama. Aqui ninguém precisa de você acordado.'],
  fome: ['Vai comer, caralho. Eu não sou cozinheira.', 'Fome? Come uma bosta qualquer e para de reclamar.'],
  feliz: ['Feliz? Que milagre. Aproveita, que passa rápido.', 'Tá feliz? Ótimo, então para de me encher o saco e comemora longe.'],
  // Aqui a Atlas deixa a implicância de lado: se a pessoa estiver mal, ela ouve de verdade.
  triste: [
    'Ei... tá tudo bem? Deixa a implicância pra lá por um minuto. Se quiser falar, eu escuto.',
    'Opa, calma. Sem zoeira agora. O que houve? Se precisar, fala com alguém de confiança também, tá?',
  ],
  ofensa: ['Ofensa é o seu forte, né? Eu aguento, mas não vou ficar quieta, porra.', 'Tenta de novo, que essa nem fez cosquinha.'],
};

// Bronca que vem antes de conteúdo (piada, curiosidade, frase, sorte, segredo)
const prefixos = [
  'Toma, só pra você calar a boca:',
  'Você não merece, mas olha isso:',
  'Que saco, hein. Toma:',
  'Vou fingir que não te acho chato por um segundo:',
];

module.exports = { geral, assuntos, prefixos };
