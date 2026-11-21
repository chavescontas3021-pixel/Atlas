const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    // Modo administrativo: com ele desligado, só os comandos de construção (e os pessoais, do dono) funcionam.
    try {
      const recusa = await require('../modo/nucleo').checar(client, interaction);
      if (recusa) return await interaction.reply({ ...UI.aviso(recusa), flags: UI.EPH }).catch(() => {});
    } catch (e) { console.error('[Modo] checagem:', e); }

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
