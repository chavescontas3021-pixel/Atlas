// ─────────────────────────────────────────────────────────────
//  ATLAS · peças prontas de interface
//  Use estas funções em vez de montar EmbedBuilder / ButtonBuilder na mão.
//  Assim o bot inteiro fica com o mesmo jeito de falar e de aparecer.
// ─────────────────────────────────────────────────────────────
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  StringSelectMenuBuilder,
} = require('discord.js');
const { COR, S, E, trilha, corta } = require('./tema');

const EPH = MessageFlags.Ephemeral;

// ── Painel (o "embed" do Atlas) ──────────────────────────────
// painel({
//   trilha: ['Ajuda', 'Membros'],   → "ATLAS  /  Ajuda  /  Membros" no topo
//   titulo, descricao,
//   campos: [{ nome, valor, lado }], → lado:true deixa lado a lado
//   rodape, imagem, thumb, perigo
// })
function painel({
  trilha: caminho = [], titulo, descricao, campos, rodape, imagem, thumb, perigo,
} = {}) {
  const e = new EmbedBuilder().setColor(perigo ? COR.perigo : COR.base);
  e.setAuthor({ name: trilha(...[].concat(caminho)) });
  if (titulo) e.setTitle(corta(titulo, 256));
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

// ── Botão ────────────────────────────────────────────────────
// O Discord NÃO deixa pintar botão de preto/branco: só existem 4 cores.
// O estilo "secundário" é o mais próximo: cinza-escuro no tema escuro e
// cinza-claro no tema claro. Por isso TODO botão do Atlas é secundário,
// e as outras cores ficam só para o que realmente importa (confirmar / perigo).
const ESTILO = {
  neutro: ButtonStyle.Secondary,
  destaque: ButtonStyle.Primary, // use com muita moderação
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

// Atalho: linha só de botões. botoes([{id,label}, {id,label}])
const botoes = (lista) => linha(lista.map(botao));

// ── Menu de seleção ──────────────────────────────────────────
// menu({ id, placeholder, opcoes:[{ valor, nome, desc, padrao }] })
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

// ── Paginação ────────────────────────────────────────────────
//   «   ‹   2 / 5   ›   »
// Os ids ficam `${base}:${pagina}` (a página vai no fim, fácil de ler no handler).
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

// ── Respostas rápidas (curtas, só para quem usou) ────────────
// nota('Salvo.')            → ● Salvo.
// nota('Não achei', 'erro') → ○ Não achei
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

// Responde ou edita, o que for possível naquele momento
async function responder(interaction, payload) {
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

module.exports = {
  EPH, painel, botao, botoes, linha, menu, paginacao, nota, ok, erro, aviso, responder,
};
