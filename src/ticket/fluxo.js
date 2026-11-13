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
const UI = require('../ui/componentes');
const T = require('../ui/tema');

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
    return interaction.reply(UI.erro('Essa categoria não existe mais. Peça para a staff repostar o painel.'));
  }
  limparFantasmas(interaction.guild, interaction.user.id);
  const abertos = N.ticketsDoUsuario(interaction.user.id);
  if (abertos.length >= N.limite()) {
    return interaction.reply(UI.erro(`Você já tem ${abertos.length} ticket(s) aberto(s): ${abertos.map((t) => `<#${t.canalId}>`).join(' ')}`));
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

async function criarCanal(guild, member, numero, painel) {
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const P = PermissionFlagsBits;
  const basico = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];

  const permissoes = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: member.id, allow: basico },
    { id: eu.id, allow: [...basico, P.ManageChannels, P.ManageMessages] },
  ];
  const jaTem = new Set(permissoes.map((p) => p.id));
  for (const id of N.staffRoles(guild, painel)) {
    permissoes.push({ id, allow: [...basico, P.ManageMessages] });
    jaTem.add(id);
  }

  // Cargos com Administrador/Gerenciar Servidor e o dono recebem acesso EXPLÍCITO ao canal.
  // Sem isso, com "Mostrar todos os canais" desligado, o ticket some da barra lateral deles
  // assim que saem do canal (Administrador não conta como acesso explícito).
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.roles.everyone.id || jaTem.has(role.id)) continue;
    if (role.permissions.has(P.Administrator) || role.permissions.has(P.ManageGuild)) {
      permissoes.push({ id: role.id, allow: [...basico, P.ManageMessages] });
      jaTem.add(role.id);
    }
  }
  if (guild.ownerId && !jaTem.has(guild.ownerId)) {
    permissoes.push({ id: guild.ownerId, allow: [...basico, P.ManageMessages] });
    jaTem.add(guild.ownerId);
  }

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
  const categoria = N.cfgPainel(painel, 'categoria');
  if (categoria && guild.channels.cache.has(categoria)) opcoes.parent = categoria;
  return guild.channels.create(opcoes);
}

async function criarTicket(interaction, tipoId) {
  await interaction.deferReply({ flags: EPH });

  const guild = interaction.guild;
  const member = interaction.member;
  const tipo = N.acharTipo(tipoId);
  if (!tipo) return interaction.editReply(UI.edicao(UI.erro('Essa categoria não existe mais. Peça para a staff repostar o painel.')));

  limparFantasmas(guild, member.id);
  if (N.ticketsDoUsuario(member.id).length >= N.limite()) {
    return interaction.editReply(UI.edicao(UI.erro('Você já atingiu o limite de tickets abertos.')));
  }

  const assunto = interaction.fields.getTextInputValue('assunto').trim();
  const descricao = interaction.fields.getTextInputValue('descricao').trim();
  const numero = N.proximoNumero();
  const painel = N.painelDoTipo(tipo.id);

  let canal;
  try {
    canal = await criarCanal(guild, member, numero, painel);
  } catch (erro) {
    console.error('[Ticket] erro ao criar canal:', erro);
    return interaction.editReply(UI.edicao(UI.erro('Não consegui criar o canal. Avise a staff (o limite de canais da categoria pode ter acabado).')));
  }

  const ticket = {
    numero,
    userId: member.id,
    canalId: canal.id,
    tipoId: tipo.id,
    painelId: painel ? painel.id : null,
    tipoNome: tipo.nome,
    tipoEmoji: tipo.emoji || '',
    assunto,
    descricao,
    aberto: Date.now(),
    assumidoPor: null,
    msgId: null,
  };
  db.set(`ticket.abertos.${canal.id}`, ticket);

  const staff = N.staffRoles(guild, painel);
  const pings = N.cfgPainel(painel, 'pingStaff', true) ? staff : [];
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

  return interaction.editReply(UI.edicao(UI.ok(`Ticket aberto: ${canal}`)));
}

// ---------- Assumir ----------

