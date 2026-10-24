const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const TIPOS = ['avisoFechar', 'fechou', 'avisoAbrir', 'abriu'];

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith('noturno:modal:')) return;

    try {
      if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: MessageFlags.Ephemeral });
      }
      const tipo = interaction.customId.split(':')[2];
      if (!TIPOS.includes(tipo)) return;

      const titulo = interaction.fields.getTextInputValue('titulo');
      const texto = interaction.fields.getTextInputValue('texto');
      db.set(`config.noturno.mensagens.${tipo}`, { titulo, texto });

      await interaction.reply({
        content: '✅ Mensagem salva! No texto você pode usar {minutos}, {fechar} e {abrir}.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (erro) {
      console.error('[Noturno] erro ao salvar mensagem:', erro);
    }
  },
};
