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
const N = require('../ticket/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const MAX_TIPOS = 15;

function status(interaction) {
  const cat = N.cfg('categoria');
  const log = N.cfg('logCanal');
  const staff = N.cfgLista('staff').map((id) => `<@&${id}>`).join(' ');
  const tiposTxt = N.tipos().map((t) => `${t.emoji || '•'} ${t.nome}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(N.COR)
    .setTitle('🎫 Tickets do Atlas')
    .addFields(
      { name: 'Categoria dos tickets', value: cat ? `<#${cat}>` : 'não definida (os canais ficam soltos)' },
      { name: 'Canal de logs', value: log ? `<#${log}>` : 'não definido' },
      { name: 'Cargos da staff', value: staff || 'nenhum (só quem tem Gerenciar servidor)' },
      { name: 'Limite por membro', value: String(N.limite()), inline: true },
      { name: 'Marcar staff ao abrir', value: N.cfg('pingStaff', true) ? 'sim' : 'não', inline: true },
      { name: 'Categorias de ticket', value: tiposTxt.slice(0, 1000) }
    );
  return interaction.reply({ embeds: [embed], flags: EPH });
}

function linhasBotoes(tipos) {
  const rows = [];
  const lista = tipos.slice(0, MAX_TIPOS);
  for (let i = 0; i < lista.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const t of lista.slice(i, i + 5)) {
      const b = new ButtonBuilder()
        .setCustomId(`ticket:novo:${t.id}`)
        .setLabel(t.nome.slice(0, 80))
        .setStyle(ButtonStyle.Primary);
      if (t.emoji) b.setEmoji(t.emoji);
      row.addComponents(b);
    }
    rows.push(row);
  }
  return rows;
}

async function tipo(interaction, sub) {
  const lista = [...N.tipos()];

  if (sub === 'listar') {
    return responder(interaction, lista.map((t, i) => `**${i + 1}.** ${t.emoji || ''} ${t.nome} — ${t.desc || ''}`).join('\n'));
  }
  if (sub === 'adicionar') {
    if (lista.length >= MAX_TIPOS) return responder(interaction, `❌ O máximo é ${MAX_TIPOS} categorias.`);
    const nome = interaction.options.getString('nome').trim();
    const emoji = (interaction.options.getString('emoji') || '').trim();
    const desc = (interaction.options.getString('descricao') || '').trim();
    if (emoji && !N.emojiValido(emoji)) {
      return responder(interaction, '❌ Emoji inválido. Use um emoji normal (ex.: 🎫) ou um emoji do servidor.');
    }
    lista.push({ id: N.proximoIdTipo(), nome, emoji, desc });
    db.set('config.ticket.tipos', lista);
    return responder(interaction, `✅ Categoria **${nome}** adicionada. Poste o painel de novo com \`/ticketconfig painel\`.`);
  }
  if (sub === 'remover') {
    const i = interaction.options.getInteger('numero') - 1;
    if (!lista[i]) return responder(interaction, '❌ Não existe categoria com esse número.');
    if (lista.length === 1) return responder(interaction, '❌ Precisa sobrar pelo menos 1 categoria.');
    const [removida] = lista.splice(i, 1);
    db.set('config.ticket.tipos', lista);
    return responder(interaction, `🗑️ Categoria **${removida.nome}** removida. Poste o painel de novo com \`/ticketconfig painel\`.`);
  }
}

