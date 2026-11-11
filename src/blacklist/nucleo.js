// Núcleo da blacklist: lista, observação automática, histórico, estatísticas e alertas.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const L = require('../logs/nucleo');

const IGNORAR_TRADUCAO = Symbol.for('atlas.mensagens.ignorar'); // não passa pelo editor de mensagens
const FUSO = 'America/Sao_Paulo';
const COR = { alerta: 0xe74c3c, obs: 0xf1c40f, info: 0x3498db, ok: 0x2ecc71 };
const MAX_HISTORICO = 100;
const MAX_AUTOMOD = 50;
const DEDUPE_MS = 30 * 1000; // alertas iguais dentro de 30s viram um só
const PING_MS = 5 * 60 * 1000; // no máximo 1 marcação de cargo a cada 5 min por membro
const BLOQUEIOS_PARA_OBSERVAR = 4; // 4 bloqueios do automod em 24h colocam o membro em observação

// ---------- Configurações ----------
const cfg = (k, p) => db.get(`config.blacklist.${k}`, p);
const modoCompleto = () => !!cfg('completo', false);
const cargoId = () => cfg('cargo') || null;
const canalId = () => cfg('canal') || L.canalId('moderacao') || null; // sem canal próprio, usa o de logs de moderação
const resumoHora = () => {
  const v = cfg('resumo', 9);
  return v === false || v === null || v === undefined ? null : Number(v);
};

// ---------- Datas (no fuso do Brasil) ----------
function diaLocal(offsetDias = 0) {
  const d = new Date(Date.now() + offsetDias * 86400000);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function horaLocal() {
  try {
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hourCycle: 'h23' }).format(new Date())) % 24;
  } catch {
    return new Date().getHours();
  }
}

// ---------- Lista (só ADM mexe) ----------
function lista() {
  const o = db.get('blacklist.membros', {}) || {};
  return Object.entries(o).map(([id, d]) => ({ id, ...d }));
}
const get = (id) => db.get(`blacklist.membros.${id}`) || null;
const esta = (id) => !!get(id);

function adicionar(userId, motivo, porId) {
  db.set(`blacklist.membros.${userId}`, { motivo, por: porId, data: Date.now() });
  db.remover(`blacklist.observacao.${userId}`); // quem entra na lista não precisa mais de observação
}

function remover(userId) {
  db.remover(`blacklist.membros.${userId}`);
  db.remover(`blacklist.historico.${userId}`);
  db.remover(`blacklist.stats.${userId}`);
  db.remover(`blacklist.automod.${userId}`);
}

// ---------- Observação (automática, só gera alertas) ----------
function observacao(id) {
  const o = db.get(`blacklist.observacao.${id}`) || null;
  if (!o) return null;
  if (o.ate && o.ate < Date.now()) {
    db.remover(`blacklist.observacao.${id}`);
    return null;
  }
  return o;
}
const observando = (id) => !!observacao(id);

// Quem está na lista OU em observação é vigiado
const vigiado = (id) => esta(id) || observando(id);

function listaObservados() {
  const o = db.get('blacklist.observacao', {}) || {};
  return Object.entries(o)
    .filter(([id]) => observacao(id))
    .map(([id, d]) => ({ id, ...d }));
}

// Retorna true se o membro entrou agora em observação (false se já estava ou já está na blacklist)
function observar(userId, motivo, dias = 7) {
  if (esta(userId)) return false;
  const jaEstava = observando(userId);
  db.set(`blacklist.observacao.${userId}`, { motivo, desde: Date.now(), ate: Date.now() + dias * 86400000 });
  return !jaEstava;
}

function soltar(userId) {
  const tinha = observando(userId);
  db.remover(`blacklist.observacao.${userId}`);
  if (!esta(userId)) {
    db.remover(`blacklist.historico.${userId}`);
    db.remover(`blacklist.stats.${userId}`);
    db.remover(`blacklist.automod.${userId}`);
  }
  return tinha;
}

// ---------- Histórico e estatísticas ----------
function historico(userId) {
  const h = db.get(`blacklist.historico.${userId}`, []);
  return Array.isArray(h) ? [...h] : [];
}

