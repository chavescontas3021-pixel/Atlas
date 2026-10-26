const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const L = require('../ajuda/lista');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Lista todos os comandos do Atlas e o que cada um faz')
    .addStringOption((o) => o.setName('tipo').setDescription('Qual lista ver (padrão: membros)').addChoices(
      { name: 'Membros', value: 'membros' },
      { name: 'Moderação (staff)', value: 'moderacao' },
      { name: 'Configuração e eventos (staff)', value: 'configuracao' },
    )),

  async execute(interaction, client) {
    const tipo = interaction.options.getString('tipo') || 'membros';
    return interaction.reply({ ...L.montar(client || interaction.client, tipo, 0), flags: MessageFlags.Ephemeral });
  },
};
