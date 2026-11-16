// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · base de conhecimento (perguntas e respostas da staff)
//  A staff ensina (/conhecimento adicionar). A Atlas responde perguntas de membros nos canais de dúvidas,
//  quando marcam ela e dentro dos tickets. O que ela não sabe vira "pendente" para a staff responder.
//  Busca por palavras (sem IA, sem custo). A IA, se estiver ligada, só reescreve usando estes fatos.
// ─────────────────────────────────────────────────────────────
const db = require('../db');

const MAX = 200;
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set('para como qual quais onde quando quem que uma uns umas com por pra pro dos das nos nas tem ter fazer faco posso pode voce voces esse essa isso aqui mais sobre algum alguem tenho quero preciso esta sao foi vai muito meu minha seu sua dar ver ate nao sim ola oi atlas ainda tambem entao porque pq'.split(' '));

// Palavras-chave de um texto: sem acento, sem palavras de ligação, no singular e cortadas em 4 letras (entrar, entro e entrada viram "entr")
function palavras(texto) {
  const out = [];
  for (let w of fold(texto).split(/[^a-z0-9]+/)) {
    if (w.length < 3 || STOP.has(w)) continue;
    if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
    out.push(w.length >= 5 ? w.slice(0, 4) : w);
  }
  return [...new Set(out)];
}

const lista = () => db.get('subdona.conhecimento', []) || [];
const salvar = (l) => db.set('subdona.conhecimento', l);

function adicionar({ pergunta, resposta, chaves = '', por }) {
  const l = lista();
  if (l.length >= MAX) return { erro: `Limite de ${MAX} respostas. Apague alguma com /conhecimento remover.` };
  const id = db.get('subdona.conhecimento_n', 0) + 1;
  db.set('subdona.conhecimento_n', id);
  const item = { id, pergunta: String(pergunta).trim().slice(0, 200), resposta: String(resposta).trim().slice(0, 1500), chaves: palavras(chaves), por, em: Date.now(), usos: 0 };
  l.push(item); salvar(l);
  limparPendentesQueCasam(item);
  return { item };
}
function remover(id) {
  const l = lista();
  if (!l.some((x) => x.id === id)) return false;
  salvar(l.filter((x) => x.id !== id));
  return true;
}
function usou(id) { const l = lista(); const x = l.find((i) => i.id === id); if (x) { x.usos = (x.usos || 0) + 1; salvar(l); } }

// Nota de cada resposta para uma pergunta: as palavras-chave valem o dobro
function pontuar(item, tokens) {
  const peso = new Map();
  for (const w of palavras(item.pergunta)) peso.set(w, 1);
  for (const w of item.chaves || []) peso.set(w, 2);
  let total = 0, acertos = 0;
  for (const [w, p] of peso) { total += p; if (tokens.has(w)) acertos += p; }
  return { acertos, cobertura: total ? acertos / total : 0 };
}
function ranking(texto) {
  const tokens = new Set(palavras(texto));
  if (!tokens.size) return [];
  return lista().map((item) => ({ item, ...pontuar(item, tokens) })).filter((r) => r.acertos > 0).sort((a, b) => b.acertos - a.acertos || b.cobertura - a.cobertura);
}
// Melhor resposta, só se for confiável
function buscar(texto) {
  const r = ranking(texto)[0];
  return r && r.acertos >= 2 && (r.cobertura >= 0.5 || r.acertos >= 3) ? r : null;
}
// Fatos para a IA usar (mesmo os menos certos)
function contexto(texto, n = 4) {
  return ranking(texto).slice(0, n).map((r) => `- ${r.item.pergunta}: ${r.item.resposta.slice(0, 400)}`).join('\n');
}

const INTERROGATIVO = /^\s*(como|onde|aonde|quando|qual|quais|quem|quanto|quantos|quantas|por ?que|pq|porque|posso|pode|podem|tem|tm|existe|ha|da pra|dá pra|e possivel|é possível|o que|oq|que horas|cade|cadê|alguem sabe|alguém sabe)\b/i;
const ehPergunta = (texto) => /\?/.test(texto) || INTERROGATIVO.test(fold(texto).replace(/^\W+/, '')) || INTERROGATIVO.test(texto);

// ── Perguntas que ela não soube responder ────────────────────
const pendentes = () => db.get('subdona.sem_resposta', []) || [];
function anotarPendente(texto, uid) {
  const chave = palavras(texto).sort().join(' ');
  if (!chave) return;
  const l = pendentes();
  const ja = l.find((x) => x.chave === chave);
  if (ja) { ja.vezes += 1; ja.em = Date.now(); } else l.push({ chave, texto: String(texto).trim().slice(0, 200), uid, vezes: 1, em: Date.now() });
  db.set('subdona.sem_resposta', l.slice(-50));
}
function limparPendentesQueCasam(item) {
  const tokens = new Set([...palavras(item.pergunta), ...(item.chaves || [])]);
  db.set('subdona.sem_resposta', pendentes().filter((p) => p.chave.split(' ').filter((w) => tokens.has(w)).length < 2));
}
const limparPendentes = () => db.set('subdona.sem_resposta', []);

module.exports = { palavras, lista, adicionar, remover, usou, buscar, contexto, ranking, ehPergunta, pendentes, anotarPendente, limparPendentes };
