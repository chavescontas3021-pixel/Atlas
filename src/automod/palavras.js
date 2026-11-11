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
      'transar', 'transei', 'transando', 'transamos', 'transa comigo',
      'boquete', 'chupar pau', 'chupar rola', 'chupa pau', 'chupa rola', 'mamar rola', 'mamar pica',
      'punheta', 'bater punheta', 'siririca', 'masturbar', 'masturbacao', 'masturbando',
      'gozar na', 'gozei na', 'gozando', 'ejacular', 'ejaculacao',
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
      'vou te matar', 'vou matar voce', 'vou matar todo mundo', 'vou matar todos',
      'te mato', 'vou te esfaquear', 'vou te dar um tiro', 'vou te dar um tiro na cara',
      'vou atirar em todo mundo', 'vou atirar em todos', 'vou te sequestrar',
      'vou sequestrar', 'vou explodir', 'vou matar a sua familia', 'vou matar sua familia',
      'vou acabar com a sua familia', 'vou te cortar todo',
    ],
    'violência extrema': [
      'chacina', 'massacre na escola', 'massacre em escola', 'ataque a escola',
      'ataque na escola', 'tiroteio na escola', 'vou atirar na escola',
      'vou fazer um atentado', 'vou fazer um massacre', 'vou fazer uma chacina',
    ],
    'armas e explosivos': [
      'fazer bomba', 'fazer uma bomba', 'bomba caseira', 'fazer explosivo',
      'fabricar bomba', 'construir bomba', 'fazer coquetel molotov',
      'vendo arma', 'vendo pistola', 'vendo fuzil', 'vendo municao', 'vendo revolver',
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
      'doxxing', 'dox', 'vou doxar', 'vou te doxar', 'ddos', 'vou ddosar', 'vou derrubar seu ip',
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
      'nazismo', 'nazista', 'neonazismo', 'neonazista', 'supremacia branca', 'white power',
      'heil hitler', 'sieg heil', 'viva hitler', 'hitler tinha razao',
      'holocausto nao aconteceu', 'holocausto foi mentira',
    ],
  },

  // LEVE: apaga a mensagem e avisa. Vira advertência só se repetir (ou conforme /automod leve)
  leves: {
    'conteúdo sexual': [
      'sexo', 'sexshop', 'sex shop', 'tesao', 'tesuda', 'tesudo',
      'safada', 'safado', 'safadinha', 'safadeza', 'sacanagem', 'putinha',
      'gozar', 'gozada', 'orgasmo', 'pelado', 'pelada', 'peladao',
      'prostituta', 'prostituicao', 'pornozinho', 'erotico', 'erotica', 'erotismo',
      'pussy', 'boobs', 'tits', 'horny', 'orgy', 'sexual content',
    ],
  },

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
