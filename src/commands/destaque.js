const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../destaque/nucleo');

const EPH = MessageFlags.Ephemeral;
const ehStaff = (i) => !!(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.ManageGuild));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('destaque')
    .setDescription('Destaque do mês: o membro mais ativo ganha um cargo')
    .addSubcommand((s) => s.setName('atual').setDescription('Mostra o destaque atual e os últimos'))
    .addSubcommand((s) => s.setName('ranking').setDescription('Ranking de mensagens do mês até agora'))
    .addSubcommand((s) => s.setName('config').setDescription('Configura o destaque (staff)')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo do destaque'))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal do anúncio').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addIntegerOption((o) => o.setName('minimo').setDescription('Mínimo de mensagens para ganhar (padrão 50)').setMinValue(1).setMaxValue(100000))
      .addBooleanOption((o) => o.setName('ativo').setDescription('Liga ou desliga a entrega automática'))
      .addStringOption((o) => o.setName('mensagem').setDescription('Texto do anúncio: {mes} {membro} {n} {cargo}').setMaxLength(1000)))
    .addSubcommand((s) => s.setName('apurar').setDescription('Apura o mês passado agora (staff)')),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use este comando no servidor.', flags: EPH });
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const c = N.cfg();

    if (['config', 'apurar'].includes(sub) && !ehStaff(interaction)) {
      return interaction.reply({ content: '🔒 Só a staff pode usar isso.', flags: EPH });
    }

    if (sub === 'atual') {
      const atuais = db.get('destaque.atuais', []) || [];
      const hist = (db.get('destaque.historico', []) || []).slice(-5).reverse();
      const embed = new EmbedBuilder().setColor(N.COR).setTitle('🏆 Destaque do mês')
        .setDescription(atuais.length ? `Atual: ${atuais.map((u) => `<@${u}>`).join(', ')}` : 'Ainda não há destaque. A apuração acontece na virada do mês.');
      if (hist.length) embed.addFields({ name: 'Anteriores', value: hist.map((h) => `${N.nomeMes(h.mes)} — <@${h.uid}> (${h.n} msgs)`).join('\n') });
      return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }

    if (sub === 'ranking') {
      await interaction.deferReply();
      const mes = N.mesDe();
      const lista = await N.ranking(guild, mes, 10);
      if (!lista.length) return interaction.editReply('Ninguém conversou ainda neste mês. 💤');
      const medalha = ['🥇', '🥈', '🥉'];
      const linhas = lista.map((r, i) => `${medalha[i] || `**${i + 1}.**`} <@${r.uid}> — ${r.n} mensagens`);
      const embed = new EmbedBuilder().setColor(N.COR).setTitle(`📈 Corrida do destaque — ${N.nomeMes(mes)}`)
        .setDescription(linhas.join('\n')).setFooter({ text: `Mínimo para ganhar: ${c.minimo ?? N.MINIMO_PADRAO} mensagens` });
      return interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    }

    if (sub === 'apurar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.apurar(guild, N.mesAnterior(N.mesDe()));
      if (!r.ok) return interaction.editReply(r.motivo);
      if (r.vazio) return interaction.editReply(`Ninguém atingiu o mínimo de ${r.minimo} mensagens no mês passado. O cargo foi retirado de quem tinha.`);
      return interaction.editReply(`✅ Destaque entregue a <@${r.uid}> (${r.n} mensagens)${r.deu ? '' : ' — mas não consegui dar o cargo (confira se o cargo do Atlas está acima dele).'}`);
    }

    // ---------- config ----------
    const cargo = interaction.options.getRole('cargo');
    const canal = interaction.options.getChannel('canal');
    const minimo = interaction.options.getInteger('minimo');
    const ativo = interaction.options.getBoolean('ativo');
    const mensagem = interaction.options.getString('mensagem');
    if (cargo) db.set('config.destaque.cargo', cargo.id);
    if (canal) db.set('config.destaque.canal', canal.id);
    if (minimo !== null) db.set('config.destaque.minimo', minimo);
    if (ativo !== null) db.set('config.destaque.ativo', ativo);
    if (mensagem) db.set('config.destaque.mensagem', mensagem);
    const n = N.cfg();
    const embed = new EmbedBuilder().setColor(N.COR).setTitle('⚙️ Destaque do mês').addFields(
      { name: 'Cargo', value: n.cargo ? `<@&${n.cargo}>` : 'não definido', inline: true },
      { name: 'Canal do anúncio', value: n.canal ? `<#${n.canal}>` : 'não definido', inline: true },
      { name: 'Mínimo de mensagens', value: `${n.minimo ?? N.MINIMO_PADRAO}`, inline: true },
      { name: 'Entrega automática', value: n.ativo ? '✅ ligada' : '❌ desligada', inline: true },
      { name: 'Mensagem', value: (n.mensagem || N.mensagemPadrao).slice(0, 1000) },
    );
    return interaction.reply({ embeds: [embed], flags: EPH });
  },
};
