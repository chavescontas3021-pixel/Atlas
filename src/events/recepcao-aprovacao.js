const { MessageFlags } = require('discord.js');
const A = require('../recepcao/aprovacao');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('recaprov:')) {
        return await A.decidir(interaction);
      }
    } catch (erro) {
      console.error('[Recepção] aprovação:', erro);
      const msg = { content: 'Ops, deu erro ao decidir esse pedido.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
