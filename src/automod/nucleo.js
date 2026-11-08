// Núcleo do automod: leitura das configurações e detecção de palavras proibidas.
const { PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const PALAVRAS = require('./palavras');

const cfg = (k, p) => db.get(`config.automod.${k}`, p);
const lista = (k) => {
  const v = cfg(k, []);
  return Array.isArray(v) ? v : [];
};

const ativo = () => cfg('ativo', true) !== false;
const extras = () => lista('extras');
const liberadas = () => lista('liberadas');
const canaisIgnorados = () => lista('canaisIgnorados');
const cargosIsentos = () => lista('cargosIsentos');

// ---------- Normalização ----------
// Tira acentos, links e menções, troca números/símbolos por letras (p3d0 -> pedo),
// reduz letras repetidas (estuuupro -> estupro) e junta letras separadas (p e d o -> pedo).
function normalizar(texto) {
  let t = String(texto || '').toLowerCase();
  t = t.replace(/https?:\/\/\S+/g, ' ').replace(/<[^>]*>/g, ' ');
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  t = t.replace(/[^a-z]+/g, ' ').replace(/(.)\1{2,}/g, '$1').trim();
  const juntas = (t.match(/\b(?:[a-z] ){2,}[a-z]\b/g) || []).map((m) => m.replace(/ /g, ''));
  return juntas.length ? `${t} ${juntas.join(' ')}` : t;
}

// Cada palavra aceita plural: matar -> matares, cartao -> cartoes
function padraoDoTermo(termo) {
  return termo
    .split(' ')
    .map((w) => (w.endsWith('ao') && w.length > 3 ? `${w.slice(0, -2)}(?:ao|aos|oes)` : `${w}(?:s|es)?`))
    .join(' ');
}

// ---------- Lista compilada (refeita só quando as configurações mudam) ----------
let cache = { chave: null, regras: [] };

function compilar() {
  const chave = JSON.stringify([extras(), liberadas()]);
  if (cache.chave === chave) return cache.regras;

  const livres = new Set(liberadas().map(normalizar));
  const categorias = { ...PALAVRAS, 'termo personalizado': extras() };
  const regras = [];
  for (const [categoria, termos] of Object.entries(categorias)) {
    const limpos = [...new Set(termos.map(normalizar).filter((t) => t && !livres.has(t)))].sort((a, b) => b.length - a.length);
    if (!limpos.length) continue;
    regras.push({ categoria, regex: new RegExp(`(?:^| )(${limpos.map(padraoDoTermo).join('|')})(?= |$)`) });
  }
  cache = { chave, regras };
  return regras;
}

// Devolve { categoria, termo } ou null
function detectar(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  for (const { categoria, regex } of compilar()) {
    const m = t.match(regex);
    if (m) return { categoria, termo: m[1] };
  }
  return null;
}

// A palavra existe na lista de fábrica?
function naListaPadrao(termo) {
  const n = normalizar(termo);
  return Object.values(PALAVRAS).some((termos) => termos.map(normalizar).includes(n));
}

// ---------- Quem é isento ----------
function isento(membro) {
  if (membro.id === membro.guild.ownerId) return true;
  const p = membro.permissions;
  if (p.has(P.Administrator) || p.has(P.ManageGuild) || p.has(P.ModerateMembers) || p.has(P.ManageMessages)) return true;
  const cargos = cargosIsentos();
  return membro.roles.cache.some((r) => cargos.includes(r.id));
}

function canalIgnorado(canal) {
  const ign = canaisIgnorados();
  return !!canal && (ign.includes(canal.id) || (canal.parentId && ign.includes(canal.parentId)));
}

module.exports = {
  cfg, ativo, extras, liberadas, canaisIgnorados, cargosIsentos,
  normalizar, detectar, naListaPadrao, isento, canalIgnorado,
};
