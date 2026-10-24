const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regras')
    .setDescription('Regras da house (usadas nos avisos)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Adiciona uma regra no final da lista')
        .addStringOption((o) => o.setName('texto').setDescription('Texto da regra').setRequired(true).setMaxLength(180))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove uma regra pelo número')
        .addIntegerOption((o) => o.setName('numero').setDescription('Número da regra').setRequired(true).setMinValue(1))
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra as regras'))
    .addSubcommand((s) =>
      s
        .setName('enviar')
        .setDescription('Posta as regras em um canal')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Onde postar')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();
    const lista = [...N.regras()];

    if (sub === 'listar') {
      if (!lista.length) return responder(interaction, 'ℹ️ Nenhuma regra cadastrada. Use `/regras adicionar`.');
      return responder(interaction, lista.map((r, i) => `**${i + 1}.** ${r}`).join('\n'));
    }

    if (sub === 'adicionar') {
      if (lista.length >= 20) return responder(interaction, '❌ O máximo é 20 regras.');
      lista.push(interaction.options.getString('texto').trim());
      db.set('config.moderacao.regras', lista);
      return responder(interaction, `✅ Regra **${lista.length}** adicionada.`);
    }

    if (sub === 'remover') {
      const n = interaction.options.getInteger('numero');
      if (!lista[n - 1]) return responder(interaction, '❌ Não existe regra com esse número.');
      lista.splice(n - 1, 1);
      db.set('config.moderacao.regras', lista);
      return responder(
        interaction,
        '🗑️ Regra removida. Atenção: as regras seguintes mudaram de número, e avisos antigos guardam o texto da regra da época.'
      );
    }

    if (sub === 'enviar') {
      if (!lista.length) return responder(interaction, 'ℹ️ Nenhuma regra cadastrada.');
      const canal = interaction.options.getChannel('canal');
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle('📜 Regras da house')
        .setDescription(lista.map((r, i) => `**${i + 1}.** ${r}`).join('\n\n'))
        .setFooter({ text: `Ao chegar em ${N.limite()} avisos, o membro é banido.` });
      await canal.send({ embeds: [embed] });
      return responder(interaction, `✅ Regras enviadas em ${canal}.`);
    }
  },
};
