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
const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');

const EPH = MessageFlags.Ephemeral;

const CANAIS = [
  { name: 'Pings', value: 'pings' },
  { name: 'Apresentação', value: 'apresentacao' },
  { name: 'Fechar vaga', value: 'fechar_vaga' },
  { name: 'Aniversário', value: 'aniversario' },
  { name: 'Registro', value: 'registro' },
  { name: 'Cor', value: 'cor' },
  { name: 'Avaliar house e staff', value: 'avaliar' },
];

const MENSAGENS = [
  { name: 'Boas-vindas', value: 'boasVindas' },
  { name: 'Passos', value: 'passos' },
  { name: 'Sucesso', value: 'sucesso' },
];

const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

function status(interaction) {
  const canais = U.PASSOS.map((p) => {
    const id = U.cfg(`canais.${p.id}`);
    return `${id ? '✅' : '❌'} ${p.nome}: ${id ? `<#${id}>` : 'não definido'}`;
  }).join('\n');

  const cargo = (k) => {
    const id = U.cfg(`cargos.${k}`);
    return id ? `<@&${id}>` : 'não definido';
  };
  const cat = U.cfg('categoria');

  const embed = new EmbedBuilder()
    .setColor(0xf5a3c7)
    .setTitle('⚙️ Recepção do Atlas')
    .addFields(
      { name: 'Estado', value: U.cfg('ativo', false) ? '🟢 Ligada' : '🔴 Desligada' },
      { name: 'Canais', value: canais },
      {
        name: 'Cargos',
        value: `Sem vaga: ${cargo('semVaga')}\nVerificado: ${cargo('verificado')}\nStaff: ${cargo('staff')}`,
      },
      { name: 'Categoria dos canais', value: cat ? `<#${cat}>` : 'não definida (fica fora de categoria)' },
      {
        name: 'Outros',
        value:
          `Moldes: ${U.moldes().length}\nEmojis: ${U.emojis().length}\n` +
          `Apagar canal após: ${U.cfg('apagarSegundos', U.PADROES.apagarSegundos)}s`,
      }
    );
  return interaction.reply({ embeds: [embed], flags: EPH });
}

async function moldes(interaction, sub) {
  const lista = [...U.moldes()];

  if (sub === 'listar') {
    return responder(interaction, lista.map((m, i) => `${i + 1}. \`${m}\``).join('\n'));
  }
  if (sub === 'adicionar') {
    const texto = interaction.options.getString('texto');
    if (!texto.includes('{personagem}')) return responder(interaction, '❌ O molde precisa ter `{personagem}`.');
    if (lista.length >= 25) return responder(interaction, '❌ O máximo é 25 moldes.');
    lista.push(texto);
    db.set('config.recepcao.moldes', lista);
    return responder(interaction, `✅ Molde adicionado: \`${texto}\``);
  }
  if (sub === 'remover') {
    const i = interaction.options.getInteger('numero') - 1;
    if (!lista[i]) return responder(interaction, '❌ Não existe molde com esse número.');
    if (lista.length === 1) return responder(interaction, '❌ Precisa sobrar pelo menos 1 molde.');
    const [removido] = lista.splice(i, 1);
    db.set('config.recepcao.moldes', lista);
    return responder(interaction, `🗑️ Molde removido: \`${removido}\``);
  }
}

