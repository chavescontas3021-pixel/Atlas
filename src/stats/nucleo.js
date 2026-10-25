// Estatísticas do servidor: mensagens por dia/canal/membro, entradas e saídas.
const db = require('../db');

const BRT = 3 * 3600 * 1000; // Brasília = UTC-3
const DIA = 24 * 3600 * 1000;
const GUARDAR_DIAS = 90;

const diaChave = (ts) => new Date(ts - BRT).toISOString().slice(0, 10).replace(/-/g, '');
const ignorados = () => db.get('config.stats.ignorados', []) || [];

// Os contadores ficam na memória e são gravados a cada 30 segundos
const pendentes = new Map();
function somar(chave, n = 1) {
  pendentes.set(chave, (pendentes.get(chave) || 0) + n);
}

function flush() {
  for (const [chave, n] of pendentes) db.set(chave, db.get(chave, 0) + n);
  pendentes.clear();
}

function registrarMensagem(canalId, uid, ts = Date.now()) {
  if (ignorados().includes(canalId)) return;
  const d = diaChave(ts);
  somar(`stats.dias.${d}.msgs`);
  somar(`stats.dias.${d}.canais.${canalId}`);
  somar(`stats.dias.${d}.membros.${uid}`);
  somar(`stats.total.${uid}`);
}
const registrarEntrada = (ts = Date.now()) => somar(`stats.dias.${diaChave(ts)}.entradas`);
const registrarSaida = (ts = Date.now()) => somar(`stats.dias.${diaChave(ts)}.saidas`);

// Soma os últimos `dias` dias (contando hoje)
function agregado(dias, agora = Date.now()) {
  flush();
  const r = { total: 0, entradas: 0, saidas: 0, canais: new Map(), membros: new Map(), porDia: [] };
  for (let i = dias - 1; i >= 0; i--) {
    const ts = agora - i * DIA;
    const k = diaChave(ts);
    const d = db.get(`stats.dias.${k}`, {}) || {};
    const tot = d.msgs || 0;
    r.total += tot;
    r.entradas += d.entradas || 0;
    r.saidas += d.saidas || 0;
    for (const [c, n] of Object.entries(d.canais || {})) r.canais.set(c, (r.canais.get(c) || 0) + n);
    for (const [m, n] of Object.entries(d.membros || {})) r.membros.set(m, (r.membros.get(m) || 0) + n);
    r.porDia.push({ dia: k, total: tot });
  }
  return r;
}

const top = (mapa, n) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const totalDoMembro = (uid) => { flush(); return db.get(`stats.total.${uid}`, 0); };

function formatarDia(k) {
  return `${k.slice(6, 8)}/${k.slice(4, 6)}`;
}

function grafico(porDia) {
  const max = Math.max(1, ...porDia.map((d) => d.total));
  return porDia
    .map((d) => {
      const n = d.total ? Math.max(1, Math.round((d.total / max) * 12)) : 0;
      return `${formatarDia(d.dia)} ${'█'.repeat(n) || '·'} ${d.total}`;
    })
    .join('\n');
}

function limpar() {
  flush();
  const dias = db.get('stats.dias', {}) || {};
  const limite = diaChave(Date.now() - GUARDAR_DIAS * DIA);
  for (const k of Object.keys(dias)) if (k < limite) db.remover(`stats.dias.${k}`);
}

// Renomeia o canal-contador (ex: "👥 Membros: 120")
async function contadorTick(client) {
  const canalId = db.get('config.stats.contador.canal', null);
  if (!canalId) return;
  const modelo = db.get('config.stats.contador.modelo', '👥 Membros: {n}');
  for (const guild of client.guilds.cache.values()) {
    const canal = guild.channels.cache.get(canalId);
    if (!canal) continue;
    const nome = String(modelo).replace('{n}', guild.memberCount).slice(0, 100);
    if (canal.name !== nome) await canal.setName(nome).catch(() => {});
  }
}

module.exports = {
  DIA, diaChave, ignorados, registrarMensagem, registrarEntrada, registrarSaida,
  flush, agregado, top, totalDoMembro, grafico, limpar, contadorTick,
};
