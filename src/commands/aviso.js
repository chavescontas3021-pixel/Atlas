const { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const SEM_PING = { parse: [] };
const responder = (interaction, content) =>
  interaction.reply({ content, flags: EPH, allowedMentions: SEM_PING });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aviso')
    .setDescription('Avisos de membros (3 avisos = banimento)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName('dar')
        .setDescription('Dá um aviso a um membro')
        .addUserOption((o) => o.setName('membro').setDescription('Quem vai receber').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo do aviso').setRequired(true).setMaxLength(300))
        .addIntegerOption((o) => o.setName('regra').setDescription('Regra quebrada (opcional)').setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('listar')
        .setDescription('Lista os avisos de um membro')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove um aviso pelo número (veja em listar)')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
        .addIntegerOption((o) => o.setName('numero').setDescription('Número do aviso').setRequired(true).setMinValue(1))
    )
    .addSubcommand((s) =>
      s
        .setName('limpar')
        .setDescription('Remove todos os avisos de um membro')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'dar') {
      const membro = interaction.options.getMember('membro');
      if (!membro) return responder(interaction, '❌ Esse membro não está no servidor.');
      if (membro.user.bot) return responder(interaction, '❌ Não dá para avisar bots.');

      const erro = N.checarHierarquia(interaction.member, membro);
      if (erro) return responder(interaction, `❌ ${erro}`);

      const motivo = interaction.options.getString('motivo');
      const regra = interaction.options.getInteger('regra');
      if (regra && regra > N.regras().length) {
        return responder(interaction, '❌ Essa regra não existe. Veja com `/regras listar`.');
      }

      await interaction.deferReply({ flags: EPH });
      const r = await N.darAviso(interaction.guild, interaction.user, membro, motivo, regra);

      let texto = `✅ Aviso dado a ${membro} (**${r.total}/${r.limite}**). DM: ${
        r.dm ? 'enviada' : 'não foi possível (DM fechada)'
      }.`;
      if (r.banido) {
        texto += r.banido.ok
          ? '\n🔨 Limite de avisos atingido: o membro foi **banido automaticamente**.'
          : `\n⚠️ Limite de avisos atingido, mas não consegui banir: ${r.banido.erro}.`;
      }
      return interaction.editReply({ content: texto, allowedMentions: SEM_PING });
    }

    const user = interaction.options.getUser('membro');
    const lista = N.avisosDe(user.id);

    if (sub === 'listar') {
      if (!lista.length) return responder(interaction, `ℹ️ ${user} não tem avisos.`);
      const linhas = lista.map((a, i) => {
        let l = `**${i + 1}.** <t:${Math.floor(a.data / 1000)}:d> • por <@${a.por}>\n${a.motivo}`;
        if (a.regra) l += `\n*Regra ${a.regra}*`;
        return l;
      });
      const embed = new EmbedBuilder()
        .setColor(N.COR.aviso)
        .setTitle(`⚠️ Avisos de ${user.username} (${lista.length}/${N.limite()})`)
        .setDescription(linhas.join('\n\n').slice(0, 4000));
      return interaction.reply({ embeds: [embed], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'remover') {
      const n = interaction.options.getInteger('numero');
      if (!lista[n - 1]) return responder(interaction, '❌ Não existe aviso com esse número.');
      const [removido] = lista.splice(n - 1, 1);
      N.salvarAvisos(user.id, lista);
      await N.registrar(interaction.guild, {
        titulo: '🗑️ Aviso removido',
        cor: N.COR.ok,
        alvo: user,
        executor: interaction.user,
        motivo: `Aviso removido: ${removido.motivo}`,
        extras: [{ name: 'Avisos agora', value: `${lista.length}/${N.limite()}`, inline: true }],
      });
      return responder(interaction, `🗑️ Aviso removido. ${user} agora tem **${lista.length}/${N.limite()}**.`);
    }

    if (sub === 'limpar') {
      if (!lista.length) return responder(interaction, `ℹ️ ${user} não tem avisos.`);
      N.salvarAvisos(user.id, []);
      await N.registrar(interaction.guild, {
        titulo: '🧹 Avisos limpos',
        cor: N.COR.ok,
        alvo: user,
        executor: interaction.user,
        motivo: `Todos os avisos (${lista.length}) foram removidos.`,
      });
      return responder(interaction, `🧹 Todos os avisos de ${user} foram removidos.`);
    }
  },
};
