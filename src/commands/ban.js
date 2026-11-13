const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

const SEM_PING = { parse: [] };
const APAGAR = { 0: 'não apagar', 3600: 'última hora', 86400: 'último dia', 604800: 'últimos 7 dias' };

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
      if (erro) return interaction.reply(UI.erro(erro));
      if (!membro.bannable) return interaction.reply(UI.erro('Não consigo banir: o cargo dele está acima do meu.'));
    } else if (user.id === interaction.user.id) {
      return interaction.reply(UI.erro('Você não pode fazer isso consigo mesmo.'));
    }

    const confirmou = await UI.confirmar(interaction, {
      perigo: true,
      sim: 'Banir',
      painel: UI.painel({
        trilha: ['Moderação', 'Banimento'],
        titulo: `Banir ${user.username}?`,
        descricao: `${user}${membro ? '' : `  ${S.sep}  não está no servidor`}`,
        campos: [
          { nome: 'Motivo', valor: motivo },
          { nome: 'Apagar mensagens', valor: APAGAR[apagar] || 'não apagar', lado: true },
        ],
        rodape: 'A pessoa recebe uma DM com o motivo',
        perigo: true,
      }),
    });
    if (!confirmou) return;

    const r = await N.banir(interaction.guild, interaction.user, user, membro, motivo, apagar);
    if (!r.ok) return interaction.editReply(UI.edicao(UI.erro(`Não consegui banir: ${r.erro}`)));

    return interaction.editReply({
      embeds: [UI.painel({
        trilha: ['Moderação', 'Banimento'],
        titulo: `${user.username} foi banido(a)`,
        descricao: membro ? `DM ${S.sep} ${r.dm ? 'enviada' : 'não foi possível enviar'}` : undefined,
        campos: [{ nome: 'Motivo', valor: motivo }],
        perigo: true,
      })],
      components: [],
      allowedMentions: SEM_PING,
    });
  },
};
