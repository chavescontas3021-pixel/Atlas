const { SlashCommandBuilder } = require('discord.js');
const L = require('../ajuda/lista');
const { EPH } = require('../ui/componentes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comandos')
    .setDescription('Central de ajuda: tudo que o Atlas faz')
    .addStringOption((o) => o.setName('tipo').setDescription('Ir direto para uma categoria').addChoices(
      { name: 'Membros', value: 'membros' },
      { name: 'Moderação (staff)', value: 'moderacao' },
      { name: 'Configuração e eventos (staff)', value: 'configuracao' },
    )),

  async execute(interaction, client) {
    const tipo = interaction.options.getString('tipo') || 'inicio';
    return interaction.reply({ ...L.montar(client || interaction.client, tipo, 0), flags: EPH });
  },
};
