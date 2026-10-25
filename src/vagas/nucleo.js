// Controle de vagas da house: lista de vagas, quem ocupa, pedidos e painel.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;

const PADROES = {
  mensagens: {
    painel: {
      titulo: '📋 Vagas da house',
      texto: 'Veja abaixo as vagas livres e ocupadas.\nPara pedir uma vaga livre use `/vaga pedir`.',
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
  await atualizarPainel(guild);
  return antigo;
}

// ---------- Painel ----------
function embedPainel(guild) {
  const m = mensagem('painel');
  const emb = new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(m.texto);
  const lista = todas();
  if (!lista.length) {
    emb.addFields({ name: 'Vagas', value: 'Nenhuma vaga cadastrada ainda.' });
    return emb;
  }
  const grupos = new Map();
  for (const v of lista) {
    const g = v.grupo || 'Geral';
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(v);
  }
  let campos = 0;
  for (const [g, vs] of grupos) {
    const linhas = vs.map((v) => (v.ocupanteId ? `🔴 **${v.nome}** — <@${v.ocupanteId}>` : `🟢 **${v.nome}** — livre`));
    // quebra em pedaços de até 1000 caracteres
    let atual = '';
    let parte = 0;
    const empurra = () => {
      if (!atual || campos >= 24) return;
      emb.addFields({ name: parte ? `${g} (cont.)` : g, value: atual });
      campos++;
      parte++;
      atual = '';
    };
    for (const l of linhas) {
      if ((atual + '\n' + l).length > 1000) empurra();
      atual += (atual ? '\n' : '') + l;
    }
    empurra();
  }
  const livresN = lista.filter((v) => !v.ocupanteId).length;
  emb.setFooter({ text: `${livresN} livre(s) de ${lista.length}` });
  return emb;
}

async function atualizarPainel(guild) {
  const canalId = cfg('canalPainel');
  if (!canalId) return false;
  const canal = guild.channels.cache.get(canalId);
  if (!canal) return false;
  const payload = { embeds: [embedPainel(guild)], allowedMentions: { parse: [] } };
  const msgId = cfg('painelMsgId');
  if (msgId && cfg('painelCanalId') === canalId) {
    const msg = await canal.messages.fetch(msgId).catch(() => null);
    if (msg) {
      await msg.edit(payload).catch(() => {});
      return true;
    }
  }
  try {
    const nova = await canal.send(payload);
    db.set('config.vagas.painelMsgId', nova.id);
    db.set('config.vagas.painelCanalId', canal.id);
    return true;
  } catch {
    return false;
  }
}

// ---------- Pedidos ----------
function botoesPedido(id, desligados) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vaga:aprovar:${id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!!desligados),
    new ButtonBuilder().setCustomId(`vaga:recusar:${id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(!!desligados),
  );
}

function embedPedido(p, vaga, estado) {
  const emb = new EmbedBuilder()
    .setColor(estado === 'aprovado' ? 0x57f287 : estado === 'recusado' ? 0xed4245 : COR)
    .setTitle('📨 Pedido de vaga')
    .setDescription(`**Membro:** <@${p.userId}>\n**Vaga:** ${vaga ? vaga.nome : '(removida)'}${p.obs ? `\n**Observação:** ${p.obs}` : ''}`)
    .setFooter({ text: `Pedido #${p.id}` });
  if (estado) emb.addFields({ name: 'Resultado', value: `${estado === 'aprovado' ? '✅ Aprovado' : '❌ Recusado'} por <@${p.porId}>` });
  return emb;
}

module.exports = {
  PADROES, cfg, mensagem, limite, norm,
  todas, obter, salvar, apagar, doUsuario, livres, proximoId,
  pedidos, pedido, proximoPedido, acharVaga,
  ocupar, liberar, embedPainel, atualizarPainel, botoesPedido, embedPedido,
};
