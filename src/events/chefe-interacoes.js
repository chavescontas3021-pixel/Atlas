const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../chefe/nucleo');
const { textoAtaque } = require('../commands/chefe');

const EPH = MessageFlags.Ephemeral;

async function atacar(interaction, forte) {
  await interaction.deferReply({ flags: EPH });
  const r = await N.atacar(interaction.client, interaction.user.id, forte);
  return interaction.editReply(r.erro ? `❌ ${r.erro}` : textoAtaque(r));
}

async function placar(interaction) {
  const a = N.ativo();
  if (!a) return interaction.reply({ content: 'Não há chefe ativo.', flags: EPH });
  return interaction.reply({
    embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle(`📊 Dano em ${a.nome}`).setDescription(N.textoPlacar(a))],
    flags: EPH,
    allowedMentions: { parse: [] },
  });
}

async function salvarMensagem(interaction) {
  if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
  }
  const tipo = interaction.customId.split(':')[2];
  if (!N.PADROES.mensagens[tipo]) return interaction.reply({ content: '❌ Texto desconhecido.', flags: EPH });
  db.set(`config.chefe.mensagens.${tipo}`, {
    titulo: interaction.fields.getTextInputValue('titulo').trim(),
    texto: interaction.fields.getTextInputValue('texto').trim(),
  });
  return interaction.reply({ content: '✅ Texto atualizado! Vale para os próximos chefes.', flags: EPH });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'chefe:atacar') return await atacar(interaction, false);
        if (interaction.customId === 'chefe:forte') return await atacar(interaction, true);
        if (interaction.customId === 'chefe:placar') return await placar(interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('chefe:modal:')) return await salvarMensagem(interaction);
    } catch (err) {
      console.error('[Chefe]', err);
    }
  },
};
