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
//    • emoji dentro de botão → removido (o texto do botão basta)
//    • resposta de texto puro começando com ✅ ❌ ⚠️ (ou qualquer resposta
//      "só para você") → vira a notinha curta do Atlas:  ●  texto
//
//  Para desligar: apague a linha `require('./ui/legado');` do index.js.
//  Os módulos reescritos à mão (src/ui/componentes.js) não dependem disto.
// ─────────────────────────────────────────────────────────────
const D = require('discord.js');
const { COR, S, tirarEmoji } = require('./tema');

const { EmbedBuilder, ButtonBuilder, ButtonStyle } = D;

// Deixe true se quiser manter os emojis dentro dos botões.
const MANTER_EMOJI_BOTAO = false;

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

  if (!MANTER_EMOJI_BOTAO) {
    // Botões do Atlas ficam só com texto: ignora o emoji pedido.
    ButtonBuilder.prototype.setEmoji = function () {
      return this;
    };
  }

  // ── Respostas de texto puro → notinha ─────────────────────
  const ehPrivado = (p) => {
    if (p.ephemeral === true) return true;
    const f = p.flags;
    if (typeof f === 'number') return (f & 64) === 64;
    if (typeof f === 'bigint') return (f & 64n) === 64n;
    if (Array.isArray(f)) return f.includes(64) || f.includes('Ephemeral');
    if (f && typeof f.has === 'function') return f.has(64);
    return false;
  };

  function converter(payload, edicao) {
    const p = typeof payload === 'string' ? { content: payload } : payload;
    if (!p || typeof p.content !== 'string' || !p.content.trim()) return payload;
    if ((p.embeds && p.embeds.length) || (p.components && p.components.length) || (p.files && p.files.length) || p.poll) return payload;

    const status = /^\s*(✅|❌|⚠️|🚫)/u.test(p.content);
    const privado = ehPrivado(p);
    if (!status && !privado) return payload;
    if (!privado && /<@[!&]?\d+>/.test(p.content)) return payload; // não perder o ping de quem foi marcado

    const erro = /^\s*(❌|⚠️|🚫)/u.test(p.content);
    const texto = tirarEmoji(p.content) || p.content;
    const embed = new EmbedBuilder()
      .setColor(erro ? COR.perigo : COR.base)
      .setDescription(`${erro ? S.vazio : S.ponto}  ${texto}`.slice(0, 4000));
    const { content, ...resto } = p;
    return { ...resto, ...(edicao ? { content: '' } : {}), embeds: [embed] };
  }

  const alvos = [
    'ChatInputCommandInteraction', 'ButtonInteraction', 'StringSelectMenuInteraction',
    'ModalSubmitInteraction', 'MessageContextMenuCommandInteraction', 'UserContextMenuCommandInteraction',
  ];
  for (const nome of alvos) {
    const classe = D[nome];
    if (!classe || !classe.prototype) continue;
    for (const metodo of ['reply', 'editReply', 'followUp']) {
      const original = classe.prototype[metodo];
      if (typeof original !== 'function') continue;
      classe.prototype[metodo] = function (payload, ...resto) {
        return original.call(this, converter(payload, metodo === 'editReply'), ...resto);
      };
    }
  }

  EmbedBuilder.prototype.__atlasLegado = true;
}