function anotar(userId, texto, suspeito) {
  const h = historico(userId);
  h.push({ t: Date.now(), texto: String(texto).slice(0, 300), s: !!suspeito });
  while (h.length > MAX_HISTORICO) h.shift();
  db.set(`blacklist.historico.${userId}`, h);
}

function contar(userId, { total = 0, suspeitos = 0, automod = 0 } = {}) {
  const base = `blacklist.stats.${userId}`;
  const todos = db.get(base, {}) || {};
  const dia = diaLocal();
  const h = todos[dia] || { total: 0, suspeitos: 0, automod: 0 };
  h.total += total;
  h.suspeitos += suspeitos;
  h.automod += automod;
  todos[dia] = h;
  for (const k of Object.keys(todos).sort().slice(0, -8)) delete todos[k]; // guarda só 8 dias
  db.set(base, todos);
}

function estatisticas(userId, dia = diaLocal()) {
  const todos = db.get(`blacklist.stats.${userId}`, {}) || {};
  return todos[dia] || { total: 0, suspeitos: 0, automod: 0 };
}

// ---------- Ocorrências do automod (de todos os membros) ----------
function ocorrencias(userId) {
  const o = db.get(`blacklist.automod.${userId}`, []);
  return Array.isArray(o) ? [...o] : [];
}

// Chamada pelo automod toda vez que bloqueia algo. Se o membro bloquear muito, entra em observação.
async function registrarOcorrencia(guild, userId, { categoria, grave }) {
  const lista = ocorrencias(userId);
  lista.push({ t: Date.now(), categoria, grave: !!grave });
  while (lista.length > MAX_AUTOMOD) lista.shift();
  db.set(`blacklist.automod.${userId}`, lista);
  if (vigiado(userId)) contar(userId, { automod: 1 });

  const recentes = lista.filter((x) => Date.now() - x.t < 86400000).length;
  if (recentes >= BLOQUEIOS_PARA_OBSERVAR) {
    await observarEAvisar(guild, userId, `Automod bloqueou ${recentes} mensagens em 24 horas`, 7);
  }
  return recentes;
}

// ---------- Envio ----------
async function enviarCanal(guild, emb, extra = {}) {
  try {
    const id = canalId();
    if (!id) return false;
    const canal = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
    if (!canal || !canal.isTextBased()) return false;
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] }, ...extra, [IGNORAR_TRADUCAO]: true });
    return true;
  } catch (e) {
    console.error('[Blacklist] não consegui enviar o alerta:', e.message);
    return false;
  }
}

async function observarEAvisar(guild, userId, motivo, dias = 7) {
  if (!observar(userId, motivo, dias)) return false;
  const emb = L.embed(COR.obs, '👁️ Membro em observação', `<@${userId}> (\`${userId}\`)\n${motivo}`, [
    ['Observação até', `<t:${Math.floor((Date.now() + dias * 86400000) / 1000)}:d>`, true],
  ]);
  emb.setFooter({ text: 'O Atlas vai avisar se ele fizer algo suspeito. Para parar: /blacklist soltar' });
  await enviarCanal(guild, emb);
  return true;
}

function botoes(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`blacklist:adv:${userId}`).setLabel('Advertir').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`blacklist:cast:${userId}`).setLabel('Castigar 1h').setEmoji('🔇').setStyle(ButtonStyle.Secondary)
  );
}

const ultimoEnvio = new Map(); // "user|titulo" -> hora
const suprimidos = new Map(); // "user|titulo" -> quantos alertas iguais foram cortados
const ultimoPing = new Map(); // userId -> hora

