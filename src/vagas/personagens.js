// Busca de personagens no AniList (gratuito, sem chave) para o /vaga pedir.
// Cobre animes e mangás. Obras de fora entram pelo pedido manual (campo "obra").
const URL_API = 'https://graphql.anilist.co';
const TTL = 10 * 60 * 1000;

const buscas = new Map(); // texto normalizado -> { quando, itens }
const detalhes = new Map(); // id -> { nome, obra, foto }

const BUSCA = `query($s:String){Page(perPage:20){characters(search:$s,sort:SEARCH_MATCH){id name{full} image{medium} media(perPage:1,sort:POPULARITY_DESC){nodes{title{romaji english}}}}}}`;
const POR_ID = `query($id:Int){Character(id:$id){id name{full} image{medium} media(perPage:1,sort:POPULARITY_DESC){nodes{title{romaji english}}}}}`;

function limpar(txt) {
  return String(txt || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function paraItem(c) {
  const m = c.media && c.media.nodes && c.media.nodes[0];
  const titulo = m && m.title ? (m.title.english || m.title.romaji) : '';
  const item = { id: c.id, chave: `al:${c.id}`, nome: c.name.full, obra: titulo || 'Sem obra', foto: (c.image && c.image.medium) || null };
  detalhes.set(String(c.id), item);
  if (detalhes.size > 2000) detalhes.delete(detalhes.keys().next().value);
  return item;
}

async function consulta(query, variables, ms) {
  const r = await fetch(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error(`AniList ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error('AniList: consulta recusada');
  return j.data;
}

// Lista de personagens que combinam com o texto. Nunca lança erro: devolve [] se o AniList não responder.
async function buscar(texto, ms = 2000) {
  const chave = limpar(texto);
  if (chave.length < 2) return [];
  const antigo = buscas.get(chave);
  if (antigo && Date.now() - antigo.quando < TTL) return antigo.itens;
  try {
    const d = await consulta(BUSCA, { s: String(texto).trim() }, ms);
    const itens = ((d && d.Page && d.Page.characters) || []).map(paraItem);
    buscas.set(chave, { quando: Date.now(), itens });
    if (buscas.size > 500) buscas.delete(buscas.keys().next().value);
    return itens;
  } catch {
    return [];
  }
}

// Detalhes de um personagem pelo id (usa o que a busca já guardou; senão pergunta ao AniList)
async function porId(id, ms = 6000) {
  const g = detalhes.get(String(id));
  if (g) return g;
  try {
    const d = await consulta(POR_ID, { id: Number(id) }, ms);
    return d && d.Character ? paraItem(d.Character) : null;
  } catch {
    return null;
  }
}

module.exports = { buscar, porId, limpar };
// fim do arquivo
