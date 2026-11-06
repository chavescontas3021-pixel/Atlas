const { AttachmentBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../decorar/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decorar')
    .setDescription('Muda o nome de vários canais de uma vez (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('lista')
        .setDescription('Manda a lista de canais com ID para você editar')
        .addBooleanOption((o) => o.setName('arquivo').setDescription('Mandar como arquivo .txt em vez de mensagens'))
    ),

  async execute(interaction) {
    const responder = (content) => interaction.reply({ content, flags: EPH });
    if (!interaction.inGuild()) return responder('Use este comando no servidor.');
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return responder('❌ Só a staff pode usar este comando.');
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'lista') {
      await interaction.deferReply({ flags: EPH });
      await interaction.guild.channels.fetch().catch(() => {});

      const { linhas, total } = N.montarLista(interaction.guild);
      if (!total) return interaction.editReply('❌ Não encontrei nenhum canal.');

      const dica =
        'Troque **só o nome depois do `|`** (não mexa no número) e apague as linhas que não quer mudar. ' +
        'Os títulos de categoria não são renomeados. Depois use `/decorar aplicar`.';

      if (interaction.options.getBoolean('arquivo')) {
        const arquivo = new AttachmentBuilder(Buffer.from(linhas.join('\n'), 'utf8'), { name: 'canais.txt' });
        return interaction.editReply({ content: `📋 **${total} canais** no arquivo.\n${dica}`, files: [arquivo] });
      }

      const pedacos = N.dividir(linhas);
      await interaction.editReply(`📋 **${total} canais** em ${pedacos.length} mensagem(ns).\n${dica}`);
      for (const p of pedacos) {
        await interaction.followUp({ content: `\`\`\`\n${p}\n\`\`\``, flags: EPH });
      }
      return null;
    }
  },
};
