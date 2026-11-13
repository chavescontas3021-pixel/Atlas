const { PermissionFlagsBits } = require('discord.js');
const Enquete = require('../enquete/nucleo');
const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('enq:')) return;
      const acao = interaction.customId.split(':')[1];
      const msgId = interaction.message.id;

      if (acao === 'fim') {
        const e = Enquete.buscar(msgId);
        if (!e) return await interaction.reply(UI.erro('Essa enquete não existe mais.'));
        const podeEncerrar = e.autorId === interaction.user.id
          || interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
        if (!podeEncerrar) {
          return await interaction.reply(UI.erro('Só quem criou a enquete (ou a staff) pode encerrar.'));
        }
        return await interaction.update(Enquete.montar(Enquete.encerrar(msgId)));
      }

      const e = Enquete.votar(msgId, interaction.user.id, parseInt(acao, 10));
      if (!e) return await interaction.reply(UI.erro('Essa enquete já foi encerrada.'));
      await interaction.update(Enquete.montar(e));
    } catch (erro) {
      console.error('[Enquete]', erro);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply(UI.erro('Não consegui registrar seu voto.')).catch(() => {});
      }
    }
  },
};
