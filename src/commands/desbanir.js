const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('desbanir')
    .setDescription('Desbane alguém pelo ID de usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName('id').setDescription('ID do usuário banido').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo (opcional)').setMaxLength(300)),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const id = interaction.options.getString('id').trim();
    const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';

    if (!/^\d{15,22}$/.test(id)) {
      return interaction.reply({ content: '❌ O ID precisa ser só números.', flags: EPH });
    }

    await interaction.deferReply({ flags: EPH });
    const r = await N.desbanir(interaction.guild, interaction.user, id, motivo);
    if (!r.ok) return interaction.editReply('❌ Não consegui desbanir. Confira se esse ID está mesmo banido.');
    return interaction.editReply(`✅ **${r.user.username}** foi desbanido(a).`);
  },
};
