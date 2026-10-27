const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const COR = 0x5865f2;

const PADROES = {
  limite: 1,
  tipos: [
    { id: 'suporte', nome: 'Suporte', emoji: '🛠️', desc: 'Preciso de ajuda com algo' },
    { id: 'denuncia', nome: 'Denúncia', emoji: '🚨', desc: 'Quero denunciar um problema' },
    { id: 'duvida', nome: 'Dúvida', emoji: '❓', desc: 'Tenho uma pergunta' },
    { id: 'parceria', nome: 'Parceria', emoji: '🤝', desc: 'Quero propor uma parceria' },
    { id: 'outro', nome: 'Outro', emoji: '💬', desc: 'Outro assunto' },
  ],
  mensagens: {
    painel: {
      titulo: '🎫 Central de atendimento',
      texto:
        'Precisa falar com a staff? Escolha uma categoria abaixo e abra um ticket.\n' +
        'Só você e a staff vão enxergar o canal.',
    },
    abertura: {
      titulo: '{emoji} Ticket #{numero} — {categoria}',
      texto:
        'Olá, {usuario}! A staff já foi avisada e vai te atender em breve.\n' +
        'Enquanto isso, conte tudo com o máximo de detalhes.',
    },
  },
};

function cfg(chave, padrao) {
  return db.get(`config.ticket.${chave}`, padrao);
}

function cfgLista(chave) {
  const v = cfg(chave);
  return Array.isArray(v) ? v : [];
}

const limite = () => Number(cfg('limite', PADROES.limite));

function tipos() {
  const t = cfg('tipos');
  return Array.isArray(t) && t.length ? t : PADROES.tipos;
}

// ---------- Painéis separados ----------
// O painel "padrão" usa config.ticket.* (como sempre foi). Painéis extras ficam em config.ticket.paineis.<id>
// e podem ter categorias, staff, categoria de canais, logs e mensagens próprios.
function paineis() {
  const p = cfg('paineis');
  return p && typeof p === 'object' ? p : {};
}

const listaPaineis = () => Object.values(paineis()).sort((a, b) => (a.criado || 0) - (b.criado || 0));
const acharPainel = (id) => (id ? paineis()[id] || null : null);

function proximoIdPainel() {
  const n = db.get('ticket.contadorPaineis', 0) + 1;
  db.set('ticket.contadorPaineis', n);
  return `p${n}`;
}

// Painel dono de uma categoria (null = painel padrão)
function painelDoTipo(tipoId) {
  if (tipos().some((t) => t.id === tipoId)) return null;
  return listaPaineis().find((p) => (p.tipos || []).some((t) => t.id === tipoId)) || null;
}

function acharTipo(id) {
  const d = tipos().find((t) => t.id === id);
  if (d) return d;
  for (const p of listaPaineis()) {
    const t = (p.tipos || []).find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}

const painelDoTicket = (t) => (t && t.painelId ? acharPainel(t.painelId) : null);

// Configurações com herança: se o painel não definiu, vale a global
function cfgPainel(painel, chave, padrao) {
  if (painel && painel[chave] !== undefined && painel[chave] !== null) return painel[chave];
  return cfg(chave, padrao);
}

function staffIds(painel) {
  if (painel && Array.isArray(painel.staff) && painel.staff.length) return painel.staff;
  return cfgLista('staff');
}

function mensagem(tipo, painel) {
  const doPainel = painel && painel.mensagens ? painel.mensagens[tipo] : null;
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}), ...(doPainel || {}) };
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const numeroFmt = (n) => String(n).padStart(4, '0');

function proximoNumero() {
  const n = db.get('ticket.contador', 0) + 1;
  db.set('ticket.contador', n);
  return n;
}

function proximoIdTipo() {
  const n = db.get('ticket.contadorTipos', 0) + 1;
  db.set('ticket.contadorTipos', n);
  return `t${n}`;
}

const ticketDoCanal = (canalId) => db.get(`ticket.abertos.${canalId}`, null);

function ticketsDoUsuario(userId) {
  return Object.values(db.get('ticket.abertos', {}) || {}).filter((t) => t.userId === userId);
}

// Cargos da staff que ainda existem no servidor
function staffRoles(guild, painel) {
  return staffIds(painel).filter((id) => guild.roles.cache.has(id));
}

// ticket (opcional): usa a staff do painel em que ele foi aberto
function ehStaff(member, ticket) {
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }
  return staffIds(painelDoTicket(ticket)).some((id) => member.roles.cache.has(id));
}

// Aceita emoji normal (sem letras) ou emoji personalizado <:nome:id>
function emojiValido(txt) {
  const t = String(txt || '').trim();
  if (!t) return false;
  if (/^<a?:\w+:\d+>$/.test(t)) return true;
  return !/[\p{L}\p{N}]/u.test(t) && Array.from(t).length <= 8;
}

function embedAbertura(t) {
  const msg = mensagem('abertura', painelDoTicket(t));
  const vars = {
    usuario: `<@${t.userId}>`,
    numero: numeroFmt(t.numero),
    categoria: t.tipoNome,
    emoji: t.tipoEmoji || '🎫',
  };
  const status = t.assumidoPor ? `🟡 Em atendimento por <@${t.assumidoPor}>` : '🟢 Aguardando a staff';
  return new EmbedBuilder()
    .setColor(t.assumidoPor ? 0xf1c40f : COR)
    .setTitle(preencher(msg.titulo, vars).slice(0, 256))
    .setDescription(preencher(msg.texto, vars))
    .addFields(
      { name: '📌 Assunto', value: t.assunto.slice(0, 1024) },
      { name: '📝 Descrição', value: t.descricao.slice(0, 1024) },
      { name: '👤 Aberto por', value: `<@${t.userId}>`, inline: true },
      { name: '📂 Categoria', value: `${t.tipoEmoji || ''} ${t.tipoNome}`.trim(), inline: true },
      { name: '📊 Status', value: status, inline: true }
    )
    .setTimestamp(t.aberto);
}

