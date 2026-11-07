const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../noturno/nucleo');

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

      const texto = interaction.fields.getTextInputValue('texto');
      // Mantém o que já existe (ex.: o banner) e troca só o que foi editado
      const atual = db.get(`config.noturno.mensagens.${tipo}`) || {};
      const novo = { ...atual, texto };
      if (!N.ehSoTexto(tipo)) novo.titulo = interaction.fields.getTextInputValue('titulo');
      db.set(`config.noturno.mensagens.${tipo}`, novo);

      await interaction.reply({
        content: '✅ Mensagem salva! No texto você pode usar {minutos}, {fechar} e {abrir}.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (erro) {
      console.error('[Noturno] erro ao salvar mensagem:', erro);
    }
  },
};
