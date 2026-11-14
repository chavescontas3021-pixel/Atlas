// ATLAS · sub dona · ronda (roda a cada 5 minutos): tickets parados, cobranças vencidas
const UI = require('../ui/componentes');
const N = require('./nucleo');
const At = require('./atendente');

const MIN = 60 * 1000;
const H = 60 * MIN;

async function tickets(client) {
  const db = require('../db');
  const T = require('../ticket/nucleo');
  const abertos = Object.values(db.get('ticket.abertos', {}) || {});
  for (const t of abertos) {
    const guild = client.guilds.cache.find((g) => g.channels.cache.has(t.canalId));
    const canal = guild && guild.channels.cache.get(t.canalId);
    if (!canal) continue;
    const agora = Date.now();
    const ultima = t.ultima || t.aberto;

    // 1) ninguém da staff apareceu: lembra a staff uma vez
    if (!t.assumidoPor && !t.humano && !t.lembrete && agora - t.aberto > 20 * MIN && At.ativoNeste()) {
      t.lembrete = agora; At.salvar(t);
      await At.chamarStaff(client, canal, t, `O ticket #${T.numeroFmt(t.numero)} está esperando atendimento há mais de 20 minutos.`);
      continue;
    }
    // 2) parado há 48 h: pergunta se ainda precisa; 24 h depois fecha (se o poder permitir)
    if (agora - ultima > 48 * H && !t.avisoInativo) {
      t.avisoInativo = agora; At.salvar(t);
      await canal.send({ content: `<@${t.userId}>`, ...UI.nota('Esse ticket está parado há 2 dias. Ainda precisa dele?', 'aviso', { publica: true }), components: [UI.botoes([{ id: 'sdt:ainda', label: 'Ainda preciso' }, { id: 'sdt:fechar', label: 'Pode fechar' }])], allowedMentions: { users: [t.userId] } }).catch(() => {});
    } else if (t.avisoInativo && agora - t.avisoInativo > 24 * H && agora - ultima > 72 * H && N.ativo() && N.modoEfetivo('ticket_fechar') !== 'off') {
      await require('../ticket/fluxo').encerrar(guild, canal, client.user, 'Fechado por inatividade (sub dona)');
    }
  }
}

function cobrancas() {
  const l = N.cobrancas();
  let mudou = false;
  for (const c of l) if (c.status === 'aberta' && Date.now() - c.criada > 48 * H) { c.status = 'vencida'; mudou = true; }
  if (mudou) N.salvarCobrancas(l);
}

async function tick(client) {
  if (!N.ativo()) return;
  await tickets(client).catch((e) => console.error('[Sub dona] ronda tickets:', e));
  cobrancas();
}

module.exports = { tick };
