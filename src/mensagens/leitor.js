// Lê o código do próprio bot e acha os textos que ele envia (respostas, títulos, botões...).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PALAVRAS_ANTES_DE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await']);

// Interpreta as barras do JS (\n, é, \`...)
function cozinhar(raw) {
  return raw.replace(/\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(\r?\n)|([\s\S]))/g, (m, a, b, c, d, e) => {
    if (a) return String.fromCodePoint(parseInt(a, 16));
    if (b) return String.fromCharCode(parseInt(b, 16));
    if (c) return String.fromCharCode(parseInt(c, 16));
    if (d) return '';
    const mapa = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
    return e in mapa ? mapa[e] : e;
  });
}

// Percorre um arquivo .js e devolve todas as strings/templates: { partes, exprs, inicio }
function extrair(src) {
  const n = src.length;
  let i = 0;
  const achados = [];

  function regexPossivel() {
    let k = i - 1;
    while (k >= 0 && /\s/.test(src[k])) k--;
    if (k < 0) return true;
    const p = src[k];
    if ('(,=:[!&|?{};+-*%<>~^'.includes(p)) return true;
    if (/[A-Za-z_$]/.test(p)) {
      const m = src.slice(Math.max(0, k - 12), k + 1).match(/([A-Za-z_$][\w$]*)$/);
      return !!(m && PALAVRAS_ANTES_DE_REGEX.has(m[1]));
    }
    return false;
  }

  function lerRegex() {
    i++;
    let classe = false;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') break;
      if (classe) {
        if (c === ']') classe = false;
      } else if (c === '[') {
        classe = true;
      } else if (c === '/') {
        i++;
        break;
      }
      i++;
    }
    while (i < n && /[a-z]/i.test(src[i])) i++;
  }

  function lerString(q) {
    const ini = i;
    i++;
    let raw = '';
    while (i < n && src[i] !== q && src[i] !== '\n') {
      if (src[i] === '\\') { raw += src[i] + (src[i + 1] || ''); i += 2; } else { raw += src[i]; i++; }
    }
    i++;
    achados.push({ partes: [cozinhar(raw)], exprs: [], inicio: ini });
  }

  function lerTemplate() {
    const ini = i;
    i++;
    const partes = [];
    const exprs = [];
    let raw = '';
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') {
        raw += src[i] + (src[i + 1] || '');
        i += 2;
      } else if (src[i] === '$' && src[i + 1] === '{') {
        partes.push(cozinhar(raw));
        raw = '';
        i += 2;
        const ei = i;
        codigo(true);
        exprs.push(src.slice(ei, i).trim());
        i++; // pula o }
      } else {
        raw += src[i];
        i++;
      }
    }
    i++;
    partes.push(cozinhar(raw));
    achados.push({ partes, exprs, inicio: ini });
  }

  function codigo(dentro) {
    let prof = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const f = src.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; continue; }
      if (c === "'" || c === '"') { lerString(c); continue; }
      if (c === '`') { lerTemplate(); continue; }
      if (c === '/') {
        if (regexPossivel()) lerRegex(); else i++;
        continue;
      }
      if (c === '{') prof++;
      else if (c === '}') {
        if (dentro && prof === 0) return;
        prof--;
      }
      i++;
    }
  }

  codigo(false);
  return achados;
}

