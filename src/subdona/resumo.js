// ATLAS · sub dona · resumos (diário, semanal e "ao voltar")
const UI = require('../ui/componentes');
const { S, quando, barra } = require('../ui/tema');
const N = require('./nucleo');
const A = require('./acoes');

const DIA = 24 * 3600 * 1000;
const BRT = 3 * 3600 * 1000;
const SEM_PING = { parse: [] };

// Configuração: config.subdona.resumo = { diario, semanal, hora }
const conf = () => ({ diario: false, semanal: false, hora: 9, ...(N.cfg('resumo', {}) || {}) });
const setConf = (c) => N.setCfg('resumo', c);

const hojeBRT = () => new Date(Date.now() - BRT);

function stats(dias) {
  try { return require('../stats/nucleo').agregado(Math.max(1, Math.min(60, dias))); } catch { return null; }
}

function tickets() {
  const lista = Object.values(require('../db').get('ticket.abertos', {}) || {});
  return { abertos: lista.length, esperando: lista.filter((t) => !t.assumidoPor && !t.humano).length };
}

function eventos() {
  try {
    const E = require('../eventos/nucleo');
    return { sorteios: E.todosSorteios().filter((s) => s.status === 'ativo').length, eventos: E.todosEventos().filter((e) => e.status === 'ativo').length };
  } catch { return { sorteios: 0, eventos: 0 }; }
}

// desde/ate em ms. Devolve a tela pronta (embed) com tudo que aconteceu no período.
function montar({ desde, ate = Date.now(), titulo = 'Resumo', trilha = 'Resumo' }) {
  const dias = Math.ceil((ate - desde) / DIA);
  const st = stats(dias);
  const feitos = N.diario().filter((d) => d.em >= desde && d.em <= ate);
  const porAcao = {};
  for (const d of feitos) porAcao[A.ROTULO[d.acao] || d.acao] = (porAcao[A.ROTULO[d.acao] || d.acao] || 0) + 1;
  const sozinha = feitos.filter((d) => d.origem === 'auto').length;
  const caixa = N.caixa().filter((c) => c.em >= desde && c.em <= ate);
  const sonhos = caixa.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const recados = N.recados().filter((r) => r.em >= desde && r.em <= ate).length;
  const t = tickets();
  const e = eventos();
  const cobAbertas = N.cobrancas().filter((c) => c.status === 'aberta').length;

  const campos = [];
  if (st) {
    const saldo = st.entradas - st.saidas;
    campos.push({ nome: 'Servidor', valor: `${st.total} mensagens\n${st.entradas} entradas  ${S.sep}  ${st.saidas} saídas\nSaldo ${saldo >= 0 ? '+' : ''}${saldo}`, lado: true });
    const topM = [...st.membros.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topC = [...st.canais.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topM.length) campos.push({ nome: 'Mais ativos', valor: topM.map(([u, n], i) => `${i + 1}. <@${u}>  ${S.sep}  ${n}`).join('\n'), lado: true });
    if (topC.length) campos.push({ nome: 'Canais movimentados', valor: topC.map(([c, n]) => `<#${c}>  ${S.sep}  ${n}`).join('\n'), lado: true });
  }
  campos.push({
    nome: 'O que eu fiz',
    valor: feitos.length ? `${feitos.length} ação(ões), ${sozinha} sozinha\n${Object.entries(porAcao).map(([k, n]) => `${S.filho} ${k}: ${n}`).join('\n')}` : 'Nada para registrar.',
  });
  campos.push({ nome: 'Tickets', valor: `${t.abertos} aberto(s)  ${S.sep}  ${t.esperando} sem atendimento`, lado: true });
  campos.push({ nome: 'Caixa', valor: `${sonhos.toLocaleString('pt-BR')} sonhos em ${caixa.length} pagamento(s)\n${cobAbertas} cobrança(s) aberta(s)`, lado: true });
  campos.push({ nome: 'Agora', valor: `${e.sorteios} sorteio(s)  ${S.sep}  ${e.eventos} evento(s)\n${recados} recado(s) no período`, lado: true });

  return {
    embeds: [UI.painel({
      trilha: ['Sub dona', trilha],
      titulo,
      descricao: `De ${quando(desde, 'f')} até ${quando(ate, 'f')}\n${barra(Math.min(1, feitos.length / 20))}  atividade da sub dona`,
      campos,
      rodape: '/gestao resumo  ·  /gestao automatico para agendar',
    })],
    allowedMentions: SEM_PING,
  };
}

// Entrega no canal de alertas (qualquer servidor onde esteja) ou na DM do pai
async function entregar(client, payload) {
  const id = N.alertasCanal();
  const canal = id && client.channels.cache.get(id);
  try {
    if (canal) return await canal.send(payload);
    const pai = await N.paiId(client);
    const u = pai && (await client.users.fetch(pai));
    if (u) return await u.send(payload);
  } catch (e) { console.error('[Sub dona] resumo:', e.message); }
  return null;
}

// Chamado pela ronda (a cada 5 min): envia quando chega a hora, uma vez por dia / semana
async function tick(client) {
  const c = conf();
  if (!c.diario && !c.semanal) return;
  const b = hojeBRT();
  if (b.getUTCHours() < c.hora) return;
  const chaveDia = b.toISOString().slice(0, 10);
  const ultimo = N.cfg('resumo_ultimo', {}) || {};
  if (c.diario && ultimo.diario !== chaveDia) {
    N.setCfg('resumo_ultimo', { ...ultimo, diario: chaveDia });
    await entregar(client, montar({ desde: Date.now() - DIA, titulo: 'Resumo do dia', trilha: 'Diário' }));
  }
  if (c.semanal && b.getUTCDay() === 1 && ultimo.semanal !== chaveDia) {
    N.setCfg('resumo_ultimo', { ...(N.cfg('resumo_ultimo', {}) || {}), semanal: chaveDia });
    await entregar(client, montar({ desde: Date.now() - 7 * DIA, titulo: 'Resumo da semana', trilha: 'Semanal' }));
  }
}

module.exports = { conf, setConf, montar, entregar, tick };
