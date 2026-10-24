const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const CLASSES = {
  livre: { nome: 'Livre', emoji: '🟢', cor: 0x2ecc71 },
  '+15': { nome: '+15', emoji: '🟠', cor: 0xf39c12 },
  '+18': { nome: '+18', emoji: '🔴', cor: 0xe74c3c },
};

const PADROES = {
  minLinhas: 20,
  mensagens: {
    painelPublicacao: {
      titulo: '📚 Publique o seu livro',
      texto:
        'Quer compartilhar a sua história com a house?\n\n' +
        'Clique no botão abaixo e eu te guio: **título**, **sinopse** (mínimo de {linhas} linhas), ' +
        '**capa**, **PDF** e **classificação** (livre, +15 ou +18).',
    },
    painelFeedback: {
      titulo: '💬 Dê o seu feedback',
      texto:
        'Leu o livro de alguém da house? Conte o que achou!\n\n' +
        'Clique no botão abaixo e informe o **título**, o **autor**, o seu **feedback** e a sua **nota final** de 0 a 10.',
    },
  },
};

function cfg(chave, padrao) {
  return db.get(`config.livraria.${chave}`, padrao);
}

const minLinhas = () => Number(cfg('minLinhas', PADROES.minLinhas));

function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, '')
    .replace(/[_*~`|]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(texto) {
  const s = normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'livro';
}

// Cada linha escrita conta 1; linhas longas contam mais (a cada ~90 caracteres)
function contarLinhas(texto) {
  let total = 0;
  for (const linha of String(texto).split(/\r?\n/)) {
    const t = linha.trim();
    if (!t) continue;
    total += Math.max(1, Math.ceil(t.length / 90));
  }
  return total;
}

function proximoId() {
  const n = db.get('livraria.contador', 0) + 1;
  db.set('livraria.contador', n);
  return n;
}

const pegarLivro = (id) => db.get(`livraria.livros.${id}`, null);
const salvarLivro = (livro) => db.set(`livraria.livros.${livro.id}`, livro);
const removerLivro = (id) => db.remover(`livraria.livros.${id}`);

// Procura um livro publicado pelo título (igual, ou parecido se só houver um parecido)
function acharPorTitulo(titulo) {
  const alvo = normalizar(titulo);
  if (!alvo) return null;
  const livros = Object.values(db.get('livraria.livros', {}) || {});
  const exato = livros.find((l) => normalizar(l.titulo) === alvo);
  if (exato) return exato;
  const parecidos = livros.filter((l) => {
    const t = normalizar(l.titulo);
    return t.includes(alvo) || alvo.includes(t);
  });
  return parecidos.length === 1 ? parecidos[0] : null;
}

function mediaDoLivro(livro) {
  const notas = Object.values(livro.notas || {});
  if (!notas.length) return null;
  return { media: notas.reduce((a, b) => a + b, 0) / notas.length, total: notas.length };
}

// Dois embeds: o de cima com a capa, o de baixo com a sinopse
function embedsDoLivro(d) {
  const c = CLASSES[d.classe] || CLASSES.livre;
  const topo = new EmbedBuilder()
    .setColor(c.cor)
    .setTitle(`📖 ${d.titulo}`.slice(0, 256))
    .setDescription(`✍️ **Autor(a):** ${d.autor} (<@${d.autorId}>)\n${c.emoji} **Classificação:** ${c.nome}`)
    .setImage(d.capaUrl);
  const rodape = `Publicado por ${d.publicador}` + (d.classe === '+18' ? ' • Conteúdo adulto' : '');
  const sinopse = new EmbedBuilder()
    .setColor(c.cor)
    .setDescription(`**📝 Sinopse**\n${d.sinopse}`.slice(0, 4096))
    .setFooter({ text: rodape.slice(0, 2048) })
    .setTimestamp();
  return [topo, sinopse];
}

async function baixar(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

const ehImagem = (a) =>
  /^image\/(png|jpe?g|webp|gif)/.test(a.contentType || '') || /\.(png|jpe?g|webp|gif)$/i.test(a.name || '');

const ehPdf = (a) => (a.contentType || '').startsWith('application/pdf') || /\.pdf$/i.test(a.name || '');

function extensaoImagem(anexo) {
  const m = String(anexo.name || '').toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
  const t = String(anexo.contentType || '');
  if (t.includes('jpeg')) return 'jpg';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  return 'png';
}

module.exports = {
  CLASSES,
  PADROES,
  cfg,
  minLinhas,
  mensagem,
  preencher,
  normalizar,
  slug,
  contarLinhas,
  proximoId,
  pegarLivro,
  salvarLivro,
  removerLivro,
  acharPorTitulo,
  mediaDoLivro,
  embedsDoLivro,
  baixar,
  ehImagem,
  ehPdf,
  extensaoImagem,
};
};