async function staff(interaction, sub) {
  const lista = N.cfgLista('staff');
  if (sub === 'listar') {
    return responder(interaction, lista.length ? lista.map((id) => `<@&${id}>`).join('\n') : 'Nenhum cargo definido.');
  }
  const cargo = interaction.options.getRole('cargo');
  if (sub === 'adicionar') {
    if (lista.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo já está na lista.');
    db.set('config.ticket.staff', [...lista, cargo.id]);
    return responder(interaction, `✅ ${cargo} agora atende tickets.`);
  }
  if (sub === 'remover') {
    if (!lista.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo não está na lista.');
    db.set('config.ticket.staff', lista.filter((id) => id !== cargo.id));
    return responder(interaction, `🗑️ ${cargo} removido da staff de tickets.`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketconfig')
    .setDescription('Configura o sistema de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração atual'))
    .addSubcommand((s) =>
      s
        .setName('categoria')
        .setDescription('Categoria onde os canais de ticket são criados (vazio = remover)')
        .addChannelOption((o) =>
          o.setName('categoria').setDescription('A categoria').addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('logs')
        .setDescription('Canal onde as transcrições são enviadas')
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
        .setDescription('Quantos tickets cada membro pode ter abertos ao mesmo tempo')
        .addIntegerOption((o) =>
          o.setName('quantidade').setDescription('Quantidade').setRequired(true).setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('pingstaff')
        .setDescription('Marcar os cargos da staff quando um ticket abrir')
        .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Posta o painel de tickets em um canal')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Onde postar')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o texto do painel ou da abertura do ticket')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual mensagem')
            .setRequired(true)
            .addChoices({ name: 'Painel', value: 'painel' }, { name: 'Abertura do ticket', value: 'abertura' })
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName('staff')
        .setDescription('Cargos que atendem tickets')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Adiciona um cargo')
            .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('remover')
            .setDescription('Remove um cargo')
            .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista os cargos'))
    )
    .addSubcommandGroup((g) =>
      g
        .setName('tipo')
        .setDescription('Categorias de ticket')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Adiciona uma categoria')
            .addStringOption((o) => o.setName('nome').setDescription('Nome do botão').setRequired(true).setMaxLength(30))
            .addStringOption((o) => o.setName('emoji').setDescription('Emoji do botão (opcional)'))
            .addStringOption((o) => o.setName('descricao').setDescription('Descrição curta (opcional)').setMaxLength(80))
        )
        .addSubcommand((s) =>
          s
            .setName('remover')
            .setDescription('Remove uma categoria pelo número')
            .addIntegerOption((o) =>
              o.setName('numero').setDescription('Número (veja em listar)').setRequired(true).setMinValue(1)
            )
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista as categorias'))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');

    const grupo = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (grupo === 'staff') return staff(interaction, sub);
    if (grupo === 'tipo') return tipo(interaction, sub);

    if (sub === 'status') return status(interaction);

    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      if (!cat) {
        db.remover('config.ticket.categoria');
        return responder(interaction, '✅ Categoria removida.');
      }
      db.set('config.ticket.categoria', cat.id);
      return responder(interaction, `✅ Os tickets serão criados em ${cat}.`);
    }

    if (sub === 'logs') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.ticket.logCanal', canal.id);
      return responder(interaction, `✅ Transcrições serão enviadas em ${canal}.`);
    }

    if (sub === 'limite') {
      const n = interaction.options.getInteger('quantidade');
      db.set('config.ticket.limite', n);
      return responder(interaction, `✅ Cada membro pode ter até **${n}** ticket(s) aberto(s).`);
    }

    if (sub === 'pingstaff') {
      const ligado = interaction.options.getBoolean('ligado');
      db.set('config.ticket.pingStaff', ligado);
      return responder(interaction, ligado ? '✅ A staff será marcada ao abrir um ticket.' : '✅ A staff não será mais marcada.');
    }

    if (sub === 'painel') {
      const canal = interaction.options.getChannel('canal');
      const msg = N.mensagem('painel');
      const tipos = N.tipos().slice(0, MAX_TIPOS);
      const lista = tipos.map((t) => `${t.emoji ? t.emoji + ' ' : ''}**${t.nome}**${t.desc ? ' — ' + t.desc : ''}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(N.COR)
        .setTitle(msg.titulo)
        .setDescription(`${msg.texto}\n\n${lista}`.slice(0, 4096));
      await canal.send({ embeds: [embed], components: linhasBotoes(tipos) });
      return responder(interaction, `✅ Painel enviado em ${canal}.`);
    }

    if (sub === 'mensagem') {
      const qual = interaction.options.getString('tipo');
      const atual = N.mensagem(qual);
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
        .setCustomId(`ticket:cfgmodal:${qual}`)
        .setTitle('Editar mensagem')
        .addComponents(
          campo('titulo', 'Título', TextInputStyle.Short, 200, atual.titulo),
          campo('texto', 'Texto da mensagem', TextInputStyle.Paragraph, 2000, atual.texto)
        );
      return interaction.showModal(modal);
    }
  },
};
