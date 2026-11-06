const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const N = require('../decorar/nucleo');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const TEMPO_COLETA = 8 * 60 * 1000;
const TEMPO_CONFIRMA = 5 * 60 * 1000;

const corta = (t, n) => {
  const a = [...String(t)];
  return a.length > n ? `${a.slice(0, n - 1).join('')}…` : String(t);
};

function botao(id, rotulo, emoji, estilo) {
  const b = new ButtonBuilder().setCustomId(id).setLabel(rotulo).setStyle(estilo);
  if (emoji) b.setEmoji(emoji);
  return b;
}

// Texto da prévia: o que vai mudar e o que deu problema
function previa(titulo, res, { iguaisTxt } = {}) {
  const linhas = [
    `✏️ **${res.mudancas.length}** vão mudar${res.iguais !== undefined ? ` · ➖ **${res.iguais}** já estão iguais` : ''} · ⚠️ **${res.problemas.length}** com problema`,
  ];
  if (iguaisTxt) linhas.push(iguaisTxt);
  if (res.mudancas.length) {
    linhas.push('', '**Exemplos:**');
    for (const m of res.mudancas.slice(0, 10)) linhas.push(`• ${corta(m.antes, 35)} → ${corta(m.depois, 60)}`);
    if (res.mudancas.length > 10) linhas.push(`… e mais ${res.mudancas.length - 10}`);
  }
  if (res.problemas.length) {
    linhas.push('', '**Problemas (esses ficam de fora):**');
    for (const p of res.problemas.slice(0, 8)) linhas.push(`• ${corta(p.nome, 40)} — ${p.motivo}`);
    if (res.problemas.length > 8) linhas.push(`… e mais ${res.problemas.length - 8}`);
  }
  return new EmbedBuilder().setColor(COR).setTitle(titulo).setDescription(corta(linhas.join('\n'), 3900));
}

function resumoFinal(ok, falhas, rodape) {
  const t = [`✅ **${ok.length}** canal(is) renomeado(s).`];
  if (falhas.length) {
    t.push(`⚠️ **${falhas.length}** falharam:`);
    for (const f of falhas.slice(0, 12)) t.push(`• ${corta(f.antes, 35)} — ${f.erro}`);
    if (falhas.length > 12) t.push(`… e mais ${falhas.length - 12}`);
  }
  if (rodape) t.push('', rodape);
  return corta(t.join('\n'), 1900);
}

// Mostra a prévia, espera o botão e aplica. "atual" é a interação que vai editar a mensagem.
async function perguntarEAplicar(atual, interaction, { embed, mudancas, rotulo, motivo, preparar, concluir, rodape }) {
  if (!mudancas.length) {
    await atual.editReply({ content: 'Nada para mudar.', embeds: [embed], components: [] });
    return null;
  }
  const linha = new ActionRowBuilder().addComponents(
    botao('decorar:confirmar', rotulo, '✅', ButtonStyle.Success),
    botao('decorar:cancelar', 'Cancelar', null, ButtonStyle.Secondary)
  );
  const msg = await atual.editReply({ content: '', embeds: [embed], components: [linha] });

  let clique = null;
  try {
    clique = await msg.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: TEMPO_CONFIRMA });
  } catch {
    clique = null;
  }
  if (!clique) {
    await atual.editReply({ content: '⌛ Tempo esgotado. Nada foi alterado.', embeds: [], components: [] }).catch(() => {});
    return null;
  }
  if (clique.customId === 'decorar:cancelar') {
    await clique.update({ content: '❌ Cancelado. Nada foi alterado.', embeds: [], components: [] });
    return null;
  }
  if (!N.reservar()) {
    await clique.update({ content: '⏳ Já tem uma decoração em andamento. Aguarde terminar.', embeds: [], components: [] });
    return null;
  }

  try {
    await clique.update({ content: `⏳ Aplicando… 0/${mudancas.length}`, embeds: [], components: [] });
    if (preparar) preparar();
    let ultimo = 0;
    const { ok, falhas } = await N.renomearLote(interaction.guild, mudancas, {
      motivo,
      aoProgredir: async (i, total) => {
        if (i === total || Date.now() - ultimo > 4000) {
          ultimo = Date.now();
          await clique.editReply({ content: `⏳ Aplicando… ${i}/${total}` });
        }
      },
    });
    if (concluir) concluir(ok);
    const texto = resumoFinal(ok, falhas, rodape);
    await clique.editReply({ content: texto }).catch(() => interaction.channel.send({ content: texto }).catch(() => {}));
  } finally {
    N.liberar();
  }
  return null;
}

