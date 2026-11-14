// ─────────────────────────────────────────────────────────────
//  ATLAS · dicionário (gratuito, sem chave)
//
//  Tenta três fontes, nesta ordem, e usa a primeira que responder:
//    1. Dicionário Aberto (dicionario-aberto.net)  → português de Portugal e do Brasil
//    2. Wikcionário em português (REST)
//    3. Wikcionário em português (API de texto)
//  Guarda cada palavra por 24 horas para não ficar pedindo a mesma coisa.
//
//  Se uma fonte mudar o formato, o Atlas simplesmente passa para a próxima.
//  Para testar do Discord: /conversa dicionario palavra:casa
// ─────────────────────────────────────────────────────────────
const TEMPO_LIMITE = 6000; // 6 segundos por fonte
const VALIDADE = 24 * 60 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map();

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };

function limparTexto(t) {
  return String(t || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTIDADES[m] || m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, ' ')
    .replace(/^\s*_[^_]{1,14}_\s*/, '') // marca de classe gramatical, ex.: _s. f._
    .replace(/_([^_]+)_/g, '$1') // sublinhado de itálico
    .replace(/^[\s_*.,;:-]+/, '')
    .trim();
}

const corta = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

// Aceita só letras, hífen, apóstrofo e espaço. Devolve null se a palavra for estranha.
function validarPalavra(bruto) {
  const p = String(bruto || '')
    .toLowerCase()
    .replace(/[?!.,;:"“”()]/g, ' ')
    .replace(/^(a|o|as|os|um|uma) (palavra|termo|expressao|expressão) /, '')
    .replace(/^(a|o) palavra /, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!p || p.length > 40) return null;
  if (!/^[\p{L}][\p{L}\-' ]*$/u.test(p)) return null;
  if (p.split(' ').length > 3) return null;
  return p;
}

async function buscarJson(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(TEMPO_LIMITE),
    headers: { 'User-Agent': 'atlas-bot (discord)', Accept: 'application/json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── Fonte 1: Dicionário Aberto ───────────────────────────────
function extrairDicionarioAberto(dados) {
  const lista = Array.isArray(dados) ? dados : dados && typeof dados === 'object' ? [dados] : [];
  const defs = [];
  for (const entrada of lista) {
    const xml = typeof entrada.xml === 'string' ? entrada.xml : typeof entrada.definition === 'string' ? entrada.definition : '';
    if (!xml) continue;
    const achados = xml.match(/<def>([\s\S]*?)<\/def>/gi) || [];
    for (const d of achados) {
      const t = limparTexto(d);
      if (t.length > 3) defs.push(t);
    }
  }
  return defs;
}

async function doDicionarioAberto(palavra) {
  const dados = await buscarJson(`https://api.dicionario-aberto.net/word/${encodeURIComponent(palavra)}`);
  if (!dados) return [];
  return extrairDicionarioAberto(dados);
}

// ── Fonte 2: Wikcionário (REST) ──────────────────────────────
function extrairWikiRest(dados) {
  const defs = [];
  if (!dados || typeof dados !== 'object') return defs;
  for (const grupo of Object.values(dados)) {
    if (!Array.isArray(grupo)) continue;
    for (const bloco of grupo) {
      const classe = limparTexto(bloco.partOfSpeech || '');
      for (const d of bloco.definitions || []) {
        const t = limparTexto(d.definition);
        if (t.length > 3) defs.push(classe ? `*${classe}.* ${t}` : t);
      }
    }
  }
  return defs;
}

async function doWikiRest(palavra) {
  const dados = await buscarJson(`https://pt.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(palavra)}`);
  return extrairWikiRest(dados);
}

// ── Fonte 3: Wikcionário (texto da página) ───────────────────
function extrairWikiTexto(dados) {
  const paginas = (dados && dados.query && dados.query.pages) || {};
  const defs = [];
  for (const pg of Object.values(paginas)) {
    if (!pg || typeof pg.extract !== 'string') continue;
    for (const linha of pg.extract.split('\n')) {
      const l = linha.trim();
      if (!l || /^=+.*=+$/.test(l)) continue; // pula títulos de seção
      if (/^(\(|\[)?(etimologia|pronuncia|exemplo|sinonimo|antonimo)/i.test(l)) continue;
      const t = limparTexto(l);
      if (t.length > 12) defs.push(t);
    }
  }
  return defs;
}

async function doWikiTexto(palavra) {
  const url =
    'https://pt.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&format=json&titles=' +
    encodeURIComponent(palavra);
  return extrairWikiTexto(await buscarJson(url));
}

const FONTES = [
  { nome: 'Dicionário Aberto', buscar: doDicionarioAberto },
  { nome: 'Wikcionário', buscar: doWikiRest },
  { nome: 'Wikcionário', buscar: doWikiTexto },
];

// Resultado:
//   { ok:true, palavra, definicoes:[...], fonte }
//   { ok:false, motivo:'invalida' | 'nao_achou' | 'erro', palavra }
async function definir(bruto, { fontes = FONTES } = {}) {
  const palavra = validarPalavra(bruto);
  if (!palavra) return { ok: false, motivo: 'invalida', palavra: String(bruto || '').slice(0, 40) };

  const guardado = cache.get(palavra);
  if (guardado && Date.now() - guardado.ts < VALIDADE) return guardado.resultado;

  let falhas = 0;
  for (const fonte of fontes) {
    try {
      const defs = (await fonte.buscar(palavra)).map((d) => corta(d, 320));
      if (defs.length) {
        const unicas = [...new Set(defs)].slice(0, 4);
        const resultado = { ok: true, palavra, definicoes: unicas, fonte: fonte.nome };
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
        cache.set(palavra, { ts: Date.now(), resultado });
        return resultado;
      }
    } catch {
      falhas += 1;
    }
  }
  // Se TODAS as fontes falharam, é problema de rede, não de palavra
  if (falhas === fontes.length) return { ok: false, motivo: 'erro', palavra };
  return { ok: false, motivo: 'nao_achou', palavra };
}

module.exports = {
  definir, validarPalavra, limparTexto,
  _teste: { extrairDicionarioAberto, extrairWikiRest, extrairWikiTexto, cache },
};