async function assumir(interaction) {
  const canal = interaction.channel;
  const t = N.ticketDoCanal(canal.id);
  if (!t) return interaction.reply(UI.auto('Este canal não é um ticket aberto.'));
  if (!N.ehStaff(interaction.member, t)) {
    return interaction.reply(UI.auto('Só a staff pode assumir tickets.'));
  }
  if (t.assumidoPor && t.assumidoPor !== interaction.user.id) {
    return interaction.reply({ ...UI.auto(`Este ticket já está com <@${t.assumidoPor}>.`), allowedMentions: { parse: [] } });
  }

  const liberando = t.assumidoPor === interaction.user.id;
  t.assumidoPor = liberando ? null : interaction.user.id;
  db.set(`ticket.abertos.${canal.id}`, t);

  // Garante que o canal continue aparecendo na lista de quem assumiu, mesmo depois de sair dele
  if (!liberando) {
    await canal.permissionOverwrites
      .edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      })
      .catch((e) => console.error('[Ticket] erro ao dar acesso a quem assumiu:', e.message));
  }

  await interaction.update({ embeds: [N.embedAbertura(t)], components: [N.botoesTicket(!!t.assumidoPor)] });
  await canal.send({
    content: liberando ? `${T.S.vazio}  ${interaction.user} liberou o ticket.` : `${T.S.ponto}  ${interaction.user} assumiu o ticket.`,
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
  return N.ehStaff(member, t);
}

async function abrirModalFechar(interaction) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (!t) return interaction.reply(UI.auto('Este canal não é um ticket aberto.'));
  if (!podeFechar(interaction.member, t)) {
    return interaction.reply(UI.auto('Só a staff pode fechar tickets.'));
  }
  const modal = new ModalBuilder()
    .setCustomId('ticket:modalfechar')
    .setTitle('Fechar ticket')
    .addComponents(campo('motivo', 'Motivo (opcional)', TextInputStyle.Paragraph, 300, { obrigatorio: false }));
  return interaction.showModal(modal);
}

async function receberFechar(interaction) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (!t) return interaction.reply(UI.auto('Este canal não é um ticket aberto.'));
  if (!podeFechar(interaction.member, t)) {
    return interaction.reply(UI.auto('Só a staff pode fechar tickets.'));
  }
  const motivo = interaction.fields.getTextInputValue('motivo').trim();
  await interaction.reply(UI.nota('Fechando o ticket e gerando a transcrição…', 'aviso', { publica: true }));
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

    const embed = UI.painel({
      trilha: ['Ticket', `#${N.numeroFmt(t.numero)}`, 'Fechado'],
      titulo: t.assunto,
      campos: [
        { nome: 'Categoria', valor: t.tipoNome, lado: true },
        { nome: 'Aberto por', valor: `<@${t.userId}>`, lado: true },
        { nome: 'Fechado por', valor: `<@${executor.id}>`, lado: true },
        { nome: 'Atendido por', valor: t.assumidoPor ? `<@${t.assumidoPor}>` : 'ninguém assumiu', lado: true },
        { nome: 'Duração', valor: formatarDuracao(Date.now() - t.aberto), lado: true },
        { nome: 'Mensagens', valor: String(mensagens.length), lado: true },
        { nome: 'Motivo do fechamento', valor: (motivo || 'não informado').slice(0, 1024) },
      ],
    }).setTimestamp();

    const logId = N.cfgPainel(N.painelDoTicket(t), 'logCanal');
    const log = logId && guild.channels.cache.get(logId);
    if (log) {
      await log
        .send({ embeds: [embed], files: [arquivo()], allowedMentions: { parse: [] } })
        .catch((e) => console.error('[Ticket] erro ao enviar log:', e.message));
    }

    if (abertoPor) {
      const embedDm = UI.painel({
        trilha: [guild.name, 'Ticket'],
        titulo: `Seu ticket #${N.numeroFmt(t.numero)} foi fechado`,
        descricao: `Motivo: ${motivo || 'não informado'}\n\nSegue a transcrição da conversa. Abra o arquivo no navegador.`,
      }).setTimestamp();
      await abertoPor.send({ embeds: [embedDm], files: [arquivo()] }).catch(() => {});
    }

    db.remover(`ticket.abertos.${canal.id}`);
    await canal.send(UI.nota('Ticket fechado. Este canal será apagado em 5 segundos.', 'ok', { publica: true })).catch(() => {});
    setTimeout(
      () => canal.delete(`Ticket #${N.numeroFmt(t.numero)} fechado por ${executor.username}`).catch((e) => console.error('[Ticket]', e.message)),
      5000
    );
  } catch (erro) {
    console.error('[Ticket] erro ao fechar:', erro);
    fechando.delete(canal.id);
    await canal.send(UI.nota('Deu erro ao fechar o ticket. Tente de novo ou chame a staff.', 'erro', { publica: true })).catch(() => {});
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
  return interaction.reply({ ...UI.ok(`${user} foi adicionado(a) ao ticket.`, { publica: true }), allowedMentions: { users: [user.id] } });
}

async function remover(interaction, user) {
  const t = N.ticketDoCanal(interaction.channel.id);
  if (user.id === t.userId) {
    return interaction.reply(UI.auto('❌ Não dá para remover quem abriu o ticket.'));
  }
  await interaction.channel.permissionOverwrites.delete(user.id);
  return interaction.reply({ ...UI.ok(`${user.username} foi removido(a) do ticket.`, { publica: true }), allowedMentions: { parse: [] } });
}

async function renomear(interaction, nome) {
  const limpo = nome.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 90);
  if (!limpo) return interaction.reply(UI.auto('❌ Nome inválido.'));
  try {
    await interaction.channel.setName(limpo);
  } catch (erro) {
    return interaction.reply(UI.auto('⚠️ Não consegui renomear agora (o Discord limita a 2 trocas a cada 10 minutos).'));
  }
  return interaction.reply(UI.ok(`Canal renomeado para **${limpo}**.`, { publica: true }));
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
