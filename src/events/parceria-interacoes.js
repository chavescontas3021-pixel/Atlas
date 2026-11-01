const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../parceria/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith('parceria:modal:')) return;
    try {
      if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
      }
      const tipo = interaction.customId.split(':')[2];
      if (!N.TIPOS[tipo]) return;

      const titulo = interaction.fields.getTextInputValue('titulo').trim();
      const texto = interaction.fields.getTextInputValue('texto').trim();
      db.set(`config.parceria.${tipo}.titulo`, titulo);
      db.set(`config.parceria.${tipo}.texto`, texto);

      await interaction.reply({
        content: `✅ Mensagem salva! Variáveis: ${N.VARIAVEIS}. Use \`/parceria testar\` para ver a prévia.`,
        flags: EPH,
      });
    } catch (erro) {
      console.error('[Parceria] erro no formulário:', erro);
      const msg = { content: 'Ops, deu erro ao salvar.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
