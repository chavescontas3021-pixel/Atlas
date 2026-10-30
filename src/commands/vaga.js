const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
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
      const embeds = N.embedsPainel(interaction.guild);
      await interaction.reply({ embeds: [embeds[0]], allowedMentions: { parse: [] } });
      for (const e of embeds.slice(1, 5)) await interaction.followUp({ embeds: [e], allowedMentions: { parse: [] } });
      if (embeds.length > 5) await interaction.followUp({ content: `Mostrei só as primeiras ${5} páginas. Veja o resto no painel fixo.`, flags: EPH });
      return null;
    }

    if (sub === 'minhas') {
      const minhas = N.doUsuario(interaction.user.id);
      if (!minhas.length) return responder(interaction, 'Você não ocupa nenhuma vaga.');
      const txt = minhas.map((v) => `🔴 **${v.nome}**${v.grupo ? ` (${v.grupo})` : ''} — desde <t:${Math.floor(v.desde / 1000)}:D>`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle('Suas vagas').setDescription(txt)], flags: EPH });
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

      if (vaga && vaga.ocupanteId) return interaction.editReply(`❌ **${vaga.nome}**${vaga.grupo ? ` (${vaga.grupo})` : ''} já está ocupado por <@${vaga.ocupanteId}>.`);
      if (N.pedidos().some((x) => x.chave === chave)) return interaction.editReply('❌ Já existe um pedido aguardando a staff para esse personagem.');

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
