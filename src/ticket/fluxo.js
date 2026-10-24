const {
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('./nucleo');

const EPH = MessageFlags.Ephemeral;
const fechando = new Set();

function campo(id, label, estilo, max, { min, obrigatorio = true } = {}) {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(estilo).setMaxLength(max).setRequired(obrigatorio);
  if (min) t.setMinLength(min);
  return new ActionRowBuilder().addComponents(t);
}

// Remove da lista tickets cujo canal foi apagado na mão
function limparFantasmas(guild, userId) {
  for (const t of N.ticketsDoUsuario(userId)) {
    if (!guild.channels.cache.has(t.canalId)) db.remover(`ticket.abertos.${t.canalId}`);
  }
}

// ---------- Abrir ----------

async function abrirModal(interaction, tipoId) {
  const tipo = N.acharTipo(tipoId);
  if (!tipo) {
    return interaction.reply({
      content: 'Essa categoria não existe mais. Peça para a staff repostar o painel.',
      flags: EPH,
    });
  }
  limparFantasmas(interaction.guild, interaction.user.id);
  const abertos = N.ticketsDoUsuario(interaction.user.id);
  if (abertos.length >= N.limite()) {
    return interaction.reply({
      content: `Você já tem ${abertos.length} ticket(s) aberto(s): ${abertos.map((t) => `<#${t.canalId}>`).join(' ')}`,
      flags: EPH,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket:modal:${tipoId}`)
    .setTitle(`Ticket — ${tipo.nome}`.slice(0, 45))
    .addComponents(
      campo('assunto', 'Assunto', TextInputStyle.Short, 100),
      campo('descricao', 'Descreva o que você precisa', TextInputStyle.Paragraph, 1000, { min: 10 })
    );
  return interaction.showModal(modal);
}

async function criarCanal(guild, member, numero) {
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const P = PermissionFlagsBits;
  const basico = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];

  const permissoes = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: member.id, allow: basico },
    { id: eu.id, allow: [...basico, P.ManageChannels, P.ManageMessages] },
  ];
  for (const id of N.staffRoles(guild)) permissoes.push({ id, allow: [...basico, P.ManageMessages] });

  const nome = `ticket-${N.numeroFmt(numero)}-${member.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 90);
  const opcoes = {
    name: nome,
    type: ChannelType.GuildText,
    topic: `Ticket de ${member.user.username} (${member.id})`,
    permissionOverwrites: permissoes,
  };
  const categoria = N.cfg('categoria');
  if (categoria && guild.channels.cache.has(categoria)) opcoes.parent = categoria;
  return guild.channels.create(opcoes);
}

async function criarTicket(interaction, tipoId) {
  await interaction.deferReply({ flags: EPH });

  const guild = interaction.guild;
  const member = interaction.member;
  const tipo = N.acharTipo(tipoId);
  if (!tipo) return interaction.editReply('Essa categoria não existe mais. Peça para a staff repostar o painel.');

  limparFantasmas(guild, member.id);
  if (N.ticketsDoUsuario(member.id).length >= N.limite()) {
    return interaction.editReply('Você já atingiu o limite de tickets abertos.');
  }

  const assunto = interaction.fields.getTextInputValue('assunto').trim();
  const descricao = interaction.fields.getTextInputValue('descricao').trim();
  const numero = N.proximoNumero();

  let canal;
  try {
    canal = await criarCanal(guild, member, numero);
  } catch (erro) {
    console.error('[Ticket] erro ao criar canal:', erro);
    return interaction.editReply('⚠️ Não consegui criar o canal. Avise a staff (o limite de canais da categoria pode ter acabado).');
  }

  const ticket = {
    numero,
    userId: member.id,
    canalId: canal.id,
    tipoId: tipo.id,
    tipoNome: tipo.nome,
    tipoEmoji: tipo.emoji || '',
    assunto,
    descricao,
    aberto: Date.now(),
    assumidoPor: null,
    msgId: null,
  };
  db.set(`ticket.abertos.${canal.id}`, ticket);

  const staff = N.staffRoles(guild);
  const pings = N.cfg('pingStaff', true) ? staff : [];
  const conteudo = [`<@${member.id}>`, ...pings.map((id) => `<@&${id}>`)].join(' ');

  const msg = await canal.send({
    content: conteudo,
    embeds: [N.embedAbertura(ticket)],
    components: [N.botoesTicket(false)],
    allowedMentions: { users: [member.id], roles: pings },
  });
  ticket.msgId = msg.id;
  db.set(`ticket.abertos.${canal.id}`, ticket);
  await msg.pin().catch(() => {});

  return interaction.editReply(`✅ Ticket aberto: ${canal}`);
}

// ---------- Assumir ----------

async function assumir(interaction) {
  const canal = interaction.channel;
  const t = N.ticketDoCanal(canal.id);
  if (!t) return interaction.reply({ content: 'Este canal não é um ticket aberto.', flags: EPH });
  if (!N.ehStaff(interaction.member)) {
    return interaction.reply({ content: 'Só a staff pode assumir tickets.', flags: EPH });
  }
  if (t.assumidoPor && t.assumidoPor !== interaction.user.id) {
    return interaction.reply({ content: `Este ticket já está com <@${t.assumidoPor}>.`, flags: EPH, allowedMentions: { parse: [] } });
  }

  const liberando = t.assumidoPor === interaction.user.id;
  t.assumidoPor = liberando ? null : interaction.user.id;
  db.set(`ticket.abertos.${canal.id}`, t);

  await interaction.update({ embeds: [N.embedAbertura(t)], components: [N.botoesTicket(!!t.assumidoPor)] });
  await canal.send({
    content: liberando ? `🔓 ${interaction.user} liberou o ticket.` : `🙋 ${interaction.user} assumiu o ticket.`,
    allowedMentions: { parse: [] },
  });
  canal
    .setTopic(
      liberando
        ? `Ticket de ${t.userId}`
        : `Ticket de ${t.userId} • atendido por ${interaction.user.username}`
    )
    .catch(() => {});
}

// ---------- Fechar ----------

function podeFechar(member, t) {
  return N.ehStaff(member) || member.id === t.userId;
}

async function abrirModalFechar(interaction) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (!t) return interaction.reply({ content: 'Este canal não é um ticket aberto.', flags: EPH });
  if (!podeFechar(interaction.member, t)) {
    return interaction.reply({ content: 'Só quem abriu o ticket ou a staff pode fechar.', flags: EPH });
  }
  const modal = new ModalBuilder()
    .setCustomId('ticket:modalfechar')
    .setTitle('Fechar ticket')
    .addComponents(campo('motivo', 'Motivo (opcional)', TextInputStyle.Paragraph, 300, { obrigatorio: false }));
  return interaction.showModal(modal);
}

async function receberFechar(interaction) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (!t) return interaction.reply({ content: 'Este canal não é um ticket aberto.', flags: EPH });
  if (!podeFechar(interaction.member, t)) {
    return interaction.reply({ content: 'Só quem abriu o ticket ou a staff pode fechar.', flags: EPH });
  }
  const motivo = interaction.fields.getTextInputValue('motivo').trim();
  await interaction.reply('🔒 Fechando o ticket e gerando a transcrição...');
  return encerrar(interaction.guild, interaction.channel, interaction.user, motivo);
}

function formatarDuracao(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} min`;
}

// Gera a transcrição, manda para o log e para quem abriu, e apaga o canal
async function encerrar(guild, canal, executor, motivo) {
  const t = N.ticketDoCanal(canal.id);
  if (!t || fechando.has(canal.id)) return;
  fechando.add(canal.id);

  try {
    const mensagens = await N.buscarMensagens(canal, 2000);
    const abertoPor = await guild.client.users.fetch(t.userId).catch(() => null);
    const html = N.gerarHtml(
      t,
      {
        abertoPor: abertoPor ? abertoPor.username : t.userId,
        fechadoPor: executor.username,
        motivo,
        fechadoEm: Date.now(),
      },
      mensagens
    );
    const nomeArquivo = `ticket-${N.numeroFmt(t.numero)}.html`;
    const arquivo = () => new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: nomeArquivo });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`🔒 Ticket #${N.numeroFmt(t.numero)} fechado`)
      .addFields(
        { name: 'Categoria', value: `${t.tipoEmoji} ${t.tipoNome}`.trim(), inline: true },
        { name: 'Aberto por', value: `<@${t.userId}>`, inline: true },
        { name: 'Fechado por', value: `<@${executor.id}>`, inline: true },
        { name: 'Atendido por', value: t.assumidoPor ? `<@${t.assumidoPor}>` : 'ninguém assumiu', inline: true },
        { name: 'Duração', value: formatarDuracao(Date.now() - t.aberto), inline: true },
        { name: 'Mensagens', value: String(mensagens.length), inline: true },
        { name: 'Assunto', value: t.assunto.slice(0, 1024) },
        { name: 'Motivo do fechamento', value: (motivo || 'não informado').slice(0, 1024) }
      )
      .setTimestamp();

    const logId = N.cfg('logCanal');
    const log = logId && guild.channels.cache.get(logId);
    if (log) {
      await log
        .send({ embeds: [embed], files: [arquivo()], allowedMentions: { parse: [] } })
        .catch((e) => console.error('[Ticket] erro ao enviar log:', e.message));
    }

    if (abertoPor) {
      const embedDm = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle(`Seu ticket #${N.numeroFmt(t.numero)} foi fechado`)
        .setDescription(`Servidor: **${guild.name}**\nMotivo: ${motivo || 'não informado'}\n\nSegue a transcrição da conversa (abra o arquivo no navegador).`)
        .setTimestamp();
      await abertoPor.send({ embeds: [embedDm], files: [arquivo()] }).catch(() => {});
    }

    db.remover(`ticket.abertos.${canal.id}`);
    await canal.send('✅ Ticket fechado. Este canal será apagado em 5 segundos.').catch(() => {});
    setTimeout(
      () => canal.delete(`Ticket #${N.numeroFmt(t.numero)} fechado por ${executor.username}`).catch((e) => console.error('[Ticket]', e.message)),
      5000
    );
  } catch (erro) {
    console.error('[Ticket] erro ao fechar:', erro);
    fechando.delete(canal.id);
    await canal.send('⚠️ Deu erro ao fechar o ticket. Tente de novo ou chame a staff.').catch(() => {});
  }
}

