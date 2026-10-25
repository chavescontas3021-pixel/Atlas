const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js');
const N = require('../eventos/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evento')
    .setDescription('Eventos da house (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('criar').setDescription('Cria um evento com confirmação de presença')
      .addStringOption((o) => o.setName('titulo').setDescription('Nome do evento').setRequired(true).setMaxLength(100))
      .addStringOption((o) => o.setName('quando').setDescription('Horário de Brasília. Ex.: 20:00, 25/10 20:00, 25/10/2026 20:00').setRequired(true))
      .addStringOption((o) => o.setName('descricao').setDescription('Detalhes do evento').setMaxLength(1500))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal do evento (padrão: este)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo para marcar nos avisos')))
    .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela um evento')
      .addIntegerOption((o) => o.setName('id').setDescription('Número do evento').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('premiar').setDescription('Dá stars a todos os confirmados')
      .addIntegerOption((o) => o.setName('id').setDescription('Número do evento').setRequired(true).setMinValue(1))
      .addIntegerOption((o) => o.setName('stars').setDescription('Stars para cada um').setRequired(true).setMinValue(1).setMaxValue(1000000)))
    .addSubcommand((s) => s.setName('listar').setDescription('Lista os eventos ativos')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      const quando = N.dataParaTs(interaction.options.getString('quando'));
      if (!quando || quando < Date.now() + 60000) {
        return interaction.reply({ content: '❌ Horário inválido ou no passado. Use `20:00`, `25/10 20:00` ou `25/10/2026 20:00` (horário de Brasília).', flags: EPH });
      }
      const canal = interaction.options.getChannel('canal') || interaction.channel;
      const cargo = interaction.options.getRole('cargo');
      const id = N.proximoId('eventos');
      const e = {
        id,
        guildId: interaction.guildId,
        canalId: canal.id,
        msgId: null,
        titulo: interaction.options.getString('titulo').trim(),
        descricao: (interaction.options.getString('descricao') || '').trim(),
        quando,
        criadorId: interaction.user.id,
        cargoPing: cargo ? cargo.id : null,
        confirmados: [],
        aviso15: false,
        iniciou: false,
        status: 'ativo',
      };
      let msg;
      try {
        msg = await canal.send({
          content: cargo ? `<@&${cargo.id}>` : undefined,
          embeds: [N.embedEvento(e)],
          components: N.botoesEvento(e),
          allowedMentions: { roles: cargo ? [cargo.id] : [] },
        });
      } catch {
        return interaction.reply({ content: '❌ Não consegui enviar nesse canal (falta permissão).', flags: EPH });
      }
      e.msgId = msg.id;
      N.salvarEvento(e);
      return interaction.reply({ content: `✅ Evento **#${id}** criado em <#${canal.id}> para <t:${N.ts(quando)}:F>.`, flags: EPH });
    }

    if (sub === 'listar') {
      const ativos = N.todosEventos().filter((e) => (e.status === 'ativo' || e.status === 'iniciado') && e.guildId === interaction.guildId);
      if (!ativos.length) return interaction.reply({ content: 'Nenhum evento ativo.', flags: EPH });
      const txt = ativos.map((e) => `**#${e.id}** — ${e.titulo} · <t:${N.ts(e.quando)}:F> · ${e.confirmados.length} confirmado(s) · https://discord.com/channels/${e.guildId}/${e.canalId}/${e.msgId}`).join('\n');
      return interaction.reply({ content: txt, flags: EPH });
    }

    const id = String(interaction.options.getInteger('id'));

    if (sub === 'cancelar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.cancelarEvento(interaction.client, id);
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : '✅ Evento cancelado e confirmados avisados.');
    }

    if (sub === 'premiar') {
      const stars = interaction.options.getInteger('stars');
      const r = N.premiarEvento(id, stars);
      if (r.erro) return interaction.reply({ content: `❌ ${r.erro}`, flags: EPH });
      let txt = `⭐ ${r.ok} pessoa(s) receberam **${stars} stars**.`;
      if (r.sem.length) txt += `\n⚠️ Sem personagem de RPG (não receberam): ${N.mencoes(r.sem)}`;
      return interaction.reply({ content: txt, flags: EPH });
    }
  },
};
