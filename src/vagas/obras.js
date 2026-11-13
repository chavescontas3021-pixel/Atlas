// Confere se uma obra existe (anime, mangá, filme, série, jogo, livro...) e devolve o título oficial.
//   1) AniList: anime, mangá e light novel
//   2) Wikidata (Wikipédia): filmes, séries, jogos, livros, quadrinhos etc., buscando em português e inglês
// Resultado de verificar():
//   { status: 'ok', titulo, tipo }        achou exatamente (já vem com o título padronizado)
//   { status: 'sugestao', titulo, tipo }  não achou igual, mas tem algo parecido ("narutu" -> "Naruto")
//   { status: 'nao' }                     não achou nada
//   { status: 'erro' }                    os serviços não responderam: não dá para afirmar nada
const ANILIST = 'https://graphql.anilist.co';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const UA = 'AtlasBot/1.0 (bot de Discord; conferencia de obras)';
const TTL = 60 * 60 * 1000;
const LIMIAR = 0.72;

const cache = new Map();

// Compara sem acento, maiúscula ou pontuação ("Re:Zero" = "re zero")
const limpo = (txt) => String(txt || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function distancia(a, b) {
  const m = a.length;
  const n = b.length;
  let antes = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) {
      atual[j] = Math.min(antes[j] + 1, atual[j - 1] + 1, antes[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    antes = atual;
  }
  return antes[n];
}

function parecido(q, t) {
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (q.length >= 4 && t.startsWith(q)) return 0.9; // "naruto" -> "naruto shippuuden"
  return 1 - distancia(q, t) / Math.max(q.length, t.length);
}

async function pedir(url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { 'User-Agent': UA, ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---- AniList ----
const Q_ANILIST = 'query($s:String){Page(perPage:6){media(search:$s,sort:SEARCH_MATCH){type format title{romaji english native} synonyms}}}';
const tipoAniList = (m) => (m.type === 'ANIME' ? 'Anime' : m.format === 'NOVEL' ? 'Light novel' : 'Mangá');

// ---- Wikidata: só aceita itens cuja descrição indica uma obra (não pessoas, personagens, lugares) ----
const OBRA = /\b(filmes?|longa|curta|films?|movie|s[eé]ries?|series|telenovela|novela|minis[eé]rie|televis[aã]o|television|anime|mang[aá]|manhwa|webtoon|jogos?|videogames?|video ?games?|games?|livros?|romances?|novels?|books?|quadrinhos|hq|comics?|desenhos?|anima[cç][aã]o|animated|franquia|franchise|sagas?|visual novel|podcast|musical|[oó]pera)\b/i;
const NAO_OBRA = /^(personagem|character|fictional|pessoa|person|ator|atriz|actor|actress|cantor|singer|escritor|writer|banda|band|empresa|company)/i;

function tipoDescricao(d) {
  const t = limpo(d);
  if (/\banime\b/.test(t)) return 'Anime';
  if (/\b(manga|manhwa|webtoon)\b/.test(t)) return 'Mangá';
  if (/\b(jogo|jogos|videogame|video game|game|games|visual novel)\b/.test(t)) return 'Jogo';
  if (/\b(serie|series|telenovela|novela|miniserie|televisao|television)\b/.test(t)) return 'Série';
  if (/\b(filme|filmes|film|films|movie|longa|curta)\b/.test(t)) return 'Filme';
  if (/\b(quadrinhos|hq|comic|comics)\b/.test(t)) return 'HQ';
  if (/\b(livro|livros|romance|romances|novel|book)\b/.test(t)) return 'Livro';
  return 'Obra';
}

async function consultar(q, bruto) {
  let tentativas = 0;
  let falhas = 0;
  let melhor = null;
  const sugerir = (titulo, tipo, nota) => {
    if (nota >= LIMIAR && (!melhor || nota > melhor.nota)) melhor = { titulo, tipo, nota };
  };

  tentativas++;
  try {
    const d = await pedir(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: Q_ANILIST, variables: { s: bruto } }),
    });
    for (const m of (d && d.data && d.data.Page && d.data.Page.media) || []) {
      const t = m.title || {};
      const titulos = [t.english, t.romaji, t.native, ...(m.synonyms || [])].filter(Boolean);
      const canonico = t.english || t.romaji || t.native;
      if (titulos.some((x) => limpo(x) === q)) return { status: 'ok', titulo: canonico, tipo: tipoAniList(m) };
      for (const x of titulos) sugerir(canonico, tipoAniList(m), parecido(q, limpo(x)));
    }
  } catch {
    falhas++;
  }

  for (const lang of ['pt', 'en']) {
    tentativas++;
    try {
      const url = `${WIKIDATA}?action=wbsearchentities&format=json&type=item&limit=8&language=${lang}&uselang=${lang}&search=${encodeURIComponent(bruto)}`;
      const d = await pedir(url);
      for (const it of (d && d.search) || []) {
        const desc = it.description || '';
        if (!it.label || !OBRA.test(desc) || NAO_OBRA.test(desc.trim())) continue;
        const tipo = tipoDescricao(desc);
        const textos = [it.label, it.match && it.match.text].filter(Boolean);
        if (textos.some((x) => limpo(x) === q)) return { status: 'ok', titulo: it.label, tipo };
        for (const x of textos) sugerir(it.label, tipo, parecido(q, limpo(x)));
      }
    } catch {
      falhas++;
    }
  }

  if (melhor) return { status: 'sugestao', titulo: melhor.titulo, tipo: melhor.tipo };
  if (falhas > 0 || falhas === tentativas) return { status: 'erro' }; // não dá para afirmar que não existe
  return { status: 'nao' };
}

async function verificar(texto) {
  const bruto = String(texto || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const q = limpo(bruto);
  if (q.length < 2) return { status: 'nao' };
  const guardado = cache.get(q);
  if (guardado && Date.now() - guardado.quando < TTL) return guardado.r;
  const r = await consultar(q, bruto);
  if (r.status !== 'erro') {
    cache.set(q, { quando: Date.now(), r });
    if (cache.size > 1000) cache.delete(cache.keys().next().value);
  }
  return r;
}

module.exports = { verificar, limpo };
// fim do arquivo
