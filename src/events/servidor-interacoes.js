const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const S = require('../servidor/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('servidor:')) return;
      const [, acao, userId] = interaction.customId.split(':');

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: 'Esse botão não é para você.', flags: EPH });
      }
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Só administradores podem usar isso.', flags: EPH });
      }

      if (acao === 'nao') {
        S.limparPedido(userId);
        return interaction.update({ content: 'Cancelado. O servidor continua ligado. 💜', embeds: [], components: [] });
      }
      if (acao !== 'sim') return;

      const pedido = S.pegarPedido(userId);
      if (!pedido) {
        return interaction.update({ content: 'Esse pedido expirou. Use `/servidor desligar` de novo.', embeds: [], components: [] });
      }
      if (S.estaOcupado()) {
        return interaction.reply({ content: '⏳ Já tem uma operação em andamento.', flags: EPH });
      }
      S.limparPedido(userId);

      await interaction.update({ content: '⏳ Desligando o servidor... isso pode levar alguns minutos.', embeds: [], components: [] });
      const guild = interaction.guild;
      const r = await S.desligar(
        guild,
        { canalMantido: pedido.canalMantido, porId: userId, pausarConvites: pedido.pausarConvites },
        (f, t) => interaction.editReply({ content: `⏳ Escondendo canais... ${f}/${t}` }).catch(() => {}),
      );

      let msg = `🔴 Servidor **desligado**: **${r.fechados}** canais escondidos`;
      if (r.jaEscondidos) msg += ` (${r.jaEscondidos} já estavam escondidos)`;
      msg += `.\nConvites: ${r.convites}.\nPara reabrir, use \`/servidor ligar\`.`;
      if (r.falhas.length) {
        msg += `\n\n⚠️ **${r.falhas.length}** canal(is) falharam (confira minhas permissões de Gerenciar Canais):\n${r.falhas.slice(0, 8).join('\n')}\nRode \`/servidor desligar\` de novo para tentar só os que faltam.`;
      }
      await interaction.editReply({ content: msg.slice(0, 1900) });

      // Aviso no canal da staff
      const canal = await guild.channels.fetch(pedido.canalMantido).catch(() => null);
      if (canal && canal.send) {
        await canal.send(`🔴 Servidor desligado por <@${userId}>. Para reabrir, use \`/servidor ligar\` aqui.`).catch(() => {});
      }
    } catch (erro) {
      console.error('[Servidor] erro:', erro);
      const msg = { content: 'Ops, deu erro. Use `/servidor status` para ver como ficou.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    }
  },
};
