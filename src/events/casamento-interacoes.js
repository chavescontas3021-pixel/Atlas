const Cer = require('../casamento/cerimonia');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = interaction.customId;
    if (!id || !id.startsWith('cas:')) return;
    const [, acao, canalId, passoId] = id.split(':');
    try {
      if (interaction.isButton()) {
        if (acao === 'sim') return await Cer.botaoSim(client, interaction, canalId, passoId);
        if (acao === 'nao') return await Cer.botaoNao(client, interaction, canalId, passoId);
        if (acao === 'voto') return await Cer.botaoVoto(interaction, canalId);
        if (acao === 'obj') return await Cer.botaoObjecao(interaction, canalId);
        return;
      }
      if (interaction.isModalSubmit() && acao === 'votomodal') return await Cer.enviarVoto(client, interaction, canalId);
    } catch (erro) {
      console.error('[Casamento] erro na interação:', erro);
      const msg = { content: 'Ops, deu erro nessa etapa. Chame a staff.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
