// Loja de itens exclusivos da house (a staff cria os itens; compra com stars).
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');
const S = require('../extras/stars');

const COR = 0xf5a3c7;

const norm = (t) => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[_*~`|]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ---------- Banco ----------
const itens = () => Object.values(db.get('loja.itens', {}) || {}).sort((a, b) => Number(a.id) - Number(b.id));
const obter = (id) => db.get(`loja.itens.${id}`, null);
const salvar = (i) => db.set(`loja.itens.${i.id}`, i);
const remover = (id) => db.remover(`loja.itens.${id}`);
const acharItem = (ref) => {
  if (!ref) return null;
  const r = norm(ref);
  return itens().find((i) => i.id === String(ref) || norm(i.nome) === r) || null;
};

function proximo(chave) {
  const n = db.get(`loja.${chave}`, 0) + 1;
  db.set(`loja.${chave}`, n);
  return String(n);
}

const comprasDe = (uid) => db.get(`loja.compras.${uid}`, []) || [];
const quantasCompras = (uid, itemId) => comprasDe(uid).filter((c) => c.itemId === itemId).length;
const pedido = (id) => db.get(`loja.pedidos.${id}`, null);
const canalPedidos = () => db.get('config.loja.canalPedidos', null);

// ---------- Visual ----------
function embedLoja() {
  const lista = itens();
  const emb = new EmbedBuilder().setColor(COR).setTitle('🛍️ Loja exclusiva da house');
  if (!lista.length) return emb.setDescription('Ainda não há itens à venda.');
  emb.setDescription(lista.map((i) => {
    const estoque = i.estoque === null ? '' : i.estoque > 0 ? ` · restam ${i.estoque}` : ' · **ESGOTADO**';
    const tipo = i.tipo === 'cargo' ? '🎨 cargo' : '🎁 entregue pela staff';
    return `**${i.nome}** — ⭐ ${i.preco}${estoque}\n${tipo}${i.descricao ? ` · ${i.descricao}` : ''}`;
  }).join('\n\n').slice(0, 4000));
  emb.setFooter({ text: 'Compre com /loja comprar' });
  return emb;
}

function botaoEntrega(id, desligado) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`loja:entregue:${id}`).setLabel('Marcar como entregue').setEmoji('📦').setStyle(ButtonStyle.Success).setDisabled(!!desligado),
  );
}

function embedPedido(p, estado) {
  const emb = new EmbedBuilder()
    .setColor(estado ? 0x57f287 : COR)
    .setTitle('🛍️ Pedido da loja')
    .setDescription(`**Membro:** <@${p.userId}>\n**Item:** ${p.nome}\n**Pago:** ⭐ ${p.preco}`)
    .setFooter({ text: `Pedido #${p.id}` });
  if (estado) emb.addFields({ name: 'Status', value: `✅ Entregue por <@${p.porId}>` });
  return emb;
}

// ---------- Comprar ----------
// Retorna { erro } ou { ok, item, manual }
async function comprar(guild, uid, item) {
  if (!R.obter(uid)) return { erro: S.SEM_RPG };
  if (item.estoque !== null && item.estoque <= 0) return { erro: 'Esse item está esgotado.' };
  if (quantasCompras(uid, item.id) >= (item.limite || 1)) return { erro: `Você já comprou o máximo desse item (${item.limite || 1}).` };

  let canal = null;
  if (item.tipo === 'manual') {
    canal = guild.channels.cache.get(canalPedidos());
    if (!canal) return { erro: 'A staff ainda não definiu o canal de pedidos da loja. Avise a staff.' };
  }

  let membro = null;
  if (item.tipo === 'cargo') {
    membro = await guild.members.fetch(uid).catch(() => null);
    if (!membro) return { erro: 'Não consegui te encontrar no servidor.' };
    if (membro.roles.cache.has(item.cargoId)) return { erro: 'Você já tem esse cargo.' };
  }

  const pago = S.gastar(uid, item.preco);
  if (pago.erro) return { erro: pago.erro };

  if (item.tipo === 'cargo') {
    try {
      await membro.roles.add(item.cargoId);
    } catch {
      S.ganhar(uid, item.preco); // devolve
      return { erro: 'Não consegui dar o cargo (o cargo do bot precisa estar acima dele). Suas stars foram devolvidas.' };
    }
  }

  if (item.estoque !== null) item.estoque--;
  salvar(item);
  const compras = comprasDe(uid);
  compras.push({ itemId: item.id, nome: item.nome, preco: item.preco, ts: Date.now() });
  db.set(`loja.compras.${uid}`, compras);

  if (item.tipo === 'manual') {
    const p = { id: proximo('contadorPedidos'), userId: uid, itemId: item.id, nome: item.nome, preco: item.preco };
    try {
      const msg = await canal.send({ embeds: [embedPedido(p)], components: [botaoEntrega(p.id)], allowedMentions: { parse: [] } });
      p.canalId = canal.id;
      p.msgId = msg.id;
    } catch { /* o pedido fica salvo mesmo assim */ }
    db.set(`loja.pedidos.${p.id}`, p);
  }
  return { ok: true, item, manual: item.tipo === 'manual' };
}

module.exports = {
  norm, itens, obter, salvar, remover, acharItem, proximo, comprasDe, pedido, canalPedidos,
  embedLoja, botaoEntrega, embedPedido, comprar,
};
