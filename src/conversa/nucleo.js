// ─────────────────────────────────────────────────────────────
//  ATLAS · conversa  ·  o cérebro (sem IA, só regras e frases prontas)
//
//  Fluxo:  mensagem → limpa → descobre o assunto → monta a resposta
//  Regras (ligar/canal/tempo/blacklist/pai) ficam no evento e aqui.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const UI = require('../ui/componentes');
const T = require('../ui/tema');
const Dic = require('./dicionario');
const { ASSUNTOS, NAO_ENTENDI, MOLDES } = require('./frases');
const VAN = { ...require('./vanellope-1'), ...require('./vanellope-2') };
const VAN_M = require('./vanellope-moldes');
const ALVO = require('./alvo');
const P = require('./palavroes');
const G = require('./giria');
const FALL = require('./fallback');
const IA = require('./ia');

const FUSO = 'America/Sao_Paulo';
const ESPERA_PADRAO = 20; // segundos
const ESPERA_PAI = 4; // segundos
const MAX_APRENDIDAS = 100;

// ── Configuração (tudo guardado no banco, mudável por /conversa) ──
const cfg = (k, padrao = null) => db.get(`config.conversa.${k}`, padrao);
const setCfg = (k, v) => db.set(`config.conversa.${k}`, v);
const ligado = () => cfg('ligado', true) !== false;
const canal = () => cfg('canal', null);
// Tom da conversa: 'vanellope' (padrão) ou 'atlas' (guia elegante). Palavrões ligados por padrão.
const tom = () => (cfg('tom', 'vanellope') === 'atlas' ? 'atlas' : 'vanellope');
const palavrao = () => cfg('palavrao', true) !== false;
const alvoId = () => cfg('alvo', null);
const ehAlvo = (uid) => !!uid && uid === alvoId();
const espera = () => Math.min(300, Math.max(5, Number(cfg('espera', ESPERA_PADRAO)) || ESPERA_PADRAO));

// ── Texto ────────────────────────────────────────────────────
function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+\-*/().,%^ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Texto "traduzido": gírias e abreviações viram palavras completas (vc → voce)
const normG = (t) => G.girias(norm(t));

