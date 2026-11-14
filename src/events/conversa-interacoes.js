// Botões de atalho que aparecem nas respostas do Atlas (Ajuda · Loja · Missões).
const B = require('../blacklist/nucleo');
const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('conversa:')) return;

      // Quem está na blacklist não usa nada do Atlas
      if (B.esta(interaction.user.id)) return await interaction.deferUpdate();

      const acao = interaction.customId.split(':')[1];

      if (acao === 'ajuda') {
        const L = require('../ajuda/lista');
        return await interaction.reply({ ...L.montar(client, 'inicio', 0), flags: UI.EPH });
      }

      if (acao === 'loja') {
        const N = require('../loja/nucleo');
        const tela = N.telaLoja ? N.telaLoja() : { embeds: [N.embedLoja()], components: [] };
        return await interaction.reply({ ...tela, flags: UI.EPH });
      }

      if (acao === 'missoes') {
        const R = require('../rpg/nucleo');
        const M = require('../missoes/nucleo');
        if (!R.obter(interaction.user.id)) {
          return await interaction.reply(UI.erro('As missões usam o RPG da house. Crie seu personagem com `/rpg criar` primeiro.'));
        }
        return await interaction.reply({
          embeds: [M.embedMissoes(interaction.user.id)],
          components: [M.botoesMissoes(interaction.user.id)],
          flags: UI.EPH,
        });
      }
    } catch (erro) {
      console.error('[Conversa] botão:', erro);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply(UI.erro('Não consegui abrir isso agora.')).catch(() => {});
      }
    }
  },
};
