// Mensagens editáveis: troca, na hora de enviar, os textos que você editou.
const path = require('path');
const D = require('discord.js');
const db = require('../db');
const { montarCatalogo } = require('./leitor');

const SIM = Symbol.for('atlas.mensagens.ignorar'); // interface do próprio sistema
const JA = Symbol.for('atlas.mensagens.ja'); // já traduzido
const VISTO = new WeakSet();

let cat = null;
function catalogo() {
  if (!cat) cat = montarCatalogo(path.join(__dirname, '..'));
  return cat;
}
function recarregar() {
  cat = null;
  compilado = null;
  return catalogo();
}

const ativo = () => db.get('config.mensagens.ativo', true) !== false;
const edicoes = () => db.get('mensagens.edicoes', {}) || {};
const editada = (id) => edicoes()[id];

function salvarEdicao(id, texto, por) {
  const e = catalogo().porId.get(id);
  if (!e) return false;
  if (texto === e.modelo) db.remover(`mensagens.edicoes.${id}`);
  else db.set(`mensagens.edicoes.${id}`, { texto, por, ts: Date.now() });
  compilado = null;
  return true;
}
function restaurar(id) {
  db.remover(`mensagens.edicoes.${id}`);
  compilado = null;
}
function restaurarTudo() {
  db.set('mensagens.edicoes', {});
  compilado = null;
}

// ---------- compilação ----------
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let compilado = null;
let assinatura = '';

function obterCompilado() {
  const ed = edicoes();
  const ids = Object.keys(ed);
  const ass = ids.map((k) => k + ed[k].ts).join('|');
  if (compilado && ass === assinatura) return compilado;
  assinatura = ass;
  const lista = [];
  const { porId } = catalogo();
  for (const id of ids) {
    const e = porId.get(id);
    if (!e) continue;
    const literal = e.partes.join('');
    let fonte = e.partes.map(escapar).join('([\\s\\S]{0,300}?)');
    if (literal.length < 10) fonte = `^${fonte}$`;
    else {
      if (e.partes[0] === '' && e.partes.length > 1) fonte = `^${fonte}`;
      if (e.partes[e.partes.length - 1] === '' && e.partes.length > 1) fonte = `${fonte}$`;
    }
    try {
      lista.push({ len: literal.length, re: new RegExp(fonte, 'g'), texto: ed[id].texto });
    } catch { /* ignora */ }
  }
  lista.sort((a, b) => b.len - a.len);
  compilado = lista;
  return lista;
}

function aplicar(texto, nivel = 0) {
  if (typeof texto !== 'string' || !texto || nivel > 2) return texto;
  const lista = obterCompilado();
  if (!lista.length) return texto;
  const guardados = [];
  let saida = texto;
  for (const it of lista) {
    it.re.lastIndex = 0;
    saida = saida.replace(it.re, (...a) => {
      const caps = [];
      for (let k = 1; typeof a[k] === 'string'; k++) caps.push(a[k]);
      const r = it.texto.replace(/\{(\d+)\}/g, (m, d) => (caps[d - 1] !== undefined ? aplicar(caps[d - 1], nivel + 1) : m));
      guardados.push(r);
      return `\uE000${guardados.length - 1}\uE001`;
    });
  }
  for (let t = 0; t < 4 && /\uE000\d+\uE001/.test(saida); t++) {
    saida = saida.replace(/\uE000(\d+)\uE001/g, (m, n) => guardados[n]);
  }
  return saida;
}

// ---------- tradução de payloads ----------
const dados = (o) => (o && o.data && typeof o.data === 'object' ? o.data : o);

function trocarCampos(obj, campos) {
  if (!obj) return;
  for (const c of campos) if (typeof obj[c] === 'string') obj[c] = aplicar(obj[c]);
}

function traduzirEmbed(emb) {
  if (!emb || VISTO.has(emb)) return;
  VISTO.add(emb);
  const d = dados(emb);
  trocarCampos(d, ['title', 'description']);
  if (d.footer) trocarCampos(d.footer, ['text']);
  if (d.author) trocarCampos(d.author, ['name']);
  if (Array.isArray(d.fields)) for (const f of d.fields) trocarCampos(f, ['name', 'value']);
}

function traduzirComponente(c) {
  if (!c || VISTO.has(c)) return;
  VISTO.add(c);
  const d = dados(c);
  trocarCampos(d, ['label', 'placeholder']);
  const ops = Array.isArray(c.options) ? c.options : Array.isArray(d.options) ? d.options : [];
  for (const o of ops) trocarCampos(dados(o), ['label', 'description']);
  const filhos = Array.isArray(c.components) ? c.components : Array.isArray(d.components) ? d.components : [];
  for (const f of filhos) traduzirComponente(f);
}

function traduzirPayload(p) {
  try {
    if (!ativo()) return p;
    if (!Object.keys(edicoes()).length) return p;
    if (typeof p === 'string') return { content: aplicar(p), [JA]: true };
    if (!p || typeof p !== 'object' || p[SIM] || p[JA]) return p;
    if (typeof D.MessagePayload === 'function' && p instanceof D.MessagePayload) return p;
    const novo = { ...p, [JA]: true };
    if (typeof novo.content === 'string') novo.content = aplicar(novo.content);
    if (Array.isArray(novo.embeds)) for (const e of novo.embeds) traduzirEmbed(e);
    if (Array.isArray(novo.components)) for (const c of novo.components) traduzirComponente(c);
    return novo;
  } catch (e) {
    console.error('[Mensagens] falha ao traduzir, enviando original:', e.message);
    return p;
  }
}

