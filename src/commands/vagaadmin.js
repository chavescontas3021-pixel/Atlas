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
    .addSubcommand((s) => s.setName('auditoria').setDescription('Procura personagens cadastrados em duplicidade')
      .addBooleanOption((o) => o.setName('corrigir').setDescription('Arruma o que for seguro (padrão: só mostrar)')))
    .addSubcommand((s) => s.setName('organizar').setDescription('Descobre sozinho a obra das vagas que estão sem obra (AniList)')
      .addBooleanOption((o) => o.setName('aplicar').setDescription('Aplica de verdade (padrão: só mostrar)')))
    .addSubcommand((s) => s.setName('obras').setDescription('Preenche a obra de várias vagas de uma vez (lista)'))
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
        { name: 'Sem obra', value: `${N.semObra().length}`, inline: true },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'auditoria') {
      const corrigir = !!interaction.options.getBoolean('corrigir');
      await interaction.deferReply({ flags: EPH });
      const rel = N.auditar({ corrigir });
      if (corrigir && rel.removidas.length) await N.atualizarPainel(guild);
      const nome = (v) => `**${v.nome}**${v.grupo ? ` (${v.grupo})` : ''}`;
      const linhas = [];
      if (!rel.grupos) linhas.push('✅ Nenhum personagem duplicado.');
      if (rel.removidas.length) {
        linhas.push(`${corrigir ? '🧹 Removidas' : '🔎 Seriam removidas'} (${rel.removidas.length}) por serem cópias:`);
        for (const r of rel.removidas.slice(0, 15)) linhas.push(`• ${nome(r.removida)} #${r.removida.id} → fica #${r.manter.id}${r.manter.ocupanteId ? ` (<@${r.manter.ocupanteId}>)` : ''}`);
        if (rel.removidas.length > 15) linhas.push(`… e mais ${rel.removidas.length - 15}.`);
      }
      if (rel.conflitos.length) {
        linhas.push(`⚠️ **Conflitos** (pessoas diferentes no mesmo personagem; decida e use \`/vagaadmin liberar\`):`);
        for (const c of rel.conflitos.slice(0, 10)) linhas.push(`• ${nome(c[0])}: ${c.map((v) => `<@${v.ocupanteId}> (#${v.id})`).join(' e ')}`);
      }
      if (!corrigir && rel.removidas.length) linhas.push('\nRode de novo com `corrigir: True` para aplicar.');
      return interaction.editReply({ content: linhas.join('\n').slice(0, 1900), allowedMentions: { parse: [] } });
    }

    if (sub === 'obras') {
      const pend = N.semObra().sort((a, b) => N.norm(a.nome).localeCompare(N.norm(b.nome)));
      let pre = '';
      for (const p of pend) {
        const linha = `${p.nome} = \n`;
        if (pre.length + linha.length > 3900) break;
        pre += linha;
      }
      const campo = new TextInputBuilder().setCustomId('lista').setLabel('Nome = Obra (uma por linha)').setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true);
      if (pre) campo.setValue(pre);
      return interaction.showModal(new ModalBuilder().setCustomId('vagas:modal:obras').setTitle('Obra das vagas').addComponents(new ActionRowBuilder().addComponents(campo)));
    }

    if (sub === 'organizar') {
      const aplicar = !!interaction.options.getBoolean('aplicar');
      await interaction.deferReply({ flags: EPH });
      const rel = await N.organizarAuto({ aplicar });
      if (aplicar && rel.certas.length) await N.atualizarPainel(guild);
      const cortar = (arr, n) => arr.slice(0, n);
      const linhas = [`${aplicar ? '✅ Aplicado' : '🔎 Prévia'}: analisei **${rel.lidas}** de **${rel.total}** vagas sem obra.`];
      if (rel.certas.length) linhas.push(`\n✅ Reconhecidas (${rel.certas.length}):\n${cortar(rel.certas, 10).map((c) => `• ${c.vaga.nome} → ${c.obra}`).join('\n')}${rel.certas.length > 10 ? '\n…' : ''}`);
      if (rel.ambiguas.length) linhas.push(`\n❓ Mais de uma obra (${rel.ambiguas.length}):\n${cortar(rel.ambiguas, 5).map((c) => `• ${c.vaga.nome} (${c.obras.join(' / ')})`).join('\n')}`);
      if (rel.sem.length) linhas.push(`\n❌ Não achei (${rel.sem.length}): ${cortar(rel.sem, 12).map((x) => x.nome).join(', ')}${rel.sem.length > 12 ? '…' : ''}`);
      if (rel.total > rel.lidas) linhas.push(`\nRode de novo para analisar o restante.`);
      linhas.push(aplicar ? '\nO que sobrou: use `/vagaadmin obras` (a lista já vem preenchida com os nomes).' : '\nGostou? Rode com `aplicar: True`.');
      return interaction.editReply({ content: linhas.join('\n').slice(0, 1950), allowedMentions: { parse: [] } });
    }

    if (sub === 'criar') {
      const nome = interaction.options.getString('nome').trim();
      const grupo = (interaction.options.getString('grupo') || '').trim();
      const existente = N.acharTodos({ ext: N.chaveManual(nome, grupo), nome, grupo })[0];
      if (existente) return responder(interaction, `❌ Esse personagem já está cadastrado (id ${existente.id}${existente.ocupanteId ? `, ocupado por <@${existente.ocupanteId}>` : ''}).`);
      const v = { id: N.proximoId(), nome, grupo, ext: N.chaveManual(nome, grupo), ocupanteId: null, desde: null };
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
      const r = await N.ocupar(guild, vaga, membro.id);
      if (!r.ok) return interaction.editReply(`❌ **${r.vaga.nome}** já está ocupado por <@${r.por}> (vaga ${r.vaga.id}). Libere essa antes ou rode \`/vagaadmin auditoria\`.`);
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
