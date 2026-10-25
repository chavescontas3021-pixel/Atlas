const {
  ActionRowBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../inatividade/nucleo');

const EPH = MessageFlags.Ephemeral;
const ehStaff = (i) => !!(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.ManageGuild));

function abrirFormulario(interaction) {
  const modal = new ModalBuilder().setCustomId('inativ:modal:justificar').setTitle('Justificar inatividade');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('tempo').setLabel('Por quanto tempo? (ex: 7 dias, 2 semanas)').setStyle(TextInputStyle.Short).setMaxLength(20).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setMaxLength(300).setRequired(true),
    ),
  );
  return interaction.showModal(modal);
}

async function enviarJustificativa(interaction) {
  await interaction.deferReply({ flags: EPH });
  const tempo = interaction.fields.getTextInputValue('tempo');
  const motivo = interaction.fields.getTextInputValue('motivo');
  const r = await N.justificar(interaction.guild, interaction.user, tempo, motivo);
  if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
  return interaction.editReply(`✅ Justificativa registrada! Sua vaga fica guardada até <t:${Math.floor(r.j.fim / 1000)}:D>.`);
}

async function salvarMensagem(interaction) {
  if (!ehStaff(interaction)) return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
  const tipo = interaction.customId.split(':')[3];
  if (!N.PADROES.mensagens[tipo]) return interaction.reply({ content: '❌ Texto desconhecido.', flags: EPH });
  db.set(`config.inatividade.mensagens.${tipo}`, {
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
      if (interaction.isButton() && interaction.customId === 'inativ:abrir') return await abrirFormulario(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'inativ:modal:justificar') return await enviarJustificativa(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('inativ:modal:msg:')) return await salvarMensagem(interaction);
    } catch (err) {
      console.error('[Inatividade]', err);
      try {
        if (interaction.isRepliable && interaction.isRepliable()) {
          const msg = 'Deu erro na inatividade. Tente de novo.';
          if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
          else await interaction.reply({ content: msg, flags: EPH });
        }
      } catch { /* ignora */ }
    }
  },
};