// Espera o staff colar a lista editada no chat (em quantas mensagens quiser)
async function coletar(interaction) {
  const linha = new ActionRowBuilder().addComponents(
    botao('decorar:pronto', 'Pronto', '✅', ButtonStyle.Success),
    botao('decorar:cancelar', 'Cancelar', null, ButtonStyle.Secondary)
  );
  const resp = await interaction.editReply({
    content:
      '📥 **Cole a lista editada aqui no chat**, em quantas mensagens precisar. ' +
      'Eu leio só as suas mensagens, por 8 minutos, e apago depois.\n' +
      'Quando terminar, aperte **Pronto**.',
    components: [linha],
  });

  const textos = [];
  const msgs = [];
  const coletor = interaction.channel.createMessageCollector({
    filter: (m) => m.author.id === interaction.user.id,
    time: TEMPO_COLETA,
  });
  coletor.on('collect', (m) => {
    textos.push(m.content);
    msgs.push(m);
    m.react('📥').catch(() => {});
  });

  let clique = null;
  try {
    clique = await resp.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: TEMPO_COLETA });
  } catch {
    clique = null;
  }
  coletor.stop();

  if (!clique) {
    await interaction.editReply({ content: '⌛ Tempo esgotado. Use `/decorar aplicar` de novo.', components: [] }).catch(() => {});
    return null;
  }
  if (clique.customId === 'decorar:cancelar') {
    await clique.update({ content: '❌ Cancelado.', components: [] });
    return null;
  }
  await clique.deferUpdate();
  for (const m of msgs) m.delete().catch(() => {}); // melhor esforço (precisa de Gerenciar Mensagens)
  if (!textos.length) {
    await clique.editReply({ content: '❌ Você não colou nada. Use `/decorar aplicar` de novo.', components: [] });
    return null;
  }
  return { texto: textos.join('\n'), interacao: clique };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decorar')
    .setDescription('Muda o nome de vários canais de uma vez (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('lista')
        .setDescription('Manda a lista de canais com ID para você editar')
        .addBooleanOption((o) => o.setName('arquivo').setDescription('Mandar como arquivo .txt em vez de mensagens'))
    )
    .addSubcommand((s) =>
      s
        .setName('aplicar')
        .setDescription('Renomeia os canais com a lista editada (cole no chat ou envie o .txt)')
        .addAttachmentOption((o) => o.setName('arquivo').setDescription('Arquivo .txt com a lista editada (opcional)'))
    )
    .addSubcommand((s) => s.setName('desfazer').setDescription('Volta os canais aos nomes de antes da decoração')),

  async execute(interaction) {
    const responder = (content) => interaction.reply({ content, flags: EPH });
    if (!interaction.inGuild()) return responder('Use este comando no servidor.');
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return responder('❌ Só a staff pode usar este comando.');
    }

    const sub = interaction.options.getSubcommand();

    // ---------- Lista ----------
    if (sub === 'lista') {
      await interaction.deferReply({ flags: EPH });
      await interaction.guild.channels.fetch().catch(() => {});

      const { linhas, total } = N.montarLista(interaction.guild);
      if (!total) return interaction.editReply('❌ Não encontrei nenhum canal.');

      const dica =
        'Troque **só o nome depois do `|`** (não mexa no número) e apague as linhas que não quer mudar. ' +
        'Os títulos de categoria não são renomeados. Depois use `/decorar aplicar`.';

      if (interaction.options.getBoolean('arquivo')) {
        const arquivo = new AttachmentBuilder(Buffer.from(linhas.join('\n'), 'utf8'), { name: 'canais.txt' });
        return interaction.editReply({ content: `📋 **${total} canais** no arquivo.\n${dica}`, files: [arquivo] });
      }

      const pedacos = N.dividir(linhas);
      await interaction.editReply(`📋 **${total} canais** em ${pedacos.length} mensagem(ns).\n${dica}`);
      for (const p of pedacos) {
        await interaction.followUp({ content: `\`\`\`\n${p}\n\`\`\``, flags: EPH });
      }
      return null;
    }

    // ---------- Aplicar ----------
    if (sub === 'aplicar') {
      if (N.estaOcupado()) return responder('⏳ Já tem uma decoração em andamento. Aguarde terminar.');
      if (!interaction.channel) return responder('❌ Não consegui ver este canal.');
      await interaction.deferReply({ flags: EPH });
      await interaction.guild.channels.fetch().catch(() => {});

      let texto;
      let atual = interaction;
      const anexo = interaction.options.getAttachment('arquivo');
      if (anexo) {
        if (anexo.size > 1000000) return interaction.editReply('❌ Esse arquivo é grande demais para ser a lista.');
        try {
          texto = await (await fetch(anexo.url)).text();
        } catch {
          return interaction.editReply('❌ Não consegui ler o arquivo. Tente de novo ou cole a lista no chat.');
        }
      } else {
        const col = await coletar(interaction);
        if (!col) return null;
        texto = col.texto;
        atual = col.interacao;
      }

      const res = N.interpretar(interaction.guild, texto);
      if (!res.lidas) {
        return atual.editReply({
          content: '❌ Não achei nenhuma linha no formato `ID | nome`. Use `/decorar lista` para pegar o modelo.',
          components: [],
        });
      }

      return perguntarEAplicar(atual, interaction, {
        embed: previa('🎨 Prévia da decoração', res),
        mudancas: res.mudancas,
        rotulo: `Aplicar em ${res.mudancas.length} canais`,
        motivo: `Decoração em lote por ${interaction.user.username}`,
        preparar: () => N.guardarBackup(res.mudancas),
        rodape:
          'Se algum falhou por limite do Discord, espere uns 10 minutos e mande a mesma lista de novo: só os que faltam serão mudados.\n' +
          '↩️ Para voltar ao normal: `/decorar desfazer`',
      });
    }

    // ---------- Desfazer ----------
    if (sub === 'desfazer') {
      if (N.estaOcupado()) return responder('⏳ Já tem uma decoração em andamento. Aguarde terminar.');
      await interaction.deferReply({ flags: EPH });
      await interaction.guild.channels.fetch().catch(() => {});

      const prep = N.prepararDesfazer(interaction.guild);
      if (!prep.mudancas.length) {
        N.limparBackup(prep.resolvidos);
        return interaction.editReply('❌ Não há nada para desfazer: todos os canais já estão com o nome original.');
      }

      const res = { mudancas: prep.mudancas, problemas: [] };
      return perguntarEAplicar(interaction, interaction, {
        embed: previa('↩️ Desfazer a decoração', res),
        mudancas: prep.mudancas,
        rotulo: `Voltar ${prep.mudancas.length} canais`,
        motivo: `Decoração desfeita por ${interaction.user.username}`,
        concluir: (ok) => N.limparBackup([...prep.resolvidos, ...ok.map((m) => m.id)]),
      });
    }

    return null;
  },
};
