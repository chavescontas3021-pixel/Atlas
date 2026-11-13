const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../vagas/nucleo');
const P = require('../vagas/personagens');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vaga')
    .setDescription('Vagas da house')
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os personagens ocupados e quem ocupa cada um'))
    .addSubcommand((s) => s.setName('buscar').setDescription('Vê se um personagem está livre ou ocupado')
      .addStringOption((o) => o.setName('nome').setDescription('Nome do personagem ou da obra').setRequired(true).setMaxLength(60)))
    .addSubcommand((s) => s.setName('minhas').setDescription('Mostra as vagas que você ocupa'))
    .addSubcommand((s) => s.setName('pedir').setDescription('Pede um personagem (busque pelo nome)')
      .addStringOption((o) => o.setName('personagem').setDescription('Nome do personagem. Escolha na lista ou digite à mão').setRequired(true).setAutocomplete(true).setMaxLength(100))
      .addStringOption((o) => o.setName('obra').setDescription('Obra do personagem (só se ele não aparecer na lista)').setMaxLength(60))
      .addStringOption((o) => o.setName('observacao').setDescription('Recado para a staff (opcional)').setMaxLength(300)))
    .addSubcommand((s) => s.setName('sair').setDescription('Libera uma vaga que você ocupa')
      .addStringOption((o) => o.setName('vaga').setDescription('Qual vaga').setRequired(true).setAutocomplete(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'lista') {
      const embeds = N.embedsPainel();
      let i = 0;
      const botoes = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vlista:ant').setEmoji('◀️').setLabel('Anterior').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
        new ButtonBuilder().setCustomId('vlista:pos').setEmoji('▶️').setLabel('Próxima').setStyle(ButtonStyle.Secondary).setDisabled(i === embeds.length - 1),
      );
      const tela = () => ({ embeds: [embeds[i]], components: embeds.length > 1 ? [botoes()] : [], allowedMentions: { parse: [] } });
      await interaction.reply(tela());
      if (embeds.length < 2) return null;
      const msg = await interaction.fetchReply();
      const col = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });
      col.on('collect', async (b) => {
        if (b.user.id !== interaction.user.id) return b.reply({ content: 'Só quem usou o comando vira a página. Use `/vaga lista` para ter a sua.', flags: EPH });
        i = Math.min(embeds.length - 1, Math.max(0, i + (b.customId === 'vlista:pos' ? 1 : -1)));
        return b.update(tela());
      });
      col.on('end', () => interaction.editReply({ components: [] }).catch(() => {}));
      return null;
    }

    if (sub === 'buscar') {
      const texto = interaction.options.getString('nome');
      const achados = N.buscar(texto);
      if (!achados.length) {
        return responder(interaction, `🟢 **${texto}** não consta no registro, então está livre. Para pedir, use \`/vaga pedir\`.`);
      }
      const linhas = achados.map((a) => {
        const nome = `**${a.vaga.nome}**${a.vaga.grupo ? ` · ${a.vaga.grupo}` : ''}`;
        return a.livre ? `🟢 ${nome} — livre` : `🔴 ${nome} — <@${a.donoId}>`;
      });
      const emb = new EmbedBuilder().setColor(0xf5a3c7).setTitle(`🔎 Resultado para “${texto.slice(0, 40)}”`).setDescription(linhas.join('\n'));
      const foto = achados.length === 1 ? achados[0].vaga.foto : null;
      if (foto) emb.setThumbnail(foto);
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: { parse: [] } });
    }

    if (sub === 'minhas') {
      const minhas = N.doUsuario(interaction.user.id);
      if (!minhas.length) return responder(interaction, 'Você não ocupa nenhuma vaga. Use `/vaga pedir` para pedir uma.');
      const emb = new EmbedBuilder().setColor(0xf5a3c7).setTitle('🎭 Suas vagas')
        .setFooter({ text: `${minhas.length} de ${N.limite()} vaga(s) usada(s)` });
      for (const v of minhas.slice(0, 10)) {
        emb.addFields({ name: `🔴 ${v.nome}`.slice(0, 256), value: `${v.grupo ? `${v.grupo} · ` : ''}desde <t:${Math.floor((v.desde || Date.now()) / 1000)}:D> (<t:${Math.floor((v.desde || Date.now()) / 1000)}:R>)` });
      }
      const foto = minhas.find((v) => v.foto);
      if (foto) emb.setThumbnail(foto.foto);
      return interaction.reply({ embeds: [emb], flags: EPH });
    }

    if (sub === 'pedir') {
      const canalPedidos = N.cfg('canalPedidos');
      if (!canalPedidos) return responder(interaction, '❌ A staff ainda não definiu o canal de pedidos.');
      const canal = interaction.guild.channels.cache.get(canalPedidos);
      if (!canal) return responder(interaction, '❌ Não encontro o canal de pedidos.');
      if (N.doUsuario(interaction.user.id).length >= N.limite()) {
        return responder(interaction, `❌ Você já ocupa o máximo de **${N.limite()}** vaga(s).`);
      }
      const bruto = interaction.options.getString('personagem').trim();
      const obraDigitada = (interaction.options.getString('obra') || '').trim();
      await interaction.deferReply({ flags: EPH });

      // Descobre o que foi pedido: vaga cadastrada, personagem do AniList ou personagem digitado à mão
      let vaga = null;
      let novo = null;
      let chave;
      const mVaga = /^v:(\d+)$/.exec(bruto);
      const mAni = /^al:(\d+)$/.exec(bruto);
      if (mVaga) {
        vaga = N.obter(mVaga[1]);
        if (!vaga) return interaction.editReply('❌ Não achei essa vaga.');
        chave = vaga.ext || `v:${vaga.id}`;
      } else if (mAni) {
        const d = await P.porId(mAni[1]);
        if (!d) return interaction.editReply('❌ Não consegui consultar o AniList agora. Tente de novo em instantes ou digite o nome do personagem e a obra à mão.');
        chave = d.chave;
        vaga = N.acharPorChave(d.chave, d.nome, d.obra);
        if (!vaga) novo = { nome: d.nome, grupo: d.obra, ext: d.chave, foto: d.foto };
      } else {
        if (bruto.length < 2) return interaction.editReply('❌ Escreva o nome do personagem.');
        if (!obraDigitada) return interaction.editReply('❌ Não achei esse nome na lista. Escolha um personagem da lista ou preencha o campo **obra** para pedir à mão.');
        chave = N.chaveManual(bruto, obraDigitada);
        vaga = N.acharPorChave(chave, bruto, obraDigitada);
        if (!vaga) novo = { nome: bruto, grupo: obraDigitada, ext: null, foto: null };
      }

      // Confere o personagem inteiro (também as entradas gêmeas), não só a vaga que foi escolhida
      const alvo = vaga || { ext: novo.ext || chave, nome: novo.nome, grupo: novo.grupo };
      const dono = N.acharTodos(alvo).find((v) => v.ocupanteId);
      if (dono) return interaction.editReply(`❌ **${dono.nome}**${dono.grupo ? ` (${dono.grupo})` : ''} já está ocupado por <@${dono.ocupanteId}>.`);
      if (N.pedidoPendente(alvo, chave)) return interaction.editReply('❌ Já existe um pedido aguardando a staff para esse personagem.');

      const p = { id: N.proximoPedido(), userId: interaction.user.id, obs: interaction.options.getString('observacao') || '', chave };
      if (vaga) p.vagaId = vaga.id; else p.novo = novo;
      let msg;
      try {
        msg = await canal.send({ embeds: [N.embedPedido(p, vaga)], components: [N.botoesPedido(p.id)], allowedMentions: { parse: [] } });
      } catch {
        return interaction.editReply('❌ Não consegui enviar o pedido ao canal da staff (falta permissão?).');
      }
      p.canalId = canal.id;
      p.msgId = msg.id;
      db.set(`vagas.pedidos.${p.id}`, p);
      return interaction.editReply(`✅ Pedido enviado para a staff! Personagem: **${N.infoPedido(p, vaga).nome}**.`);
    }

    if (sub === 'sair') {
      const vaga = N.acharVaga(interaction.options.getString('vaga'));
      if (!vaga || vaga.ocupanteId !== interaction.user.id) return responder(interaction, '❌ Você não ocupa essa vaga.');
      await interaction.deferReply({ flags: EPH });
      await N.liberar(interaction.guild, vaga);
      return interaction.editReply(`✅ Você liberou a vaga **${vaga.nome}**.`);
    }
  },
};
// fim do arquivo
