const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../parceria/nucleo');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });
const ESCOLHAS = Object.entries(N.TIPOS).map(([value, t]) => ({ name: t.nome, value }));
const tipoOpt = (o) => o.setName('tipo').setDescription('Qual parceria').setRequired(true).addChoices(...ESCOLHAS);

function status(interaction) {
  const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('🤝 Parcerias do Atlas');
  for (const [tipo, info] of Object.entries(N.TIPOS)) {
    const c = N.conf(tipo);
    const ping = tipo === 'everyone' ? '@everyone' : c.cargo ? `<@&${c.cargo}>` : 'não definido';
    embed.addFields({
      name: `${info.emoji} ${info.nome}`,
      value:
        `Estado: ${c.ativo ? '🟢 Ligada' : '🔴 Desligada'}\n` +
        `Canal: ${c.canal ? `<#${c.canal}>` : 'não definido'}\n` +
        `Marca: ${ping}\n` +
        `Banner: ${N.bannerValido(c.banner) ? 'sim' : 'não'}`,
    });
  }
  return interaction.reply({ embeds: [embed], flags: EPH });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parceria')
    .setDescription('Configura as mensagens automáticas de parceria (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração das duas parcerias'))
    .addSubcommand((s) =>
      s
        .setName('ativar')
        .setDescription('Liga ou desliga uma parceria')
        .addStringOption(tipoOpt)
        .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('Canal onde os convites são enviados')
        .addStringOption(tipoOpt)
        .addChannelOption((o) =>
          o.setName('canal').setDescription('O canal').setRequired(true).addChannelTypes(...TEXTO)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('cargo')
        .setDescription('Cargo marcado na parceria normal (vazio = remover)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo de ping de parceria'))
    )
    .addSubcommand((s) =>
      s.setName('mensagem').setDescription('Edita o título e o texto da mensagem').addStringOption(tipoOpt)
    )
    .addSubcommand((s) =>
      s
        .setName('banner')
        .setDescription('Banner da mensagem (vazio = remover)')
        .addStringOption(tipoOpt)
        .addStringOption((o) => o.setName('link').setDescription('Link direto da imagem (https://...)').setMaxLength(500))
    )
    .addSubcommand((s) =>
      s.setName('testar').setDescription('Mostra uma prévia (sem marcar ninguém)').addStringOption(tipoOpt)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') return status(interaction);

    if (sub === 'ativar') {
      const tipo = interaction.options.getString('tipo');
      const ligado = interaction.options.getBoolean('ligado');
      db.set(`config.parceria.${tipo}.ativo`, ligado);
      const c = N.conf(tipo);
      const aviso = ligado && !c.canal ? '\n⚠️ Falta definir o canal com `/parceria canal`.' : '';
      return responder(interaction, `${ligado ? '🟢 Ligada' : '🔴 Desligada'}: **${N.TIPOS[tipo].nome}**.${aviso}`);
    }

    if (sub === 'canal') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');
      db.set(`config.parceria.${tipo}.canal`, canal.id);
      return responder(interaction, `✅ Canal da **${N.TIPOS[tipo].nome}**: ${canal}`);
    }

    if (sub === 'cargo') {
      const cargo = interaction.options.getRole('cargo');
      if (!cargo) {
        db.remover('config.parceria.normal.cargo');
        return responder(interaction, '✅ Cargo removido (a parceria normal não vai marcar ninguém).');
      }
      if (cargo.managed) return responder(interaction, '❌ Esse cargo é gerenciado por uma integração.');
      db.set('config.parceria.normal.cargo', cargo.id);
      return responder(
        interaction,
        `✅ A parceria normal vai marcar ${cargo}.\n` +
          'ℹ️ Se o cargo não for "mencionável", o Atlas precisa da permissão **Mencionar @everyone, @here e todos os cargos**.'
      );
    }

    if (sub === 'banner') {
      const tipo = interaction.options.getString('tipo');
      const link = interaction.options.getString('link');
      if (!link) {
        db.remover(`config.parceria.${tipo}.banner`);
        return responder(interaction, '🗑️ Banner removido.');
      }
      const url = N.bannerValido(link);
      if (!url) return responder(interaction, '❌ Link inválido. Use um link que comece com `https://` e leve direto à imagem.');
      db.set(`config.parceria.${tipo}.banner`, url);
      const prev = new EmbedBuilder().setColor(0xf5a3c7).setTitle('Prévia do banner').setImage(url);
      return interaction.reply({
        content:
          '✅ Banner salvo! Se a prévia não aparecer, o link não é de uma imagem direta.\n' +
          '⚠️ Links de anexos do Discord expiram. Prefira hospedar em outro lugar (ex.: Imgur).',
        embeds: [prev],
        flags: EPH,
      });
    }

    if (sub === 'testar') {
      const tipo = interaction.options.getString('tipo');
      const msg = N.montar(
        tipo,
        { membroId: interaction.user.id, convite: 'https://discord.gg/exemplo', servidor: interaction.guild.name },
        { preview: true }
      );
      return interaction.reply({ ...msg, flags: EPH });
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const c = N.conf(tipo);
      const modal = new ModalBuilder()
        .setCustomId(`parceria:modal:${tipo}`)
        .setTitle(`Mensagem: ${N.TIPOS[tipo].nome}`.slice(0, 45))
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('titulo')
              .setLabel('Título (pode ficar vazio)')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(200)
              .setRequired(false)
              .setValue(String(c.titulo || '').slice(0, 200))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('texto')
              .setLabel('Texto ({convite} {membro} {servidor} {cargo})')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(true)
              .setValue(String(c.texto || '').slice(0, 2000))
          )
        );
      return interaction.showModal(modal);
    }
  },
};
