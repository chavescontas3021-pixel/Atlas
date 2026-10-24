const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('expulsar')
    .setDescription('Expulsa um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('membro').setDescription('Quem expulsar').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true).setMaxLength(300)),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const membro = interaction.options.getMember('membro');
    const motivo = interaction.options.getString('motivo');

    if (!membro) return interaction.reply({ content: '❌ Esse membro não está no servidor.', flags: EPH });
    const erro = N.checarHierarquia(interaction.member, membro);
    if (erro) return interaction.reply({ content: `❌ ${erro}`, flags: EPH });
    if (!membro.kickable) {
      return interaction.reply({ content: '❌ Não consigo expulsar: o cargo dele está acima do meu.', flags: EPH });
    }

    await interaction.deferReply({ flags: EPH });
    const r = await N.expulsar(interaction.guild, interaction.user, membro, motivo);
    if (!r.ok) return interaction.editReply(`❌ Não consegui expulsar: ${r.erro}`);

    return interaction.editReply({
      content: `👢 ${membro.user} foi expulso(a). DM: ${r.dm ? 'enviada' : 'não foi possível'}.`,
      allowedMentions: SEM_PING,
    });
  },
};
