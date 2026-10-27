const A = require('../prefixo/adaptador');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('pfx:modal:')) {
        await A.abrirModal(interaction);
      }
    } catch (e) {
      console.error('[Prefixo]', e);
    }
  },
};
