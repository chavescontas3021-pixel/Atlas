const { MessageFlags } = require('discord.js');
const Limpeza = require('../recepcao/limpeza');
const F = require('../recepcao/fluxo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
      const [prefixo, acao, userId] = interaction.customId.split(':');

      // Clique do próprio membro na recepção = atividade
      if (prefixo === 'recepcao') {
        if (interaction.user.id === userId) await Limpeza.registrarAtividade(client, userId);
        return;
      }

      // Botões do aviso da staff
      if (prefixo !== 'reclimp' || !interaction.isButton()) return;
      if (!F.ehStaffRecepcao(interaction)) {
        return interaction.reply({ content: '❌ Só a staff pode usar isso.', flags: EPH });
      }
      await interaction.deferUpdate();
      if (acao === 'tempo') {
        const ok = await Limpeza.darMaisTempo(client, userId, interaction.user.id);
        if (!ok) await interaction.followUp({ content: 'Essa recepção já foi encerrada.', flags: EPH });
      } else if (acao === 'apagar') {
        await Limpeza.apagarAgora(client, userId, interaction.user.id);
      }
    } catch (erro) {
      console.error('[Limpeza] erro na interação:', erro);
    }
  },
};
