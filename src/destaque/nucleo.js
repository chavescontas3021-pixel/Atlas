// Destaque do mês: o membro que mais conversou no mês (usa as estatísticas) ganha um cargo temporário.
const db = require('../db');
const S = require('../stats/nucleo');

const BRT = 3 * 3600 * 1000;
const COR = 0xf5c542;
const MINIMO_PADRAO = 50;

const cfg = () => db.get('config.destaque', {}) || {};
const mesDe = (ts = Date.now()) => new Date(ts - BRT).toISOString().slice(0, 7).replace('-', ''); // AAAAMM
const mesAnterior = (mes) => {
  let a = Number(mes.slice(0, 4));
  let m = Number(mes.slice(4)) - 1;
  if (m === 0) { m = 12; a--; }
  return `${a}${String(m).padStart(2, '0')}`;
};
const nomeMes = (mes) => {
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${nomes[Number(mes.slice(4)) - 1]} de ${mes.slice(0, 4)}`;
};

// Soma as mensagens de cada membro durante o mês (AAAAMM)
function totaisDoMes(mes) {
  S.flush();
  const mapa = new Map();
  for (let d = 1; d <= 31; d++) {
    const membros = db.get(`stats.dias.${mes}${String(d).padStart(2, '0')}.membros`, null);
    if (!membros) continue;
    for (const [uid, n] of Object.entries(membros)) mapa.set(uid, (mapa.get(uid) || 0) + n);
  }
  return mapa;
}

// Ranking já sem bots e sem quem saiu do servidor
async function ranking(guild, mes, limite = 10) {
  const ordem = [...totaisDoMes(mes).entries()].sort((a, b) => b[1] - a[1]);
  const lista = [];
  for (const [uid, n] of ordem) {
    const m = guild.members.cache.get(uid) || (await guild.members.fetch(uid).catch(() => null));
    if (!m || m.user.bot) continue;
    lista.push({ uid, n });
    if (lista.length >= limite) break;
  }
  return lista;
}

const mensagemPadrao = '🏆 **Destaque de {mes}!**\n{membro} foi quem mais agitou a house, com **{n} mensagens**. Parabéns! 🎉\nO cargo {cargo} é seu até o próximo mês.';
const aplicar = (txt, v) => String(txt).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : `{${k}}`));

// Apura o mês indicado: tira o cargo do destaque anterior e entrega ao novo
async function apurar(guild, mes) {
  const c = cfg();
  if (!c.cargo) return { ok: false, motivo: 'Configure o cargo primeiro (/destaque config cargo).' };
  const cargo = guild.roles.cache.get(c.cargo) || (await guild.roles.fetch(c.cargo).catch(() => null));
  if (!cargo) return { ok: false, motivo: 'O cargo configurado não existe mais.' };

  const minimo = c.minimo ?? MINIMO_PADRAO;
  const [vencedor] = await ranking(guild, mes, 1);

  // tira o cargo de quem tinha
  const antigos = db.get('destaque.atuais', []) || [];
  for (const uid of antigos) {
    const m = await guild.members.fetch(uid).catch(() => null);
    if (m) await m.roles.remove(cargo).catch(() => {});
  }
  db.set('destaque.atuais', []);
  db.set('destaque.ultimoMes', mes);

  if (!vencedor || vencedor.n < minimo) {
    return { ok: true, vazio: true, minimo };
  }
  const membro = await guild.members.fetch(vencedor.uid).catch(() => null);
  if (!membro) return { ok: true, vazio: true, minimo };
  const deu = await membro.roles.add(cargo).then(() => true).catch(() => false);
  db.set('destaque.atuais', [vencedor.uid]);
  const hist = db.get('destaque.historico', []) || [];
  hist.push({ mes, uid: vencedor.uid, n: vencedor.n });
  db.set('destaque.historico', hist.slice(-24));

  const texto = aplicar(c.mensagem || mensagemPadrao, { mes: nomeMes(mes), membro: `<@${vencedor.uid}>`, n: vencedor.n, cargo: `<@&${cargo.id}>` });
  if (c.canal) {
    const canal = guild.channels.cache.get(c.canal);
    if (canal) await canal.send({ content: texto, allowedMentions: { users: [vencedor.uid], roles: [] } }).catch(() => {});
  }
  return { ok: true, uid: vencedor.uid, n: vencedor.n, deu, texto };
}

// Roda a cada poucos minutos: quando o mês vira, apura o mês que passou
async function ciclo(client) {
  const c = cfg();
  if (!c.ativo || !c.cargo) return;
  const agora = mesDe();
  const alvo = mesAnterior(agora);
  const feito = db.get('destaque.ultimoMes', null);
  if (feito === alvo || feito === agora) return;
  if (!feito) { // primeira vez: não apura retroativamente, só marca e espera a virada do mês
    db.set('destaque.ultimoMes', alvo);
    return;
  }
  for (const guild of client.guilds.cache.values()) {
    const r = await apurar(guild, alvo).catch((e) => { console.error('[Destaque]', e); return null; });
    if (r && r.ok) break;
  }
}

module.exports = { COR, MINIMO_PADRAO, cfg, mesDe, mesAnterior, nomeMes, totaisDoMes, ranking, apurar, ciclo, mensagemPadrao };
// fim do arquivo
