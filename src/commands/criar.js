const { PermissionFlagsBits, SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const N = require('../decorar/nucleo');
const U = require('../decorar/ui');
const C = require('../construir/nucleo');

const EPH = MessageFlags.Ephemeral;
const bloco = (t) => `\`\`\`\n${t}\n\`\`\``;
const sobre = (itens, problemas, extra = []) => {
  const l = [...extra];
  if (problemas.length) { l.push('', '**Linhas com problema (ficam de fora):**'); for (const p of problemas.slice(0, 8)) l.push(`• ${U.corta(p.nome, 40)} — ${p.motivo}`); if (problemas.length > 8) l.push(`… e mais ${problemas.length - 8}`); }
  return l;
};

module.exports = {
  data: new SlashCommandBuilder().setName('criar').setDescription('Cria canais, categorias e cargos a partir de uma lista (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('canais').setDescription('Cria canais e categorias da lista (cole no chat ou envie o .txt)')
      .addAttachmentOption((o) => o.setName('arquivo').setDescription('Arquivo .txt com a lista (opcional)'))
      .addChannelOption((o) => o.setName('categoria').setDescription('Onde colocar os canais que não têm categoria na lista').addChannelTypes(ChannelType.GuildCategory)))
    .addSubcommand((s) => s.setName('cargos').setDescription('Cria cargos da lista (cole no chat ou envie o .txt)')
      .addAttachmentOption((o) => o.setName('arquivo').setDescription('Arquivo .txt com a lista (opcional)')))
    .addSubcommand((s) => s.setName('exemplo').setDescription('Mostra o jeito de escrever as listas')),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use este comando no servidor.', flags: EPH });
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Só a staff pode usar este comando.', flags: EPH });
    const sub = interaction.options.getSubcommand();

    if (sub === 'exemplo') {
      return interaction.reply({
        flags: EPH,
        content: `**Canais e categorias** — \`/criar canais\`\nUma linha por item. A marca diz o tipo: \`{categoria}\` \`{texto}\` \`{voz}\` \`{anuncio}\` \`{forum}\` \`{palco}\` \`{midia}\`. Sem marca = texto. Os canais entram na última categoria acima deles.\n${bloco(C.EXEMPLO_CANAIS)}\n**Cargos** — \`/criar cargos\`\nMarcas em qualquer lugar da linha: \`{#cor}\` \`{separado}\` \`{mencionavel}\` \`{admin}\`. O primeiro da lista fica mais alto.\n${bloco(C.EXEMPLO_CARGOS)}`.slice(0, 1990),
      });
    }

    const me = interaction.guild.members.me;
    const preciso = sub === 'canais' ? PermissionFlagsBits.ManageChannels : PermissionFlagsBits.ManageRoles;
    if (!me || !me.permissions.has(preciso)) return interaction.reply({ content: `❌ Eu preciso da permissão **${sub === 'canais' ? 'Gerenciar canais' : 'Gerenciar cargos'}** neste servidor.`, flags: EPH });
    if (N.estaOcupado()) return interaction.reply({ content: '⏳ Já tem uma operação em andamento. Aguarde terminar.', flags: EPH });
    await interaction.deferReply({ flags: EPH });
    await interaction.guild.channels.fetch().catch(() => {});
    await interaction.guild.roles.fetch().catch(() => {});

    const lista = await U.lerLista(interaction, `/criar ${sub}`);
    if (!lista) return null;
    const { texto, atual } = lista;

    if (sub === 'canais') {
      const base = interaction.options.getChannel('categoria');
      const { itens, problemas } = C.lerCanais(texto);
      if (!itens.length) return atual.editReply({ content: '❌ Não achei nenhum canal na lista. Use `/criar exemplo` para ver o modelo.', components: [] });
      const lim = C.conferir(interaction.guild, itens, base && base.id);
      if (lim.erros.length) return atual.editReply({ content: `❌ ${lim.erros.join('\n')}`, components: [] });
      const linhas = sobre(itens, problemas, [`📁 **${lim.categorias}** categoria(s) · 💬 **${lim.canais}** canal(is) · ⚠️ **${problemas.length}** com problema`, ...(base ? [`Canais sem categoria vão para **${base.name}**.`] : []), '', ...C.arvore(itens)]);
      return U.confirmar(atual, interaction, {
        prévia: U.embed('🏗️ Prévia da construção', linhas), rotulo: `Criar ${itens.length} itens`,
        executar: async (prog) => {
          const { ok, falhas } = await C.criarCanais(interaction.guild, itens, { baseId: base && base.id, motivo: `Construção por ${interaction.user.username}`, aoProgredir: prog });
          return [`✅ **${ok.length}** criado(s).`, ...U.falhasTxt(falhas, (f) => f.nome)].join('\n');
        },
      });
    }

    const { itens, problemas } = C.lerCargos(texto);
    if (!itens.length) return atual.editReply({ content: '❌ Não achei nenhum cargo na lista. Use `/criar exemplo` para ver o modelo.', components: [] });
    if (interaction.guild.roles.cache.size + itens.length > 250) return atual.editReply({ content: `❌ O servidor tem ${interaction.guild.roles.cache.size} cargos e o máximo é 250.`, components: [] });
    const linhas = sobre(itens, problemas, [`🎭 **${itens.length}** cargo(s) · ⚠️ **${problemas.length}** com problema`, '', ...itens.slice(0, 30).map(C.descCargo), ...(itens.length > 30 ? [`… e mais ${itens.length - 30}`] : [])]);
    return U.confirmar(atual, interaction, {
      prévia: U.embed('🎭 Prévia dos cargos', linhas), rotulo: `Criar ${itens.length} cargos`,
      executar: async (prog) => {
        const { ok, falhas, ordenado } = await C.criarCargos(interaction.guild, itens, { motivo: `Cargos criados por ${interaction.user.username}`, aoProgredir: prog });
        return [`✅ **${ok.length}** cargo(s) criado(s).`, ...(ok.length > 1 && !ordenado ? ['ℹ️ Não consegui ordenar: arraste o cargo da Atlas para cima dos novos e eles ficam na ordem certa.'] : []), ...U.falhasTxt(falhas, (f) => f.nome)].join('\n');
      },
    });
  },
};