function traduzirModal(m) {
  try {
    if (!ativo() || !Object.keys(edicoes()).length || !m || VISTO.has(m)) return m;
    VISTO.add(m);
    const d = dados(m);
    trocarCampos(d, ['title']);
    const linhas = Array.isArray(m.components) ? m.components : Array.isArray(d.components) ? d.components : [];
    for (const l of linhas) traduzirComponente(l);
    return m;
  } catch (e) {
    return m;
  }
}

// ---------- instalação dos "ganchos" ----------
let instalado = false;
function envolver(cls, nome, fn) {
  if (!cls || !cls.prototype) return;
  const orig = cls.prototype[nome];
  if (typeof orig !== 'function' || orig.__atlasMsg) return;
  const novo = function (arg, ...resto) {
    return orig.call(this, fn(arg), ...resto);
  };
  novo.__atlasMsg = true;
  cls.prototype[nome] = novo;
}

function instalar() {
  if (instalado) return;
  instalado = true;
  const resposta = ['reply', 'editReply', 'followUp', 'update'];
  for (const c of ['CommandInteraction', 'MessageComponentInteraction', 'ModalSubmitInteraction']) {
    for (const m of resposta) envolver(D[c], m, traduzirPayload);
    envolver(D[c], 'showModal', traduzirModal);
  }
  for (const c of ['TextChannel', 'NewsChannel', 'ThreadChannel', 'DMChannel', 'VoiceChannel', 'StageChannel', 'User', 'GuildMember']) {
    envolver(D[c], 'send', traduzirPayload);
  }
  envolver(D.Message, 'edit', traduzirPayload);
  envolver(D.Message, 'reply', traduzirPayload);
}

// ---------- ajudas para os comandos ----------
function limpar(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function buscar(termo, grupo) {
  const palavras = String(termo || '').toLowerCase().split(/\s+/).filter(Boolean);
  const g = grupo ? String(grupo).toLowerCase() : null;
  return catalogo().lista.filter((e) => {
    if (g && ![...e.grupos].some((x) => x.toLowerCase() === g)) return false;
    const t = e.modelo.toLowerCase();
    return palavras.every((p) => t.includes(p));
  });
}

function grupos() {
  const s = new Set();
  for (const e of catalogo().lista) for (const g of e.grupos) s.add(g);
  return [...s].sort();
}

function achar(valor) {
  const { porId } = catalogo();
  if (porId.has(valor)) return porId.get(valor);
  return buscar(valor)[0] || null;
}

function detalhe(e) {
  const ed = editada(e.id);
  const bloco = (t) => `\`\`\`\n${t.replace(/```/g, "'''").slice(0, 900)}\n\`\`\``;
  const legenda = e.vars.length
    ? e.vars.map((v, i) => `**{${i + 1}}** = \`${limpar(v, 60)}\``).join('\n').slice(0, 1000)
    : 'Esse texto não tem variáveis.';
  const emb = new D.EmbedBuilder()
    .setColor(0xf5a3c7)
    .setTitle('✏️ Mensagem do bot')
    .setDescription(`ID \`${e.id}\` • usada em: ${[...e.grupos].join(', ').slice(0, 200)}`)
    .addFields(
      { name: 'Texto original', value: bloco(e.modelo) },
      { name: 'Variáveis (não apague as chaves)', value: legenda },
      { name: ed ? 'Texto atual (editado)' : 'Texto atual', value: ed ? bloco(ed.texto) : 'Igual ao original.' },
    );
  const linha = new D.ActionRowBuilder().addComponents(
    new D.ButtonBuilder().setCustomId(`msgs:editar:${e.id}`).setLabel('Editar').setStyle(D.ButtonStyle.Primary),
    new D.ButtonBuilder().setCustomId(`msgs:restaurar:${e.id}`).setLabel('Restaurar original').setStyle(D.ButtonStyle.Secondary).setDisabled(!ed),
  );
  return { embeds: [emb], components: [linha], [SIM]: true };
}

function listaComSeletor(titulo, itens, rodape) {
  const emb = new D.EmbedBuilder().setColor(0xf5a3c7).setTitle(titulo)
    .setDescription(itens.length
      ? itens.map((e, i) => `**${i + 1}.** [${[...e.grupos][0]}] ${limpar(e.modelo, 90)}${editada(e.id) ? ' ✏️' : ''}`).join('\n').slice(0, 4000)
      : 'Nada encontrado.');
  if (rodape) emb.setFooter({ text: rodape });
  const comps = [];
  if (itens.length) {
    comps.push(new D.ActionRowBuilder().addComponents(
      new D.StringSelectMenuBuilder().setCustomId('msgs:sel').setPlaceholder('Escolha uma mensagem para editar')
        .addOptions(itens.map((e, i) => ({ label: limpar(`${i + 1}. ${e.modelo}`, 100), value: e.id, description: limpar([...e.grupos].join(', '), 100) }))),
    ));
  }
  return { embeds: [emb], components: comps, [SIM]: true };
}

module.exports = {
  SIM, JA, catalogo, recarregar, ativo, editada, edicoes, salvarEdicao, restaurar, restaurarTudo,
  aplicar, traduzirPayload, traduzirModal, instalar, buscar, grupos, achar, detalhe, listaComSeletor, limpar,
};
