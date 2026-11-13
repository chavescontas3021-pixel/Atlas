const L = require('../ajuda/lista');
const UI = require('../ui/componentes');

// Trata o menu de categorias (cmds:menu) e a paginação (cmds:<tipo>:<pagina>) da central de ajuda.
module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      const id = interaction.customId;
      if (!id || !id.startsWith('cmds:')) return;

      if (interaction.isStringSelectMenu() && id === 'cmds:menu') {
        return await interaction.update(L.montar(client, interaction.values[0], 0));
      }

      if (interaction.isButton()) {
        const [, tipo, pag] = id.split(':');
        if (!L.TITULOS[tipo] || pag === 'atual') return await interaction.deferUpdate();
        return await interaction.update(L.montar(client, tipo, parseInt(pag, 10) || 0));
      }
    } catch (e) {
      console.error('[Comandos]', e);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply(UI.erro('Não consegui abrir essa lista agora.')).catch(() => {});
      }
    }
  },
};
