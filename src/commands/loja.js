const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const N = require('../loja/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Loja de itens exclusivos da house')
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra os itens à venda'))
    .addSubcommand((s) => s.setName('comprar').setDescription('Compra um item com stars')
      .addStringOption((o) => o.setName('item').setDescription('Qual item').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('meus').setDescription('Mostra o que você já comprou')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'ver') return interaction.reply({ embeds: [N.embedLoja()] });

    if (sub === 'meus') {
      const compras = N.comprasDe(uid);
      if (!compras.length) return interaction.reply({ content: 'Você ainda não comprou nada.', flags: EPH });
      const txt = compras.slice(-20).map((c) => `• **${c.nome}** — ⭐ ${c.preco} · <t:${Math.floor(c.ts / 1000)}:d>`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle('🛍️ Suas compras').setDescription(txt)], flags: EPH });
    }

    if (sub === 'comprar') {
      const item = N.acharItem(interaction.options.getString('item'));
      if (!item) return interaction.reply({ content: '❌ Não achei esse item. Veja `/loja ver`.', flags: EPH });
      await interaction.deferReply({ flags: EPH });
      const r = await N.comprar(interaction.guild, uid, item);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply(r.manual
        ? `✅ Você comprou **${item.nome}**! A staff foi avisada e vai te entregar em breve. 💜`
        : `✅ Você comprou **${item.nome}** e o cargo já é seu! 🎨`);
    }
  },
};
