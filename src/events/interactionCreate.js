const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const comando = client.commands.get(interaction.commandName);
    if (!comando) return;

    try {
      await comando.execute(interaction, client);
    } catch (erro) {
      console.error(`[ERRO no comando ${interaction.commandName}]`, erro);
      const msg = UI.erro('Algo deu errado ao executar esse comando. Tente de novo em instantes.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
