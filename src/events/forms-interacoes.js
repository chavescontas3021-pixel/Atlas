// Botões, menus e janelas do formulário de servidor: fs: (cliente) e fsd: (dono)
module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = typeof interaction.customId === 'string' ? interaction.customId : '';
    const cli = id.startsWith('fs:'), dono = id.startsWith('fsd:');
    if (!cli && !dono) return;
    if (!(interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu())) return;
    try {
      if (dono) return await require('../formsrv/dono').tratar(interaction, client);
      return await require('../formsrv/fluxo').tratar(interaction, client);
    } catch (e) {
      console.error('[Forms]', e);
      const msg = { content: 'Algo deu errado. Tente de novo em instantes.' };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
