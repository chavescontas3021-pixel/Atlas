const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderacao')
    .setDescription('Configura a moderação do Atlas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração atual'))
    .addSubcommand((s) =>
      s
        .setName('canallog')
        .setDescription('Canal onde avisos, bans e expulsões são registrados')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('O canal')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('limite')
        .setDescription('Quantos avisos levam ao banimento (padrão: 3)')
        .addIntegerOption((o) =>
          o.setName('avisos').setDescription('Quantidade').setRequired(true).setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o texto das mensagens enviadas por DM')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual mensagem')
            .setRequired(true)
            .addChoices(
              { name: 'DM de aviso', value: 'dmAviso' },
              { name: 'DM de banimento', value: 'dmBan' },
              { name: 'DM de expulsão', value: 'dmExpulsao' }
            )
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const log = N.cfg('canalLog');
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🛡️ Moderação do Atlas')
        .addFields(
          { name: 'Canal de log', value: log ? `<#${log}>` : 'não definido' },
          { name: 'Limite de avisos', value: `${N.limite()} (ao atingir, banimento automático)` },
          { name: 'Regras cadastradas', value: String(N.regras().length) }
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'canallog') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.moderacao.canalLog', canal.id);
      return responder(interaction, `✅ Canal de log: ${canal}`);
    }

    if (sub === 'limite') {
      const n = interaction.options.getInteger('avisos');
      db.set('config.moderacao.limite', n);
      return responder(interaction, `✅ Com **${n}** aviso(s) o membro será banido.`);
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const atual = N.mensagem(tipo);
      const modal = new ModalBuilder()
        .setCustomId(`moderacao:modal:${tipo}`)
        .setTitle('Editar mensagem')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('titulo')
              .setLabel('Título')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(200)
              .setRequired(true)
              .setValue(atual.titulo.slice(0, 200))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('texto')
              .setLabel('Texto da mensagem')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(true)
              .setValue(atual.texto.slice(0, 2000))
          )
        );
      return interaction.showModal(modal);
    }
  },
};
