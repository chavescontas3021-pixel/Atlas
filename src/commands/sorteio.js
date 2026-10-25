const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js');
const N = require('../eventos/nucleo');

const EPH = MessageFlags.Ephemeral;
const MIN_MS = 10 * 1000;
const MAX_MS = 30 * 24 * 3600 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Sorteios da house (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('criar').setDescription('Cria um sorteio')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo do prêmio').setRequired(true).addChoices(
        { name: '⭐ Stars (o Atlas entrega sozinho)', value: 'stars' },
        { name: '🧾 Texto (a staff entrega, ex.: sonhos)', value: 'texto' },
      ))
      .addStringOption((o) => o.setName('premio').setDescription('Stars: um número. Texto: ex. "5.000 sonhos"').setRequired(true).setMaxLength(150))
      .addStringOption((o) => o.setName('duracao').setDescription('Ex.: 30m, 2h, 1d, 1d12h').setRequired(true))
      .addIntegerOption((o) => o.setName('vencedores').setDescription('Quantos vencedores (padrão 1)').setMinValue(1).setMaxValue(20))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal do sorteio (padrão: este)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption((o) => o.setName('cargo').setDescription('Só quem tem esse cargo participa'))
      .addIntegerOption((o) => o.setName('nivel').setDescription('Nível mínimo no RPG').setMinValue(1).setMaxValue(100))
      .addRoleOption((o) => o.setName('mencionar').setDescription('Cargo para marcar ao criar')))
    .addSubcommand((s) => s.setName('encerrar').setDescription('Encerra e sorteia agora')
      .addIntegerOption((o) => o.setName('id').setDescription('Número do sorteio').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela sem sortear')
      .addIntegerOption((o) => o.setName('id').setDescription('Número do sorteio').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('rerolar').setDescription('Sorteia mais vencedores de um sorteio encerrado')
      .addIntegerOption((o) => o.setName('id').setDescription('Número do sorteio').setRequired(true).setMinValue(1))
      .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantos novos (padrão 1)').setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) => s.setName('listar').setDescription('Lista os sorteios ativos')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      const tipo = interaction.options.getString('tipo');
      const premioTxt = interaction.options.getString('premio').trim();
      const ms = N.duracaoParaMs(interaction.options.getString('duracao'));
      if (!ms || ms < MIN_MS || ms > MAX_MS) {
        return interaction.reply({ content: '❌ Duração inválida. Use de 10s a 30d. Ex.: `30m`, `2h`, `1d12h`.', flags: EPH });
      }
      let premio = premioTxt;
      if (tipo === 'stars') {
        premio = Number(premioTxt.replace(/[.\s]/g, ''));
        if (!Number.isInteger(premio) || premio < 1 || premio > 1000000) {
          return interaction.reply({ content: '❌ Para prêmio em stars, escreva só um número de 1 a 1.000.000.', flags: EPH });
        }
      }

      const canal = interaction.options.getChannel('canal') || interaction.channel;
      const cargo = interaction.options.getRole('cargo');
      const mencionar = interaction.options.getRole('mencionar');
      const id = N.proximoId('sorteios');
      const s = {
        id,
        guildId: interaction.guildId,
        canalId: canal.id,
        msgId: null,
        criadorId: interaction.user.id,
        criadorNome: interaction.user.username,
        premioTipo: tipo,
        premio,
        vencedores: interaction.options.getInteger('vencedores') || 1,
        fim: Date.now() + ms,
        cargoExigido: cargo ? cargo.id : null,
        nivelMin: interaction.options.getInteger('nivel') || 0,
        participantes: [],
        ganhadores: [],
        status: 'ativo',
      };

      let msg;
      try {
        msg = await canal.send({
          content: mencionar ? `<@&${mencionar.id}>` : undefined,
          embeds: [N.embedSorteio(s)],
          components: N.botoesSorteio(s),
          allowedMentions: { roles: mencionar ? [mencionar.id] : [] },
        });
      } catch {
        return interaction.reply({ content: '❌ Não consegui enviar nesse canal (falta permissão).', flags: EPH });
      }
      s.msgId = msg.id;
      N.salvarSorteio(s);
      return interaction.reply({ content: `✅ Sorteio **#${id}** criado em <#${canal.id}>.`, flags: EPH });
    }

    if (sub === 'listar') {
      const ativos = N.todosSorteios().filter((s) => s.status === 'ativo' && s.guildId === interaction.guildId);
      if (!ativos.length) return interaction.reply({ content: 'Nenhum sorteio ativo.', flags: EPH });
      const txt = ativos.map((s) => {
        const premio = s.premioTipo === 'stars' ? `⭐ ${s.premio}` : s.premio;
        return `**#${s.id}** — ${premio} · termina <t:${N.ts(s.fim)}:R> · ${s.participantes.length} participante(s) · https://discord.com/channels/${s.guildId}/${s.canalId}/${s.msgId}`;
      }).join('\n');
      return interaction.reply({ content: txt, flags: EPH });
    }

    await interaction.deferReply({ flags: EPH });
    const id = String(interaction.options.getInteger('id'));

    if (sub === 'encerrar') {
      const r = await N.encerrarSorteio(interaction.client, id);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply(r.ganhadores.length ? `✅ Sorteio encerrado. Vencedor(es): ${N.mencoes(r.ganhadores)}` : '✅ Sorteio encerrado, mas ninguém elegível participou.');
    }

    if (sub === 'cancelar') {
      const r = await N.cancelarSorteio(interaction.client, id);
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : '✅ Sorteio cancelado.');
    }

    if (sub === 'rerolar') {
      const q = interaction.options.getInteger('quantidade') || 1;
      const r = await N.rerolarSorteio(interaction.client, id, q);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply(`✅ Novo(s) vencedor(es): ${N.mencoes(r.ganhadores)}`);
    }
  },
};
