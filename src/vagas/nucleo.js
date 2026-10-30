// Controle de vagas da house: lista de vagas, quem ocupa, pedidos e painel.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;

const PADROES = {
  mensagens: {
    painel: {
      titulo: '📋 Vagas da house',
      texto: 'Veja abaixo os personagens que já têm dono.\nQualquer personagem que não esteja aqui está livre! Para pedir um, use `/vaga pedir` e busque pelo nome.',
    },
  },
};

function cfg(chave, padrao) {
  return db.get(`config.vagas.${chave}`, padrao);
}
function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}
const limite = () => Number(cfg('limite', 1));

function norm(txt) {
  return String(txt || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[_*~`|]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---------- Banco ----------
const todas = () => Object.values(db.get('vagas.lista', {}) || {}).sort((a, b) => Number(a.id) - Number(b.id));
const obter = (id) => db.get(`vagas.lista.${id}`, null);
const salvar = (v) => db.set(`vagas.lista.${v.id}`, v);
const apagar = (id) => db.remover(`vagas.lista.${id}`);
const doUsuario = (uid) => todas().filter((v) => v.ocupanteId === uid);
const livres = () => todas().filter((v) => !v.ocupanteId);

function proximoId() {
  const n = db.get('vagas.contador', 0) + 1;
  db.set('vagas.contador', n);
  return String(n);
}

const pedidos = () => Object.values(db.get('vagas.pedidos', {}) || {});
const pedido = (id) => db.get(`vagas.pedidos.${id}`, null);

function proximoPedido() {
  const n = db.get('vagas.contadorPedidos', 0) + 1;
  db.set('vagas.contadorPedidos', n);
  return String(n);
}

function acharVaga(ref) {
  if (!ref) return null;
  const r = norm(ref);
  return todas().find((v) => v.id === String(ref) || norm(v.nome) === r) || null;
}

// Chave estável de um personagem: AniList (al:123) ou manual (m:nome|obra)
const chaveManual = (nome, obra) => `m:${norm(nome)}|${norm(obra)}`;
function acharPorChave(chave, nome, grupo) {
  return todas().find((v) => (v.ext && v.ext === chave) || (norm(v.nome) === norm(nome) && norm(v.grupo) === norm(grupo))) || null;
}

// ---------- Ocupar / liberar ----------
async function mexerCargo(guild, userId, dar) {
  const cargoId = cfg('cargo');
  if (!cargoId) return;
  const membro = await guild.members.fetch(userId).catch(() => null);
  if (!membro) return;
  if (dar) {
    await membro.roles.add(cargoId).catch(() => {});
  } else if (doUsuario(userId).length === 0) {
    await membro.roles.remove(cargoId).catch(() => {}); // só tira se não sobrou nenhuma vaga
  }
}

async function ocupar(guild, vaga, userId) {
  vaga.ocupanteId = userId;
  vaga.desde = Date.now();
  salvar(vaga);
  await mexerCargo(guild, userId, true);
  await atualizarPainel(guild);
}

async function liberar(guild, vaga) {
  const antigo = vaga.ocupanteId;
  vaga.ocupanteId = null;
  vaga.desde = null;
  salvar(vaga);
  if (antigo) await mexerCargo(guild, antigo, false);
  if (vaga.auto) apagar(vaga.id); // vaga criada por pedido some quando fica livre
  await atualizarPainel(guild);
  return antigo;
}

// ---------- Painel ----------
const LIMITE_PAGINA = 3600;

// Divide a lista em páginas de texto (uma obra por bloco, ocupadas e livres)
function paginasPainel() {
  const lista = todas().slice().sort((a, b) => norm(a.grupo || 'geral').localeCompare(norm(b.grupo || 'geral')) || norm(a.nome).localeCompare(norm(b.nome)));
  const paginas = [];
  let atual = '';
  let grupoAtual = null;
  const empurra = () => { if (atual) paginas.push(atual); atual = ''; };
  for (const v of lista) {
    const g = v.grupo || 'Geral';
    const linha = v.ocupanteId ? `🔴 ${v.nome} — <@${v.ocupanteId}>` : `🟢 ${v.nome} — livre`;
    const troca = g !== grupoAtual;
    let cont = false;
    if (atual && atual.length + (troca ? g.length + 8 : 0) + linha.length + 1 > LIMITE_PAGINA) {
      empurra();
      cont = !troca;
    }
    if (troca || cont) {
      atual += `${atual ? '\n' : ''}**${g}${cont ? ' (cont.)' : ''}**\n`;
      grupoAtual = g;
    }
    atual += `${linha}\n`;
  }
  empurra();
  return paginas;
}

// Lista de embeds do painel (cada uma vira uma mensagem; o limite do Discord é por mensagem)
function embedsPainel() {
  const m = mensagem('painel');
  const lista = todas();
  const paginas = paginasPainel();
  const ocupadas = lista.filter((v) => v.ocupanteId).length;
  const rodape = `${ocupadas} ocupada(s)${lista.length > ocupadas ? ` · ${lista.length - ocupadas} livre(s) cadastrada(s)` : ''}`;
  if (!paginas.length) {
    return [new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(`${String(m.texto).slice(0, 600)}\n\nNenhum personagem ocupado ainda.`)];
  }
  return paginas.map((txt, i) => {
    const e = new EmbedBuilder().setColor(COR).setDescription(i === 0 ? `${String(m.texto).slice(0, 400)}\n\n${txt}` : txt);
    if (i === 0) e.setTitle(m.titulo);
    if (i === paginas.length - 1) e.setFooter({ text: rodape });
    return e;
  });
}
const embedPainel = () => embedsPainel()[0];

async function atualizarPainel(guild) {
  const canalId = cfg('canalPainel');
  if (!canalId) return false;
  const canal = guild.channels.cache.get(canalId);
  if (!canal) return false;
  const embeds = embedsPainel();
  let ids = cfg('painelMsgIds') || (cfg('painelMsgId') ? [cfg('painelMsgId')] : []);
  if (cfg('painelCanalId') !== canalId) ids = [];
  const novos = [];
  for (let i = 0; i < embeds.length; i++) {
    const payload = { embeds: [embeds[i]], allowedMentions: { parse: [] } };
    const msg = ids[i] ? await canal.messages.fetch(ids[i]).catch(() => null) : null;
    if (msg) {
      await msg.edit(payload).catch(() => {});
      novos.push(msg.id);
      continue;
    }
    try {
      const nova = await canal.send(payload);
      novos.push(nova.id);
    } catch {
      return false;
    }
  }
  for (const extra of ids.slice(embeds.length)) {
    const m = await canal.messages.fetch(extra).catch(() => null);
    if (m) await m.delete().catch(() => {});
  }
  db.set('config.vagas.painelMsgIds', novos);
  db.set('config.vagas.painelCanalId', canal.id);
  db.remover('config.vagas.painelMsgId');
  return true;
}

// ---------- Pedidos ----------
function botoesPedido(id, desligados) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vaga:aprovar:${id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!!desligados),
    new ButtonBuilder().setCustomId(`vaga:recusar:${id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(!!desligados),
  );
}

// Nome, obra e foto do que está sendo pedido (vaga já cadastrada ou personagem novo)
function infoPedido(p, vaga) {
  if (vaga) return { nome: vaga.nome, grupo: vaga.grupo || '', foto: vaga.foto || null };
  if (p.novo) return { nome: p.novo.nome, grupo: p.novo.grupo || '', foto: p.novo.foto || null };
  return { nome: '(removida)', grupo: '', foto: null };
}

function embedPedido(p, vaga, estado) {
  const i = infoPedido(p, vaga);
  const origem = p.novo ? (p.novo.ext ? ' · achado no AniList' : ' · digitado à mão, confira se existe') : '';
  const emb = new EmbedBuilder()
    .setColor(estado === 'aprovado' ? 0x57f287 : estado === 'recusado' ? 0xed4245 : COR)
    .setTitle('📨 Pedido de vaga')
    .setDescription(`**Membro:** <@${p.userId}>\n**Personagem:** ${i.nome}${i.grupo ? `\n**Obra:** ${i.grupo}` : ''}${p.obs ? `\n**Observação:** ${p.obs}` : ''}`)
    .setFooter({ text: `Pedido #${p.id}${origem}` });
  if (i.foto) emb.setThumbnail(i.foto);
  if (estado) emb.addFields({ name: 'Resultado', value: `${estado === 'aprovado' ? '✅ Aprovado' : '❌ Recusado'} por <@${p.porId}>` });
  return emb;
}

module.exports = {
  PADROES, cfg, mensagem, limite, norm,
  todas, obter, salvar, apagar, doUsuario, livres, proximoId,
  pedidos, pedido, proximoPedido, acharVaga,
  chaveManual, acharPorChave, infoPedido,
  ocupar, liberar, embedPainel, embedsPainel, atualizarPainel, botoesPedido, embedPedido,
};
// fim do arquivo
