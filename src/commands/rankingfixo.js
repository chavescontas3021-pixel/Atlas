const {
  ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const K = require('../ranking/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankingfixo')
    .setDescription('Placar que se atualiza sozinho num canal (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('configurar').setDescription('Cria o placar fixo no canal escolhido')
      .addChannelOption((o) => o.setName('canal').setDescription('Onde fica o placar').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('atualizar').setDescription('Atualiza o placar agora'))
    .addSubcommand((s) => s.setName('remover').setDescription('Para de atualizar e apaga a mensagem do placar')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: EPH });

    if (sub === 'configurar') {
      const canal = interaction.options.getChannel('canal');
      const antigo = K.cfg();
      if (antigo && antigo.canalId && antigo.msgId) {
        const c = await interaction.client.channels.fetch(antigo.canalId).catch(() => null);
        const m = c && (await c.messages.fetch(antigo.msgId).catch(() => null));
        if (m) await m.delete().catch(() => {});
      }
      db.set('config.ranking', { canalId: canal.id, msgId: null });
      const r = await K.atualizar(interaction.client, true);
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : `✅ Placar criado em ${canal}. Ele se atualiza sozinho a cada 5 minutos.`);
    }

    if (sub === 'atualizar') {
      const r = await K.atualizar(interaction.client, true);
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : '✅ Placar atualizado.');
    }

    if (sub === 'remover') {
      const c = K.cfg();
      if (!c) return interaction.editReply('Não há placar configurado.');
      const canal = await interaction.client.channels.fetch(c.canalId).catch(() => null);
      const m = canal && c.msgId && (await canal.messages.fetch(c.msgId).catch(() => null));
      if (m) await m.delete().catch(() => {});
      db.remover('config.ranking');
      return interaction.editReply('✅ Placar removido.');
    }
  },
};
// fim do arquivo
