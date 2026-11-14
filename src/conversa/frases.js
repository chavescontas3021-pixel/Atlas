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
// Os assuntos ficam em arquivos pequenos (frases-a/b/c/d) para facilitar copiar e editar.
const ASSUNTOS = [
  ...require('./frases-a'),
  ...require('./frases-b'),
  ...require('./frases-c'),
  ...require('./frases-d'),
  ...require('./frases-palavrao'),
];
const { NAO_ENTENDI, MOLDES } = require('./frases-moldes');

module.exports = { ASSUNTOS, NAO_ENTENDI, MOLDES };
