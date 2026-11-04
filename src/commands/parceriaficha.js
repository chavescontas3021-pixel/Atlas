const { ApplicationIntegrationType, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const Ficha = require('../parceria/ficha');

module.exports = {
  global: true, // registrado como comando global para funcionar também no privado (veja deploy-commands.js)
  data: new SlashCommandBuilder()
    .setName('parceriaficha')
    .setDescription('Preencha a ficha de parceria ou aliança')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),

  async execute(interaction, client) {
    await interaction.deferReply(interaction.inGuild() ? { flags: MessageFlags.Ephemeral } : {});
    const painel = await Ficha.painel(client, interaction.user.id);
    return interaction.editReply(painel);
  },
};
