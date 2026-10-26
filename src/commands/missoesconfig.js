const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../missoes/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('missoesconfig')
    .setDescription('Configura missões e conquistas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga a contagem de missões e conquistas')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar?').setRequired(true)))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal onde as conquistas são anunciadas (vazio = DM)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Edita o texto do anúncio de conquista')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const canal = N.cfg('canal');
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('📋 Missões do Atlas').addFields(
        { name: 'Contagem', value: N.ativo() ? '✅ ligada' : '⏸️ desligada', inline: true },
        { name: 'Anúncio de conquistas', value: canal ? `<#${canal}>` : 'por DM', inline: true },
        { name: 'Conquistas disponíveis', value: `${N.CONQUISTAS.length}`, inline: true },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ativar') {
      const on = interaction.options.getBoolean('ligado');
      db.set('config.missoes.ativo', on);
      return responder(interaction, on ? '✅ Missões e conquistas ligadas.' : '⏸️ Missões e conquistas pausadas (o progresso não conta).');
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      if (!canal) {
        db.remover('config.missoes.canal');
        return responder(interaction, '✅ As conquistas serão avisadas por DM.');
      }
      db.set('config.missoes.canal', canal.id);
      return responder(interaction, `✅ As conquistas serão anunciadas em ${canal}, marcando a pessoa.`);
    }

    if (sub === 'mensagem') {
      const m = N.mensagem('conquista');
      const modal = new ModalBuilder().setCustomId('missoes:modal:conquista').setTitle('Anúncio de conquista');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true).setValue(m.titulo.slice(0, 200))),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('texto').setLabel('Texto ({usuario} {emoji} {conquista} {desc} {stars})').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true).setValue(m.texto.slice(0, 2000))),
      );
      return interaction.showModal(modal);
    }
  },
};
