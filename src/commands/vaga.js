const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../vagas/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vaga')
    .setDescription('Vagas da house')
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra as vagas e quem ocupa cada uma'))
    .addSubcommand((s) => s.setName('minhas').setDescription('Mostra as vagas que você ocupa'))
    .addSubcommand((s) => s.setName('pedir').setDescription('Pede uma vaga livre')
      .addStringOption((o) => o.setName('vaga').setDescription('Qual vaga').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('observacao').setDescription('Recado para a staff (opcional)').setMaxLength(300)))
    .addSubcommand((s) => s.setName('sair').setDescription('Libera uma vaga que você ocupa')
      .addStringOption((o) => o.setName('vaga').setDescription('Qual vaga').setRequired(true).setAutocomplete(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'lista') {
      return interaction.reply({ embeds: [N.embedPainel(interaction.guild)], allowedMentions: { parse: [] } });
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
      const vaga = N.acharVaga(interaction.options.getString('vaga'));
      if (!vaga) return responder(interaction, '❌ Não achei essa vaga.');
      if (vaga.ocupanteId) return responder(interaction, '❌ Essa vaga já está ocupada.');
      if (N.doUsuario(interaction.user.id).length >= N.limite()) {
        return responder(interaction, `❌ Você já ocupa o máximo de **${N.limite()}** vaga(s).`);
      }
      if (N.pedidos().some((p) => p.userId === interaction.user.id && p.vagaId === vaga.id)) {
        return responder(interaction, '❌ Você já tem um pedido aguardando para essa vaga.');
      }
      const canal = interaction.guild.channels.cache.get(canalPedidos);
      if (!canal) return responder(interaction, '❌ Não encontro o canal de pedidos.');
      const p = { id: N.proximoPedido(), vagaId: vaga.id, userId: interaction.user.id, obs: interaction.options.getString('observacao') || '' };
      let msg;
      try {
        msg = await canal.send({ embeds: [N.embedPedido(p, vaga)], components: [N.botoesPedido(p.id)], allowedMentions: { parse: [] } });
      } catch {
        return responder(interaction, '❌ Não consegui enviar o pedido ao canal da staff (falta permissão?).');
      }
      p.canalId = canal.id;
      p.msgId = msg.id;
      db.set(`vagas.pedidos.${p.id}`, p);
      return responder(interaction, `✅ Pedido enviado para a staff! Vaga: **${vaga.nome}**.`);
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
