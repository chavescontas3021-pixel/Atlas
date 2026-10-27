const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const Bichos = require('../extras/bichos');
const P = require('../extras/presentepet');
const R = require('../rpg/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isModalSubmit() || interaction.customId !== 'petpresente:modal') return;
    try {
      if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
      }
      const d = P.pegar(interaction.user.id);
      if (!d) return await interaction.reply({ content: '⌛ O pedido expirou. Use `/presentepet` de novo.', flags: EPH });

      const texto = interaction.fields.getTextInputValue('mensagem');
      const canal = interaction.guild.channels.cache.get(d.canalId) || interaction.channel;
      const embed = P.embedPresente(d.alvoId, texto);

      // Posta primeiro; só entrega o pet se a mensagem saiu
      try {
        await canal.send({
          content: `<@${d.alvoId}>`,
          embeds: [embed],
          files: [Bichos.anexoDe(P.ESPECIE).anexo()],
          allowedMentions: { users: [d.alvoId] },
        });
      } catch (e) {
        return await interaction.reply({ content: '⚠️ Não consegui enviar a mensagem nesse canal (falta permissão?). O pet não foi entregue.', flags: EPH });
      }
      P.criarPet(d.alvoId, d.nome);
      P.limpar(interaction.user.id);

      const semRpg = !R.obter(d.alvoId);
      return await interaction.reply({
        content: `✅ **${d.nome}** foi entregue a <@${d.alvoId}>!${semRpg ? '\n💡 A pessoa ainda não tem personagem de RPG: avise para usar `/rpg criar`, senão o pet não rende stars nos passeios.' : ''}`,
        flags: EPH,
        allowedMentions: { parse: [] },
      });
    } catch (erro) {
      console.error('[PetPresente] erro:', erro);
      const msg = { content: 'Ops, deu erro ao entregar o presente.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
