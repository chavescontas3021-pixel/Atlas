// Enquetes do Atlas: votação por botão, com barras ao vivo.
// Fica salva no banco, então continua funcionando depois que o bot reinicia.
const db = require('../db');
const UI = require('../ui/componentes');
const { S, barra, corta } = require('../ui/tema');

const chave = (msgId) => `enquetes.${msgId}`;
const MAX_SALVAS = 100;

function resultado(e) {
  const votos = Object.values(e.votos || {});
  const total = votos.length;
  const contagem = e.opcoes.map((_, i) => votos.filter((v) => v === i).length);
  return { total, contagem };
}

function montar(e) {
  const { total, contagem } = resultado(e);
  const maior = Math.max(0, ...contagem);
  const linhas = e.opcoes.map((op, i) => {
    const pct = total ? Math.round((contagem[i] / total) * 100) : 0;
    const lider = e.encerrada && maior > 0 && contagem[i] === maior ? `  ${S.seta} mais votada` : '';
    return `**${op}**${lider}\n${barra(total ? contagem[i] / total : 0, 12)}  ${contagem[i]} ${S.sep} ${pct}%`;
  });

  const embed = UI.painel({
    trilha: ['Enquete', e.encerrada ? 'Encerrada' : 'Aberta'],
    titulo: e.pergunta,
    descricao: linhas.join('\n\n'),
    rodape: `${total} ${total === 1 ? 'voto' : 'votos'}  ${S.sep}  por ${e.autorNome}`,
  });

  const opcoes = UI.linha(e.opcoes.map((op, i) => UI.botao({
    id: `enq:${i}`, label: corta(op, 40), desabilitado: e.encerrada,
  })));
  const controle = UI.linha(UI.botao({
    id: 'enq:fim', label: e.encerrada ? 'Encerrada' : 'Encerrar enquete', desabilitado: e.encerrada,
  }));
  return { embeds: [embed], components: [opcoes, controle] };
}

function criar(msgId, dados) {
  const todas = db.get('enquetes', {});
  const ids = Object.keys(todas);
  if (ids.length >= MAX_SALVAS) {
    ids.sort((a, b) => (todas[a].criadaEm || 0) - (todas[b].criadaEm || 0));
    for (const id of ids.slice(0, ids.length - MAX_SALVAS + 1)) db.remover(chave(id));
  }
  db.set(chave(msgId), { ...dados, votos: {}, encerrada: false, criadaEm: Date.now() });
}

const buscar = (msgId) => db.get(chave(msgId), null);
const salvar = (msgId, e) => db.set(chave(msgId), e);

// Clicar na mesma opção de novo tira o voto; clicar em outra troca.
function votar(msgId, userId, indice) {
  const e = buscar(msgId);
  if (!e || e.encerrada || indice < 0 || indice >= e.opcoes.length) return null;
  if (e.votos[userId] === indice) delete e.votos[userId];
  else e.votos[userId] = indice;
  salvar(msgId, e);
  return e;
}

function encerrar(msgId) {
  const e = buscar(msgId);
  if (!e) return null;
  e.encerrada = true;
  salvar(msgId, e);
  return e;
}

module.exports = { montar, criar, buscar, votar, encerrar };
