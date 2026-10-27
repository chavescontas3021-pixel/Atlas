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
const MAX_TIPOS = 15;
const MAX_PAINEIS = 10;
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: { parse: [] } });

const optNum = (o) => o.setName('painel').setDescription('Número do painel (veja em /ticketpainel listar)').setRequired(true).setMinValue(1);
const canaisTexto = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function linhasBotoes(tipos) {
  const rows = [];
  const lista = tipos.slice(0, MAX_TIPOS);
  for (let i = 0; i < lista.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const t of lista.slice(i, i + 5)) {
      const b = new ButtonBuilder().setCustomId(`ticket:novo:${t.id}`).setLabel(t.nome.slice(0, 80)).setStyle(ButtonStyle.Primary);
      if (t.emoji) b.setEmoji(t.emoji);
      row.addComponents(b);
    }
    rows.push(row);
  }
  return rows;
}

function pegarPainel(interaction) {
  const n = interaction.options.getInteger('painel');
  return N.listaPaineis()[n - 1] || null;
}
const salvar = (p, campo, valor) => db.set(`config.ticket.paineis.${p.id}.${campo}`, valor);
const limparCampo = (p, campo) => db.remover(`config.ticket.paineis.${p.id}.${campo}`);

function resumo(p, n) {
  const tipos = (p.tipos || []).map((t) => `${t.emoji || '•'} ${t.nome}`).join(', ') || '—';
  const staff = (p.staff || []).map((id) => `<@&${id}>`).join(' ') || 'usa a staff geral';
  return `**${n}. ${p.nome}** — categorias: ${tipos}\n   staff: ${staff} • tickets em: ${p.categoria ? `<#${p.categoria}>` : 'categoria geral'} • logs: ${p.logCanal ? `<#${p.logCanal}>` : 'canal geral'}${p.canal ? ` • postado em <#${p.canal}>` : ''}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpainel')
    .setDescription('Painéis de ticket separados (cada um com categorias, staff e logs próprios)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('criar')
        .setDescription('Cria um painel novo')
        .addStringOption((o) => o.setName('nome').setDescription('Nome do painel (ex.: Suporte, Benefícios)').setRequired(true).setMaxLength(40))
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Lista os painéis'))
    .addSubcommand((s) => s.setName('remover').setDescription('Apaga um painel').addIntegerOption(optNum))
    .addSubcommand((s) =>
      s
        .setName('nome')
        .setDescription('Renomeia um painel')
        .addIntegerOption(optNum)
        .addStringOption((o) => o.setName('novo').setDescription('Novo nome').setRequired(true).setMaxLength(40))
    )
    .addSubcommand((s) =>
      s
        .setName('postar')
        .setDescription('Posta o painel em um canal')
        .addIntegerOption(optNum)
        .addChannelOption((o) => o.setName('canal').setDescription('Onde postar').setRequired(true).addChannelTypes(...canaisTexto))
    )
    .addSubcommand((s) =>
      s
        .setName('tipoadicionar')
        .setDescription('Adiciona uma categoria (botão) ao painel')
        .addIntegerOption(optNum)
        .addStringOption((o) => o.setName('nome').setDescription('Nome do botão').setRequired(true).setMaxLength(30))
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji do botão (opcional)'))
        .addStringOption((o) => o.setName('descricao').setDescription('Descrição curta (opcional)').setMaxLength(80))
    )
    .addSubcommand((s) =>
      s
        .setName('tiporemover')
        .setDescription('Remove uma categoria do painel pelo número')
        .addIntegerOption(optNum)
        .addIntegerOption((o) => o.setName('numero').setDescription('Número da categoria (veja em status)').setRequired(true).setMinValue(1))
    )
    .addSubcommand((s) =>
      s
        .setName('staff')
        .setDescription('Define os cargos que atendem este painel')
        .addIntegerOption(optNum)
        .addStringOption((o) =>
          o
            .setName('acao')
            .setDescription('O que fazer')
            .setRequired(true)
            .addChoices(
              { name: 'Adicionar cargo', value: 'adicionar' },
              { name: 'Remover cargo', value: 'remover' },
              { name: 'Usar a staff geral', value: 'limpar' }
            )
        )
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo (não precisa em "usar a staff geral")'))
    )
    .addSubcommand((s) =>
      s
        .setName('categoria')
        .setDescription('Categoria do Discord onde os tickets deste painel nascem (vazio = a geral)')
        .addIntegerOption(optNum)
        .addChannelOption((o) => o.setName('categoria').setDescription('A categoria').addChannelTypes(ChannelType.GuildCategory))
    )
    .addSubcommand((s) =>
      s
        .setName('logs')
        .setDescription('Canal das transcrições deste painel (vazio = o geral)')
        .addIntegerOption(optNum)
        .addChannelOption((o) => o.setName('canal').setDescription('O canal').addChannelTypes(...canaisTexto))
    )
    .addSubcommand((s) =>
      s
        .setName('mensagem')
        .setDescription('Edita o texto do painel ou da abertura do ticket')
        .addIntegerOption(optNum)
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual mensagem')
            .setRequired(true)
            .addChoices({ name: 'Painel', value: 'painel' }, { name: 'Abertura do ticket', value: 'abertura' })
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();
    const lista = N.listaPaineis();

    if (sub === 'criar') {
      if (lista.length >= MAX_PAINEIS) return responder(interaction, `❌ O máximo é ${MAX_PAINEIS} painéis.`);
      const nome = interaction.options.getString('nome').trim();
      const id = N.proximoIdPainel();
      db.set(`config.ticket.paineis.${id}`, {
        id,
        nome,
        criado: Date.now(),
        tipos: [{ id: N.proximoIdTipo(), nome: 'Atendimento', emoji: '🎫', desc: '' }],
        staff: [],
      });
      return responder(
        interaction,
        `✅ Painel **${nome}** criado (número **${lista.length + 1}**).\n` +
          'Agora ajuste com `/ticketpainel tipoadicionar`, `staff`, `categoria`, `logs` e `mensagem`, e poste com `/ticketpainel postar`.'
      );
    }

    if (sub === 'listar') {
      if (!lista.length) {
        return responder(interaction, 'Ainda não há painéis extras. Crie um com `/ticketpainel criar`.\n(O painel original continua sendo configurado com `/ticketconfig`.)');
      }
      return responder(interaction, lista.map((p, i) => resumo(p, i + 1)).join('\n').slice(0, 1900));
    }

    const p = pegarPainel(interaction);
    if (!p) return responder(interaction, '❌ Não existe painel com esse número. Veja em `/ticketpainel listar`.');

    if (sub === 'remover') {
      db.remover(`config.ticket.paineis.${p.id}`);
      return responder(interaction, `🗑️ Painel **${p.nome}** apagado. Tickets já abertos nele continuam funcionando; mensagens antigas do painel param de funcionar.`);
    }

    if (sub === 'nome') {
      const novo = interaction.options.getString('novo').trim();
      salvar(p, 'nome', novo);
      return responder(interaction, `✅ Painel renomeado para **${novo}**.`);
    }

    if (sub === 'postar') {
      const canal = interaction.options.getChannel('canal');
      const tipos = (p.tipos || []).slice(0, MAX_TIPOS);
      if (!tipos.length) return responder(interaction, '❌ Esse painel não tem categorias. Use `/ticketpainel tipoadicionar`.');
      const msg = N.mensagem('painel', p);
      const desc = tipos.map((t) => `${t.emoji ? t.emoji + ' ' : ''}**${t.nome}**${t.desc ? ' — ' + t.desc : ''}`).join('\n');
      const embed = new EmbedBuilder().setColor(N.COR).setTitle(msg.titulo).setDescription(`${msg.texto}\n\n${desc}`.slice(0, 4096));
      try {
        await canal.send({ embeds: [embed], components: linhasBotoes(tipos) });
      } catch (e) {
        return responder(interaction, '⚠️ Não consegui postar nesse canal. Confira se eu tenho permissão de enviar mensagens e links nele.');
      }
      salvar(p, 'canal', canal.id);
      return responder(interaction, `✅ Painel **${p.nome}** enviado em ${canal}.`);
    }

    if (sub === 'tipoadicionar') {
      const tipos = [...(p.tipos || [])];
      if (tipos.length >= MAX_TIPOS) return responder(interaction, `❌ O máximo é ${MAX_TIPOS} categorias por painel.`);
      const nome = interaction.options.getString('nome').trim();
      const emoji = (interaction.options.getString('emoji') || '').trim();
      const desc = (interaction.options.getString('descricao') || '').trim();
      if (emoji && !N.emojiValido(emoji)) return responder(interaction, '❌ Emoji inválido. Use um emoji normal (ex.: 🎫) ou um emoji do servidor.');
      tipos.push({ id: N.proximoIdTipo(), nome, emoji, desc });
      salvar(p, 'tipos', tipos);
      return responder(interaction, `✅ Categoria **${nome}** adicionada ao painel **${p.nome}**. Poste de novo com \`/ticketpainel postar\`.`);
    }

    if (sub === 'tiporemover') {
      const tipos = [...(p.tipos || [])];
      const i = interaction.options.getInteger('numero') - 1;
      if (!tipos[i]) return responder(interaction, '❌ Não existe categoria com esse número.');
      if (tipos.length === 1) return responder(interaction, '❌ Precisa sobrar pelo menos 1 categoria.');
      const [r] = tipos.splice(i, 1);
      salvar(p, 'tipos', tipos);
      return responder(interaction, `🗑️ Categoria **${r.nome}** removida. Poste de novo com \`/ticketpainel postar\`.`);
    }

    if (sub === 'staff') {
      const acao = interaction.options.getString('acao');
      const atual = [...(p.staff || [])];
      if (acao === 'limpar') {
        salvar(p, 'staff', []);
        return responder(interaction, `✅ O painel **${p.nome}** agora usa a staff geral (\`/ticketconfig staff\`).`);
      }
      const cargo = interaction.options.getRole('cargo');
      if (!cargo) return responder(interaction, '❌ Escolha o cargo.');
      if (acao === 'adicionar') {
        if (atual.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo já atende este painel.');
        salvar(p, 'staff', [...atual, cargo.id]);
        return responder(interaction, `✅ ${cargo} agora atende o painel **${p.nome}** (e só quem está na lista dele, não a staff geral).`);
      }
      if (!atual.includes(cargo.id)) return responder(interaction, 'ℹ️ Esse cargo não está na lista deste painel.');
      salvar(p, 'staff', atual.filter((x) => x !== cargo.id));
      return responder(interaction, `🗑️ ${cargo} removido do painel **${p.nome}**.`);
    }

    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      if (!cat) {
        limparCampo(p, 'categoria');
        return responder(interaction, '✅ Esse painel volta a usar a categoria geral.');
      }
      salvar(p, 'categoria', cat.id);
      return responder(interaction, `✅ Tickets do painel **${p.nome}** serão criados em ${cat}.`);
    }

    if (sub === 'logs') {
      const canal = interaction.options.getChannel('canal');
      if (!canal) {
        limparCampo(p, 'logCanal');
        return responder(interaction, '✅ Esse painel volta a usar o canal de logs geral.');
      }
      salvar(p, 'logCanal', canal.id);
      return responder(interaction, `✅ Transcrições do painel **${p.nome}** irão para ${canal}.`);
    }

    if (sub === 'mensagem') {
      const qual = interaction.options.getString('tipo');
      const atual = N.mensagem(qual, p);
      const campo = (id, label, estilo, max, valor) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(estilo).setMaxLength(max).setRequired(true).setValue(valor.slice(0, max))
        );
      const modal = new ModalBuilder()
        .setCustomId(`ticket:pmodal:${p.id}:${qual}`)
        .setTitle(`Mensagem — ${p.nome}`.slice(0, 45))
        .addComponents(
          campo('titulo', 'Título', TextInputStyle.Short, 200, atual.titulo),
          campo('texto', 'Texto da mensagem', TextInputStyle.Paragraph, 2000, atual.texto)
        );
      return interaction.showModal(modal);
    }
  },
};
