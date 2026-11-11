const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const B = require('../blacklist/nucleo');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;
const SEM_PING = { parse: [] };
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: SEM_PING });
const data = (ms) => `<t:${Math.floor(ms / 1000)}:d>`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist de membros vigiados pelo Atlas (só ADM)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Coloca um membro na blacklist (o Atlas passa a vigiar tudo o que ele fizer)')
        .addUserOption((o) => o.setName('membro').setDescription('Quem vai ser vigiado').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Por que ele entrou na lista').setRequired(true).setMaxLength(300))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Tira um membro da blacklist')
        .addUserOption((o) => o.setName('membro').setDescription('Quem sai da lista').setRequired(true))
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra a blacklist e como ela está configurada'))
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Mostra a ficha de um membro vigiado (blacklist ou observação)')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('nota')
        .setDescription('Anota uma observação na ficha de um membro vigiado')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
        .addStringOption((o) => o.setName('texto').setDescription('A anotação').setRequired(true).setMaxLength(250))
    )
    .addSubcommand((s) => s.setName('observados').setDescription('Mostra quem está em observação automática'))
    .addSubcommand((s) =>
      s
        .setName('soltar')
        .setDescription('Tira um membro da observação automática')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('Define o canal que recebe os alertas da blacklist')
        .addChannelOption((o) =>
          o.setName('canal').setDescription('Canal de alertas').setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('cargo')
        .setDescription('Cargo marcado nos alertas suspeitos (deixe vazio para parar de marcar)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo da staff'))
    )
    .addSubcommand((s) =>
      s
        .setName('modo')
        .setDescription('Escolhe se o Atlas avisa só suspeitas ou absolutamente tudo')
        .addBooleanOption((o) =>
          o.setName('completo').setDescription('Sim = avisa tudo que ele fizer; Não = só o que for suspeito').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('resumo')
        .setDescription('Hora do resumo diário (horário de Brasília); sem número, desliga')
        .addIntegerOption((o) => o.setName('hora').setDescription('Hora de 0 a 23').setMinValue(0).setMaxValue(23))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;

    // Só ADM (ou o dono) pode mexer na blacklist
    const ehAdm =
      interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
      interaction.user.id === interaction.guild.ownerId;
    if (!ehAdm) return responder(interaction, '❌ Só administradores podem usar a blacklist.');

    const sub = interaction.options.getSubcommand();

    if (sub === 'adicionar') {
      const user = interaction.options.getUser('membro');
      const membro = interaction.options.getMember('membro');
      const motivo = interaction.options.getString('motivo');

      if (user.bot) return responder(interaction, '❌ Não dá para colocar bots na blacklist.');
      if (user.id === interaction.user.id) return responder(interaction, '❌ Você não pode se colocar na blacklist.');
      if (user.id === interaction.guild.ownerId) return responder(interaction, '❌ O dono do servidor não pode ir para a blacklist.');
      if (membro && membro.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
        return responder(interaction, '❌ Só o dono do servidor pode colocar outro administrador na blacklist.');
      }
      if (B.esta(user.id)) return responder(interaction, `ℹ️ ${user} já está na blacklist.`);

      B.adicionar(user.id, motivo, interaction.user.id);

      const emb = new EmbedBuilder()
        .setColor(B.COR.alerta)
        .setTitle('🕵️ Membro adicionado à blacklist')
        .addFields(
          { name: 'Membro', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
          { name: 'Por', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Motivo', value: motivo.slice(0, 1024) }
        )
        .setTimestamp();
      await B.enviarCanal(interaction.guild, emb);

      let texto = `✅ ${user} entrou na blacklist. A partir de agora o Atlas vigia tudo o que ele fizer e o automod fica mais duro com ele.`;
      if (!B.canalId()) texto += '\n⚠️ Ainda não há canal de alertas. Use `/blacklist canal` para eu saber onde avisar.';
      return responder(interaction, texto);
    }

    if (sub === 'remover') {
      const user = interaction.options.getUser('membro');
      if (!B.esta(user.id)) return responder(interaction, `ℹ️ ${user} não está na blacklist.`);
      B.remover(user.id);

      const emb = new EmbedBuilder()
        .setColor(B.COR.ok)
        .setTitle('✅ Membro removido da blacklist')
        .addFields(
          { name: 'Membro', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
          { name: 'Por', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
      await B.enviarCanal(interaction.guild, emb);
      return responder(interaction, `✅ ${user} saiu da blacklist e o histórico dele foi apagado.`);
    }

    if (sub === 'listar') {
      const todos = B.lista();
      const linhas = todos.map(
        (d, i) => `**${i + 1}.** <@${d.id}> — ${d.motivo}\n↳ por <@${d.por}> em ${data(d.data)}`
      );
      const canal = B.canalId();
      const cargo = B.cargoId();
      const hora = B.resumoHora();
      const emb = new EmbedBuilder()
        .setColor(B.COR.alerta)
        .setTitle(`🕵️ Blacklist (${todos.length})`)
        .setDescription(todos.length ? linhas.join('\n\n').slice(0, 4000) : 'A blacklist está vazia.')
        .addFields(
          { name: 'Canal de alertas', value: canal ? `<#${canal}>` : '*não definido*', inline: true },
          { name: 'Modo', value: B.modoCompleto() ? 'Completo (avisa tudo)' : 'Só suspeitas', inline: true },
          { name: 'Cargo marcado', value: cargo ? `<@&${cargo}>` : '*nenhum*', inline: true },
          { name: 'Resumo diário', value: hora === null ? 'Desligado' : `Todo dia às ${hora}h`, inline: true },
          { name: 'Em observação', value: String(B.listaObservados().length), inline: true }
        );
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'ver') {
      const user = interaction.options.getUser('membro');
      const dados = B.get(user.id);
      const obs = dados ? null : B.observacao(user.id);
      if (!dados && !obs) return responder(interaction, `ℹ️ ${user} não está na blacklist nem em observação.`);

      const hist = B.historico(user.id).slice(-12).reverse();
      const linhas = hist.length
        ? hist.map((h) => `${h.s ? '🚨' : '•'} <t:${Math.floor(h.t / 1000)}:R> ${h.texto}`).join('\n')
        : 'Nada registrado ainda.';

      const hoje = B.estatisticas(user.id);
      const ontem = B.estatisticas(user.id, B.diaLocal(-1));
      const fmt = (e) => `${e.total} ações · 🚨 ${e.suspeitos} · 🤖 ${e.automod}`;

      const ocorr = B.ocorrencias(user.id);
      const ult24 = ocorr.filter((x) => Date.now() - x.t < 86400000).length;
      const cats = {};
      for (const o of ocorr) cats[o.categoria] = (cats[o.categoria] || 0) + 1;
      const catsTxt = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c} (${n})`).join(', ');

      const avisos = N.avisosDe(user.id).length;

      const emb = new EmbedBuilder()
        .setColor(dados ? B.COR.alerta : B.COR.obs)
        .setTitle(`${dados ? '🕵️ Blacklist' : '👁️ Observação'}: ${user.username}`)
        .setDescription(
          dados
            ? `**Motivo:** ${dados.motivo}\n**Por:** <@${dados.por}> em ${data(dados.data)}`
            : `**Motivo:** ${obs.motivo}\n**Desde:** ${data(obs.desde)} · **até** ${data(obs.ate)}`
        )
        .addFields(
          { name: 'Hoje', value: fmt(hoje), inline: true },
          { name: 'Ontem', value: fmt(ontem), inline: true },
          { name: 'Advertências', value: `${avisos}/${N.limite()}`, inline: true },
          { name: 'Automod', value: ocorr.length ? `${ocorr.length} bloqueios (${ult24} nas últimas 24h)\n${catsTxt}` : 'Nenhum bloqueio' },
          { name: 'Últimas atividades', value: linhas.slice(0, 1020) }
        );
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'nota') {
      const user = interaction.options.getUser('membro');
      const texto = interaction.options.getString('texto');
      if (!B.vigiado(user.id)) return responder(interaction, `ℹ️ ${user} não está na blacklist nem em observação.`);
      B.anotar(user.id, `📝 Nota de ${interaction.user.username}: ${texto}`, false);
      return responder(interaction, `✅ Nota anotada na ficha de ${user}. Veja com \`/blacklist ver\`.`);
    }

    if (sub === 'observados') {
      const todos = B.listaObservados();
      if (!todos.length) return responder(interaction, 'ℹ️ Ninguém está em observação agora.');
      const linhas = todos.map((d) => `<@${d.id}> — ${d.motivo}\n↳ até ${data(d.ate)}`);
      const emb = new EmbedBuilder()
        .setColor(B.COR.obs)
        .setTitle(`👁️ Em observação (${todos.length})`)
        .setDescription(linhas.join('\n\n').slice(0, 4000));
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'soltar') {
      const user = interaction.options.getUser('membro');
      if (!B.soltar(user.id)) return responder(interaction, `ℹ️ ${user} não está em observação.`);
      return responder(interaction, `✅ ${user} saiu da observação.`);
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.blacklist.canal', canal.id);
      return responder(interaction, `✅ Os alertas da blacklist agora vão para ${canal}.`);
    }

    if (sub === 'cargo') {
      const cargo = interaction.options.getRole('cargo');
      if (!cargo) {
        db.remover('config.blacklist.cargo');
        return responder(interaction, '✅ Os alertas não marcam mais nenhum cargo.');
      }
      db.set('config.blacklist.cargo', cargo.id);
      return responder(interaction, `✅ Os alertas suspeitos vão marcar ${cargo} (no máximo 1 vez a cada 5 minutos por membro).`);
    }

    if (sub === 'modo') {
      const completo = interaction.options.getBoolean('completo');
      db.set('config.blacklist.completo', completo);
      return responder(
        interaction,
        completo
          ? '✅ Modo **completo**: o Atlas avisa tudo o que os membros vigiados fizerem.'
          : '✅ Modo **só suspeitas**: o Atlas avisa o que parecer suspeito e quando eles entram numa call. O resto fica na ficha (`/blacklist ver`).'
      );
    }

    if (sub === 'resumo') {
      const hora = interaction.options.getInteger('hora');
      if (hora === null) {
        db.set('config.blacklist.resumo', false);
        return responder(interaction, '✅ Resumo diário **desligado**.');
      }
      db.set('config.blacklist.resumo', hora);
      return responder(interaction, `✅ O resumo diário do dia anterior sai todo dia às **${hora}h** (horário de Brasília), se houve atividade.`);
    }
  },
};
