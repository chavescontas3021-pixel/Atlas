const { SlashCommandBuilder } = require('discord.js');
const N = require('../loja/nucleo');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');
const RpgCanal = require('../rpg/canal');

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
    const bloqueado = RpgCanal.bloqueio(interaction);
    if (bloqueado) return interaction.reply(UI.erro(require('../ui/tema').tirarEmoji(bloqueado)));
    const uid = interaction.user.id;

    if (sub === 'ver') return interaction.reply(N.telaLoja());

    if (sub === 'meus') {
      const compras = N.comprasDe(uid);
      if (!compras.length) return interaction.reply(UI.ok('Você ainda não comprou nada.'));
      const txt = compras.slice(-20).reverse().map((c) => `**${c.nome}**  ${S.sep}  ⭐ ${c.preco}  ${S.sep}  ${quando(c.ts, 'd')}`).join('\n');
      return interaction.reply({
        embeds: [UI.painel({ trilha: ['Loja', 'Compras'], titulo: 'Suas compras', descricao: txt, rodape: `${compras.length} no total` })],
        flags: UI.EPH,
      });
    }

    if (sub === 'comprar') {
      const item = N.acharItem(interaction.options.getString('item'));
      if (!item) return interaction.reply(UI.erro('Não achei esse item. Veja `/loja ver`.'));
      return require('../loja/compra').fluxo(interaction, item);
    }
  },
};