// ---------- Ações da staff dentro do ticket ----------

async function adicionar(interaction, user) {
  await interaction.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });
  return interaction.reply({ content: `➕ ${user} foi adicionado(a) ao ticket.`, allowedMentions: { users: [user.id] } });
}

async function remover(interaction, user) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (user.id === t.userId) {
    return interaction.reply({ content: '❌ Não dá para remover quem abriu o ticket.', flags: EPH });
  }
  await interaction.channel.permissionOverwrites.delete(user.id);
  return interaction.reply({ content: `➖ ${user.username} foi removido(a) do ticket.`, allowedMentions: { parse: [] } });
}

async function renomear(interaction, nome) {
  const limpo = nome.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 90);
  if (!limpo) return interaction.reply({ content: '❌ Nome inválido.', flags: EPH });
  try {
    await interaction.channel.setName(limpo);
  } catch (erro) {
    return interaction.reply({ content: '⚠️ Não consegui renomear agora (o Discord limita a 2 trocas a cada 10 minutos).', flags: EPH });
  }
  return interaction.reply({ content: `✏️ Canal renomeado para **${limpo}**.` });
}

module.exports = {
  abrirModal,
  criarTicket,
  assumir,
  abrirModalFechar,
  receberFechar,
  encerrar,
  adicionar,
  remover,
  renomear,
};
