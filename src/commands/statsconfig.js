const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../stats/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statsconfig')
    .setDescription('Configura as estatísticas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('ignorar').setDescription('Liga/desliga a contagem de mensagens de um canal')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.PublicThread)))
    .addSubcommand((s) => s.setName('contador').setDescription('Canal que mostra o número de membros no nome')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal de voz (deixe vazio para desligar)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildText, ChannelType.GuildCategory))
      .addStringOption((o) => o.setName('modelo').setDescription('Nome do canal, com {n} no lugar do número').setMaxLength(90))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const ign = N.ignorados();
      const cont = db.get('config.stats.contador.canal', null);
      const dias = Object.keys(db.get('stats.dias', {}) || {}).length;
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('📊 Estatísticas do Atlas').addFields(
        { name: 'Canais ignorados', value: ign.length ? ign.map((c) => `<#${c}>`).join(', ') : 'nenhum' },
        { name: 'Contador de membros', value: cont ? `<#${cont}> — modelo: ${db.get('config.stats.contador.modelo', '👥 Membros: {n}')}` : 'desligado' },
        { name: 'Dias registrados', value: `${dias}` },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ignorar') {
      const canal = interaction.options.getChannel('canal');
      const lista = N.ignorados();
      if (lista.includes(canal.id)) {
        db.set('config.stats.ignorados', lista.filter((c) => c !== canal.id));
        return responder(interaction, `✅ Mensagens de ${canal} voltam a ser contadas.`);
      }
      db.set('config.stats.ignorados', [...lista, canal.id]);
      return responder(interaction, `✅ Mensagens de ${canal} não serão mais contadas.`);
    }

    if (sub === 'contador') {
      const canal = interaction.options.getChannel('canal');
      const modelo = interaction.options.getString('modelo');
      if (!canal) {
        db.remover('config.stats.contador');
        return responder(interaction, '✅ Contador desligado. (O nome do canal fica como está.)');
      }
      if (modelo && !modelo.includes('{n}')) return responder(interaction, '❌ O modelo precisa ter `{n}` onde vai o número. Ex: `👥 Membros: {n}`');
      db.set('config.stats.contador.canal', canal.id);
      if (modelo) db.set('config.stats.contador.modelo', modelo);
      await interaction.deferReply({ flags: EPH });
      await N.contadorTick(interaction.client);
      return interaction.editReply(`✅ ${canal} vai mostrar o número de membros (atualiza a cada 10 minutos). O bot precisa da permissão **Gerenciar Canais** nele. O número inclui bots.`);
    }
  },
};
