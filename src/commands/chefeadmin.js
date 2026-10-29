const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const E = require('../eventos/nucleo');
const N = require('../chefe/nucleo');
const Tipos = require('../chefe/tipos');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chefeadmin')
    .setDescription('Cria e gerencia eventos de chefe (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('invocar').setDescription('Faz um chefe aparecer (agora ou agendado)')
      .addStringOption((o) => o.setName('nome').setDescription('Nome do chefe').setRequired(true).setMaxLength(60))
      .addIntegerOption((o) => o.setName('vida').setDescription('Vida do chefe (ex: 3000)').setRequired(true).setMinValue(100).setMaxValue(100000000))
      .addStringOption((o) => o.setName('duracao').setDescription('Quanto tempo dura. Ex: 2h, 90m (padrão 2h)'))
      .addIntegerOption((o) => o.setName('premio').setDescription('Total de stars do prêmio (padrão 1000)').setMinValue(0).setMaxValue(10000000))
      .addIntegerOption((o) => o.setName('xp').setDescription('Total de XP do prêmio (padrão 500)').setMinValue(0).setMaxValue(10000000))
      .addStringOption((o) => o.setName('tipo').setDescription('Que monstro é o chefe (padrão: Dragão Negro)').addChoices(...Tipos.escolhas()))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji do chefe (padrão: o do tipo)').setMaxLength(20))
      .addChannelOption((o) => o.setName('canal').setDescription('Onde aparece (padrão: este canal)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo marcado quando o chefe aparecer'))
      .addStringOption((o) => o.setName('quando').setDescription('Agendar. Ex: 20:00 ou 25/10 20:00 (vazio = agora)')))
    .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela o chefe atual (sem prêmios)'))
    .addSubcommand((s) => s.setName('agenda').setDescription('Mostra os chefes agendados'))
    .addSubcommand((s) => s.setName('desagendar').setDescription('Cancela um chefe agendado')
      .addStringOption((o) => o.setName('id').setDescription('Número da agenda').setRequired(true)))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Edita os textos dos chefes')
      .addStringOption((o) => o.setName('tipo').setDescription('Qual texto').setRequired(true).addChoices(
        { name: 'Aparição', value: 'chamada' }, { name: 'Vitória', value: 'vitoria' }, { name: 'Fuga', value: 'fuga' },
      ))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'invocar') {
      const g = interaction.options;
      const duracaoMs = E.duracaoParaMs(g.getString('duracao') || '2h');
      if (!duracaoMs || duracaoMs < 60000 || duracaoMs > 7 * 86400000) return responder(interaction, '❌ Duração inválida. Use algo como `90m`, `2h` ou `1d` (entre 1 minuto e 7 dias).');
      const canal = g.getChannel('canal') || interaction.channel;
      const cargo = g.getRole('cargo');
      const cfg = {
        nome: g.getString('nome').trim(),
        hp: g.getInteger('vida'),
        duracaoMs,
        premio: g.getInteger('premio') ?? 1000,
        xp: g.getInteger('xp') ?? 500,
        tipo: g.getString('tipo') || Tipos.PADRAO,
        emoji: (g.getString('emoji') || Tipos.info(g.getString('tipo') || Tipos.PADRAO).emoji).trim(),
        canalId: canal.id,
        cargoId: cargo ? cargo.id : null,
      };
      const quando = g.getString('quando');
      if (quando) {
        const ts = E.dataParaTs(quando);
        if (!ts) return responder(interaction, '❌ Não entendi o horário. Use `20:00` ou `25/10 20:00`.');
        const id = N.proximoId();
        db.set(`chefe.agenda.${id}`, { id, quando: ts, guildId: interaction.guildId, cfg });
        return responder(interaction, `📅 **${cfg.nome}** agendado para <t:${Math.floor(ts / 1000)}:F> em ${canal} (agenda #${id}).`);
      }
      await interaction.deferReply({ flags: EPH });
      const r = await N.invocar(interaction.guild, cfg);
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : `✅ **${cfg.nome}** apareceu em ${canal}!`);
    }

    if (sub === 'cancelar') {
      await interaction.deferReply({ flags: EPH });
      return interaction.editReply((await N.cancelar(interaction.client)) ? '✅ Chefe cancelado (ninguém recebeu prêmio).' : 'Não há chefe ativo.');
    }

    if (sub === 'agenda') {
      const ag = N.agenda();
      if (!ag.length) return responder(interaction, 'Nenhum chefe agendado.');
      const txt = ag.map((x) => `**#${x.id}** — ${x.cfg.emoji} ${x.cfg.nome} · <t:${Math.floor(x.quando / 1000)}:F> · <#${x.cfg.canalId}>`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle('📅 Chefes agendados').setDescription(txt)], flags: EPH });
    }

    if (sub === 'desagendar') {
      const id = interaction.options.getString('id').replace('#', '').trim();
      if (!db.get(`chefe.agenda.${id}`, null)) return responder(interaction, '❌ Não achei essa agenda.');
      db.remover(`chefe.agenda.${id}`);
      return responder(interaction, `✅ Agenda #${id} cancelada.`);
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const m = N.mensagem(tipo);
      const modal = new ModalBuilder().setCustomId(`chefe:modal:${tipo}`).setTitle('Editar texto do chefe');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título ({chefe} {emoji})').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true).setValue(m.titulo.slice(0, 200))),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('texto').setLabel('Texto ({chefe} {hp} {ultimo} {mvp})').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true).setValue(m.texto.slice(0, 2000))),
      );
      return interaction.showModal(modal);
    }
  },
};
// fim do arquivo
