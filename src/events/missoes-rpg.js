const N = require('../missoes/nucleo');

// Depois de qualquer ação do /rpg (comando ou botão), confere o que mudou no personagem
module.exports = {
  name: 'interactionCreate',
  once: false,
  execute(client, interaction) {
    const ehRpg = (interaction.isChatInputCommand && interaction.isChatInputCommand() && interaction.commandName === 'rpg')
      || (interaction.isButton && interaction.isButton() && String(interaction.customId).startsWith('rpg:'));
    if (!ehRpg) return;
    N.observarRpg(client, interaction.user.id);
  },
};
