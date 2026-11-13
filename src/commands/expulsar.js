const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

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

    if (!membro) return interaction.reply(UI.erro('Esse membro não está no servidor.'));
    const erro = N.checarHierarquia(interaction.member, membro);
    if (erro) return interaction.reply(UI.erro(erro));
    if (!membro.kickable) return interaction.reply(UI.erro('Não consigo expulsar: o cargo dele está acima do meu.'));

    const confirmou = await UI.confirmar(interaction, {
      sim: 'Expulsar',
      painel: UI.painel({
        trilha: ['Moderação', 'Expulsão'],
        titulo: `Expulsar ${membro.user.username}?`,
        descricao: `${membro.user}`,
        campos: [{ nome: 'Motivo', valor: motivo }],
        rodape: 'A pessoa recebe uma DM e pode voltar com um novo convite',
      }),
    });
    if (!confirmou) return;

    const r = await N.expulsar(interaction.guild, interaction.user, membro, motivo);
    if (!r.ok) return interaction.editReply(UI.edicao(UI.erro(`Não consegui expulsar: ${r.erro}`)));

    return interaction.editReply({
      embeds: [UI.painel({
        trilha: ['Moderação', 'Expulsão'],
        titulo: `${membro.user.username} foi expulso(a)`,
        descricao: `DM ${S.sep} ${r.dm ? 'enviada' : 'não foi possível enviar'}`,
        campos: [{ nome: 'Motivo', valor: motivo }],
      })],
      components: [],
      allowedMentions: SEM_PING,
    });
  },
};
