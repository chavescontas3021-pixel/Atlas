const db = require('../db');
const M = require('./modelo');

const todos = () => { const o = db.get('formsrv.pedidos', {}); return o && typeof o === 'object' ? o : {}; };
const obter = (id) => todos()[id] || null;
const salvar = (p) => db.set(`formsrv.pedidos.${p.id}`, p);
function criar(userId, usuario) {
  const n = (Number(db.get('formsrv.contador', 0)) || 0) + 1; db.set('formsrv.contador', n);
  const p = { id: `s${n}`, userId, usuario, status: 'rascunho', etapa: 'servico', r: {}, anexos: {}, coletando: null, criado: Date.now() };
  salvar(p); return p;
}
const coletandoDe = (uid) => Object.values(todos()).find((p) => p.userId === uid && p.coletando && p.status === 'rascunho') || null;
const proxima = (p) => { const e = M.etapas(p); p.etapa = e[e.indexOf(p.etapa) + 1] || 'revisao'; };

// Resumo "pergunta / resposta" para o cliente e para o dono
function linhas(p) {
  const r = p.r || {}; const out = [];
  const anexo = (k) => { const a = p.anexos[k]; if (!a) return ''; const f = (a.arquivos || []).length, t = (a.textos || []).length; return [f ? `${f} arquivo(s)` : '', t ? `${t} mensagem(ns) de texto` : ''].filter(Boolean).join(' + '); };
  out.push([M.PERGUNTAS.servico, r.servico === 'outros' ? `Outros: ${r.outros || '(sem descrição)'}` : M.nome(M.SERVICOS, r.servico)]);
  const sn = (k) => (r[k] === 'sim' ? `Sim${anexo(k) ? ` (${anexo(k)})` : ' (nada enviado ainda)'}` : 'Não');
  out.push([M.PERGUNTAS.decors, sn('decors')]);
  out.push([M.PERGUNTAS.prazo, r.prazo === 'outro' ? `Outro: ${r.prazoTexto || ''}` : M.nome(M.PRAZOS, r.prazo)]);
  if (r.servico === 'servidor') {
    out.push([M.PERGUNTAS.exemplo, sn('exemplo')], [M.PERGUNTAS.banners, sn('banners')], [M.PERGUNTAS.tipo, M.nome(M.TIPOS, r.tipo)]);
    out.push([M.PERGUNTAS.lista, r.lista === 'sim' ? `Sim${anexo('lista') ? ` (${anexo('lista')})` : ' (nada enviado ainda)'}` : 'Não, prefere que montem']);
  }
  return out;
}
const faltando = (p) => M.etapas(p).filter((e) => e !== 'revisao' && !(p.r || {})[e]);
module.exports = { todos, obter, salvar, criar, coletandoDe, proxima, linhas, faltando };
