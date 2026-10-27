// Núcleo dos logs: onde cada tipo de log vai parar e como montar as mensagens.
const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const db = require('../db');

const IGNORAR_TRADUCAO = Symbol.for('atlas.mensagens.ignorar'); // não passa pelo editor de mensagens

const CATEGORIAS = {
  membros: '👥 Entradas, saídas e mudanças de membros',
  moderacao: '🔨 Bans, expulsões e castigos',
  mensagens: '💬 Mensagens apagadas e editadas',
  voz: '🔊 Canais de voz',
  canais: '📁 Canais e tópicos',
  cargos: '🏷️ Cargos',
  servidor: '⚙️ Servidor, emojis e convites',
  comandos: '⌨️ Comandos usados',
};

const CORES = { verde: 0x57f287, vermelho: 0xed4245, amarelo: 0xfee75c, azul: 0x5865f2, rosa: 0xf5a3c7, cinza: 0x99aab5 };

const cfg = (k, p) => db.get(`config.logs.${k}`, p);
const ativa = (cat) => !(cfg('desligados', []) || []).includes(cat);
const canalId = (cat) => cfg(`canais.${cat}`) || cfg('padrao') || null;
const ignorados = () => cfg('ignorados', []) || [];

// IDs de todos os canais usados como log (para não registrar o próprio log)
function canaisDeLog() {
  const s = new Set();
  if (cfg('padrao')) s.add(cfg('padrao'));
  for (const id of Object.values(cfg('canais', {}) || {})) s.add(id);
  return s;
}

const corta = (t, n = 1000) => {
  const s = String(t === undefined || t === null ? '' : t);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const vazio = (t) => (t === undefined || t === null || String(t).trim() === '' ? '—' : String(t));
const quando = (ms) => `<t:${Math.floor(ms / 1000)}:R>`;
const quandoCompleto = (ms) => `<t:${Math.floor(ms / 1000)}:f>`;
const pessoa = (u) => (u ? `<@${u.id}> (${u.tag || u.username || u.id})` : 'desconhecido');

function embed(cor, titulo, descricao, campos = []) {
  const e = new EmbedBuilder().setColor(CORES[cor] || cor).setTitle(corta(titulo, 250)).setTimestamp(new Date());
  if (descricao) e.setDescription(corta(descricao, 3900));
  const lista = campos.filter(Boolean).slice(0, 24).map(([nome, valor, inline]) => ({ name: corta(nome, 250), value: corta(vazio(valor), 1020), inline: !!inline }));
  if (lista.length) e.addFields(...lista);
  return e;
}

async function enviar(guild, cat, emb) {
  try {
    if (!guild || !ativa(cat)) return;
    const id = canalId(cat);
    if (!id) return;
    const canal = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
    if (!canal || !canal.isTextBased()) return;
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] }, [IGNORAR_TRADUCAO]: true });
  } catch (e) {
    console.error('[Logs] não consegui enviar:', e.message);
  }
}

// Descobre QUEM fez a ação olhando o registro de auditoria (precisa da permissão "Ver registro de auditoria")
async function quem(guild, tipo, alvoId, { espera = 900, filtro } = {}) {
  try {
    await new Promise((r) => setTimeout(r, espera));
    const reg = await guild.fetchAuditLogs({ type: tipo, limit: 8 });
    const agora = Date.now();
    for (const e of reg.entries.values()) {
      if (agora - e.createdTimestamp > 15000) continue;
      if (alvoId && e.target && e.target.id !== alvoId) continue;
      if (filtro && !filtro(e)) continue;
      return { executor: e.executor || null, motivo: e.reason || null, entrada: e };
    }
  } catch { /* sem permissão ou sem registro */ }
  return null;
}

module.exports = {
  AuditLogEvent, CATEGORIAS, CORES, cfg, ativa, canalId, ignorados, canaisDeLog,
  corta, vazio, quando, quandoCompleto, pessoa, embed, enviar, quem,
};
