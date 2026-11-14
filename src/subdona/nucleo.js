// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · base
//  Config, ausência do pai, cofre de poderes, delegados, diário e recados.
//  Tudo fica no banco em  config.subdona.*  (configuração)  e  subdona.*  (registros).
// ─────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../db');
const Conversa = require('../conversa/nucleo');

const cfg = (k, p = null) => db.get(`config.subdona.${k}`, p);
const setCfg = (k, v) => db.set(`config.subdona.${k}`, v);

// ── Cofre de poderes ─────────────────────────────────────────
// modo: 'off' (nunca faz) · 'confirma' (pede um clique de quem mandou) · 'auto' (faz direto)
// perm: permissão do Discord que um DELEGADO precisa ter (o pai manda sem precisar)
const PODERES = {
  advertir: { nome: 'Advertir', padrao: 'auto', perm: 'ModerateMembers', info: 'Dá aviso a um membro' },
  silenciar: { nome: 'Silenciar', padrao: 'auto', perm: 'ModerateMembers', info: 'Põe de castigo (timeout) e tira' },
  expulsar: { nome: 'Expulsar', padrao: 'confirma', perm: 'KickMembers', info: 'Expulsa um membro' },
  banir: { nome: 'Banir', padrao: 'confirma', perm: 'BanMembers', info: 'Bane um membro' },
  desbanir: { nome: 'Desbanir', padrao: 'confirma', perm: 'BanMembers', info: 'Tira um banimento' },
  limpar: { nome: 'Limpar mensagens', padrao: 'auto', perm: 'ManageMessages', info: 'Apaga mensagens recentes' },
  trancar: { nome: 'Trancar canal', padrao: 'auto', perm: 'ManageChannels', info: 'Tranca e destranca canais' },
  lento: { nome: 'Modo lento', padrao: 'auto', perm: 'ManageChannels', info: 'Liga e desliga o modo lento' },
  anunciar: { nome: 'Anunciar', padrao: 'auto', perm: 'ManageMessages', info: 'Posta um aviso em um canal' },
  cargo: { nome: 'Cargos', padrao: 'confirma', perm: 'ManageRoles', info: 'Dá e tira cargos' },
  apelido: { nome: 'Apelidos', padrao: 'auto', perm: 'ManageNicknames', info: 'Muda o apelido de alguém' },
};
const MODOS = { off: 'desligado', confirma: 'pede confirmação', auto: 'automático' };

const modo = (poder) => {
  const m = cfg(`poderes.${poder}`, null);
  return MODOS[m] ? m : (PODERES[poder] ? PODERES[poder].padrao : 'off');
};
const setModo = (poder, m) => setCfg(`poderes.${poder}`, m);

// ── Quem manda ───────────────────────────────────────────────
const paiId = (client) => Conversa.paiId(client);
const ehPai = (client, uid) => Conversa.ehPai(client, uid);
const delegados = () => cfg('delegados', []);
const ehDelegado = (uid) => delegados().includes(uid);
async function podeMandar(client, uid) {
  return (await ehPai(client, uid)) || ehDelegado(uid);
}
function delegar(uid) {
  const l = delegados();
  if (!l.includes(uid)) l.push(uid);
  setCfg('delegados', l.slice(0, 25));
}
function tirarDelegado(uid) {
  setCfg('delegados', delegados().filter((x) => x !== uid));
}

// ── Ausência ─────────────────────────────────────────────────
function ausencia() {
  const a = cfg('ausente', null);
  if (!a) return null;
  if (a.ate && a.ate <= Date.now()) {
    setCfg('ausente', null);
    return null;
  }
  return a;
}
const ausentar = ({ motivo, horas }) => setCfg('ausente', { desde: Date.now(), ate: horas ? Date.now() + horas * 3600 * 1000 : null, motivo: motivo || '' });
const voltar = () => setCfg('ausente', null);

// ── Diário (tudo que a sub dona fez) ─────────────────────────
const diario = () => db.get('subdona.diario', []);
function registrar({ acao, executor, alvo = null, motivo = '', texto = '', desfazer = null, origem = 'ordem', guildId = null }) {
  const lista = diario();
  const id = (db.get('subdona.contador', 0)) + 1;
  db.set('subdona.contador', id);
  lista.push({ id, em: Date.now(), acao, executor, alvo, motivo: String(motivo).slice(0, 200), texto: String(texto).slice(0, 200), desfazer, desfeito: false, origem, guildId, ausencia: !!ausencia() });
  db.set('subdona.diario', lista.slice(-200));
  return id;
}
const obter = (id) => diario().find((d) => d.id === id) || null;
function marcarDesfeito(id) {
  db.set('subdona.diario', diario().map((d) => (d.id === id ? { ...d, desfeito: true } : d)));
}

// ── Recados para o pai ───────────────────────────────────────
const recados = () => db.get('subdona.recados', []);
function anotarRecado({ de, canalId, guildId, msgId, texto }) {
  const l = recados();
  l.push({ de, canalId, guildId, msgId, texto: String(texto).slice(0, 300), em: Date.now() });
  db.set('subdona.recados', l.slice(-100));
}
const limparRecados = () => db.set('subdona.recados', []);

// ── Pedidos pendentes de confirmação (somem em 3 minutos) ────
const pendentes = new Map();
const VALIDADE = 3 * 60 * 1000;
function guardarPendente(dados) {
  for (const [k, v] of pendentes) if (Date.now() - v.ts > VALIDADE) pendentes.delete(k);
  const token = crypto.randomBytes(4).toString('hex');
  pendentes.set(token, { ...dados, ts: Date.now() });
  return token;
}
function pegarPendente(token) {
  const p = pendentes.get(token);
  if (!p || Date.now() - p.ts > VALIDADE) { pendentes.delete(token); return null; }
  return p;
}
const soltarPendente = (token) => pendentes.delete(token);

module.exports = {
  cfg, setCfg, PODERES, MODOS, modo, setModo, paiId, ehPai, delegados, ehDelegado, podeMandar, delegar, tirarDelegado,
  ausencia, ausentar, voltar, diario, registrar, obter, marcarDesfeito, recados, anotarRecado, limparRecados,
  guardarPendente, pegarPendente, soltarPendente,
};
