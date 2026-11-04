const { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const Ficha = require('../parceria/ficha');

module.exports = {
  global: true, // comando global: funciona em qualquer lugar (veja deploy-commands.js)
  data: new SlashCommandBuilder()
    .setName('parceriaficha')
    .setDescription('Preencha a ficha de parceria ou aliança')
    // Instalado no servidor OU na conta da pessoa (app de usuário)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    // Servidor, privado com o Atlas e qualquer DM/grupo
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),

  async execute(interaction, client) {
    await interaction.deferReply(); // mensagem pública, todos na conversa veem
    const painel = await Ficha.painel(client, interaction.user.id);
    return interaction.editReply(painel);
  },
};
