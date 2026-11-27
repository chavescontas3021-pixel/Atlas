const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  StringSelectMenuBuilder,
} = require('discord.js');
const { COR, S, E, trilha, corta, tirarEmoji } = require('./tema');

const EPH = MessageFlags.Ephemeral;

function painel({
  trilha: caminho = [], titulo, descricao, campos, rodape, imagem, thumb, perigo,
} = {}) {
  const e = new EmbedBuilder().setColor(perigo ? COR.perigo : COR.base);
  e.setAuthor({ name: trilha(...[].concat(caminho)) });
  if (titulo) e.setTitle(corta(tirarEmoji(titulo) || titulo, 256));
  if (descricao) e.setDescription(String(descricao).slice(0, 4000));
  if (campos && campos.length) {
    e.addFields(campos.slice(0, 25).map((c) => ({
      name: corta(c.nome, 256) || '',
      value: String(c.valor ?? '—').slice(0, 1024) || '—',
      inline: !!c.lado,
    })));
  }
  if (rodape) e.setFooter({ text: corta(rodape, 2048) });
  if (imagem) e.setImage(imagem);
  if (thumb) e.setThumbnail(thumb);
  return e;
}

const ESTILO = {
  neutro: ButtonStyle.Secondary,
  destaque: ButtonStyle.Primary,
  perigo: ButtonStyle.Danger,
  confirmar: ButtonStyle.Success,
};

function botao({
  id, label, emoji, estilo = 'neutro', desabilitado = false, url,
} = {}) {
  const b = new ButtonBuilder();
  if (label) b.setLabel(corta(label, 80));
  if (emoji) b.setEmoji(emoji);
  if (url) {
    b.setStyle(ButtonStyle.Link).setURL(url);
  } else {
    b.setCustomId(String(id).slice(0, 100)).setStyle(ESTILO[estilo] || ButtonStyle.Secondary);
  }
  return b.setDisabled(!!desabilitado);
}

const linha = (...itens) => new ActionRowBuilder().addComponents(...itens.flat().filter(Boolean));

const botoes = (lista) => linha(lista.map(botao));

function menu({
  id, placeholder = 'Escolha uma opção', opcoes, min = 1, max = 1, desabilitado = false,
}) {
  const m = new StringSelectMenuBuilder()
    .setCustomId(String(id).slice(0, 100))
    .setPlaceholder(corta(placeholder, 150))
    .setMinValues(min)
    .setMaxValues(Math.min(max, opcoes.length))
    .setDisabled(!!desabilitado)
    .addOptions(opcoes.slice(0, 25).map((o) => {
      const opt = { label: corta(o.nome, 100), value: String(o.valor).slice(0, 100) };
      if (o.desc) opt.description = corta(o.desc, 100);
      if (o.emoji) opt.emoji = o.emoji;
      if (o.padrao) opt.default = true;
      return opt;
    }));
  return linha(m);
}

function paginacao(base, pagina, total) {
  if (total <= 1) return null;
  const p = Math.min(Math.max(0, pagina), total - 1);
  return linha(
    botao({ id: `${base}:0`, label: E.inicio, desabilitado: p === 0 }),
    botao({ id: `${base}:${p - 1}`, label: E.anterior, desabilitado: p === 0 }),
    botao({ id: `${base}:atual`, label: `${p + 1} / ${total}`, desabilitado: true }),
    botao({ id: `${base}:${p + 1}`, label: E.proxima, desabilitado: p >= total - 1 }),
    botao({ id: `${base}:${total - 1}`, label: E.fim, desabilitado: p >= total - 1 }),
  );
}

function nota(texto, tipo = 'ok', { publica = false } = {}) {
  const simbolo = tipo === 'ok' ? S.ponto : S.vazio;
  const e = new EmbedBuilder()
    .setColor(tipo === 'erro' ? COR.perigo : COR.base)
    .setDescription(`${simbolo}  ${texto}`);
  const payload = { embeds: [e] };
  if (!publica) payload.flags = EPH;
  return payload;
}
const ok = (texto, opts) => nota(texto, 'ok', opts);
const erro = (texto, opts) => nota(texto, 'erro', opts);
const aviso = (texto, opts) => nota(texto, 'aviso', opts);

function auto(texto, opts) {
  const t = String(texto ?? '');
  const ehErro = /^\s*(❌|⚠️|🚫)/u.test(t);
  return nota(tirarEmoji(t) || t, ehErro ? 'erro' : 'ok', opts);
}

function edicao(payload) {
  const { flags, ...resto } = payload;
  return { components: [], ...resto };
}

async function responder(interaction, payload) {
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

async function confirmar(interaction, {
  painel: embed, sim = 'Confirmar', nao = 'Cancelar', perigo = false, tempo = 30000,
}) {
  const base = `conf:${interaction.id}`;
  await interaction.reply({
    embeds: [embed],
    components: [linha(
      botao({ id: `${base}:sim`, label: sim, estilo: perigo ? 'perigo' : 'neutro' }),
      botao({ id: `${base}:nao`, label: nao }),
    )],
    flags: EPH,
  });
  const msg = await interaction.fetchReply();
  try {
    const clique = await msg.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(base),
      time: tempo,
    });
    if (clique.customId === `${base}:sim`) {
      await clique.deferUpdate();
      return true;
    }
    await clique.update(edicao(nota('Cancelado.', 'aviso')));
    return false;
  } catch {
    await interaction.editReply(edicao(nota('Tempo esgotado. Nada foi feito.', 'aviso'))).catch(() => {});
    return false;
  }
}

module.exports = {
  EPH, auto, confirmar, edicao, painel, botao, botoes, linha, menu, paginacao, nota, ok, erro, aviso, responder,
};
