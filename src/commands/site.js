const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const S = require('../site/sincronia');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('site')
    .setDescription('Site de configuração do Atlas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra o endereço e o estado da sincronização'))
    .addSubcommand((s) => s.setName('sincronizar').setDescription('Sincroniza agora com o site')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (!process.env.GITHUB_TOKEN) {
      return interaction.reply({
        content: '❌ Falta o `GITHUB_TOKEN` no arquivo `.env` do bot. Veja o passo a passo da Parte 10.',
        flags: EPH,
      });
    }

    if (sub === 'sincronizar') {
      await interaction.deferReply({ flags: EPH });
      const r = await S.ciclo(interaction.client);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      if (r.ignorado) return interaction.editReply('⏳ Já tem uma sincronização em andamento. Tente de novo em instantes.');
      return interaction.editReply('✅ Sincronizado! Atualize a página do site.');
    }

    const i = S.info;
    const quando = i.ultimoCiclo ? `<t:${Math.floor(i.ultimoCiclo / 1000)}:R>` : 'ainda não';
    return interaction.reply({
      content:
        `🌐 **Site:** ${S.urlDoSite()}\n` +
        `📦 **Repositório:** ${S.REPO}\n` +
        `🔄 **Última sincronização:** ${quando}\n` +
        (i.erro ? `⚠️ **Último erro:** ${i.erro}` : '✅ Sem erros.'),
      flags: EPH,
    });
  },
};
