const { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const Ficha = require('../parceria/ficha');

module.exports = {
  global: true,
  data: new SlashCommandBuilder()
    .setName('parceriaficha')
    .setDescription('Preencha a ficha de parceria ou aliança')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),

  async execute(interaction, client) {
    await interaction.deferReply();
    const painel = await Ficha.painel(client, interaction.user.id);
    return interaction.editReply(painel);
  },
};
