const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../moderacao/nucleo');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

const responder = (interaction, texto) => interaction.reply(UI.ok(texto));

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
        .setName('canaladvertencia')
        .setDescription('Canal de divergências: advertências dadas lá saem no canal, com tópico (vazio = desligar)')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('O canal de divergências')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
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
      const adv = N.canalAdvertencia();
      const embed = UI.painel({
        trilha: ['Moderação', 'Configuração'],
        titulo: 'Moderação do Atlas',
        campos: [
          { nome: 'Canal de log', valor: log ? `<#${log}>` : 'não definido', lado: true },
          { nome: 'Canal de advertências', valor: adv ? `<#${adv}>` : 'não definido', lado: true },
          { nome: 'Limite de avisos', valor: `${N.limite()}  ${S.sep}  ao atingir, banimento automático` },
          { nome: 'Regras cadastradas', valor: String(N.regras().length), lado: true },
        ],
        rodape: 'Use os botões para editar as mensagens enviadas por DM',
      });
      return interaction.reply({
        embeds: [embed],
        components: [UI.botoes([
          { id: 'moderacao:editar:dmAviso', label: 'DM de aviso' },
          { id: 'moderacao:editar:dmBan', label: 'DM de banimento' },
          { id: 'moderacao:editar:dmExpulsao', label: 'DM de expulsão' },
        ])],
        flags: UI.EPH,
      });
    }

    if (sub === 'canallog') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.moderacao.canalLog', canal.id);
      return responder(interaction, `Canal de log definido: ${canal}`);
    }

    if (sub === 'canaladvertencia') {
      const canal = interaction.options.getChannel('canal');
      if (!canal) {
        db.remover('config.moderacao.canalAdvertencia');
        return responder(interaction, 'Advertência por canal desligada. Voltam as DMs normais.');
      }
      db.set('config.moderacao.canalAdvertencia', canal.id);
      return responder(
        interaction,
        `Advertências dadas em ${canal} saem no canal, marcando o membro, e ganham um tópico.\n` +
          'Em outros canais o `/aviso dar` continua mandando DM.'
      );
    }

    if (sub === 'limite') {
      const n = interaction.options.getInteger('avisos');
      db.set('config.moderacao.limite', n);
      return responder(interaction, `Com **${n}** aviso(s) o membro será banido.`);
    }

    if (sub === 'mensagem') {
      return interaction.showModal(N.modalMensagem(interaction.options.getString('tipo')));
    }
  },
};
