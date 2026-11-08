// Núcleo da blacklist: quem está na lista, o histórico do que cada um fez e os alertas de suspeita.
const db = require('../db');
const L = require('../logs/nucleo');

const IGNORAR_TRADUCAO = Symbol.for('atlas.mensagens.ignorar'); // não passa pelo editor de mensagens
const COR = { alerta: 0xe74c3c, info: 0x3498db, ok: 0x2ecc71 };
const MAX_HISTORICO = 40;

const cfg = (k, p) => db.get(`config.blacklist.${k}`, p);
const modoCompleto = () => !!cfg('completo', false);
// Canal próprio da blacklist; se não tiver, usa o canal de logs de moderação
const canalId = () => cfg('canal') || L.canalId('moderacao') || null;

// ---------- Lista ----------
function lista() {
  const o = db.get('blacklist.membros', {}) || {};
  return Object.entries(o).map(([id, d]) => ({ id, ...d }));
}
const get = (id) => db.get(`blacklist.membros.${id}`) || null;
const esta = (id) => !!get(id);

function adicionar(userId, motivo, porId) {
  db.set(`blacklist.membros.${userId}`, { motivo, por: porId, data: Date.now() });
}

function remover(userId) {
  db.remover(`blacklist.membros.${userId}`);
  db.remover(`blacklist.historico.${userId}`);
}

// ---------- Histórico ----------
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

// ---------- Envio de alertas ----------
async function enviarCanal(guild, emb) {
  try {
    const id = canalId();
    if (!id) return false;
    const canal = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
    if (!canal || !canal.isTextBased()) return false;
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] }, [IGNORAR_TRADUCAO]: true });
    return true;
  } catch (e) {
    console.error('[Blacklist] não consegui enviar o alerta:', e.message);
    return false;
  }
}

// Anota no histórico e, se for suspeito (ou o modo completo estiver ligado), avisa no canal
async function alertar(guild, userId, titulo, descricao, campos = [], { suspeito = true } = {}) {
  const dados = get(userId);
  if (!dados) return;
  anotar(userId, `${titulo}${descricao ? ` — ${String(descricao).replace(/\n/g, ' | ')}` : ''}`, suspeito);
  if (!suspeito && !modoCompleto()) return;

  const emb = L.embed(suspeito ? COR.alerta : COR.info, titulo, `<@${userId}> (\`${userId}\`)\n${descricao || ''}`, campos);
  emb.setFooter({ text: `Na blacklist: ${L.corta(dados.motivo || 'sem motivo', 180)}` });
  await enviarCanal(guild, emb);
}

// ---------- Detecção de suspeitas ----------
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
  const lista = (recentes.get(userId) || []).filter((x) => agora - x.t < 60000);
  lista.push({ t: agora, texto: limpo });
  recentes.set(userId, lista);

  const m = [];
  if (lista.filter((x) => agora - x.t < 10000).length >= 5) m.push('mandando mensagens muito rápido (spam)');
  if (limpo && lista.filter((x) => x.texto === limpo).length >= 3) m.push('repetindo a mesma mensagem');
  return m;
}

module.exports = {
  COR,
  cfg,
  modoCompleto,
  canalId,
  lista,
  get,
  esta,
  adicionar,
  remover,
  historico,
  anotar,
  enviarCanal,
  alertar,
  motivosConteudo,
  motivosSpam,
};
