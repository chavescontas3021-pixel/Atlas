const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../missoes/nucleo');
const { textoResgate } = require('../commands/missoes');

const EPH = MessageFlags.Ephemeral;

async function resgatar(interaction) {
  await interaction.deferUpdate();
  const r = await N.resgatar(interaction.client, interaction.user.id);
  if (r.erro) return interaction.followUp({ content: `❌ ${r.erro}`, flags: EPH });
  await interaction.editReply({ embeds: [N.embedMissoes(interaction.user.id)], components: [N.botoesMissoes(interaction.user.id)] });
  return interaction.followUp({ content: textoResgate(r), flags: EPH });
}

async function salvarMensagem(interaction) {
  if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
  }
  db.set('config.missoes.mensagens.conquista', {
    titulo: interaction.fields.getTextInputValue('titulo').trim(),
    texto: interaction.fields.getTextInputValue('texto').trim(),
  });
  return interaction.reply({ content: '✅ Texto atualizado!', flags: EPH });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isButton() && interaction.customId === 'missoes:resgatar') return await resgatar(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'missoes:modal:conquista') return await salvarMensagem(interaction);
    } catch (err) {
      console.error('[Missões]', err);
    }
  },
};
