const { MessageFlags } = require('discord.js');
const L = require('../ajuda/lista');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('cmds:')) return;
      const [, tipo, pag] = interaction.customId.split(':');
      if (!L.TITULOS[tipo]) return;
      await interaction.update(L.montar(client, tipo, parseInt(pag, 10) || 0));
    } catch (e) {
      console.error('[Comandos]', e);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'Deu erro ao mostrar a lista.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