// Tira menções, o nome "atlas" e espaços. Devolve { bruto, texto, puro }
function limpar(conteudo) {
  const bruto = String(conteudo || '')
    .replace(/<@!?\d+>|<@&\d+>|<#\d+>/g, ' ')
    .replace(/\batlas\b[\s,:;!?.-]*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { bruto, texto: normG(bruto), puro: norm(bruto) };
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const comBorda = (p) => new RegExp(`(?<![a-z0-9])(?:${p})(?![a-z0-9])`);

// Compila os padrões uma única vez
const ASSUNTOS_PRONTOS = ASSUNTOS.map((a) => ({ ...a, regs: a.padroes.map(comBorda) }));

// ── Dono ("pai") ─────────────────────────────────────────────
let donoCache = null;
async function donoId(client) {
  if (donoCache) return donoCache;
  try {
    const app = await client.application.fetch();
    const o = app.owner;
    donoCache = (o && (o.ownerId || o.id)) || null;
  } catch {
    donoCache = null;
  }
  return donoCache;
}

// O "pai" é quem foi definido com /conversa pai; se ninguém foi, é o dono do aplicativo do bot.
async function paiId(client) {
  return cfg('pai', null) || (await donoId(client));
}
async function ehPai(client, uid) {
  return !!uid && uid === (await paiId(client));
}

// ── Tempo de espera por pessoa ───────────────────────────────
const ultimaFala = new Map();
function esperaRestante(uid, pai) {
  const limite = (pai ? ESPERA_PAI : espera()) * 1000;
  const faltam = limite - (Date.now() - (ultimaFala.get(uid) || 0));
  return faltam > 0 ? Math.ceil(faltam / 1000) : 0;
}
function marcarFala(uid) {
  if (ultimaFala.size > 5000) ultimaFala.clear();
  ultimaFala.set(uid, Date.now());
}

// ── Aprendidas (a staff ensina por /conversa ensinar) ────────
const aprendidas = () => db.get('conversa.aprendidas', []);
const salvarAprendidas = (l) => db.set('conversa.aprendidas', l);

function ensinar({ gatilhos, respostas, soPai = false, por }) {
  const lista = aprendidas();
  if (lista.length >= MAX_APRENDIDAS) return { erro: `Limite de ${MAX_APRENDIDAS} respostas ensinadas atingido.` };
  const g = [...new Set(gatilhos.map(normG).filter((x) => x.length >= 2))].slice(0, 8);
  const r = respostas.map((x) => x.trim()).filter(Boolean).slice(0, 8);
  if (!g.length) return { erro: 'Preciso de pelo menos um gatilho com 2 letras ou mais.' };
  if (!r.length) return { erro: 'Falta a resposta.' };
  if (r.some((x) => x.length > 500)) return { erro: 'Cada resposta pode ter até 500 caracteres.' };
  const item = { id: Date.now().toString(36), gatilhos: g, respostas: r, soPai: !!soPai, por, em: Date.now() };
  lista.push(item);
  salvarAprendidas(lista);
  return { item, total: lista.length };
}

function esquecer(numero) {
  const lista = aprendidas();
  const [tirada] = lista.splice(numero - 1, 1);
  if (!tirada) return null;
  salvarAprendidas(lista);
  return tirada;
}

// ── Detectar o assunto ───────────────────────────────────────
function detectar(texto, { pai = false } = {}) {
  let melhor = null;
  const considerar = (cand) => {
    if (!melhor || cand.prioridade > melhor.prioridade || (cand.prioridade === melhor.prioridade && cand.tamanho > melhor.tamanho)) melhor = cand;
  };

  if (texto === '') return { assunto: ASSUNTOS_PRONTOS.find((a) => a.id === 'online'), captura: null };

  for (const a of ASSUNTOS_PRONTOS) {
    for (const re of a.regs) {
      const m = re.exec(texto);
      if (m) considerar({ tipo: 'padrao', assunto: a, prioridade: a.prioridade, tamanho: m[0].length, captura: m[1] || null });
    }
  }
  // Respostas ensinadas pela staff (prioridade 70: ganham dos assuntos comuns)
  for (const item of aprendidas()) {
    if (item.soPai && !pai) continue;
    for (const g of item.gatilhos) {
      const m = comBorda(escapar(g)).exec(texto);
      if (m) considerar({ tipo: 'aprendida', item, prioridade: 70, tamanho: m[0].length });
    }
  }
  return melhor;
}

// ── Montar a resposta ────────────────────────────────────────
const ultimas = new Map(); // evita repetir a mesma frase em seguida
function sortear(lista, chave) {
  if (!lista || !lista.length) return '';
  if (lista.length === 1) return lista[0];
  let i;
  do i = Math.floor(Math.random() * lista.length);
  while (i === ultimas.get(chave));
  if (ultimas.size > 3000) ultimas.clear();
  ultimas.set(chave, i);
  return lista[i];
}

function periodoDoDia(agora = new Date()) {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(agora)) % 24;
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Frases possíveis para um assunto, conforme o tom, o palavrão e quem está falando
function fonte(a) {
  if (a.id === 'crise') return a; // segurança: texto sempre o cuidadoso
  return tom() === 'vanellope' && VAN[a.id] ? { ...a, ...VAN[a.id] } : a;
}

const semPalavrao = (l) => (l || []).filter((x) => !P.temPalavrao(x));

function candidatas(a, via) {
  const f = fonte(a);
  const pode = palavrao();
  if (via === 'alvo' && a.id !== 'crise') {
    const rude = ALVO.assuntos[a.id] || f.alvo || (a.dinamico === 'lista' ? null : ALVO.geral);
    if (rude) {
      let ok = pode ? rude : semPalavrao(rude);
      if (!ok.length) ok = semPalavrao(ALVO.geral);
      return { lista: ok.length ? ok : f.normal };
    }
    // piada, curiosidade...: o conteúdo de sempre, com uma bronca na frente
    return { lista: f.normal, prefixo: pode ? ALVO.prefixos : semPalavrao(ALVO.prefixos) };
  }
  const base = (via === 'pai' && f.pai && f.pai.length ? f.pai : f.normal);
  const forte = via === 'pai' ? f.fortePai : f.forte;
  if (pode && forte && forte.length && Math.random() < (via === 'pai' ? 0.4 : 0.3)) return { lista: forte };
  return { lista: base };
}

// Escolhe uma frase que o automod também deixaria um membro dizer
function sortearSeguro(lista, chave, vars) {
  for (let i = 0; i < 6; i += 1) {
    const t = preencher(sortear(lista, chave), vars);
    if (P.seguroNoAutomod(t)) return t;
  }
  return lista.map((x) => preencher(x, vars)).find((x) => P.seguroNoAutomod(x)) || 'Deu glitch aqui. Tenta de novo?';
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ''));
}

function personagemDe(uid) {
  try {
    const v = require('../vagas/nucleo').doUsuario(uid)[0];
    return v ? v.nome : '';
  } catch {
    return '';
  }
}

// Apelidos do Discord vêm cheios de símbolos (✂ . 🩸 Angel Devil ○): fica só o nome legível
function nomeLimpo(nome) {
  const m = /[\p{L}\p{N}]+(?:[ /'-][\p{L}\p{N}]+)*/u.exec(String(nome || ''));
  return m ? m[0].slice(0, 24) : 'você';
}

function variaveis({ uid, nome, pai, client, agora = new Date() }) {
  const personagem = personagemDe(uid);
  const dono = db.get('config.conversa.pai', null) || donoCache;
  return {
    nome: pai ? 'pai' : nomeLimpo(nome),
    personagem,
    personagem_frase: personagem ? ` e seu personagem é **${personagem}**` : '',
    periodo: periodoDoDia(agora),
    hora: new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(agora),
    data: new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(agora),
    dono: dono ? `<@${dono}>` : 'o meu criador',
  };
}

// ── Respostas calculadas ─────────────────────────────────────
function rolarDado(bruto, texto) {
  const m = /(\d{0,2})d(\d{1,3})/.exec(texto);
  const qtd = Math.min(10, Math.max(1, m && m[1] ? parseInt(m[1], 10) : 1));
  const faces = Math.min(1000, Math.max(2, m ? parseInt(m[2], 10) : 6));
  const rolos = Array.from({ length: qtd }, () => 1 + Math.floor(Math.random() * faces));
  const soma = rolos.reduce((a, b) => a + b, 0);
  return { q: `${qtd}d${faces}`, r: qtd === 1 ? String(soma) : `${rolos.join(' + ')} = ${soma}` };
}

function escolher(bruto) {
  const m = /(?:escolh[ae]|decid[ae]|sorteia|qual (?:voce |vc )?(?:prefere|escolheria))\s*(?:entre\s*)?(.+)/i.exec(bruto);
  const base = (m ? m[1] : bruto).replace(/[?!.]+$/g, '');
  const opcoes = base.split(/\s+ou\s+|\s*,\s*/i).map((x) => x.trim()).filter(Boolean).slice(0, 8);
  if (opcoes.length < 2) return null;
  return { r: opcoes[Math.floor(Math.random() * opcoes.length)] };
}

function calcular(expr) {
  const limpa = String(expr || '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/x/g, '*')
    .replace(/\^/g, '**')
    .replace(/\s+/g, '');
  if (!limpa || limpa.length > 60 || !/^[\d+\-*/().%]+$/.test(limpa)) return null;
  try {
    const r = Function(`"use strict"; return (${limpa});`)();
    if (typeof r !== 'number' || !Number.isFinite(r)) return null;
    return { q: String(expr).replace(/\s+/g, ' ').trim(), r: (Math.round(r * 1e8) / 1e8).toLocaleString('pt-BR', { maximumFractionDigits: 8 }) };
  } catch {
    return null;
  }
}

const botoesAtalho = () => UI.botoes([
  { id: 'conversa:ajuda', label: 'Ajuda' },
  { id: 'conversa:loja', label: 'Loja' },
  { id: 'conversa:missoes', label: 'Missões' },
]);

// Pede a resposta para a IA (se estiver ligada). Devolve null se não der, e aí valem as respostas prontas.
const pedirIA = ({ bruto, uid, vars, via }) => IA.responder({ texto: bruto, uid, nome: vars.nome, via, tom: tom(), palavrao: palavrao() });

// Função principal: recebe a mensagem já filtrada e devolve o que enviar.
//   entrada: { conteudo, uid, nome, pai, client }
//   saída:   { assunto, content?, embeds?, components? }
async function responder({ conteudo, uid, nome, pai, alvo = false, client, agora = new Date() }) {
  const { bruto, texto, puro } = limpar(conteudo);
  const vars = variaveis({ uid, nome, pai, client, agora });
  const via = pai ? 'pai' : alvo ? 'alvo' : 'normal';
  const van = tom() === 'vanellope';
  const NE = van || via === 'alvo' ? VAN_M.NAO_ENTENDI : NAO_ENTENDI;
  const MO = van || via === 'alvo' ? VAN_M.MOLDES : MOLDES;

  const molde = (chave, extra = {}) => {
    let lista = (MO[via] && MO[via][chave]) || MO.normal[chave];
    if (via === 'alvo' && !palavrao()) {
      const limpa = semPalavrao(lista);
      lista = limpa.length ? limpa : MO.normal[chave];
    }
    return sortearSeguro(lista, `${uid}:m:${chave}`, { ...vars, ...extra });
  };

  let achado = detectar(texto, { pai });
  if (!achado) achado = detectar(G.corrigir(texto), { pai }); // erro de digitação

  if (!achado) {
    // Sem assunto: responde ao tipo da frase (pergunta ou comentário). "Não entendi" só para teclada aleatória.
    const ehPergunta = /\?/.test(bruto) || /^(quem|que|qual|quais|como|onde|quando|porque|quanto|quantos|quantas|existe|tem|da pra|pode|sabe|sera|por que)\b/.test(texto);
    const pouco = texto.length < 2 || G.ininteligivel(texto);
    if (!pouco) {
      const falaIA = await pedirIA({ bruto, uid, vars, via });
      if (falaIA) return { assunto: 'ia', content: falaIA };
      const c = candidatas({ id: ehPergunta ? 'pergunta' : 'comentario', ...(ehPergunta ? FALL.pergunta : FALL.comentario) }, via);
      return { assunto: ehPergunta ? 'pergunta' : 'comentario', content: sortearSeguro(c.lista, `${uid}:fb`, vars) };
    }
    let lista = NE[via] || NE.normal;
    if (via === 'alvo' && !palavrao()) lista = semPalavrao(lista).length ? semPalavrao(lista) : NE.normal;
    return { assunto: 'nao_entendi', content: sortearSeguro(lista, `${uid}:nao`, vars), components: [botoesAtalho()] };
  }

  if (achado.tipo === 'aprendida') {
    return { assunto: `aprendida:${achado.item.id}`, content: preencher(sortear(achado.item.respostas, `${uid}:ap:${achado.item.id}`), vars) };
  }

  const a = achado.assunto;

  switch (a.dinamico) {
    case 'hora':
      return { assunto: a.id, content: molde('hora', { r: vars.hora }) };
    case 'data':
      return { assunto: a.id, content: molde('data', { r: vars.data }) };
    case 'dado': {
      const d = rolarDado(bruto, texto);
      return { assunto: a.id, content: molde('dado', d) };
    }
    case 'moeda':
      return { assunto: a.id, content: molde('moeda', { r: Math.random() < 0.5 ? 'cara' : 'coroa' }) };
    case 'escolha': {
      const e = escolher(bruto);
      return { assunto: a.id, content: e ? molde('escolha', e) : molde('escolha_erro') };
    }
    case 'calculo': {
      const c = calcular(achado.captura || texto);
      return { assunto: a.id, content: c ? molde('calculo', c) : molde('calculo_erro') };
    }
    case 'dicionario': {
      const cru = a.regs.map((re) => re.exec(puro)).find(Boolean); // palavra como foi escrita (sem gírias)
      const res = await Dic.definir((cru && cru[1]) || achado.captura);
      if (!res.ok) {
        const chave = res.motivo === 'erro' ? 'dicionario_erro' : 'dicionario_nada';
        return { assunto: a.id, content: molde(chave, { r: res.palavra }) };
      }
      const embed = UI.painel({
        trilha: ['Dicionário'],
        titulo: res.palavra,
        descricao: res.definicoes.map((d, i) => `**${i + 1}.**  ${d}`).join('\n\n').slice(0, 3800),
        rodape: `Fonte: ${res.fonte}`,
      });
      return { assunto: a.id, content: molde('dicionario_ok'), embeds: [embed] };
    }
    default:
  }

  if (IA.ASSUNTOS_ABERTOS.has(a.id)) {
    const falaIA = await pedirIA({ bruto, uid, vars, via });
    if (falaIA) return { assunto: 'ia', content: falaIA };
  }

  const c = candidatas(a, via);
  let frase = sortearSeguro(c.lista, `${uid}:${a.id}:${via}`, vars);
  if (c.prefixo && c.prefixo.length) frase = `${sortearSeguro(c.prefixo, `${uid}:pre`, vars)} ${frase}`;
  const saida = { assunto: a.id, content: frase };
  if (a.botoes) saida.components = [botoesAtalho()];
  return saida;
}

// ── Decidir se a mensagem é para o Atlas ─────────────────────
const COMECA_COM_ATLAS = /^\s*(?:(?:oi|ola|olá|ei|eae|e ai|e aí|hey|opa|fala|salve|bom dia|boa tarde|boa noite)[\s,]+)?atlas\b/i;

async function chamouAtlas(client, msg) {
  if (msg.mentions && msg.mentions.users && msg.mentions.users.has(client.user.id) && !msg.mentions.everyone) return true;
  if (COMECA_COM_ATLAS.test(msg.content || '')) return true;
  if (msg.reference && msg.reference.messageId) {
    try {
      const original = msg.channel.messages.cache.get(msg.reference.messageId)
        || (await msg.channel.messages.fetch(msg.reference.messageId));
      if (original && original.author && original.author.id === client.user.id) return true;
    } catch { /* mensagem apagada */ }
  }
  return false;
}

module.exports = {
  cfg, setCfg, ligado, canal, espera, ESPERA_PAI, ESPERA_PADRAO, tom, palavrao, alvoId, ehAlvo, IA,
  norm, limpar, detectar, responder, chamouAtlas,
  donoId, paiId, ehPai, esperaRestante, marcarFala,
  aprendidas, ensinar, esquecer,
  _teste: { calcular, rolarDado, escolher, periodoDoDia, ASSUNTOS_PRONTOS, zerarDono: () => { donoCache = null; } },
  T,
};
