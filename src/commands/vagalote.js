const {
  ActionRowBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vagalote')
    .setDescription('Cria várias vagas de uma vez (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const modal = new ModalBuilder().setCustomId('vagas:modal:lote').setTitle('Criar várias vagas');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('grupo').setLabel('Grupo (opcional, ex: nome da obra)').setStyle(TextInputStyle.Short).setMaxLength(40).setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('lista').setLabel('Vagas (uma por linha)').setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  },
};
