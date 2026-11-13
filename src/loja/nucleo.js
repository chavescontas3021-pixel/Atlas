// Loja de itens exclusivos da house (a staff cria os itens; compra com stars).
const db = require('../db');
const UI = require('../ui/componentes');
const T = require('../ui/tema');
const R = require('../rpg/nucleo');
const S = require('../extras/stars');


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
const disponivel = (i) => i.estoque === null || i.estoque > 0;

function embedLoja() {
  const lista = itens();
  if (!lista.length) {
    return UI.painel({ trilha: ['Loja'], titulo: 'Loja da house', descricao: 'Ainda não há itens à venda.' });
  }
  const linhas = lista.map((i) => {
    const estoque = i.estoque === null ? '' : i.estoque > 0 ? `  ${T.S.sep}  restam ${i.estoque}` : `  ${T.S.sep}  esgotado`;
    const tipo = i.tipo === 'cargo' ? 'cargo' : 'entregue pela staff';
    const nome = disponivel(i) ? `**${i.nome}**` : `~~${i.nome}~~`;
    return `${nome}  ${T.S.sep}  ⭐ ${i.preco}${estoque}\n${T.S.filho} ${tipo}${i.descricao ? `  ${T.S.sep}  ${i.descricao}` : ''}`;
  });
  return UI.painel({
    trilha: ['Loja'],
    titulo: 'Loja da house',
    descricao: linhas.join('\n\n').slice(0, 3800),
    rodape: 'Escolha um item no menu para comprar',
  });
}

// Menu de compra: só mostra o que ainda tem estoque
function menuLoja() {
  const lista = itens().filter(disponivel).slice(0, 25);
  if (!lista.length) return null;
  return UI.menu({
    id: 'loja:comprar',
    placeholder: 'Escolher um item para comprar',
    opcoes: lista.map((i) => ({ valor: i.id, nome: i.nome, desc: `⭐ ${i.preco}${i.descricao ? `  ·  ${i.descricao}` : ''}` })),
  });
}

function telaLoja() {
  const menu = menuLoja();
  return { embeds: [embedLoja()], components: menu ? [menu] : [] };
}

function botaoEntrega(id, desligado) {
  return UI.botoes([{ id: `loja:entregue:${id}`, label: desligado ? 'Entregue' : 'Marcar como entregue', desabilitado: !!desligado }]);
}

function embedPedido(p, estado) {
  const campos = [
    { nome: 'Membro', valor: `<@${p.userId}>`, lado: true },
    { nome: 'Item', valor: p.nome, lado: true },
    { nome: 'Pago', valor: `⭐ ${p.preco}`, lado: true },
  ];
  if (estado) campos.push({ nome: 'Status', valor: `${T.S.ponto}  Entregue por <@${p.porId}>` });
  return UI.painel({ trilha: ['Loja', 'Pedido'], titulo: p.nome, campos, rodape: `Pedido #${p.id}` });
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
  embedLoja, menuLoja, telaLoja, botaoEntrega, embedPedido, comprar,
};
