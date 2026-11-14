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
// Poderes dos vigias (ações automáticas). "Pede confirmação" aqui significa:
// com você presente ela avisa e espera o clique; com você ausente ela age sozinha (e deixa o botão Desfazer).
Object.assign(PODERES, {
  vigia_raid: { nome: 'Vigiar raids', padrao: 'confirma', vigia: true, info: 'Muitas entradas de uma vez: tranca o servidor' },
  vigia_flood: { nome: 'Vigiar flood e spam', padrao: 'confirma', vigia: true, info: 'Põe de castigo quem floda e apaga o spam' },
  vigia_golpe: { nome: 'Vigiar golpes', padrao: 'confirma', vigia: true, info: 'Apaga links de golpe e castiga quem postou' },
  ticket_fechar: { nome: 'Fechar tickets esquecidos', padrao: 'off', vigia: true, info: 'Fecha ticket parado há muito tempo' },
});
const MODOS = { off: 'desligado', confirma: 'pede confirmação', auto: 'automático' };

// ── Interruptor mestre (só o pai mexe) ───────────────────────
const ativo = () => cfg('ativo', true) !== false;
const setAtivo = (v) => setCfg('ativo', !!v);

const modo = (poder) => {
  const m = cfg(`poderes.${poder}`, null);
  return MODOS[m] ? m : (PODERES[poder] ? PODERES[poder].padrao : 'off');
};
const setModo = (poder, m) => setCfg(`poderes.${poder}`, m);
// Para os vigias: "confirma" vira "auto" enquanto o pai está ausente
const modoEfetivo = (poder) => (modo(poder) === 'confirma' && PODERES[poder] && PODERES[poder].vigia && ausencia() ? 'auto' : modo(poder));

// ── Configurações da parte 2 ─────────────────────────────────
const alertasCanal = () => cfg('alertas', null);
const ticketModo = () => (['sempre', 'ausente', 'off'].includes(cfg('ticket', 'ausente')) ? cfg('ticket', 'ausente') : 'ausente');
const lorittaId = () => cfg('loritta', '297153970613387264');

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
// ── Caixa de sonhos (pagamentos pela Loritta) e cobranças ────
const caixa = () => db.get('subdona.caixa', []);
function lancar(p) {
  const l = caixa();
  const id = db.get('subdona.caixa_n', 0) + 1;
  db.set('subdona.caixa_n', id);
  l.push({ id, em: Date.now(), ...p });
  db.set('subdona.caixa', l.slice(-500));
  return id;
}
const cobrancas = () => db.get('subdona.cobrancas', []);
const salvarCobrancas = (l) => db.set('subdona.cobrancas', l.slice(-100));
const amostrasSonhos = () => db.get('subdona.amostras_sonhos', []);
function guardarAmostra(txt) {
  db.set('subdona.amostras_sonhos', [...amostrasSonhos(), { em: Date.now(), txt: String(txt).slice(0, 700) }].slice(-10));
}

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
  ativo, setAtivo, modoEfetivo, alertasCanal, ticketModo, lorittaId, caixa, lancar, cobrancas, salvarCobrancas, amostrasSonhos, guardarAmostra,
  ausencia, ausentar, voltar, diario, registrar, obter, marcarDesfeito, recados, anotarRecado, limparRecados,
  guardarPendente, pegarPendente, soltarPendente,
};
