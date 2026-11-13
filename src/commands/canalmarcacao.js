const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const N = require('../canalmarcacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canalmarcacao')
    .setDescription('Canais onde só vale mensagem com marcação de canal (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Ativa a regra em um canal')
        .addChannelOption((o) =>
          o.setName('canal').setDescription('Canal').setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Desativa a regra em um canal')
        .addChannelOption((o) =>
          o.setName('canal').setDescription('Canal').setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra os canais com a regra ativa')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'listar') {
      const lista = N.canais();
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle('📌 Canais com marcação obrigatória')
        .setDescription(lista.length ? lista.map((id) => `<#${id}>`).join('\n') : 'Nenhum canal configurado.');
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    const canal = interaction.options.getChannel('canal');

    if (sub === 'adicionar') {
      const novo = N.adicionar(canal.id);
      return responder(
        interaction,
        novo
          ? `✅ Em ${canal}, mensagens **sem marcação de canal** serão apagadas (a staff é ignorada).`
          : `⚠️ ${canal} já estava com essa regra.`
      );
    }

    if (sub === 'remover') {
      const tirou = N.remover(canal.id);
      return responder(interaction, tirou ? `✅ Regra desativada em ${canal}.` : `⚠️ ${canal} não estava com essa regra.`);
    }
  },
};
