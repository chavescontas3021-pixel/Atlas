// ─────────────────────────────────────────────────────────────
//  ATLAS · camada de compatibilidade visual
//
//  O Atlas tem dezenas de módulos antigos com embeds rosa, botões azuis/verdes
//  e títulos cheios de emoji. Em vez de esperar cada um ser reescrito, este
//  arquivo "traduz" tudo para a identidade nova na hora de montar a mensagem:
//
//    • cor do embed        → preto do Atlas (vermelho continua só para perigo)
//    • botão azul/verde    → cinza (o mais próximo de preto/branco que o Discord permite)
//    • emoji no começo de título e de nome de campo → removido
//
//  Para desligar: apague a linha `require('./ui/legado');` do index.js.
//  Os módulos reescritos à mão (src/ui/componentes.js) não dependem disto.
// ─────────────────────────────────────────────────────────────
const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COR, tirarEmoji } = require('./tema');

if (!EmbedBuilder.prototype.__atlasLegado) {
  const VERMELHOS = new Set([0xe74c3c, 0xed4245, 0xc0392b]);

  const setColor = EmbedBuilder.prototype.setColor;
  EmbedBuilder.prototype.setColor = function (cor) {
    if (typeof cor === 'number') return setColor.call(this, VERMELHOS.has(cor) ? COR.perigo : COR.base);
    return setColor.call(this, cor);
  };

  const setTitle = EmbedBuilder.prototype.setTitle;
  EmbedBuilder.prototype.setTitle = function (titulo) {
    if (typeof titulo !== 'string') return setTitle.call(this, titulo);
    return setTitle.call(this, tirarEmoji(titulo) || titulo);
  };

  const addFields = EmbedBuilder.prototype.addFields;
  EmbedBuilder.prototype.addFields = function (...campos) {
    const limpos = campos.flat().map((c) => (c && typeof c.name === 'string' && tirarEmoji(c.name)
      ? { ...c, name: tirarEmoji(c.name) }
      : c));
    return addFields.call(this, ...limpos);
  };

  const setStyle = ButtonBuilder.prototype.setStyle;
  ButtonBuilder.prototype.setStyle = function (estilo) {
    const neutro = estilo === ButtonStyle.Primary || estilo === ButtonStyle.Success;
    return setStyle.call(this, neutro ? ButtonStyle.Secondary : estilo);
  };

  EmbedBuilder.prototype.__atlasLegado = true;
         }
