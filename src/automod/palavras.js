// Lista de palavras e frases proibidas do automod, separada por categoria.
// Só entra coisa absurda ligada a crime (nada de palavrão comum).
// Pode escrever com ou sem acento e em minúsculas: o Atlas já entende "p3d0filia", "p e d o f i l i a" etc.
// O plural de cada palavra (s / es / ões) é detectado sozinho, não precisa repetir.
module.exports = {
  'conteúdo envolvendo menores': [
    'pedofilia', 'pedofilo', 'pedofila', 'pornografia infantil', 'porno infantil',
    'nudes de crianca', 'nudes de menor', 'nude de crianca', 'nude de menor',
    'sexo com crianca', 'sexo com menor', 'estuprar crianca', 'estuprar menor',
    'vendo pack de menor', 'pack de menor', 'pack de crianca',
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
    'heil hitler', 'sieg heil', 'viva hitler', 'hitler tinha razao',
    'holocausto nao aconteceu', 'holocausto foi mentira',
  ],
};
