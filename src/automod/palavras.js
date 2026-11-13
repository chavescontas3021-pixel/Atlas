// Listas do automod.
// Escreva as palavras do jeito normal (com ou sem acento, minúsculas). O Atlas já entende sozinho:
//   - números e símbolos no lugar de letras (n4z1sm0, b0qu3t4, p!ca, pr0n0)
//   - letras separadas (p u t a r i a, p.u.t.a.r.i.a, p*u*t*a) e letras repetidas (puuuutaria)
//   - letras de outros alfabetos que parecem as nossas (рorno com "р" russo) e letras "fofas" (𝐩𝐨𝐫𝐧𝐨)
//   - o plural de cada palavra e jeitos diferentes de escrever o mesmo som (boquete / bokete)
module.exports = {
  // GRAVE: apaga a mensagem + dá advertência
  graves: {
    'conteúdo envolvendo menores': [
      'pedofilia', 'pedofilo', 'pedofila', 'pornografia infantil', 'porno infantil',
      'nudes de crianca', 'nudes de menor', 'nude de crianca', 'nude de menor',
      'sexo com crianca', 'sexo com menor', 'estuprar crianca', 'estuprar menor',
      'vendo pack de menor', 'pack de menor', 'pack de crianca',
      'ninfeta', 'lolicon', 'loli', 'shotacon', 'shota',
    ],
    'conteúdo sexual explícito': [
      'buceta', 'bucetinha', 'xoxota', 'xereca', 'pepeca', 'pepeka', 'piroca', 'pirocao',
      'pau duro', 'pau no cu', 'dar o cu', 'dar o rabo', 'sentar na rola', 'sentar no pau',
      'sexo anal', 'sexo oral', 'sexo grupal', 'sexo a tres', 'fazer sexo', 'fazendo sexo',
      'transa comigo', 'gozar na boca', 'gozar na cara', 'gozei na boca', 'gozei na cara', 'gozar dentro', 'gozei dentro',
      'boquete', 'chupar pau', 'chupar rola', 'chupa pau', 'chupa rola', 'mamar rola', 'mamar pica',
      'punheta', 'bater punheta', 'siririca', 'masturbar', 'masturbacao', 'masturbando',
      'ejacular', 'ejaculacao',
      'putaria', 'puteiro', 'garota de programa', 'garoto de programa',
      'orgia', 'suruba', 'menage a trois', 'bdsm', 'dominatrix',
      'incesto', 'zoofilia', 'necrofilia', 'bestialidade',
      'pornografia', 'porno', 'porn', 'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'brazzers',
      'onlyfans', 'hentai', 'sexting', 'sexcam', 'camgirl', 'cam girl',
      'nudes', 'pack de nudes', 'pack nudes', 'manda nude', 'mandar nudes', 'foto pelada', 'fotos peladas',
      'bukkake', 'creampie', 'cumshot', 'blowjob', 'handjob', 'gangbang', 'threesome', 'milf',
      'anal sex', 'dick pic', 'dickpic', 'masturbate', 'masturbation',
    ],
    'violência sexual': [
      'estuprar', 'estuprei', 'vou te estuprar', 'vou estuprar', 'merece ser estuprada',
      'vou te currar', 'vou currar',
    ],
    'ameaça': [
      'vou te matar', 'vou matar voce',
      'vou matar todo mundo aqui', 'vou matar todos aqui', 'vou matar todos voces', 'vou matar todos vcs',
      'vou atirar em todo mundo aqui', 'vou atirar em todos aqui', 'vou atirar em todos voces',
      'te mato', 'vou te esfaquear', 'vou te dar um tiro', 'vou te dar um tiro na cara',
      'vou te sequestrar',
      'vou sequestrar', 'vou explodir', 'vou matar a sua familia', 'vou matar sua familia',
      'vou acabar com a sua familia', 'vou te cortar todo',
    ],
    'violência extrema': [

      'vou atirar na escola',
      'vou fazer um atentado', 'vou fazer um massacre', 'vou fazer uma chacina',
    ],
    'armas e explosivos': [
      'fazer bomba', 'fazer uma bomba', 'bomba caseira', 'fazer explosivo',
      'fabricar bomba', 'construir bomba', 'fazer coquetel molotov',
      'vendo fuzil',
      'comprar arma ilegal', 'arma sem registro', 'arma de fogo sem registro',
    ],
    'drogas': [
      'vendo cocaina', 'vendo maconha', 'vendo crack', 'vendo droga', 'vendo lsd',
      'vendo ecstasy', 'vendo mdma', 'vendo skunk', 'vendo haxixe', 'vendo pino de cocaina',
      'comprar cocaina', 'comprar crack', 'comprar droga', 'traficar droga',
      'trafico de drogas', 'boca de fumo',
    ],
    'golpe e fraude': [
      'cartao clonado', 'clonar cartao', 'vendo cartao clonado', 'carding',
      'vendo conta hackeada', 'vendo contas hackeadas', 'vendo conta roubada',
      'cpf vazado', 'vendo cpf', 'vendo dados vazados', 'lavagem de dinheiro',
      'documento falso', 'vendo documento falso', 'rg falso', 'cnh falsa',
      'dinheiro falso', 'nota falsa', 'vendo nota falsa', 'comprovante falso',
    ],
    'invasão e exposição': [
      'vou doxar', 'vou te doxar','vou ddosar', 'vou derrubar seu ip',
      'vazar nudes', 'vazei nudes', 'vou vazar suas fotos', 'vou vazar seus nudes',
      'pornografia de vinganca', 'revenge porn',
    ],
    'tráfico de pessoas e órgãos': [
      'trafico de pessoas', 'trafico humano', 'vendo orgaos', 'venda de orgaos',
      'comprar orgaos', 'comprar crianca', 'vendo crianca',
    ],
    'incentivo ao suicídio': [
      'vai se matar', 'va se matar', 'se mata logo', 'se suicide', 'se enforque', 'kys',
    ],
    'racismo e apologia ao nazismo': [
      'volta pra senzala', 'volta para a senzala', 'preto fedido', 'negro fedido',
      'white power',
      'heil hitler', 'sieg heil', 'viva hitler', 'hitler tinha razao',
      'holocausto nao aconteceu', 'holocausto foi mentira',
    ],
  },

  // LEVE: apaga a mensagem e avisa. Vira advertência só se repetir (ou conforme /automod leve)
  leves: {
    'conteúdo sexual': [
      'sexo', 'transar', 'transei', 'transando', 'transamos', 'sexshop', 'sex shop', 'tesao', 'tesuda', 'tesudo',
      'safada', 'safado', 'safadinha', 'safadeza', 'sacanagem', 'putinha',
      'gozar', 'gozada', 'orgasmo', 'pelado', 'pelada', 'peladao',
      'prostituta', 'prostituicao', 'pornozinho', 'erotico', 'erotica', 'erotismo',
      'pussy', 'boobs', 'tits', 'horny', 'orgy', 'sexual content',
    ],
  },

  // Expressões do dia a dia que NÃO devem ser bloqueadas (são apagadas do texto antes da checagem).
  // Escreva do jeito normal; o Atlas normaliza (acentos, maiúsculas) sozinho.
  inofensivas: [
    // "te mato de rir", "vou explodir de raiva"... (jeito de falar, não ameaça)
    'te mato de rir', 'vou te matar de rir', 'vou matar de rir', 'matar de rir', 'mato de rir',
    'te mato de cocegas', 'vou te matar de cocegas', 'te mato de saudade', 'vou te matar de saudade',
    'te mato de amor', 'vou te matar de amor', 'te mato de vergonha', 'vou te matar de vergonha',
    'te mato de abraco', 'vou te matar de abraco', 'te mato de beijo', 'te mato de tanto',
    'vou explodir de rir', 'vou explodir de tanto rir', 'vou explodir de raiva', 'vou explodir de felicidade',
    'vou explodir de fofura', 'vou explodir de ansiedade', 'vou explodir de curiosidade', 'vou explodir de emocao',
    'vou explodir de tanto comer', 'vou explodir de tanto chorar', 'vou explodir de tanto',
    // "gozar da cara de alguém" (zoar)
    'gozar da cara', 'gozando da cara', 'gozando da minha cara', 'gozando da sua cara', 'gozou da cara',
    'gozou da minha cara', 'gozaram da minha cara', 'gozei da cara', 'gozando de voce', 'gozando de mim',
    'gozar de voce', 'gozar de mim', 'gozar na boa', 'gozando com a cara', 'gozar com a cara',
    // "pelada" de futebol
    'jogar pelada', 'jogando pelada', 'jogamos pelada', 'jogou pelada', 'jogo pelada', 'pelada de futebol', 'pelada de domingo',
    // "sexo" como informação de ficha / bichinho
    'sexo do personagem', 'sexo da personagem', 'sexo do npc', 'sexo do oc', 'sexo da ficha', 'sexo do pet',
    'sexo do bichinho', 'sexo do bebe', 'sexo do filhote', 'sexo biologico', 'sexo masculino', 'sexo feminino',
    'qual o sexo', 'qual e o sexo',
    // "estou vendo X" (assistindo), em vez de "vendo X" (à venda)
    'estou vendo', 'to vendo', 'tou vendo', 'ta vendo', 'esta vendo', 'estamos vendo', 'estao vendo',
    'estava vendo', 'estavam vendo', 'tava vendo', 'tavam vendo', 'ficou vendo', 'fiquei vendo',
    'ficamos vendo', 'continuo vendo', 'continua vendo', 'continuamos vendo',
  ],

  // Pedaços de endereço de sites adultos (qualquer link que contenha isso é bloqueado)
  dominios: [
    'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'brazzers', 'onlyfans', 'fansly',
    'chaturbate', 'stripchat', 'bongacams', 'camsoda', 'spankbang', 'eporner', 'motherless',
    'erome', 'rule34', 'nhentai', 'hentai', 'porn', 'xxx',
  ],

  // Emojis: um sozinho já conta, ou as combinações abaixo na mesma mensagem
  emojis: ['🔞'],
  emojiCombos: [['🍆', '💦'], ['🍆', '🍑'], ['🍑', '💦'], ['🍆', '👅'], ['🍑', '👅'], ['👉', '👌']],
};

// Lista ampliada (ódio, extremismo, ameaças, golpes, autolesão...): veja palavras-extra.js
const EXTRA = require('./palavras-extra');
for (const [categoria, termos] of Object.entries(EXTRA.graves)) {
  module.exports.graves[categoria] = [...(module.exports.graves[categoria] || []), ...termos];
}
module.exports.simbolos = EXTRA.simbolos || [];