// Anota no histórico e, se for suspeito (ou o modo completo/forçar estiver ligado), avisa no canal
async function alertar(guild, userId, titulo, descricao, campos = [], { suspeito = true, forcar = false } = {}) {
  const dados = get(userId);
  const obs = dados ? null : observacao(userId);
  if (!dados && !obs) return;

  anotar(userId, `${titulo}${descricao ? ` — ${String(descricao).replace(/\n/g, ' | ')}` : ''}`, suspeito);
  contar(userId, { total: 1, suspeitos: suspeito ? 1 : 0 });
  if (!suspeito && !forcar && !modoCompleto()) return;

  // Corta alertas repetidos
  const chave = `${userId}|${titulo}`;
  const agora = Date.now();
  if (agora - (ultimoEnvio.get(chave) || 0) < DEDUPE_MS) {
    suprimidos.set(chave, (suprimidos.get(chave) || 0) + 1);
    return;
  }
  ultimoEnvio.set(chave, agora);
  const cortados = suprimidos.get(chave) || 0;
  suprimidos.delete(chave);

  const campos2 = [...campos];
  if (cortados) campos2.push(['Repetições cortadas', `${cortados} alerta${cortados > 1 ? 's' : ''} igual${cortados > 1 ? 'is' : ''} nos últimos segundos`, true]);

  const emb = L.embed(suspeito ? COR.alerta : obs ? COR.obs : COR.info, titulo, `<@${userId}> (\`${userId}\`)\n${descricao || ''}`, campos2);
  emb.setFooter({ text: dados ? `Na blacklist: ${L.corta(dados.motivo || 'sem motivo', 180)}` : `Em observação: ${L.corta(obs.motivo || '', 180)}` });

  const extra = {};
  if (suspeito) {
    extra.components = [botoes(userId)];
    const cargo = cargoId();
    if (cargo && agora - (ultimoPing.get(userId) || 0) > PING_MS) {
      ultimoPing.set(userId, agora);
      extra.content = `<@&${cargo}>`;
      extra.allowedMentions = { roles: [cargo] };
    }
  }
  await enviarCanal(guild, emb, extra);
}

// ---------- Detecção de suspeitas em mensagens ----------
const RE_CONVITE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;
const RE_LINK = /https?:\/\/[^\s]+/i;
const RE_GOLPE = /free\s*nitro|nitro\s*gr[aá]tis|steam\s*gift|airdrop|clique\s+(?:aqui\s+)?(?:para|e)\s+(?:ganhar|resgatar)/i;
const EXT_PERIGOSA = /\.(?:exe|scr|bat|cmd|msi|apk|jar|ps1|vbs|lnk|dll)$/i;

function motivosConteudo(msg) {
  const m = [];
  const texto = msg.content || '';
  if (/@(?:everyone|here)/.test(texto)) m.push('tentou marcar @everyone/@here');
  const marcados = msg.mentions && msg.mentions.users ? msg.mentions.users.size : 0;
  if (marcados >= 4) m.push(`marcou ${marcados} pessoas de uma vez`);
  if (RE_CONVITE.test(texto)) m.push('enviou convite de outro servidor');
  else if (RE_LINK.test(texto)) m.push('enviou um link');
  if (RE_GOLPE.test(texto)) m.push('texto parecido com golpe');
  if (msg.attachments) {
    for (const a of msg.attachments.values()) {
      if (EXT_PERIGOSA.test(a.name || '')) m.push(`enviou arquivo perigoso (${a.name})`);
    }
  }
  return m;
}

const recentes = new Map(); // userId -> [{ t, texto }]

function motivosSpam(userId, texto) {
  const agora = Date.now();
  const limpo = String(texto || '').trim().toLowerCase();
  const l = (recentes.get(userId) || []).filter((x) => agora - x.t < 60000);
  l.push({ t: agora, texto: limpo });
  recentes.set(userId, l);

  const m = [];
  if (l.filter((x) => agora - x.t < 10000).length >= 5) m.push('mandando mensagens muito rápido (spam)');
  if (limpo && l.filter((x) => x.texto === limpo).length >= 3) m.push('repetindo a mesma mensagem');
  return m;
}

module.exports = {
  COR, cfg, modoCompleto, cargoId, canalId, resumoHora, diaLocal, horaLocal,
  lista, get, esta, adicionar, remover,
  observacao, observando, vigiado, listaObservados, observar, soltar, observarEAvisar,
  historico, anotar, contar, estatisticas, ocorrencias, registrarOcorrencia,
  enviarCanal, alertar, motivosConteudo, motivosSpam,
};
