const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
const N = require('../livraria/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

const CHAVES_CANAL = {
  publicacao: 'canalPublicacao',
  livros: 'canalLivros',
  feedback: 'canalFeedback',
  feedbacks: 'canalFeedbacks',
};

function status(interaction) {
  const canal = (k) => {
    const id = N.cfg(k);
    return id ? `<#${id}>` : 'não definido';
  };
  const cat = N.cfg('categoria');
  const staff = N.cfg('staff');
  const total = Object.keys(db.get('livraria.livros', {}) || {}).length;

  const embed = new EmbedBuilder()
    .setColor(0xf5a3c7)
    .setTitle('📚 Livraria do Atlas')
    .addFields(
      { name: 'Canal de publicação (painel)', value: canal('canalPublicacao') },
      { name: 'Canal de livros (onde os livros aparecem)', value: canal('canalLivros') },
      { name: 'Canal de feedback (painel)', value: canal('canalFeedback') },
      { name: 'Canal onde os feedbacks são postados', value: N.cfg('canalFeedbacks') ? canal('canalFeedbacks') : 'mesmo do painel de feedback' },
      { name: 'Categoria dos canais temporários', value: cat ? `<#${cat}>` : 'não definida' },
      { name: 'Cargo da staff (vê os canais temporários)', value: staff ? `<@&${staff}>` : 'não definido' },
      { name: 'Mínimo de linhas na sinopse', value: String(N.minLinhas()) },
      { name: 'Livros publicados', value: String(total) }
    );
  return interaction.reply({ embeds: [embed], flags: EPH });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('livraria')
    .setDescription('Configura a livraria do Atlas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração atual'))
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('Define um canal da livraria')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual canal')
            .setRequired(true)
            .addChoices(
              { name: 'Publicação (painel com o botão de publicar)', value: 'publicacao' },
              { name: 'Livros (onde os livros aparecem)', value: 'livros' },
              { name: 'Feedback (painel com o botão de feedback)', value: 'feedback' },
              { name: 'Onde postar os feedbacks (opcional)', value: 'feedbacks' }
            )
        )
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
        .setName('categoria')
        .setDescription('Categoria dos canais temporários de publicação (vazio = remover)')
        .addChannelOption((o) =>
          o.setName('categoria').setDescription('A categoria').setRequired(false).addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('staff')
        .setDescription('Cargo da staff que enxerga os canais temporários')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('sinopse')
        .setDescription('Mínimo de linhas da sinopse (padrão: 20)')
        .addIntegerOption((o) =>
          o.setName('linhas').setDescription('Quantidade de linhas').setRequired(true).setMinValue(1).setMaxValue(60)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Posta o painel com o botão em um canal')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual painel')
            .setRequired(true)
            .addChoices({ name: 'Publicar livro', value: 'publicacao' }, { name: 'Dar feedback', value: 'feedback' })
        )
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Onde postar (se vazio, usa o canal configurado)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o título e o texto de um painel')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual painel')
            .setRequired(true)
            .addChoices(
              { name: 'Painel de publicação', value: 'painelPublicacao' },
              { name: 'Painel de feedback', value: 'painelFeedback' }
            )
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') return status(interaction);

    if (sub === 'canal') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');
      db.set(`config.livraria.${CHAVES_CANAL[tipo]}`, canal.id);
      return responder(interaction, `✅ Canal definido: ${canal}`);
    }

    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      if (!cat) {
        db.remover('config.livraria.categoria');
        return responder(interaction, '✅ Categoria removida.');
      }
      db.set('config.livraria.categoria', cat.id);
      return responder(interaction, `✅ Categoria definida: ${cat}`);
    }

    if (sub === 'staff') {
      const cargo = interaction.options.getRole('cargo');
      db.set('config.livraria.staff', cargo.id);
      return responder(interaction, `✅ A staff (${cargo}) vai enxergar os canais temporários.`);
    }

    if (sub === 'sinopse') {
      const n = interaction.options.getInteger('linhas');
      db.set('config.livraria.minLinhas', n);
      return responder(interaction, `✅ A sinopse precisa ter no mínimo **${n}** linhas.`);
    }

    if (sub === 'painel') {
      const tipo = interaction.options.getString('tipo');
      const chaveCfg = tipo === 'publicacao' ? 'canalPublicacao' : 'canalFeedback';
      const escolhido = interaction.options.getChannel('canal');
      const canal = escolhido || interaction.guild.channels.cache.get(N.cfg(chaveCfg));
      if (!canal) {
        return responder(interaction, '❌ Defina o canal com `/livraria canal` ou escolha um canal neste comando.');
      }
      if (escolhido) db.set(`config.livraria.${chaveCfg}`, escolhido.id);

      const msg = N.mensagem(tipo === 'publicacao' ? 'painelPublicacao' : 'painelFeedback');
      const vars = { linhas: String(N.minLinhas()) };
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle(N.preencher(msg.titulo, vars))
        .setDescription(N.preencher(msg.texto, vars));
      const botao =
        tipo === 'publicacao'
          ? new ButtonBuilder().setCustomId('livraria:abrir').setLabel('Publicar livro').setEmoji('📖').setStyle(ButtonStyle.Primary)
          : new ButtonBuilder().setCustomId('livraria:feedback').setLabel('Dar feedback').setEmoji('💬').setStyle(ButtonStyle.Primary);

      await canal.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(botao)] });
      return responder(interaction, `✅ Painel enviado em ${canal}.`);
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const atual = N.mensagem(tipo);
      const campo = (id, label, estilo, max, valor) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(estilo)
            .setMaxLength(max)
            .setRequired(true)
            .setValue(valor.slice(0, max))
        );
      const modal = new ModalBuilder()
        .setCustomId(`livraria:modal:${tipo}`)
        .setTitle('Editar painel')
        .addComponents(
          campo('titulo', 'Título', TextInputStyle.Short, 200, atual.titulo),
          campo('texto', 'Texto da mensagem', TextInputStyle.Paragraph, 2000, atual.texto)
        );
      return interaction.showModal(modal);
    }
  },
};
