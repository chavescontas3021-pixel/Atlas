const { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const F = require('../formularios/fluxo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('formularios')
    .setDescription('Formulários de staff (equipe)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) => s.setName('entregues').setDescription('Veja os formulários entregues e aprove ou reprove')),

  async execute(interaction) {
    return F.comandoEntregues(interaction);
  },
};