function botoesTicket(assumido) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:assumir')
      .setLabel(assumido ? 'Liberar' : 'Assumir')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket:fechar').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

// ---------- Transcrição ----------

async function buscarMensagens(canal, limiteMsgs) {
  const todas = [];
  let antes;
  while (todas.length < limiteMsgs) {
    const lote = await canal.messages.fetch({ limit: 100, ...(antes ? { before: antes } : {}) });
    if (lote.size === 0) break;
    todas.push(...lote.values());
    antes = lote.last().id;
    if (lote.size < 100) break;
  }
  return todas.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function esc(texto) {
  return String(texto === undefined || texto === null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataBR(ms) {
  return new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Troca menções (<@id>, <@&id>, <#id>) por nomes legíveis
function textoLegivel(msg) {
  let t = msg.content || '';
  t = t.replace(/<@!?(\d+)>/g, (m, id) => {
    const u = msg.mentions.users.get(id);
    return u ? `@${u.username}` : m;
  });
  t = t.replace(/<@&(\d+)>/g, (m, id) => {
    const r = msg.guild && msg.guild.roles.cache.get(id);
    return r ? `@${r.name}` : m;
  });
  t = t.replace(/<#(\d+)>/g, (m, id) => {
    const c = msg.guild && msg.guild.channels.cache.get(id);
    return c ? `#${c.name}` : m;
  });
  return t;
}

function gerarHtml(ticket, info, mensagens) {
  const corpo = mensagens
    .map((m) => {
      const autor = esc((m.member && m.member.displayName) || m.author.username);
      const avatar = esc(m.author.displayAvatarURL({ extension: 'png', size: 64 }));
      const texto = esc(textoLegivel(m)).replace(/\n/g, '<br>');
      const extras = [];
      for (const e of m.embeds) {
        const partes = [e.title, e.description];
        for (const f of e.fields || []) partes.push(`${f.name}: ${f.value}`);
        const t = partes.filter(Boolean).join(' — ');
        if (t) extras.push(`<div class="embed">${esc(t).replace(/\n/g, '<br>')}</div>`);
      }
      for (const a of m.attachments.values()) {
        extras.push(`<div class="anexo">📎 <a href="${esc(a.url)}">${esc(a.name)}</a></div>`);
      }
      return (
        `<div class="msg"><img src="${avatar}" alt=""><div>` +
        `<span class="autor">${autor}</span><span class="hora">${esc(dataBR(m.createdTimestamp))}</span>` +
        `<div class="texto">${texto}</div>${extras.join('')}</div></div>`
      );
    })
    .join('\n');

  const css =
    'body{font-family:system-ui,sans-serif;background:#1e1f22;color:#dbdee1;margin:0;padding:16px}' +
    '.topo{background:#2b2d31;border-radius:12px;padding:16px;margin-bottom:16px}' +
    '.topo h1{margin:0 0 8px;font-size:20px;color:#fff}' +
    '.topo p{margin:2px 0;color:#b5bac1;font-size:14px}' +
    '.msg{display:flex;gap:12px;padding:8px 4px}' +
    '.msg img{width:40px;height:40px;border-radius:50%}' +
    '.autor{font-weight:600;color:#fff}' +
    '.hora{font-size:12px;color:#949ba4;margin-left:8px}' +
    '.texto{word-break:break-word;margin-top:2px}' +
    '.embed{border-left:4px solid #5865f2;background:#2b2d31;padding:8px 12px;margin-top:6px;border-radius:4px}' +
    '.anexo{margin-top:6px}a{color:#00a8fc}';

  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>Ticket #${numeroFmt(ticket.numero)}</title><style>${css}</style></head><body>` +
    `<div class="topo"><h1>Ticket #${numeroFmt(ticket.numero)} — ${esc(ticket.tipoNome)}</h1>` +
    `<p>Assunto: ${esc(ticket.assunto)}</p>` +
    `<p>Aberto por: ${esc(info.abertoPor)} em ${esc(dataBR(ticket.aberto))}</p>` +
    `<p>Fechado por: ${esc(info.fechadoPor)} em ${esc(dataBR(info.fechadoEm))}</p>` +
    `<p>Motivo do fechamento: ${esc(info.motivo || 'não informado')}</p>` +
    `<p>${mensagens.length} mensagem(ns)</p></div>${corpo}</body></html>`
  );
}

module.exports = {
  COR,
  PADROES,
  cfg,
  cfgLista,
  limite,
  tipos,
  acharTipo,
  paineis,
  listaPaineis,
  acharPainel,
  proximoIdPainel,
  painelDoTipo,
  painelDoTicket,
  cfgPainel,
  staffIds,
  mensagem,
  preencher,
  numeroFmt,
  proximoNumero,
  proximoIdTipo,
  ticketDoCanal,
  ticketsDoUsuario,
  staffRoles,
  ehStaff,
  emojiValido,
  embedAbertura,
  botoesTicket,
  buscarMensagens,
  gerarHtml,
};
