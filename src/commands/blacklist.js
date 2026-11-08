const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const B = require('../blacklist/nucleo');

const EPH = MessageFlags.Ephemeral;
const SEM_PING = { parse: [] };
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: SEM_PING });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist de membros vigiados pelo Atlas (só ADM)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Coloca um membro na blacklist (o Atlas passa a vigiar tudo o que ele fizer)')
        .addUserOption((o) => o.setName('membro').setDescription('Quem vai ser vigiado').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Por que ele entrou na lista').setRequired(true).setMaxLength(300))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Tira um membro da blacklist')
        .addUserOption((o) => o.setName('membro').setDescription('Quem sai da lista').setRequired(true))
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra todos os membros da blacklist'))
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Mostra o que um membro da blacklist fez recentemente')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('Define o canal que recebe os alertas da blacklist')
        .addChannelOption((o) =>
          o.setName('canal').setDescription('Canal de alertas').setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('modo')
        .setDescription('Escolhe se o Atlas avisa só suspeitas ou absolutamente tudo')
        .addBooleanOption((o) =>
          o.setName('completo').setDescription('Sim = avisa tudo que ele fizer; Não = só o que for suspeito').setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;

    // Só ADM (ou o dono) pode mexer na blacklist
    const ehAdm =
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
      interaction.user.id === interaction.guild.ownerId;
    if (!ehAdm) return responder(interaction, '❌ Só administradores podem usar a blacklist.');

    const sub = interaction.options.getSubcommand();

    if (sub === 'adicionar') {
      const user = interaction.options.getUser('membro');
      const membro = interaction.options.getMember('membro');
      const motivo = interaction.options.getString('motivo');

      if (user.bot) return responder(interaction, '❌ Não dá para colocar bots na blacklist.');
      if (user.id === interaction.user.id) return responder(interaction, '❌ Você não pode se colocar na blacklist.');
      if (user.id === interaction.guild.ownerId) return responder(interaction, '❌ O dono do servidor não pode ir para a blacklist.');
      if (membro && membro.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
        return responder(interaction, '❌ Só o dono do servidor pode colocar outro administrador na blacklist.');
      }
      if (B.esta(user.id)) return responder(interaction, `ℹ️ ${user} já está na blacklist.`);

      B.adicionar(user.id, motivo, interaction.user.id);

      const emb = new EmbedBuilder()
        .setColor(B.COR.alerta)
        .setTitle('🕵️ Membro adicionado à blacklist')
        .addFields(
          { name: 'Membro', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
          { name: 'Por', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Motivo', value: motivo.slice(0, 1024) }
        )
        .setTimestamp();
      await B.enviarCanal(interaction.guild, emb);

      let texto = `✅ ${user} entrou na blacklist. A partir de agora o Atlas vigia tudo o que ele fizer.`;
      if (!B.canalId()) texto += '\n⚠️ Ainda não há canal de alertas. Use `/blacklist canal` para eu saber onde avisar.';
      return responder(interaction, texto);
    }

    if (sub === 'remover') {
      const user = interaction.options.getUser('membro');
      if (!B.esta(user.id)) return responder(interaction, `ℹ️ ${user} não está na blacklist.`);
      B.remover(user.id);

      const emb = new EmbedBuilder()
        .setColor(B.COR.ok)
        .setTitle('✅ Membro removido da blacklist')
        .addFields(
          { name: 'Membro', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
          { name: 'Por', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
      await B.enviarCanal(interaction.guild, emb);
      return responder(interaction, `✅ ${user} saiu da blacklist e o histórico dele foi apagado.`);
    }

    if (sub === 'listar') {
      const todos = B.lista();
      if (!todos.length) return responder(interaction, 'ℹ️ A blacklist está vazia.');
      const linhas = todos.map(
        (d, i) => `**${i + 1}.** <@${d.id}> — ${d.motivo}\n↳ por <@${d.por}> em <t:${Math.floor(d.data / 1000)}:d>`
      );
      const canal = B.canalId();
      const emb = new EmbedBuilder()
        .setColor(B.COR.alerta)
        .setTitle(`🕵️ Blacklist (${todos.length})`)
        .setDescription(linhas.join('\n\n').slice(0, 4000))
        .addFields(
          { name: 'Canal de alertas', value: canal ? `<#${canal}>` : '*não definido*', inline: true },
          { name: 'Modo', value: B.modoCompleto() ? 'Completo (avisa tudo)' : 'Só suspeitas', inline: true }
        );
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'ver') {
      const user = interaction.options.getUser('membro');
      const dados = B.get(user.id);
      if (!dados) return responder(interaction, `ℹ️ ${user} não está na blacklist.`);

      const hist = B.historico(user.id).slice(-15).reverse();
      const linhas = hist.length
        ? hist.map((h) => `${h.s ? '🚨' : '•'} <t:${Math.floor(h.t / 1000)}:R> ${h.texto}`).join('\n')
        : 'Nada registrado ainda.';
      const emb = new EmbedBuilder()
        .setColor(B.COR.alerta)
        .setTitle(`🕵️ ${user.username} na blacklist`)
        .setDescription(`**Motivo:** ${dados.motivo}\n**Por:** <@${dados.por}> em <t:${Math.floor(dados.data / 1000)}:d>`)
        .addFields({ name: 'Últimas atividades', value: linhas.slice(0, 1020) });
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      require('../db').set('config.blacklist.canal', canal.id);
      return responder(interaction, `✅ Os alertas da blacklist agora vão para ${canal}.`);
    }

    if (sub === 'modo') {
      const completo = interaction.options.getBoolean('completo');
      require('../db').set('config.blacklist.completo', completo);
      return responder(
        interaction,
        completo
          ? '✅ Modo **completo**: o Atlas avisa tudo o que os membros da blacklist fizerem.'
          : '✅ Modo **só suspeitas**: o Atlas avisa apenas o que parecer suspeito (todo o resto fica no histórico, veja com `/blacklist ver`).'
      );
    }
  },
};
