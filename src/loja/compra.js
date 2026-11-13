// Fluxo de compra: confirma com botões e depois paga. Usado pelo /loja comprar e pelo menu da loja.
const N = require('./nucleo');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

async function fluxo(interaction, item) {
  const confirmou = await UI.confirmar(interaction, {
    sim: `Comprar por ⭐ ${item.preco}`,
    painel: UI.painel({
      trilha: ['Loja', 'Compra'],
      titulo: item.nome,
      descricao: item.descricao || undefined,
      campos: [
        { nome: 'Preço', valor: `⭐ ${item.preco}`, lado: true },
        { nome: 'Entrega', valor: item.tipo === 'cargo' ? 'Cargo na hora' : 'A staff entrega', lado: true },
      ],
    }),
  });
  if (!confirmou) return null;

  const r = await N.comprar(interaction.guild, interaction.user.id, item);
  if (r.erro) return interaction.editReply(UI.edicao(UI.erro(r.erro)));
  return interaction.editReply(UI.edicao({
    embeds: [UI.painel({
      trilha: ['Loja', 'Compra'],
      titulo: `Você comprou ${item.nome}`,
      descricao: r.manual
        ? `${S.filho} A staff foi avisada e vai te entregar em breve.`
        : `${S.filho} O cargo já é seu.`,
    })],
  }));
}

module.exports = { fluxo };
