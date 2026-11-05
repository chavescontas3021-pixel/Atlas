const { MessageFlags } = require('discord.js');
const F = require('../formularios/fluxo');

const EPH = MessageFlags.Ephemeral;

// Botões e janelas dos formulários:
//   form:...     -> quem está respondendo (funciona no privado com o Atlas)
//   formadm:...  -> staff vendo os formulários entregues
module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = typeof interaction.customId === 'string' ? interaction.customId : '';
    const ehForm = id.startsWith('form:');
    const ehAdm = id.startsWith('formadm:');
    if (!ehForm && !ehAdm) return;
    if (!(interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu())) return;

    try {
      if (ehAdm) return await F.painelStaff(interaction);

      const [, acao, tipo, n] = id.split(':');
      if (acao === 'ini' && interaction.isButton()) return await F.iniciar(interaction, tipo);
      if (acao === 'pag' && interaction.isButton()) return await F.continuar(interaction, tipo, Number(n));
      if (acao === 'modal' && interaction.isModalSubmit()) return await F.receberParte(interaction, tipo, Number(n));
    } catch (erro) {
      console.error('[Formulários]', erro);
      const msg = {
        content: 'Ocorreu um erro ao processar o formulário. Tente novamente ou fale com a equipe.',
        ...(interaction.inGuild() ? { flags: EPH } : {}),
      };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