async function emojis(interaction, sub) {
  const lista = [...U.emojis()];

  if (sub === 'listar') {
    return responder(interaction, lista.map((e, i) => `${i + 1}. ${e}`).join('\n'));
  }
  if (sub === 'adicionar') {
    const emoji = interaction.options.getString('emoji').trim();
    if (!emoji || /[\p{L}\p{N}]/u.test(emoji) || Array.from(emoji).length > 8) {
      return responder(interaction, '❌ Envie só um emoji ou símbolo (sem letras), como 🌸 ou ✦.');
    }
    if (lista.length >= 25) return responder(interaction, '❌ O máximo é 25 emojis.');
    lista.push(emoji);
    db.set('config.recepcao.emojis', lista);
    return responder(interaction, `✅ Emoji adicionado: ${emoji}`);
  }
  if (sub === 'remover') {
    const i = interaction.options.getInteger('numero') - 1;
    if (!lista[i]) return responder(interaction, '❌ Não existe emoji com esse número.');
    if (lista.length === 1) return responder(interaction, '❌ Precisa sobrar pelo menos 1 emoji.');
    const [removido] = lista.splice(i, 1);
    db.set('config.recepcao.emojis', lista);
    return responder(interaction, `🗑️ Emoji removido: ${removido}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcao')
    .setDescription('Configura a recepção automática do Atlas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração atual'))
    .addSubcommand((s) =>
      s
        .setName('ativar')
        .setDescription('Liga ou desliga a recepção automática')
        .addBooleanOption((o) =>
          o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true)
        )
    )
    .addSubcommand((s) => s.setName('testar').setDescription('Cria uma recepção de teste para você'))
    .addSubcommand((s) =>
      s
        .setName('testarvaga')
        .setDescription('Testa se um personagem está ocupado no fechar vaga')
        .addStringOption((o) => o.setName('nome').setDescription('Nome do personagem').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('Define um dos canais usados nos passos')
        .addStringOption((o) =>
          o.setName('tipo').setDescription('Qual canal').setRequired(true).addChoices(...CANAIS)
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
        .setName('cargo')
        .setDescription('Define os cargos da recepção')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual cargo')
            .setRequired(true)
            .addChoices(
              { name: 'Sem vaga', value: 'semVaga' },
              { name: 'Verificado', value: 'verificado' },
              { name: 'Staff (vê os canais de recepção)', value: 'staff' }
            )
        )
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('categoria')
        .setDescription('Categoria onde os canais de recepção são criados (vazio = remover)')
        .addChannelOption((o) =>
          o
            .setName('categoria')
            .setDescription('A categoria')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('apagar')
        .setDescription('Quantos segundos até apagar o canal depois de verificar (0 = não apagar)')
        .addIntegerOption((o) =>
          o.setName('segundos').setDescription('Segundos').setRequired(true).setMinValue(0).setMaxValue(3600)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o título e o texto de uma mensagem da recepção')
        .addStringOption((o) =>
          o.setName('tipo').setDescription('Qual mensagem').setRequired(true).addChoices(...MENSAGENS)
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName('molde')
        .setDescription('Moldes de nome')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Adiciona um molde')
            .addStringOption((o) =>
              o
                .setName('texto')
                .setDescription('Use {personagem} e {emoji}. Ex.: {emoji} {personagem}')
                .setRequired(true)
                .setMaxLength(60)
            )
        )
        .addSubcommand((s) =>
          s
            .setName('remover')
            .setDescription('Remove um molde pelo número')
            .addIntegerOption((o) =>
              o.setName('numero').setDescription('Número (veja em listar)').setRequired(true).setMinValue(1)
            )
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista os moldes'))
    )
    .addSubcommandGroup((g) =>
      g
        .setName('emoji')
        .setDescription('Emojis disponíveis no menu')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Adiciona um emoji')
            .addStringOption((o) => o.setName('emoji').setDescription('O emoji').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('remover')
            .setDescription('Remove um emoji pelo número')
            .addIntegerOption((o) =>
              o.setName('numero').setDescription('Número (veja em listar)').setRequired(true).setMinValue(1)
            )
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista os emojis'))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');

    const grupo = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (grupo === 'molde') return moldes(interaction, sub);
    if (grupo === 'emoji') return emojis(interaction, sub);

    if (sub === 'testarvaga') {
      await interaction.deferReply({ flags: EPH });
      const nome = interaction.options.getString('nome');
      const r = await U.procurarVaga(interaction.guild, nome, interaction.user.id);
      if (r.erro) return interaction.editReply(`⚠️ ${r.erro}`);
      const achou = r.ocupada || r.fechada;
      return interaction.editReply(
        `Li **${r.lidas}** mensagens do canal.\n` +
          (achou ? `🔒 Encontrei: ${achou.url}` : '🔓 Não encontrei esse nome (vaga livre).')
      );
    }

    if (sub === 'status') return status(interaction);

    if (sub === 'ativar') {
      const ligado = interaction.options.getBoolean('ligado');
      db.set('config.recepcao.ativo', ligado);
      return responder(interaction, ligado ? '🟢 Recepção ligada!' : '🔴 Recepção desligada.');
    }

    if (sub === 'testar') {
      await interaction.deferReply({ flags: EPH });
      const canal = await F.iniciarRecepcao(interaction.member, { teste: true });
      return interaction.editReply(`🧪 Recepção de teste criada: ${canal}`);
    }

    if (sub === 'canal') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');
      db.set(`config.recepcao.canais.${tipo}`, canal.id);
      return responder(interaction, `✅ Canal definido: ${canal}`);
    }

    if (sub === 'cargo') {
      const tipo = interaction.options.getString('tipo');
      const cargo = interaction.options.getRole('cargo');
      if (cargo.managed) return responder(interaction, '❌ Esse cargo é gerenciado por uma integração.');
      db.set(`config.recepcao.cargos.${tipo}`, cargo.id);

      let aviso = '';
      const eu = interaction.guild.members.me;
      if (tipo !== 'staff' && eu && cargo.comparePositionTo(eu.roles.highest) >= 0) {
        aviso = '\n⚠️ Esse cargo está acima do cargo do Atlas. Arraste o cargo do Atlas para cima dele.';
      }
      return responder(interaction, `✅ Cargo definido: ${cargo}${aviso}`);
    }

    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      if (!cat) {
        db.remover('config.recepcao.categoria');
        return responder(interaction, '✅ Categoria removida.');
      }
      db.set('config.recepcao.categoria', cat.id);
      return responder(interaction, `✅ Categoria definida: ${cat}`);
    }

    if (sub === 'apagar') {
      const seg = interaction.options.getInteger('segundos');
      db.set('config.recepcao.apagarSegundos', seg);
      return responder(interaction, seg > 0 ? `✅ O canal será apagado ${seg}s após verificar.` : '✅ O canal não será apagado.');
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const atual = U.mensagem(tipo);
      const modal = new ModalBuilder()
        .setCustomId(`recepcao:modal:${tipo}`)
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
