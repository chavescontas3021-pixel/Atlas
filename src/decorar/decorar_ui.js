// Peças de tela compartilhadas pelo /criar e pelo /cargo (mesmo jeito do /decorar: lista, prévia, confirmar, aplicar)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const N = require('./nucleo');

const COR = 0xf5a3c7;
const TEMPO_COLETA = 8 * 60 * 1000;
const TEMPO_CONFIRMA = 5 * 60 * 1000;

const corta = (t, n) => { const a = [...String(t)]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : String(t); };
const botao = (id, rotulo, emoji, estilo) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(rotulo).setStyle(estilo);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const embed = (titulo, linhas) => new EmbedBuilder().setColor(COR).setTitle(titulo).setDescription(corta(linhas.join('\n'), 3900));

// Pega a lista: do arquivo anexado ou colada no chat (em quantas mensagens quiser). Devolve { texto, atual } ou null.
async function lerLista(interaction, comando) {
  const anexo = interaction.options.getAttachment('arquivo');
  if (anexo) {
    if (anexo.size > 1000000) { await interaction.editReply('❌ Esse arquivo é grande demais para ser a lista.'); return null; }
    try { return { texto: await (await fetch(anexo.url)).text(), atual: interaction }; }
    catch { await interaction.editReply('❌ Não consegui ler o arquivo. Tente de novo ou cole a lista no chat.'); return null; }
  }
  const linha = new ActionRowBuilder().addComponents(botao('ui:pronto', 'Pronto', '✅', ButtonStyle.Success), botao('ui:cancelar', 'Cancelar', null, ButtonStyle.Secondary));
  const resp = await interaction.editReply({
    content: '📥 **Cole a lista aqui no chat**, em quantas mensagens precisar. Eu leio só as suas mensagens, por 8 minutos, e apago depois.\nQuando terminar, aperte **Pronto**.',
    components: [linha],
  });
  const textos = []; const msgs = [];
  const col = interaction.channel.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, time: TEMPO_COLETA });
  col.on('collect', (m) => { textos.push(m.content); msgs.push(m); m.react('📥').catch(() => {}); });
  let clique = null;
  try { clique = await resp.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: TEMPO_COLETA }); } catch { clique = null; }
  col.stop();
  if (!clique) { await interaction.editReply({ content: `⌛ Tempo esgotado. Use \`${comando}\` de novo.`, components: [] }).catch(() => {}); return null; }
  if (clique.customId === 'ui:cancelar') { await clique.update({ content: '❌ Cancelado.', components: [] }); return null; }
  await clique.deferUpdate();
  for (const m of msgs) m.delete().catch(() => {});
  if (!textos.length) { await clique.editReply({ content: `❌ Você não colou nada. Use \`${comando}\` de novo.`, components: [] }); return null; }
  return { texto: textos.join('\n'), atual: clique };
}

// Mostra a prévia, espera o botão e roda executar(progresso) → texto final
async function confirmar(atual, interaction, { prévia, rotulo, executar }) {
  const linha = new ActionRowBuilder().addComponents(botao('ui:ok', rotulo, '✅', ButtonStyle.Success), botao('ui:cancelar', 'Cancelar', null, ButtonStyle.Secondary));
  const msg = await atual.editReply({ content: '', embeds: [prévia], components: [linha] });
  let clique = null;
  try { clique = await msg.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: TEMPO_CONFIRMA }); } catch { clique = null; }
  if (!clique) { await atual.editReply({ content: '⌛ Tempo esgotado. Nada foi alterado.', embeds: [], components: [] }).catch(() => {}); return; }
  if (clique.customId === 'ui:cancelar') { await clique.update({ content: '❌ Cancelado. Nada foi alterado.', embeds: [], components: [] }); return; }
  if (!N.reservar()) { await clique.update({ content: '⏳ Já tem uma operação em andamento. Aguarde terminar.', embeds: [], components: [] }); return; }
  try {
    await clique.update({ content: '⏳ Aplicando…', embeds: [], components: [] });
    let ultimo = 0;
    const texto = await executar(async (i, total) => {
      if (i === total || Date.now() - ultimo > 4000) { ultimo = Date.now(); await clique.editReply({ content: `⏳ Aplicando… ${i}/${total}` }).catch(() => {}); }
    });
    await clique.editReply({ content: corta(texto, 1900) }).catch(() => interaction.channel.send({ content: corta(texto, 1900) }).catch(() => {}));
  } finally { N.liberar(); }
}

// Falhas em lista curta
const falhasTxt = (falhas, nomeDe) => falhas.length ? [`⚠️ **${falhas.length}** falharam:`, ...falhas.slice(0, 10).map((f) => `• ${corta(nomeDe(f), 35)} — ${f.erro}`), ...(falhas.length > 10 ? [`… e mais ${falhas.length - 10}`] : [])] : [];

module.exports = { COR, corta, botao, embed, lerLista, confirmar, falhasTxt };