const ROTULOS = /\.(setLabel|setTitle|setPlaceholder|setFooter|setAuthor)\(\s*(\{\s*text:\s*)?$|\b(label|name|value|content|description|title|text|placeholder)\s*:\s*$/;
const IGNORAR_ANTES = new RegExp(
  '(require|import)\\s*\\(\\s*$|' +
  '\\.(get|set|remover|has|startsWith|endsWith|includes|getString|getSubcommand|getSubcommandGroup|getInteger|getUser|getChannel|getRole|getBoolean|getAttachment|getTextInputValue|getFocused|setCustomId|setName|on|once|emit|split|join|replace|replaceAll|match|test|indexOf|get_|add|delete|cdKey)\\(\\s*$|' +
  '(===|!==|==|!=|case)\\s*$|' +
  'console\\.\\w+\\(\\s*$|new Error\\(\\s*$|throw\\s*$|customId\\s*[:=]\\s*$|\\bcustomId\\s*===\\s*$',
);

function ehMensagem(item, antes, noBloco) {
  if (noBloco) return false;
  const lit = item.partes.join('');
  if (!/\p{L}{2,}/u.test(lit)) return false;
  if (IGNORAR_ANTES.test(antes)) return false;
  if (ROTULOS.test(antes)) return true;
  if (!item.exprs.length && /^[\w:.\-/@#$%{}[\]]+$/.test(lit)) return false; // ids, caminhos
  if (/^https?:\/\/\S+$/.test(lit)) return false;
  return /\s/.test(lit) || /[^\x00-\x7f]/.test(lit);
}

function grupoDe(rel) {
  const p = rel.split(path.sep);
  const base = path.basename(rel, '.js');
  if (p[0] === 'commands') return base;
  if (p[0] === 'events') return base.split('-')[0];
  return p[0];
}

const IGNORAR_ARQUIVOS = ['index.js', 'db.js', 'deploy-commands.js', 'mensagens.js', 'mensagens-instalar.js', 'mensagens-interacoes.js'];

function listarArquivos(dir, saida = []) {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const c = path.join(dir, it.name);
    if (it.isDirectory()) {
      if (['mensagens', 'site', 'node_modules'].includes(it.name)) continue;
      listarArquivos(c, saida);
    } else if (it.name.endsWith('.js') && !IGNORAR_ARQUIVOS.includes(it.name)) {
      saida.push(c);
    }
  }
  return saida;
}

const idDe = (partes) => crypto.createHash('sha1').update(partes.join('\u0001')).digest('hex').slice(0, 8);

// Devolve { lista: [...], porId: Map }. Textos iguais em vários lugares viram um só.
function montarCatalogo(raiz) {
  const porId = new Map();
  for (const arq of listarArquivos(raiz)) {
    let src;
    try { src = fs.readFileSync(arq, 'utf8'); } catch { continue; }
    const rel = path.relative(raiz, arq);
    const ehComando = rel.split(path.sep)[0] === 'commands';
    let blocoIni = -1;
    let blocoFim = -1;
    if (ehComando) {
      blocoIni = src.search(/\bdata\s*:\s*new\s+SlashCommandBuilder/);
      const f = blocoIni < 0 ? -1 : src.slice(blocoIni).search(/\n\s*(async\s+)?execute\s*\(/);
      blocoFim = f < 0 ? -1 : blocoIni + f;
    }
    let itens = [];
    try { itens = extrair(src); } catch { continue; }
    for (const it of itens) {
      const antes = src.slice(Math.max(0, it.inicio - 70), it.inicio).replace(/\s+/g, ' ');
      const noBloco = blocoIni >= 0 && blocoFim > blocoIni && it.inicio >= blocoIni && it.inicio < blocoFim;
      if (!ehMensagem(it, antes, noBloco)) continue;
      const id = idDe(it.partes);
      let e = porId.get(id);
      if (!e) {
        let modelo = it.partes[0];
        for (let k = 0; k < it.exprs.length; k++) modelo += `{${k + 1}}${it.partes[k + 1]}`;
        e = { id, partes: it.partes, vars: it.exprs, modelo, grupos: new Set(), arquivos: new Set() };
        porId.set(id, e);
      }
      e.grupos.add(grupoDe(rel));
      e.arquivos.add(rel);
    }
  }
  const lista = [...porId.values()].sort((a, b) => [...a.grupos][0].localeCompare([...b.grupos][0]) || a.modelo.localeCompare(b.modelo));
  return { lista, porId };
}

module.exports = { extrair, montarCatalogo, cozinhar };
