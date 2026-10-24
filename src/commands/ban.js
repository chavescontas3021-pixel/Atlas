const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro direto (casos graves)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('membro').setDescription('Quem banir (pode ser alguém que já saiu)').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true).setMaxLength(300))
    .addIntegerOption((o) =>
      o
        .setName('apagar')
        .setDescription('Apagar as mensagens recentes da pessoa?')
        .addChoices(
          { name: 'Não apagar', value: 0 },
          { name: 'Última hora', value: 3600 },
          { name: 'Último dia', value: 86400 },
          { name: 'Últimos 7 dias', value: 604800 }
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const user = interaction.options.getUser('membro');
    const membro = interaction.options.getMember('membro');
    const motivo = interaction.options.getString('motivo');
    const apagar = interaction.options.getInteger('apagar') || 0;

    if (membro) {
      const erro = N.checarHierarquia(interaction.member, membro);
      if (erro) return interaction.reply({ content: `❌ ${erro}`, flags: EPH });
      if (!membro.bannable) {
        return interaction.reply({ content: '❌ Não consigo banir: o cargo dele está acima do meu.', flags: EPH });
      }
    } else if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode fazer isso consigo mesmo.', flags: EPH });
    }

    await interaction.deferReply({ flags: EPH });
    const r = await N.banir(interaction.guild, interaction.user, user, membro, motivo, apagar);
    if (!r.ok) return interaction.editReply(`❌ Não consegui banir: ${r.erro}`);

    return interaction.editReply({
      content: `🔨 ${user} foi banido(a).${membro ? ` DM: ${r.dm ? 'enviada' : 'não foi possível'}.` : ''}`,
      allowedMentions: SEM_PING,
    });
  },
};
