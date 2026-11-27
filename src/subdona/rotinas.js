const db = require('../db');
const N = require('./nucleo');

const DIA = 24 * 3600 * 1000;
const BRT = 3 * 3600 * 1000;
const MAX = 30;
const TIPOS = {
  anuncio: 'Anúncio', sorteio: 'Sorteio', evento: 'Evento', inativos: 'Cargo de inativos',
  cargo_tempo: 'Cargo por tempo de casa', cargo_entrada: 'Cargo ao entrar',
};
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const lista = () => db.get('subdona.rotinas', []) || [];
const salvar = (l) => db.set('subdona.rotinas', l);
const obter = (id) => lista().find((r) => r.id === id) || null;

function proxima(r, de = Date.now()) {
  const b = new Date(de - BRT);
  const alvo = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), r.hora || 0, 0));
  if (r.repete === 'semanal') alvo.setUTCDate(alvo.getUTCDate() + ((r.dia - alvo.getUTCDay() + 7) % 7));
  let ts = alvo.getTime() + BRT;
  if (ts <= de) ts += (r.repete === 'semanal' ? 7 : 1) * DIA;
  return ts;
}

function criar(dados) {
  const l = lista();
  if (l.length >= MAX) return { erro: `Limite de ${MAX} rotinas. Remova alguma com /rotina remover.` };
  const id = (db.get('subdona.rotinas_n', 0)) + 1;
  db.set('subdona.rotinas_n', id);
  const r = { id, criada: Date.now(), ativa: true, ...dados };
  if (r.texto) r.texto = String(r.texto).replace(/@(everyone|here)/gi, '@$1').slice(0, 1500);
  if (r.tipo !== 'cargo_entrada' && !r.proxima) r.proxima = r.repete === 'uma_vez' ? r.quando : proxima(r);
  l.push(r);
  salvar(l);
  return { rotina: r };
}
function remover(id) {
  const l = lista();
  if (!l.some((r) => r.id === id)) return false;
  salvar(l.filter((r) => r.id !== id));
  return true;
}
function alternar(id) {
  const l = lista();
  const r = l.find((x) => x.id === id);
  if (!r) return null;
  r.ativa = !r.ativa;
  if (r.ativa && r.repete && r.repete !== 'uma_vez') r.proxima = proxima(r);
  salvar(l);
  return r;
}

function descrever(r) {
  const quando = r.tipo === 'cargo_entrada' ? 'ao entrar no servidor'
    : r.repete === 'uma_vez' ? `uma vez, <t:${Math.floor(r.proxima / 1000)}:f>`
    : r.repete === 'semanal' ? `toda ${DIAS_SEMANA[r.dia]}, ${r.hora}h`
    : r.tipo === 'inativos' || r.tipo === 'cargo_tempo' ? `todo dia, ${r.hora}h` : `todo dia, ${r.hora}h`;
  const alvo = r.cargoId ? ` ${r.tipo === 'inativos' ? `(${r.dias} dias sem falar)` : r.tipo === 'cargo_tempo' ? `(${r.dias} dias de casa)` : ''}` : '';
  const txt = r.texto ? `: ${String(r.texto).slice(0, 60)}` : r.premio ? `: ${String(r.premio).slice(0, 40)}` : r.titulo ? `: ${String(r.titulo).slice(0, 40)}` : '';
  return `**#${r.id}**  ${r.ativa ? '●' : '○'}  ${TIPOS[r.tipo] || r.tipo}${txt}${alvo}\n↳ ${quando}${r.resultado ? `  ·  ${r.resultado}` : ''}`;
}

const poderOk = (p) => N.ativo() && N.modo(p) !== 'off';

async function rodarAnuncio(client, r) {
  if (!poderOk('anunciar')) return 'poder Anunciar desligado';
  const canal = client.channels.cache.get(r.canalId);
  if (!canal) return 'canal não encontrado';
  await canal.send({ content: r.texto, allowedMentions: { parse: [], roles: r.cargoPing ? [r.cargoPing] : [] } });
  return 'postado';
}
async function rodarSorteio(client, r) {
  if (!poderOk('anunciar')) return 'poder Anunciar desligado';
  const canal = client.channels.cache.get(r.canalId);
  if (!canal) return 'canal não encontrado';
  const E = require('../eventos/nucleo');
  const s = {
    id: E.proximoId('sorteios'), guildId: canal.guildId, canalId: canal.id, msgId: null,
    criadorId: client.user.id, criadorNome: 'Atlas', premioTipo: 'texto', premio: r.premio, vencedores: r.vencedores || 1,
    fim: Date.now() + r.duracaoMs, cargoExigido: null, nivelMin: 0, participantes: [], ganhadores: [], status: 'ativo',
  };
  const msg = await canal.send({ content: r.cargoPing ? `<@&${r.cargoPing}>` : undefined, embeds: [E.embedSorteio(s)], components: E.botoesSorteio(s), allowedMentions: { roles: r.cargoPing ? [r.cargoPing] : [] } });
  s.msgId = msg.id;
  E.salvarSorteio(s);
  return `sorteio #${s.id} criado`;
}
async function rodarEvento(client, r) {
  if (!poderOk('anunciar')) return 'poder Anunciar desligado';
  const canal = client.channels.cache.get(r.canalId);
  if (!canal) return 'canal não encontrado';
  const E = require('../eventos/nucleo');
  const e = {
    id: E.proximoId('eventos'), guildId: canal.guildId, canalId: canal.id, msgId: null, titulo: r.titulo, descricao: r.descricao || '',
    quando: Date.now() + r.depoisMs, criadorId: client.user.id, cargoPing: r.cargoPing || null, confirmados: [], aviso15: false, iniciou: false, status: 'ativo',
  };
  const msg = await canal.send({ content: r.cargoPing ? `<@&${r.cargoPing}>` : undefined, embeds: [E.embedEvento(e)], components: E.botoesEvento(e), allowedMentions: { roles: r.cargoPing ? [r.cargoPing] : [] } });
  e.msgId = msg.id;
  E.salvarEvento(e);
  return `evento #${e.id} criado`;
}

