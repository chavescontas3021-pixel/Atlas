const { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } = require('discord.js');
const F = require('../formularios/fluxo');
const { AREAS } = require('../formularios/modelos');

module.exports = {
  global: true,
  data: new SlashCommandBuilder()
    .setName('formulario')
    .setDescription('Receba o formulário para entrar em uma área da staff')
    .addStringOption((o) =>
      o
        .setName('tipo')
        .setDescription('A área da staff')
        .setRequired(true)
        .addChoices(...Object.entries(AREAS).map(([value, area]) => ({ name: area.nome, value })))
    )
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction) {
    return F.comando(interaction);
  },
};
