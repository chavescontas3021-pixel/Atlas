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
const N = require('../noturno/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

function status(interaction) {
  const fecharH = N.horaFechar();
  const abrirH = N.horaAbrir();
  const aviso = N.minutosAviso();
  const cut = (t) => (t.length > 1000 ? t.slice(0, 1000) + '…' : t) || 'nenhum';

  const canais = N.cfgLista('canais').map((id) => `<#${id}>`).join(' ');
  const cats = N.cfgLista('categorias').map((id) => `<#${id}>`).join(' ');
  const cargos = ['@everyone', ...N.cfgLista('cargos').map((id) => `<@&${id}>`)].join(' ');
  const avisoCanal = N.cfg('avisoCanal');
  const dorminhoca = N.cfg('cargoDorminhoca');

  const embed = new EmbedBuilder()
    .setColor(0x5b6ee1)
    .setTitle('🌙 Fechamento noturno')
    .addFields(
      {
        name: 'Estado',
        value: `${N.cfg('ativo', false) ? '🟢 Ligado' : '🔴 Desligado'}\nChats trancados agora: ${
          db.get('noturno.trancado', false) ? '🔒 sim' : '🔓 não'
        }`,
      },
      {
        name: 'Horários (Brasília)',
        value:
          `Fecha às **${fecharH}** (aviso às ${N.deMin(N.paraMin(fecharH) - aviso)})\n` +
          `Abre às **${abrirH}** (aviso às ${N.deMin(N.paraMin(abrirH) - aviso)})`,
      },
      { name: 'Canal de avisos', value: avisoCanal ? `<#${avisoCanal}>` : 'não definido' },
      { name: 'Cargo "house dorminhoca"', value: dorminhoca ? `<@&${dorminhoca}>` : 'não definido' },
      { name: 'Categorias bloqueadas', value: cut(cats) },
      { name: 'Chats bloqueados (soltos)', value: cut(canais) },
      { name: 'Cargos afetados', value: cut(cargos) }
    );
  return interaction.reply({ embeds: [embed], flags: EPH });
}

async function chat(interaction, sub) {
  const canais = N.cfgLista('canais');
  const cats = N.cfgLista('categorias');

  if (sub === 'listar') {
    return responder(
      interaction,
      `**Categorias:** ${cats.map((id) => `<#${id}>`).join(' ') || 'nenhuma'}\n` +
        `**Chats soltos:** ${canais.map((id) => `<#${id}>`).join(' ') || 'nenhum'}`
    );
  }

  const alvo = interaction.options.getChannel('canal');
  const ehCategoria = alvo.type === ChannelType.GuildCategory;
  const lista = ehCategoria ? cats : canais;
  const chave = ehCategoria ? 'categorias' : 'canais';

  if (sub === 'adicionar') {
    if (lista.includes(alvo.id)) return responder(interaction, 'ℹ️ Esse já está na lista.');
    db.set(`config.noturno.${chave}`, [...lista, alvo.id]);
    return responder(
      interaction,
      ehCategoria
        ? `✅ Todos os chats da categoria ${alvo} serão bloqueados.`
        : `✅ O chat ${alvo} será bloqueado.`
    );
  }
  if (sub === 'remover') {
    if (!lista.includes(alvo.id)) return responder(interaction, 'ℹ️ Esse não está na lista.');
    db.set(`config.noturno.${chave}`, lista.filter((id) => id !== alvo.id));
    return responder(interaction, `🗑️ Removido: ${alvo}`);
  }
}

async function afetados(interaction, sub) {
  const lista = N.cfgLista('cargos');

  if (sub === 'listar') {
    return responder(interaction, ['@everyone', ...lista.map((id) => `<@&${id}>`)].join('\n'));
  }
  const cargo = interaction.options.getRole('cargo');
  if (sub === 'adicionar') {
    if (cargo.id === interaction.guild.id) return responder(interaction, 'ℹ️ O @everyone já é sempre bloqueado.');
    if (lista.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo já está na lista.');
    db.set('config.noturno.cargos', [...lista, cargo.id]);
    return responder(interaction, `✅ O cargo ${cargo} também será bloqueado à noite.`);
  }
  if (sub === 'remover') {
    if (!lista.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo não está na lista.');
    db.set('config.noturno.cargos', lista.filter((id) => id !== cargo.id));
    return responder(interaction, `🗑️ Removido: ${cargo}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noturno')
    .setDescription('Configura o fechamento automático dos chats à noite')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração atual'))
    .addSubcommand((s) =>
      s
        .setName('ativar')
        .setDescription('Liga ou desliga o fechamento automático')
        .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('horario')
        .setDescription('Define os horários de fechar e abrir (ex.: 00:00 e 06:00)')
        .addStringOption((o) => o.setName('fechar').setDescription('Hora de fechar, ex.: 00:00').setRequired(false))
        .addStringOption((o) => o.setName('abrir').setDescription('Hora de abrir, ex.: 06:00').setRequired(false))
    )
    .addSubcommand((s) =>
      s
        .setName('aviso')
        .setDescription('Quantos minutos antes os avisos são enviados (padrão: 10)')
        .addIntegerOption((o) =>
          o.setName('minutos').setDescription('Minutos').setRequired(true).setMinValue(1).setMaxValue(120)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('canalaviso')
        .setDescription('Canal onde os avisos são enviados')
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
        .setName('dorminhoca')
        .setDescription('Cargo marcado nos avisos (house dorminhoca)')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o título e o texto de uma mensagem')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual mensagem')
            .setRequired(true)
            .addChoices(
              { name: 'Aviso antes de fechar', value: 'avisoFechar' },
              { name: 'Chats fechados', value: 'fechou' },
              { name: 'Aviso antes de abrir', value: 'avisoAbrir' },
              { name: 'Chats abertos', value: 'abriu' }
            )
        )
    )
    .addSubcommand((s) => s.setName('fechar').setDescription('Fecha os chats agora (manual)'))
    .addSubcommand((s) => s.setName('abrir').setDescription('Abre os chats agora (manual)'))
    .addSubcommandGroup((g) =>
      g
        .setName('chat')
        .setDescription('Quais chats são bloqueados')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Adiciona um chat ou uma categoria inteira')
            .addChannelOption((o) =>
              o
                .setName('canal')
                .setDescription('Chat ou categoria')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildCategory)
            )
        )
        .addSubcommand((s) =>
          s
            .setName('remover')
            .setDescription('Remove um chat ou uma categoria da lista')
            .addChannelOption((o) =>
              o
                .setName('canal')
                .setDescription('Chat ou categoria')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildCategory)
            )
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista o que é bloqueado'))
    )
    .addSubcommandGroup((g) =>
      g
        .setName('afetados')
        .setDescription('Cargos que ficam sem poder falar à noite (além do @everyone)')
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
        .addSubcommand((s) => s.setName('listar').setDescription('Lista os cargos afetados'))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');

    const grupo = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (grupo === 'chat') return chat(interaction, sub);
    if (grupo === 'afetados') return afetados(interaction, sub);

    if (sub === 'status') return status(interaction);

    if (sub === 'ativar') {
      const ligado = interaction.options.getBoolean('ligado');
      db.set('config.noturno.ativo', ligado);
      if (!ligado && db.get('noturno.trancado', false)) {
        await interaction.deferReply({ flags: EPH });
        await N.abrir(interaction.guild, 'Fechamento noturno desligado');
        return interaction.editReply('🔴 Desligado. Como os chats estavam trancados, eu abri todos.');
      }
      return responder(interaction, ligado ? '🟢 Fechamento noturno ligado!' : '🔴 Fechamento noturno desligado.');
    }

    if (sub === 'horario') {
      const f = interaction.options.getString('fechar');
      const a = interaction.options.getString('abrir');
      if (f) {
        const hora = N.normalizarHora(f);
        if (!hora) return responder(interaction, '❌ Hora de fechar inválida. Use o formato 00:00.');
        db.set('config.noturno.fechar', hora);
      }
      if (a) {
        const hora = N.normalizarHora(a);
        if (!hora) return responder(interaction, '❌ Hora de abrir inválida. Use o formato 06:00.');
        db.set('config.noturno.abrir', hora);
      }
      return responder(interaction, `✅ Fecha às **${N.horaFechar()}** e abre às **${N.horaAbrir()}** (horário de Brasília).`);
    }

    if (sub === 'aviso') {
      const min = interaction.options.getInteger('minutos');
      db.set('config.noturno.aviso', min);
      return responder(interaction, `✅ Os avisos serão enviados ${min} minutos antes.`);
    }

    if (sub === 'canalaviso') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.noturno.avisoCanal', canal.id);
      return responder(interaction, `✅ Canal de avisos: ${canal}`);
    }

    if (sub === 'dorminhoca') {
      const cargo = interaction.options.getRole('cargo');
      db.set('config.noturno.cargoDorminhoca', cargo.id);
      return responder(interaction, `✅ Cargo marcado nos avisos: ${cargo}`);
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const atual = N.mensagem(tipo);
      const modal = new ModalBuilder()
        .setCustomId(`noturno:modal:${tipo}`)
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

    if (sub === 'fechar' || sub === 'abrir') {
      await interaction.deferReply({ flags: EPH });
      const r =
        sub === 'fechar'
          ? await N.fechar(interaction.guild, 'Fechamento manual')
          : await N.abrir(interaction.guild, 'Abertura manual');
      if (r.canais === 0) {
        return interaction.editReply('ℹ️ Nenhum chat configurado. Use `/noturno chat adicionar`.');
      }
      return interaction.editReply(
        `${sub === 'fechar' ? '🔒 Fechado' : '🔓 Aberto'}: ${r.canais} chat(s), ${r.ok} permissões alteradas` +
          (r.falhas ? `, **${r.falhas} falharam** (veja \`pm2 logs atlas\`).` : '.')
      );
    }
  },
};
