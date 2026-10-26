const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../loja/nucleo');

const EPH = MessageFlags.Ephemeral;

async function autocompletar(interaction) {
  const foco = N.norm(interaction.options.getFocused());
  const res = N.itens()
    .filter((i) => (interaction.commandName === 'loja' ? i.estoque === null || i.estoque > 0 : true))
    .filter((i) => N.norm(i.nome).includes(foco))
    .slice(0, 25)
    .map((i) => ({ name: `${i.nome} — ${i.preco} stars`.slice(0, 100), value: i.id }));
  await interaction.respond(res).catch(() => {});
}

async function entregue(interaction) {
  if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
  }
  const id = interaction.customId.split(':')[2];
  const p = N.pedido(id);
  if (!p) return interaction.update({ content: 'Esse pedido já foi resolvido.', components: [] });
  p.porId = interaction.user.id;
  db.remover(`loja.pedidos.${id}`);
  await interaction.update({ embeds: [N.embedPedido(p, true)], components: [N.botaoEntrega(id, true)] });
  const user = await interaction.client.users.fetch(p.userId).catch(() => null);
  if (user) await user.send(`📦 Seu item **${p.nome}** da loja foi entregue! Aproveite. 💜`).catch(() => {});
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && (interaction.commandName === 'loja' || interaction.commandName === 'lojaadmin')) return await autocompletar(interaction);
      if (interaction.isButton() && interaction.customId.startsWith('loja:entregue:')) return await entregue(interaction);
    } catch (err) {
      console.error('[Loja]', err);
    }
  },
};
