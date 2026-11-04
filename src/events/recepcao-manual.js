const { MessageFlags } = require('discord.js');
const M = require('../recepcao/manual');

const EPH = MessageFlags.Ephemeral;

// Botões e formulário da verificação manual (prefixo "recmanual:")
module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const ehNosso =
      (interaction.isButton() || interaction.isModalSubmit()) &&
      typeof interaction.customId === 'string' &&
      interaction.customId.startsWith('recmanual:');
    if (!ehNosso) return;
    try {
      await M.tratar(interaction);
    } catch (erro) {
      console.error('[Recepção] verificação manual:', erro);
      const msg = { content: 'Ops, deu erro na verificação manual. Tente de novo ou use os botões do canal.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
