// Venda em massa do inventário do RPG (/rpg vendertudo)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { ITENS } = require('./dados');
const N = require('./nucleo');

// Mesmo preço do /rpg vender: 50% do valor do item
const valorUnidade = (id) => Math.floor((ITENS[id].preco || 0) * 0.5);

// modo: 'tudo' = tudo que tem preço | 'mat' = só materiais (guarda poções e equipamentos)
function calcular(j, modo) {
  const itens = [];
  let total = 0;
  for (const [id, q] of Object.entries(j.inv || {})) {
    const i = ITENS[id];
    if (!i || !i.preco || q <= 0) continue;
    if (modo === 'mat' && i.tipo !== 'material') continue;
    const valor = valorUnidade(id) * q;
    itens.push({ id, q, valor });
    total += valor;
  }
  return { itens, total };
}

function lista(itens) {
  const linhas = itens.map((x) => `${N.nomeItem(x.id)} × **${x.q}** — ⭐ ${x.valor}`);
  let txt = '';
  for (const l of linhas) {
    if (txt.length + l.length + 1 > 3500) { txt += '\n…e mais itens.'; break; }
    txt += (txt ? '\n' : '') + l;
  }
  return txt;
}

function botoes(userId, temMat, temOutros) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rpg:vt:tudo:${userId}`).setLabel('Vender tudo').setEmoji('💰').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rpg:vt:mat:${userId}`).setLabel('Só materiais').setEmoji('🪨').setStyle(ButtonStyle.Primary).setDisabled(!temMat || !temOutros),
    new ButtonBuilder().setCustomId(`rpg:vt:no:${userId}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
  );
}

// Tela de confirmação (nada é vendido ainda)
function confirmacao(j, userId) {
  const todos = calcular(j, 'tudo');
  if (!todos.itens.length) return { vazio: true };
  const mats = calcular(j, 'mat');
  const embed = new EmbedBuilder()
    .setColor(N.COR)
    .setTitle('💰 Vender tudo do inventário?')
    .setDescription(lista(todos.itens))
    .addFields(
      { name: 'Total (tudo)', value: `⭐ ${todos.total}`, inline: true },
      { name: 'Total (só materiais)', value: `⭐ ${mats.total}`, inline: true }
    )
    .setFooter({ text: 'O equipamento que você está usando não é vendido.' });
  return { embed, linha: botoes(userId, mats.itens.length > 0, mats.itens.length !== todos.itens.length) };
}

// Faz a venda de verdade, recalculando agora (o inventário pode ter mudado desde a confirmação)
function vender(j, modo) {
  const r = calcular(j, modo);
  for (const x of r.itens) N.removerItem(j, x.id, x.q);
  j.moedas += r.total;
  return r;
}

module.exports = { calcular, confirmacao, vender };
