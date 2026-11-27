const { AttachmentBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const N = require('../decorar/nucleo');
const U = require('../decorar/ui');
const R = require('../decorar/cargos');

const EPH = MessageFlags.Ephemeral;
const previa = (titulo, res) => {
  const l = [`✏️ **${res.mudancas.length}** vão mudar${res.iguais !== undefined ? ` · ➖ **${res.iguais}** já estão iguais` : ''} · ⚠️ **${res.problemas.length}** com problema`];
  if (res.mudancas.length) { l.push('', '**Exemplos:**'); for (const m of res.mudancas.slice(0, 10)) l.push(`• ${U.corta(m.antes, 35)} → ${U.corta(m.depois, 60)}`); if (res.mudancas.length > 10) l.push(`… e mais ${res.mudancas.length - 10}`); }
  if (res.problemas.length) { l.push('', '**Problemas (ficam de fora):**'); for (const p of res.problemas.slice(0, 8)) l.push(`• ${U.corta(p.nome, 40)} — ${p.motivo}`); }
  return U.embed(titulo, l);
};

module.exports = {
  data: new SlashCommandBuilder().setName('decorarcargos').setDescription('Decora os nomes dos cargos pela lista (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('lista').setDescription('Manda a lista de cargos com ID para você editar')
      .addBooleanOption((o) => o.setName('arquivo').setDescription('Mandar como arquivo .txt em vez de mensagens')))
    .addSubcommand((s) => s.setName('decorar').setDescription('Renomeia os cargos com a lista editada (cole no chat ou envie o .txt)')
      .addAttachmentOption((o) => o.setName('arquivo').setDescription('Arquivo .txt com a lista editada (opcional)')))
    .addSubcommand((s) => s.setName('desfazer').setDescription('Volta os cargos aos nomes de antes da decoração')),

  async execute(interaction) {
    const resp = (content) => interaction.reply({ content, flags: EPH });
    if (!interaction.inGuild()) return resp('Use este comando no servidor.');
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return resp('❌ Só a staff pode usar este comando.');
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    if (sub !== 'lista') {
      const me = guild.members.me;
      if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return resp('❌ Eu preciso da permissão **Gerenciar cargos** neste servidor.');
      if (N.estaOcupado()) return resp('⏳ Já tem uma operação em andamento. Aguarde terminar.');
    }
    await interaction.deferReply({ flags: EPH });
    await guild.roles.fetch().catch(() => {});

    if (sub === 'lista') {
      const { linhas, total } = R.montarLista(guild);
      if (!total) return interaction.editReply('❌ Não encontrei nenhum cargo.');
      const dica = 'Do mais alto para o mais baixo. Troque **só o nome depois do `|`** (não mexa no número) e apague as linhas que não quer mudar. Depois use `/cargo decorar`.';
      if (interaction.options.getBoolean('arquivo')) return interaction.editReply({ content: `📋 **${total} cargos** no arquivo.\n${dica}`, files: [new AttachmentBuilder(Buffer.from(linhas.join('\n'), 'utf8'), { name: 'cargos.txt' })] });
      const ped = N.dividir(linhas);
      await interaction.editReply(`📋 **${total} cargos** em ${ped.length} mensagem(ns).\n${dica}`);
      for (const p of ped) await interaction.followUp({ content: `\`\`\`\n${p}\n\`\`\``, flags: EPH });
      return null;
    }

    if (sub === 'decorar') {
      const lista = await U.lerLista(interaction, '/cargo decorar');
      if (!lista) return null;
      const res = R.interpretar(guild, lista.texto);
      if (!res.lidas) return lista.atual.editReply({ content: '❌ Não achei nenhuma linha no formato `ID | nome`. Use `/cargo lista` para pegar o modelo.', components: [] });
      return U.confirmar(lista.atual, interaction, {
        prévia: previa('🎨 Prévia da decoração de cargos', res), rotulo: `Aplicar em ${res.mudancas.length} cargos`,
        executar: async (prog) => {
          if (!res.mudancas.length) return 'Nada para mudar.';
          R.guardarBackup(res.mudancas);
          const { ok, falhas } = await R.renomear(guild, res.mudancas, { motivo: `Decoração de cargos por ${interaction.user.username}`, aoProgredir: prog });
          return [`✅ **${ok.length}** cargo(s) renomeado(s).`, ...U.falhasTxt(falhas, (f) => f.antes), '', '↩️ Para voltar ao normal: `/cargo desfazer`'].join('\n');
        },
      });
    }

    const prep = R.prepararDesfazer(guild);
    if (!prep.mudancas.length) { R.limparBackup(prep.resolvidos); return interaction.editReply('❌ Não há nada para desfazer: todos os cargos já estão com o nome original.'); }
    return U.confirmar(interaction, interaction, {
      prévia: previa('↩️ Desfazer a decoração de cargos', { mudancas: prep.mudancas, problemas: [] }), rotulo: `Voltar ${prep.mudancas.length} cargos`,
      executar: async (prog) => {
        const { ok, falhas } = await R.renomear(guild, prep.mudancas, { motivo: `Decoração desfeita por ${interaction.user.username}`, aoProgredir: prog });
        R.limparBackup([...prep.resolvidos, ...ok.map((m) => m.id)]);
        return [`✅ **${ok.length}** cargo(s) de volta ao normal.`, ...U.falhasTxt(falhas, (f) => f.antes)].join('\n');
      },
    });
  },
};