function cargoUtil(guild, cargoId) {
  const cargo = guild.roles.cache.get(cargoId);
  const eu = guild.members.me;
  if (!cargo) return { erro: 'cargo não existe mais' };
  if (cargo.managed || (eu && cargo.position >= eu.roles.highest.position)) return { erro: 'o cargo está acima do meu' };
  if (eu && !eu.permissions.has('ManageRoles')) return { erro: 'falta a permissão Gerenciar Cargos' };
  return { cargo };
}
function historicoDias() {
  const k = Object.keys(db.get('stats.dias', {}) || {}).sort()[0];
  if (!k) return 0;
  return Math.floor((Date.now() - Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8))) / DIA);
}
async function varrer(client, r, regra) {
  if (!poderOk('cargo')) return 'poder Cargos desligado';
  const guild = client.guilds.cache.get(r.guildId);
  if (!guild) return 'servidor não encontrado';
  const { cargo, erro } = cargoUtil(guild, r.cargoId);
  if (erro) return erro;
  const membros = await guild.members.fetch();
  let deu = 0, tirou = 0;
  for (const m of membros.values()) {
    if (m.user.bot || deu + tirou >= 60) continue;
    const quer = regra(m);
    if (quer === true && !m.roles.cache.has(cargo.id)) { await m.roles.add(cargo, 'Atlas · rotina').then(() => deu++).catch(() => {}); }
    else if (quer === false && m.roles.cache.has(cargo.id)) { await m.roles.remove(cargo, 'Atlas · rotina').then(() => tirou++).catch(() => {}); }
  }
  if (deu || tirou) N.registrar({ acao: 'cargo_dar', executor: client.user.id, texto: `Rotina #${r.id}: ${deu} receberam e ${tirou} perderam ${cargo.name}`, origem: 'auto', guildId: guild.id });
  return `${deu} receberam, ${tirou} perderam`;
}
async function rodarInativos(client, r) {
  if (historicoDias() < r.dias) return `poucos dados (${historicoDias()} de ${r.dias} dias de histórico)`;
  const St = require('../stats/nucleo');
  const ativos = St.agregado(Math.min(r.dias, 90)).membros;
  const limite = Date.now() - r.dias * DIA;
  return varrer(client, r, (m) => (m.joinedTimestamp > limite ? null : !ativos.has(m.id)));
}
const rodarTempo = (client, r) => { const limite = Date.now() - r.dias * DIA; return varrer(client, r, (m) => (m.joinedTimestamp <= limite ? true : null)); };
const EXEC = { anuncio: rodarAnuncio, sorteio: rodarSorteio, evento: rodarEvento, inativos: rodarInativos, cargo_tempo: rodarTempo };

async function tick(client) {
  if (!N.ativo()) return;
  const l = lista();
  let mudou = false;
  for (const r of l) {
    if (!r.ativa || !r.proxima || r.proxima > Date.now() || !EXEC[r.tipo]) continue;
    const atrasada = Date.now() - r.proxima > 2 * 3600 * 1000;
    try { r.resultado = atrasada ? 'perdida (bot estava fora)' : await EXEC[r.tipo](client, r); }
    catch (e) { r.resultado = `erro: ${String(e.message).slice(0, 60)}`; console.error('[Sub dona] rotina', r.id, e.message); }
    r.ultima = Date.now();
    if (r.repete === 'uma_vez') { r.ativa = false; r.proxima = null; } else r.proxima = proxima(r);
    mudou = true;
  }
  if (mudou) salvar(l);
}

async function aoEntrar(client, membro) {
  if (!poderOk('cargo') || membro.user.bot) return;
  for (const r of lista().filter((x) => x.ativa && x.tipo === 'cargo_entrada' && x.guildId === membro.guild.id)) {
    const { cargo } = cargoUtil(membro.guild, r.cargoId);
    if (cargo) await membro.roles.add(cargo, 'Atlas · cargo de entrada').catch(() => {});
  }
}

module.exports = { TIPOS, DIAS_SEMANA, lista, obter, criar, remover, alternar, descrever, proxima, tick, aoEntrar, historicoDias };
