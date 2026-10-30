const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../vagas/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const vagaOpt = (o) => o.setName('vaga').setDescription('Qual vaga').setRequired(true).setAutocomplete(true);
const textoCanal = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vagaadmin')
    .setDescription('Administra as vagas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('criar').setDescription('Cria uma vaga')
      .addStringOption((o) => o.setName('nome').setDescription('Nome da vaga').setRequired(true).setMaxLength(60))
      .addStringOption((o) => o.setName('grupo').setDescription('Grupo/categoria (ex: Obra, Casa)').setMaxLength(40)))
    .addSubcommand((s) => s.setName('remover').setDescription('Remove uma vaga').addStringOption(vagaOpt))
    .addSubcommand((s) => s.setName('ocupar').setDescription('Coloca um membro numa vaga')
      .addStringOption(vagaOpt)
      .addUserOption((o) => o.setName('membro').setDescription('Quem vai ocupar').setRequired(true)))
    .addSubcommand((s) => s.setName('liberar').setDescription('Libera uma vaga ocupada').addStringOption(vagaOpt))
    .addSubcommand((s) => s.setName('painel').setDescription('Publica (ou move) o painel de vagas')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal do painel').setRequired(true).addChannelTypes(...textoCanal)))
    .addSubcommand((s) => s.setName('pedidos').setDescription('Canal onde chegam os pedidos de vaga')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal da staff').setRequired(true).addChannelTypes(...textoCanal)))
    .addSubcommand((s) => s.setName('cargo').setDescription('Cargo dado a quem ocupa uma vaga (opcional)')
      .addRoleOption((o) => o.setName('cargo').setDescription('Deixe vazio para desligar')))
    .addSubcommand((s) => s.setName('limite').setDescription('Quantas vagas cada pessoa pode ocupar')
      .addIntegerOption((o) => o.setName('quantidade').setDescription('1 a 10').setRequired(true).setMinValue(1).setMaxValue(10)))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Edita o texto do painel')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'status') {
      const c = (k) => N.cfg(k);
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('📋 Vagas do Atlas').addFields(
        { name: 'Painel', value: c('canalPainel') ? `<#${c('canalPainel')}>` : 'não definido', inline: true },
        { name: 'Pedidos', value: c('canalPedidos') ? `<#${c('canalPedidos')}>` : 'não definido', inline: true },
        { name: 'Cargo de ocupante', value: c('cargo') ? `<@&${c('cargo')}>` : 'nenhum', inline: true },
        { name: 'Limite por pessoa', value: `${N.limite()}`, inline: true },
        { name: 'Personagens', value: `${N.todas().filter((v) => v.ocupanteId).length} ocupados · ${N.livres().length} livres cadastrados`, inline: true },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'criar') {
      const nome = interaction.options.getString('nome').trim();
      if (N.acharVaga(nome)) return responder(interaction, '❌ Já existe uma vaga com esse nome.');
      const v = { id: N.proximoId(), nome, grupo: (interaction.options.getString('grupo') || '').trim(), ocupanteId: null, desde: null };
      N.salvar(v);
      await N.atualizarPainel(guild);
      return responder(interaction, `✅ Vaga **${v.nome}** criada (id ${v.id}).`);
    }

    if (sub === 'mensagem') {
      const m = N.mensagem('painel');
      const modal = new ModalBuilder().setCustomId('vagas:modal:painel').setTitle('Texto do painel de vagas');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true).setValue(m.titulo.slice(0, 200))),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('texto').setLabel('Texto').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true).setValue(m.texto.slice(0, 2000))),
      );
      return interaction.showModal(modal);
    }

    if (sub === 'painel') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.vagas.canalPainel', canal.id);
      db.remover('config.vagas.painelMsgId');
      db.remover('config.vagas.painelMsgIds');
      db.remover('config.vagas.painelCanalId');
      await interaction.deferReply({ flags: EPH });
      const ok = await N.atualizarPainel(guild);
      return interaction.editReply(ok ? `✅ Painel publicado em ${canal}. Ele se atualiza sozinho.` : '❌ Salvei o canal, mas não consegui publicar (falta permissão?).');
    }

    if (sub === 'pedidos') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.vagas.canalPedidos', canal.id);
      return responder(interaction, `✅ Os pedidos de vaga chegarão em ${canal}.`);
    }

    if (sub === 'cargo') {
      const cargo = interaction.options.getRole('cargo');
      if (!cargo) {
        db.remover('config.vagas.cargo');
        return responder(interaction, '✅ Cargo de ocupante desligado.');
      }
      db.set('config.vagas.cargo', cargo.id);
      return responder(interaction, `✅ Quem ocupar uma vaga receberá o cargo ${cargo}. (O cargo do bot precisa estar acima dele.) Vagas já ocupadas não recebem o cargo retroativamente.`);
    }

    if (sub === 'limite') {
      const n = interaction.options.getInteger('quantidade');
      db.set('config.vagas.limite', n);
      return responder(interaction, `✅ Cada pessoa pode ocupar até **${n}** vaga(s).`);
    }

    // remover / ocupar / liberar usam uma vaga
    const vaga = N.acharVaga(interaction.options.getString('vaga'));
    if (!vaga) return responder(interaction, '❌ Não achei essa vaga.');
    await interaction.deferReply({ flags: EPH });

    if (sub === 'remover') {
      if (vaga.ocupanteId) await N.liberar(guild, vaga);
      N.apagar(vaga.id);
      for (const p of N.pedidos()) if (p.vagaId === vaga.id) db.remover(`vagas.pedidos.${p.id}`);
      await N.atualizarPainel(guild);
      return interaction.editReply(`🗑️ Vaga **${vaga.nome}** removida.`);
    }

    if (sub === 'ocupar') {
      const membro = interaction.options.getUser('membro');
      if (vaga.ocupanteId) return interaction.editReply('❌ Essa vaga já está ocupada. Libere antes.');
      await N.ocupar(guild, vaga, membro.id);
      return interaction.editReply(`✅ ${membro} agora ocupa a vaga **${vaga.nome}**.`);
    }

    if (sub === 'liberar') {
      if (!vaga.ocupanteId) return interaction.editReply('Essa vaga já está livre.');
      await N.liberar(guild, vaga);
      return interaction.editReply(`✅ Vaga **${vaga.nome}** liberada.`);
    }
  },
};
// fim do arquivo
