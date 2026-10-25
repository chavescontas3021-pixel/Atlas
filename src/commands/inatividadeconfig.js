const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../inatividade/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const textoCanal = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inatividadeconfig')
    .setDescription('Configura o controle de inatividade (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga a verificação automática')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar?').setRequired(true)))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal onde as pessoas justificam')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true).addChannelTypes(...textoCanal)))
    .addSubcommand((s) => s.setName('avisos').setDescription('Canal onde o bot marca quem está sumida (opcional)')
      .addChannelOption((o) => o.setName('canal').setDescription('Deixe vazio para desligar').addChannelTypes(...textoCanal)))
    .addSubcommand((s) => s.setName('dias').setDescription('Dias sem aparecer para avisar e para liberar a vaga')
      .addIntegerOption((o) => o.setName('aviso').setDescription('Dias até o aviso').setRequired(true).setMinValue(1).setMaxValue(180))
      .addIntegerOption((o) => o.setName('liberar').setDescription('Dias até liberar a vaga').setRequired(true).setMinValue(2).setMaxValue(365)))
    .addSubcommand((s) => s.setName('maximo').setDescription('Maior tempo que alguém pode justificar')
      .addIntegerOption((o) => o.setName('dias').setDescription('1 a 180').setRequired(true).setMinValue(1).setMaxValue(180)))
    .addSubcommand((s) => s.setName('painel').setDescription('Publica o botão de justificar no canal de justificativas'))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Edita um texto do sistema')
      .addStringOption((o) => o.setName('tipo').setDescription('Qual texto').setRequired(true).addChoices(
        { name: 'Painel (botão)', value: 'painel' },
        { name: 'Aviso de inatividade', value: 'aviso' },
        { name: 'Vaga liberada', value: 'liberada' },
      )))
    .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela a justificativa de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) => s.setName('lista').setDescription('Justificativas ativas agora')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const c = (k) => N.cfg(k);
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('🌙 Inatividade do Atlas').addFields(
        { name: 'Verificação', value: c('ativo') ? '✅ ligada' : '⏸️ desligada', inline: true },
        { name: 'Canal de justificativas', value: c('canal') ? `<#${c('canal')}>` : 'não definido', inline: true },
        { name: 'Canal de avisos', value: c('canalAviso') ? `<#${c('canalAviso')}>` : 'só DM', inline: true },
        { name: 'Aviso / liberação', value: `${N.avisoDias()} / ${N.liberarDias()} dias`, inline: true },
        { name: 'Máximo a justificar', value: `${N.maxDias()} dias`, inline: true },
        { name: 'Justificativas ativas', value: `${N.justificativas().filter((j) => j.fim > Date.now()).length}`, inline: true },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ativar') {
      const on = interaction.options.getBoolean('ligado');
      if (on && !N.cfg('canal')) return responder(interaction, '❌ Defina antes o canal de justificativas (`/inatividadeconfig canal`).');
      db.set('config.inatividade.ativo', on);
      return responder(interaction, on ? '✅ Verificação ligada. A contagem de dias começa a partir de agora para quem já ocupa vaga.' : '⏸️ Verificação desligada. Nenhuma vaga será liberada.');
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.inatividade.canal', canal.id);
      return responder(interaction, `✅ Justificativas em ${canal}. Use \`/inatividadeconfig painel\` para publicar o botão lá.`);
    }

    if (sub === 'avisos') {
      const canal = interaction.options.getChannel('canal');
      if (!canal) {
        db.remover('config.inatividade.canalAviso');
        return responder(interaction, '✅ Avisos só por DM.');
      }
      db.set('config.inatividade.canalAviso', canal.id);
      return responder(interaction, `✅ Os avisos também serão postados em ${canal}, marcando a pessoa.`);
    }

    if (sub === 'dias') {
      const aviso = interaction.options.getInteger('aviso');
      const liberar = interaction.options.getInteger('liberar');
      if (aviso >= liberar) return responder(interaction, '❌ O aviso precisa vir antes da liberação (número de dias menor).');
      db.set('config.inatividade.avisoDias', aviso);
      db.set('config.inatividade.liberarDias', liberar);
      return responder(interaction, `✅ Aviso com **${aviso}** dias e liberação com **${liberar}** dias sem aparecer.`);
    }

    if (sub === 'maximo') {
      const n = interaction.options.getInteger('dias');
      db.set('config.inatividade.maxDias', n);
      return responder(interaction, `✅ Cada pessoa pode justificar até **${n}** dias.`);
    }

    if (sub === 'painel') {
      const canal = interaction.guild.channels.cache.get(N.cfg('canal'));
      if (!canal) return responder(interaction, '❌ Defina antes o canal (`/inatividadeconfig canal`).');
      await interaction.deferReply({ flags: EPH });
      try {
        await N.publicarPainel(canal);
      } catch {
        return interaction.editReply('❌ Não consegui publicar no canal (falta permissão?).');
      }
      return interaction.editReply(`✅ Botão publicado em ${canal}.`);
    }

    if (sub === 'mensagem') {
      const tipo = interaction.options.getString('tipo');
      const m = N.mensagem(tipo);
      const modal = new ModalBuilder().setCustomId(`inativ:modal:msg:${tipo}`).setTitle('Editar texto');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true).setValue(m.titulo.slice(0, 200))),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('texto').setLabel('Texto (aviso: {usuario} {dias} {restam} {vagas} {canal})').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true).setValue(m.texto.slice(0, 2000))),
      );
      return interaction.showModal(modal);
    }

    if (sub === 'cancelar') {
      const membro = interaction.options.getUser('membro');
      return responder(interaction, N.encerrarJustificativa(membro.id) ? `✅ Justificativa de ${membro} cancelada. A contagem de dias recomeça agora.` : 'Essa pessoa não tem justificativa ativa.');
    }

    if (sub === 'lista') {
      const ativas = N.justificativas().filter((j) => j.fim > Date.now());
      if (!ativas.length) return responder(interaction, 'Nenhuma justificativa ativa.');
      const txt = ativas.map((j) => `🌙 <@${j.userId}> — até <t:${Math.floor(j.fim / 1000)}:D> · ${j.motivo}`).join('\n').slice(0, 4000);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle('Justificativas ativas').setDescription(txt)], flags: EPH, allowedMentions: { parse: [] } });
    }
  },
};
