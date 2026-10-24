const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../moderacao/nucleo');

const TIPOS = ['dmAviso', 'dmBan', 'dmExpulsao'];

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // Lista de regras ao digitar /aviso dar
      if (interaction.isAutocomplete() && interaction.commandName === 'aviso') {
        const foco = String(interaction.options.getFocused()).toLowerCase();
        const opcoes = N.regras()
          .map((texto, i) => ({ name: `${i + 1}. ${texto}`.slice(0, 100), value: i + 1 }))
          .filter((o) => o.name.toLowerCase().includes(foco))
          .slice(0, 25);
        return await interaction.respond(opcoes);
      }

      // Janela de edição das mensagens de DM
      if (interaction.isModalSubmit() && interaction.customId.startsWith('moderacao:modal:')) {
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
          return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: MessageFlags.Ephemeral });
        }
        const tipo = interaction.customId.split(':')[2];
        if (!TIPOS.includes(tipo)) return;

        const titulo = interaction.fields.getTextInputValue('titulo');
        const texto = interaction.fields.getTextInputValue('texto');
        db.set(`config.moderacao.mensagens.${tipo}`, { titulo, texto });

        return await interaction.reply({
          content: '✅ Mensagem salva! Você pode usar {servidor}, {motivo}, {regra}, {avisos} e {limite}.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (erro) {
      console.error('[Moderação] erro na interação:', erro);
    }
  },
};
